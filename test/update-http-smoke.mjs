// Run only against an explicitly isolated, unauthenticated-to-Xiaosuanli profile
// installed with the committed updater fixture at version 1.0.2.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const [logPath, resultPath] = process.argv.slice(2);
if (!logPath || !resultPath) throw Error('Usage: node update-http-smoke.mjs <isolated-host-log> <result-json>');
const log = await readFile(logPath, 'utf8');
const launch = log.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/)?.[1];
assert.ok(launch, 'Missing isolated launch URL');
const base = new URL(launch).origin;
const admission = await fetch(launch, { redirect: 'manual' });
const cookie = admission.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
assert.ok(cookie);
const rpc = async (method, payload = {}) => {
  const response = await fetch(base + '/api/xiaosuanli/' + method, { method: 'POST', signal: AbortSignal.timeout(180000),
    headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: crypto.randomUUID(), method: 'xiaosuanli/' + method, payload }) });
  assert.ok(response.ok, 'RPC HTTP ' + response.status);
  return (await response.json()).result;
};
const connection = await rpc('status');
assert.equal(connection.value.connected, false, 'Only isolated unconnected profile allowed');
const before = await rpc('plugin-status');
assert.equal(before.value.version, '1.0.2');
const check = await rpc('plugin-check-update');
assert.equal(check.ok, true); assert.equal(check.value.updateAvailable, true);
let result;
try { result = await rpc('plugin-update', { candidateId: check.value.candidateId }); }
catch { result = { responseInterrupted: true }; }
let after;
for (let i = 0; i < 15; i++) {
  try { after = await rpc('plugin-status'); if (after.value?.installedVersion === check.value.latestVersion) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
const summary = { from: before.value.version, target: check.value.latestVersion, result, after,
  accountConnected: false, chargedGeneration: false };
await writeFile(resultPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
assert.equal(after?.value?.installedVersion, check.value.latestVersion, 'Update must install selected version');
assert.ok(result.responseInterrupted || result.ok && !['failed', 'cancelled', 'overridden'].includes(result.value.application));
