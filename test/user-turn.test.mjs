import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../host.mjs';

test('native user messages claim ownership; reads, reopening and old tool calls cannot reclaim', async () => {
  const records = new Map(), tools = new Map(), routes = new Map(), events = new Map();
  const children = new Map(), claims = [], writes = [];
  const originalFetch = globalThis.fetch;
  const identity = { clientId: 'xiaosuanli-dsh', channel: 'dsh', projectId: 'project-a',
    scopes: ['project:read', 'project:write'], expiresAt: new Date(Date.now() + 600000).toISOString() };
  const definitions = [{ operation: 'node_update', description: 'Edit', inputSchema: { type: 'object', properties: {} } }];
  globalThis.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    const token = options.headers?.Authorization?.replace('Bearer ', '');
    const child = children.get(token);
    let data;
    if (url.endsWith('/token')) data = { ...identity, accessToken: 'parent' };
    else if (url.endsWith('/conversations/open')) {
      data = { ...identity, authorizationId: body.conversationId, accessToken: 'child-' + body.conversationId, ...body };
      children.set(data.accessToken, data);
    } else if (url.endsWith('/capabilities')) data = { ...identity, tools: definitions,
      ...(child ? { chapterId: child.chapterId, sessionId: child.authorizationId } : {}) };
    else if (url.endsWith('/conversations/user-turn')) {
      if (child) claims.push([child.conversationId, body.userTurnId]); data = { canWrite: !!child };
    } else if (url.includes('/tools/')) { writes.push(options.headers['X-Director-User-Turn']); data = {}; }
    else throw Error('Unexpected route ' + url);
    return { ok: true, json: async () => ({ code: 200, data }) };
  };
  const ctx = {
    credentials: { readRecord: async k => records.get(k), modifyRecord: async (k, fn) => records.set(k, await fn(records.get(k))), deleteRecord: async k => records.delete(k) },
    tools: { register(def) { tools.set(def.name, def); return () => tools.delete(def.name); } },
    skills: { register() {} },
    connection: { fetch: { register(route) { routes.set(route.path, route); } } },
    on(name, fn) { events.set(name, fn); },
  };
  const rpc = async (name, payload) => {
    const result = await routes.get('/api/xiaosuanli/' + name).fetch(new Request('https://localhost', {
      method: 'POST', body: JSON.stringify({ type: 'client-request', rpcId: 'r', method: 'xiaosuanli/' + name, payload }),
    }));
    const envelope = (await result.json()).result;
    assert.equal(envelope.ok, true, JSON.stringify(envelope)); return envelope.value;
  };
  const emit = (id, type, data) => events.get('session/event')({ id }, { type, data });
  const message = (id, turn, userId, kind = 'user') => {
    emit(id, 'turn/start', { turn }); emit(id, 'user/message', { id: userId, source: { kind } });
  };
  const call = (id, turn, callId, name = 'xiaosuanli_node_update', args = {}) => {
    emit(id, 'tool/call', { turn, callId, name });
    return tools.get(name).execute(args, { agent: { session: { id } }, callId });
  };
  try {
    await apply(ctx, { siteOrigin: 'https://www.example.com', apiOrigin: 'https://api.example.com' });
    const login = await rpc('begin-login'); await rpc('complete-login', { code: 'once', state: login.state });
    await rpc('open-chapter', { conversationId: 'a', chapterId: 'chapter-a' });
    await rpc('open-chapter', { conversationId: 'b', chapterId: 'chapter-a' });
    assert.deepEqual(claims, []);
    message('a', 1, 'a1'); await call('a', 1, 'a-call-1');
    message('b', 1, 'b1'); await call('b', 1, 'b-call-1');
    await rpc('open-chapter', { conversationId: 'a', chapterId: 'chapter-a' });
    await rpc('conversation', { conversationId: 'a' });
    assert.deepEqual(claims, [['a', 'a1'], ['b', 'b1']]);
    message('a', 2, 'a2'); await call('a', 2, 'a-call-2');
    // Even a tool/call event arriving after a2 must keep the old turn's a1.
    await assert.rejects(call('a', 1, 'late-a1'), /旧消息|旧操作/);
    message('a', 3, 'auto', 'goal'); await call('a', 3, 'goal-call');
    assert.deepEqual(claims, [['a', 'a1'], ['b', 'b1'], ['a', 'a2']]);
    assert.deepEqual(writes, ['a1', 'b1', 'a2', 'a2']);
    await assert.rejects(call('a', 999, 'unknown-turn'), /发送消息/);
    // A slow open requested by an earlier message must not overtake a later chat.
    message('c', 1, 'c1');
    message('b', 2, 'b2'); await call('b', 2, 'b-call-2');
    await assert.rejects(call('c', 1, 'slow-open', 'xiaosuanli_open_chapter', { chapterId: 'chapter-a' }), /更新的用户消息/);
    assert.deepEqual(claims.at(-1), ['b', 'b2']);
    assert.equal(claims.some(([conversation]) => conversation === 'c'), false);
  } finally { globalThis.fetch = originalFetch; }
});
