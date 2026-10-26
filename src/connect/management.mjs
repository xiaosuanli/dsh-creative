import { randomUUID } from 'node:crypto';
import semver from 'semver';
import { ConnectError } from './index.mjs';

const packageName = '@xiaosuanli/dsh-plugin';
const failures = {
  'stop-profile': '请完全退出 DSH 后，在系统终端执行下方卸载命令。',
  'bundle-in-use': '插件仍在使用，请完全退出 DSH 后执行下方卸载命令。',
  'not-removable': '此安装由 DSH 管理，无法在这里卸载，请使用 DSH 插件管理。',
  'management-required': '当前环境不允许修改插件，请使用 DSH 插件管理。',
  'incompatible-version': '新版本与当前 DSH 不兼容，请先升级 DSH。',
};

// This owner-only UI can manage this package alone. Never accept install specs
// from the client, or bypass the manager's compatibility/active-profile guards.
export function pluginManagement({ manager, metadata, siteOrigin, profile, fetchImpl = (...args) => fetch(...args) }) {
  let candidate, changed = false;
  const release = metadata.xiaosuanliRelease;
  const channel = release ? release.environment : 'npm';
  const command = typeof profile === 'string' && /^[a-zA-Z0-9_-]+$/.test(profile)
    ? `dsh plugin --profile ${profile} remove ${packageName}` : undefined;
  const requireManager = () => {
    if (!manager) throw new ConnectError('MANAGEMENT_UNAVAILABLE', '当前 DSH 未提供插件管理，请在系统终端更新或卸载。');
  };
  const json = async url => {
    const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new ConnectError('UPDATE_CHECK_FAILED', '暂时无法检查更新，请稍后重试。');
    return response.json();
  };
  const status = async () => {
    const bundle = manager && (await manager.listBundles()).find(item => item.name === packageName);
    return { version: metadata.version, revision: release?.sourceRevision?.slice(0, 12), channel,
      installedVersion: bundle?.version, available: !!manager, removable: !!bundle?.removable,
      restartRequired: changed || !!bundle?.version && bundle.version !== metadata.version, uninstallCommand: command };
  };
  const outcome = result => {
    if (result.changed) { changed = true; candidate = undefined; }
    const failed = ['failed', 'cancelled', 'overridden'].includes(result.application);
    return { changed: result.changed, application: result.application, version: result.version,
      errorCode: result.error?.code, uninstallCommand: command,
      message: failed ? failures[result.error?.code] || (result.application === 'cancelled' ? '操作已取消。' : '操作未完成，请查看 DSH 插件管理中的诊断信息。') :
        result.stage === 'remove' ? '插件已卸载，请完全退出并重新打开 DSH。' : '更新已安装，请完全退出并重新打开 DSH 后使用。' };
  };
  return {
    status,
    async check() {
      requireManager(); candidate = undefined;
      const state = await status();
      if (state.restartRequired) return { ...state, updateAvailable: false, message: '插件已变更，请先完全退出并重新打开 DSH。' };
      let version, revision, spec;
      if (release) {
        const origins = { test: 'https://test-app.xiaosuanli.com', production: 'https://www.xiaosuanli.com' };
        if (origins[channel] !== siteOrigin) throw new ConnectError('UPDATE_CHANNEL_MISMATCH', '安装渠道与当前站点不一致，请从当前站点重新安装插件。');
        const base = siteOrigin + '/skills/xiaosuanli-director/';
        const manifest = await json(base + 'manifest.json');
        revision = manifest.sourceRevision;
        version = manifest.channels?.dsh?.version;
        if (manifest.name !== 'xiaosuanli-director' || manifest.environment !== channel || !/^[a-f0-9]{40}$/.test(revision || '') ||
          manifest.channels?.dsh?.artifact !== `adapters/dsh/xiaosuanli-dsh-plugin-${revision.slice(0, 12)}.tgz` || !semver.valid(version)) {
          throw new ConnectError('INVALID_UPDATE', '更新信息不完整，请稍后重试或从下载入口安装。');
        }
        spec = base + manifest.channels.dsh.artifact;
      } else {
        const latest = await json('https://registry.npmjs.org/@xiaosuanli%2Fdsh-plugin/latest');
        if (latest.name !== packageName || !semver.valid(latest.version) || !latest.dsh?.bundle) throw new ConnectError('INVALID_UPDATE', 'npm 更新信息无效，请稍后重试。');
        version = latest.version;
        spec = `${packageName}@${version}`;
      }
      const newer = semver.valid(metadata.version) && (semver.gt(version, metadata.version) ||
        !!release && semver.eq(version, metadata.version) && revision !== release.sourceRevision);
      if (newer) candidate = { id: randomUUID(), spec, version, expiresAt: Date.now() + 300000 };
      return { ...state, updateAvailable: !!newer, latestVersion: version, latestRevision: revision?.slice(0, 12),
        candidateId: candidate?.id, message: newer ? '发现可用更新。' : '当前已是此渠道的最新版本。' };
    },
    async update(id) {
      requireManager();
      if (!candidate || id !== candidate.id || candidate.expiresAt < Date.now()) throw new ConnectError('STALE_UPDATE', '请重新检查更新后再安装。');
      const selected = candidate; candidate = undefined;
      return outcome(await manager.installBundle(selected.spec, { saveExact: true }));
    },
    async remove(confirmed) {
      requireManager();
      if (confirmed !== true) throw new ConnectError('CONFIRM_UNINSTALL', '请先确认卸载插件。');
      return outcome(await manager.removeBundle(packageName));
    },
  };
}
