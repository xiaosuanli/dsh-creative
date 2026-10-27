import test from 'node:test';
import assert from 'node:assert/strict';
import { pluginManagement } from '../src/connect/management.mjs';

const name = '@xiaosuanli/dsh-plugin';
const tarball = version => `https://registry.npmjs.org/@xiaosuanli/dsh-plugin/-/dsh-plugin-${version}.tgz`;
const npmRelease = version => ({ name, version, dsh: { bundle: {} }, dist: { tarball: tarball(version) } });
const current = 'a'.repeat(40), next = 'b'.repeat(40);
function fixture({ release, latest, installed = '1.0.2', result } = {}) {
  const calls = [];
  const manager = {
    listBundles: async () => [{ name, version: installed, removable: true }],
    installBundle: async (...args) => { calls.push(['install', ...args]); return result || { changed: true, application: 'restart-required', stage: 'install' }; },
    removeBundle: async target => { calls.push(['remove', target]); return result || { changed: false, application: 'failed', stage: 'remove', error: { code: 'stop-profile' } }; },
  };
  const service = pluginManagement({ manager, metadata: { version: '1.0.2', xiaosuanliRelease: release },
    siteOrigin: 'https://test-app.xiaosuanli.com', profile: 'desktop',
    fetchImpl: async url => { calls.push(['fetch', url]); return { ok: true, json: async () => latest }; } });
  return { service, calls };
}
const manifest = (revision = next) => ({ name: 'xiaosuanli-director', environment: 'test', sourceRevision: revision,
  channels: { dsh: { version: '1.0.2', artifact: `adapters/dsh/xiaosuanli-dsh-plugin-${revision.slice(0, 12)}.tgz` } } });

test('npm check never downgrades the candidate; update is pinned and single use', async () => {
  const old = fixture({ latest: npmRelease('1.0.1') });
  assert.equal((await old.service.check()).updateAvailable, false);
  await assert.rejects(old.service.update('arbitrary-url'), /检查更新/);
  const newer = fixture({ latest: npmRelease('1.0.3') });
  const check = await newer.service.check();
  assert.equal(check.updateAvailable, true);
  const outcome = await newer.service.update(check.candidateId);
  assert.equal(outcome.application, 'restart-required');
  assert.deepEqual(newer.calls.at(-1), ['install', tarball('1.0.3'), { saveExact: true }]);
  await assert.rejects(newer.service.update(check.candidateId), /检查更新/);
  assert.equal((await newer.service.status()).restartRequired, true);
});

test('test channel detects a new build of the same version and never switches to npm', async () => {
  const { service, calls } = fixture({ release: { environment: 'test', sourceRevision: current }, latest: manifest() });
  const check = await service.check();
  assert.equal(check.latestRevision, next.slice(0, 12));
  await service.update(check.candidateId);
  assert.equal(calls[0][1], 'https://test-app.xiaosuanli.com/skills/xiaosuanli-director/manifest.json');
  assert.equal(calls.at(-1)[1], 'https://test-app.xiaosuanli.com/skills/xiaosuanli-director/' + manifest().channels.dsh.artifact);
  const same = fixture({ release: { environment: 'test', sourceRevision: current }, latest: manifest(current) });
  assert.equal((await same.service.check()).updateAvailable, false);
});

test('invalid or cross-channel manifests cannot inject installation targets', async () => {
  for (const latest of [{ ...manifest(), environment: 'production' }, { ...manifest(), channels: { dsh: { version: '1.0.3', artifact: 'https://evil.example/payload.tgz' } } }]) {
    const { service, calls } = fixture({ release: { environment: 'test', sourceRevision: current }, latest });
    await assert.rejects(service.check(), /更新信息不完整/);
    assert.equal(calls.some(call => call[0] === 'install'), false);
  }
});

test('uninstall requires confirmation and reports the active-profile guard without bypass', async () => {
  const { service, calls } = fixture();
  await assert.rejects(service.remove(false), /确认卸载/);
  assert.equal(calls.length, 0);
  const result = await service.remove(true);
  assert.equal(result.changed, false);
  assert.equal(result.errorCode, 'stop-profile');
  assert.match(result.message, /退出 DSH/);
  assert.equal(result.uninstallCommand, 'dsh plugin --profile desktop remove ' + name);
  assert.deepEqual(calls, [['remove', name]]);
});

test('an already installed newer version requires restart before another update', async () => {
  const { service, calls } = fixture({ installed: '1.0.3' });
  assert.equal((await service.check()).restartRequired, true);
  assert.equal(calls.length, 0);
});


test('npm update rejects untrusted or mismatched tarballs before installing', async () => {
  for (const artifact of ['https://example.com/plugin.tgz', tarball('1.0.2'), tarball('1.0.3') + '?redirect=other']) {
    const { service, calls } = fixture({ latest: { ...npmRelease('1.0.3'), dist: { tarball: artifact } } });
    await assert.rejects(service.check(), { code: 'INVALID_UPDATE' });
    assert.equal(calls.some(call => call[0] === 'install'), false);
  }
});

test('failed update can be checked and retried with a fresh candidate, without uninstalling', async () => {
  const { service, calls } = fixture({ latest: npmRelease('1.0.3'), result: { changed: false, application: 'failed', error: { code: 'already-installed' } } });
  const first = await service.check();
  const failed = await service.update(first.candidateId);
  assert.match(failed.message, /覆盖安装/);
  await assert.rejects(service.update(first.candidateId), { code: 'STALE_UPDATE' });
  const second = await service.check();
  assert.notEqual(second.candidateId, first.candidateId);
  await service.update(second.candidateId);
  assert.equal(calls.filter(call => call[0] === 'install').length, 2);
  assert.equal(calls.some(call => call[0] === 'remove'), false);
});
