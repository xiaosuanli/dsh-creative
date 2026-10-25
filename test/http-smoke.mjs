// Read only the isolated test Host's launch token; never print or archive it.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const [logPath, resultPath] = process.argv.slice(2);
if (!logPath || !resultPath) throw new Error('Usage: node http-smoke.mjs <isolated-host-log> <result-json>');
const log = await readFile(logPath, 'utf8');
assert.equal(log.includes('did not activate'), false, 'A plugin did not activate');
const launch = log.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/)?.[1];
assert.ok(launch, 'Missing isolated host URL');
const base = new URL(launch).origin;
const admission = await fetch(launch, { redirect: 'manual' });
const cookie = admission.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
assert.ok(cookie, 'Host did not admit the test owner');
const rpc = async (method, payload = {}, authenticated = true) => {
  const response = await fetch(base + '/api/xiaosuanli/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...(authenticated ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ type: 'client-request', rpcId: crypto.randomUUID(), method: 'xiaosuanli/' + method, payload }),
  });
  return { status: response.status, body: response.ok ? await response.json() : null };
};
const anonymous = await rpc('status', {}, false);
assert.equal(anonymous.status, 401);
const status = await rpc('status');
assert.equal(status.body.result.ok, true);
assert.equal(status.body.result.value.connected, false);
assert.equal(status.body.result.value.channel, 'dsh');
const login = await rpc('begin-login');
assert.equal(login.body.result.ok, true);
assert.equal(new URL(login.body.result.value.url).searchParams.get('clientId'), 'xiaosuanli-dsh');
assert.equal('codeVerifier' in login.body.result.value, false);
const account = await rpc('account');
assert.equal(account.body.result.ok, false);
const html = await (await fetch(base, { headers: { Cookie: cookie } })).text();
const summary = { activated: true, anonymousStatus: anonymous.status, ownerStatus: status.body.result.value,
  loginLinkClient: 'xiaosuanli-dsh', unconnectedAccountRejected: true,
  clientMentionedInBootstrap: html.includes('@xiaosuanli/dsh-plugin') || html.includes('%40xiaosuanli'),
  remoteAccountUsed: false, chargedGeneration: false };
await writeFile(resultPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
