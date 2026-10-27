import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DirectorConnect } from '../src/connect/index.mjs';
import { request } from '../src/connect/http.mjs';

test('Connect preserves actionable business rejection without leaking the credential', async () => {
  const token = 'private-secret';
  const fetcher = async () => ({ ok: true, status: 200, json: async () => ({ code: 400, message: '其他章节队列尚未结束 ' + token }) });
  await assert.rejects(request(fetcher, 'https://test.example', '/tools/generation_start', { token }), error =>
    error.code === 400 && error.message.includes('其他章节队列尚未结束') && !error.message.includes(token));
});

const project = '11111111-1111-1111-1111-111111111111';
function fixture({ storeValues = new Map(), client = { id: 'xiaosuanli-dsh', channel: 'dsh' }, apiOrigin = 'https://api.example.com', extraTools = [] } = {}) {
  const calls = [];
  let fail;
  const children = new Map();
  const grant = { clientId: client.id, channel: client.channel, projectId: project, accessToken: 'private-token',
    scopes: ['project:read', 'account:read', 'project:write'], expiresAt: new Date(Date.now() + 600000).toISOString() };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (fail) throw new Error('private internal message');
    let data = { accepted: true };
    const body = options.body ? JSON.parse(options.body) : {};
    const actor = children.get(options.headers.Authorization?.slice(7));
    if (url.endsWith("/conversations/open")) {
      data = { ...grant, accessToken: "private-child-" + body.conversationId, authorizationId: "auth-" + body.conversationId, chapterId: body.chapterId, conversationId: body.conversationId };
      children.set(data.accessToken, data);
    }
    if (url.endsWith("/conversations/user-turn")) data = { userTurnId: body.userTurnId, canWrite: true };
    if (url.endsWith('/token')) data = grant;
    if (url.endsWith('/capabilities')) data = { clientId: client.id, channel: client.channel, projectId: project,
      ...(actor ? { chapterId: actor.chapterId, sessionId: actor.authorizationId, canWrite: true } : {}),
      tools: [...extraTools, { operation: 'node_update', inputSchema: { type: 'object' } }, { operation: 'shell', inputSchema: { type: 'object' } }] };
    if (url.endsWith('/account')) data = { clientId: client.id, channel: client.channel, projectId: project, username: 'user', credits: { availableCredits: 12 } };
    return { ok: true, json: async () => ({ code: 200, data }) };
  };
  const connect = new DirectorConnect({ client, apiOrigin, siteOrigin: 'https://www.example.com', fetcher,
    store: { get: async key => storeValues.get(key), set: async (key, value) => storeValues.set(key, value), delete: async key => storeValues.delete(key) } });
  const login = async () => { const pending = connect.beginLogin(); await connect.completeLogin({ code: 'one-time-code', state: pending.state }); await connect.openChapter('conversation-a', 'chapter-a'); await connect.beginUserTurn('conversation-a', 'user-1'); return pending; };
  return { connect, execute: (operation, args) => connect.execute(operation, args, { conversationId: 'conversation-a', userTurnId: 'user-1' }), login, calls, grant, storeValues, failNetwork: () => { fail = true; } };
}

test('PKCE stays in host; status has no secrets; state mismatch cannot exchange', async () => {
  const f = fixture();
  const pending = f.connect.beginLogin();
  await assert.rejects(f.connect.completeLogin({ code: 'code', state: 'wrong' }), { code: 'INVALID_LOGIN' });
  assert.equal(f.calls.length, 0);
  const status = await f.connect.completeLogin({ code: 'code', state: pending.state });
  const exchange = JSON.parse(f.calls[0].options.body);
  assert.equal(createHash('sha256').update(exchange.codeVerifier).digest('base64url'), new URL(pending.url).searchParams.get('codeChallenge'));
  assert.equal(exchange.clientId, 'xiaosuanli-dsh');
  assert.equal(status.projectId, project);
  assert.equal(JSON.stringify(status).includes('private-token'), false);
  assert.equal(JSON.stringify(pending).includes(exchange.codeVerifier), false);
  await assert.rejects(f.connect.completeLogin({ code: 'code', state: pending.state }), { code: 'INVALID_LOGIN' });
});

test('credentials isolate channels and environments, and reject foreign exchange identity', async () => {
  const f = fixture(); await f.login();
  const other = fixture({ storeValues: f.storeValues, client: { id: 'fixture-host', channel: 'fixture' } });
  const environment = fixture({ storeValues: f.storeValues, apiOrigin: 'https://test.example.com' });
  assert.equal((await other.connect.status()).connected, false);
  assert.equal((await environment.connect.status()).connected, false);
  const malicious = fixture(); malicious.grant.channel = 'foreign';
  await assert.rejects(malicious.login(), { code: 'INVALID_GRANT' });
  assert.equal(malicious.storeValues.size, 0);
});

test('tools preserve original request/version and reject identity or project overrides', async () => {
  const f = fixture(); await f.login();
  const args = { projectId: project, requestId: 'original-request', expectedVersion: 7, kind: 'video', nodeId: 'node', description: 'new story' };
  await f.execute('node_update', args);
  assert.deepEqual(JSON.parse(f.calls.at(-1).options.body), args);
  const count = f.calls.length;
  await assert.rejects(f.execute('node_update', { ...args, projectId: 'foreign' }), { code: 'INVALID_ARGUMENTS' });
  await assert.rejects(f.execute('node_update', { ...args, clientId: 'foreign' }), { code: 'INVALID_ARGUMENTS' });
  await assert.rejects(f.execute('shell', {}), { code: 'INVALID_OPERATION' });
  assert.equal(f.calls.length, count);
  assert.deepEqual((await f.connect.capabilities()).tools.map(t => t.operation), ['node_update']);
});

test('uncertain write is never automatically retried and failed revoke retains recoverable grant', async () => {
  const f = fixture(); await f.login(); f.failNetwork();
  const count = f.calls.length;
  await assert.rejects(f.execute('video_generate', { requestId: 'original', expectedVersion: 7 }), { code: 'RESULT_UNKNOWN' });
  assert.equal(f.calls.length, count + 1);
  await assert.rejects(f.connect.disconnect(), { code: 'RESULT_UNKNOWN' });
  assert.equal((await f.connect.status()).connected, true);
});

test('logout revokes only selected grant; expired token cannot invoke a tool', async () => {
  const f = fixture(); await f.login();
  await f.connect.disconnect();
  assert.equal(f.calls.at(-1).options.method, 'DELETE');
  assert.equal((await f.connect.status()).connected, false);
  await f.login();
  for (const value of f.storeValues.values()) if (value.accessToken) value.expiresAt = '2000-01-01T00:00:00Z';
  const count = f.calls.length;
  await assert.rejects(f.execute('project_get', {}), { code: 'INVALID_GRANT' });
  assert.equal(f.calls.length, count);
});

test('network origin cannot carry a token target override', () => {
  assert.throws(() => fixture({ apiOrigin: 'http://untrusted.example.com' }), { code: 'INVALID_ORIGIN' });
  assert.throws(() => fixture({ apiOrigin: 'https://example.com/other' }), { code: 'INVALID_ORIGIN' });
});

test('chapter credentials are bound per conversation and tool calls keep their original user message', async () => {
  const f = fixture();
  const pending = f.connect.beginLogin();
  await f.connect.completeLogin({ code: 'once', state: pending.state });
  await assert.rejects(f.execute('node_update', {}), { code: 'CHAPTER_NOT_OPEN' });
  await f.connect.openChapter('conversation-a', 'chapter-a');
  await assert.rejects(f.connect.openChapter('conversation-a', 'chapter-b'), { code: 'CHAPTER_ALREADY_BOUND' });
  await f.connect.openChapter('conversation-b', 'chapter-a');
  await f.connect.beginUserTurn('conversation-a', 'a-older');
  await f.connect.beginUserTurn('conversation-b', 'b-newer');
  await f.connect.execute('project_get', {}, { conversationId: 'conversation-a', userTurnId: 'a-older' });
  assert.equal(f.calls.at(-1).options.headers['X-Director-User-Turn'], 'a-older');
  assert.equal(f.calls.at(-1).options.headers.Authorization, 'Bearer private-child-conversation-a');
  await f.connect.execute('project_get', {}, { conversationId: 'conversation-b', userTurnId: 'b-newer' });
  assert.equal(f.calls.at(-1).options.headers.Authorization, 'Bearer private-child-conversation-b');
  assert.equal(JSON.stringify(await f.connect.conversation('conversation-a')).includes('private-child'), false);
});

test('concurrent opens cannot replace a conversation chapter locally', async () => {
  const f = fixture(); const pending = f.connect.beginLogin();
  await f.connect.completeLogin({ code: 'once', state: pending.state });
  const results = await Promise.allSettled([f.connect.openChapter('new-conversation', 'chapter-a'), f.connect.openChapter('new-conversation', 'chapter-b')]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[1].reason.code, 'CHAPTER_ALREADY_BOUND');
  assert.equal(f.calls.filter(call => call.url.endsWith('/conversations/open')).length, 1);
});


test('creation uses host conversation identity, never rebinds an existing chat, and returns a same-site editor URL', async () => {
  const f = fixture(); await f.login();
  await assert.rejects(f.connect.create('project', { title: '新工程', requestId: 'create' }, { conversationId: 'conversation-a' }), { code: 'CHAPTER_ALREADY_BOUND' });
  await assert.rejects(f.connect.create('chapter', { projectId: 'foreign', title: '新章' }, { conversationId: 'new-chat' }), { code: 'PROJECT_NOT_AUTHORIZED' });
  const value = await f.connect.create('chapter', { projectId: project, scriptId: 'script-a', title: '新章', requestId: 'new-chapter', expectedVersion: 2 }, { conversationId: 'new-chat' });
  const sent = f.calls.at(-1);
  assert.equal(JSON.parse(sent.options.body).conversationId, 'new-chat');
  assert.equal(sent.options.headers.Authorization, 'Bearer private-token');
  assert.equal(new URL(value.editorUrl).origin, 'https://www.example.com');
  assert.equal(new URL(value.editorUrl).searchParams.get('project'), project);
  await assert.rejects(f.connect.create('project', { title: '新工程', requestId: 'new', userId: 'override' }, { conversationId: 'new-chat' }), { code: 'INVALID_ARGUMENTS' });
});


test('shared library tools preserve server schema, chapter identity and mutation replay keys', async () => {
  const schema = { type: 'object', properties: { chapterId: { type: 'string' }, action: { enum: ['import'] } }, required: ['chapterId', 'action'] };
  const f = fixture({ extraTools: [
    { operation: 'library_list', inputSchema: { type: 'object' } },
    { operation: 'library_manage', inputSchema: schema },
    { operation: 'canvas_edit', inputSchema: { type: 'object' } },
    { operation: 'workspace_action', inputSchema: { type: 'object' } },
  ] });
  await f.login();
  const tools = (await f.connect.capabilities()).tools;
  assert.deepEqual(tools.map(t => t.operation), ['library_list', 'library_manage', 'canvas_edit', 'node_update']);
  assert.deepEqual(tools.find(t => t.operation === 'library_manage').inputSchema, schema);
  await f.execute('library_list', { chapterId: 'chapter-a' });
  const args = { chapterId: 'chapter-a', action: 'import', libraryResourceId: 'shared-person', resourceId: 'person-a', expectedVersion: 7, requestId: 'reuse-shared-person' };
  await f.execute('library_manage', args);
  const sent = f.calls.at(-1);
  assert.ok(sent.url.endsWith('/tools/library_manage'));
  assert.deepEqual(JSON.parse(sent.options.body), { ...args, projectId: project });
  assert.equal(sent.options.headers.Authorization, 'Bearer private-child-conversation-a');
  assert.equal(sent.options.headers['X-Director-User-Turn'], 'user-1');
  await assert.rejects(f.execute('library_manage', { ...args, projectId: 'foreign' }), { code: 'INVALID_ARGUMENTS' });
  await assert.rejects(f.execute('workspace_action', {}), { code: 'INVALID_OPERATION' });
  await assert.rejects(f.connect.openChapter('conversation-a', 'chapter-b'), { code: 'CHAPTER_ALREADY_BOUND' });
});
