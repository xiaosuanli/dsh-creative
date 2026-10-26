import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { apply } from '../host.mjs';

test('host registers isolated account UI RPC, installs tools after login and removes them on revoke', async () => {
  const values = new Map(), tools = new Map(), skills = [], effects = [];
  const routes = new Map();
  const handler = async (endpoint, payload) => {
    const route = routes.get('/api/xiaosuanli/' + endpoint);
    const response = await route.fetch(new Request('https://localhost/api/xiaosuanli/' + endpoint, { method: 'POST', body: JSON.stringify({ type: 'client-request', rpcId: 'test', method: 'xiaosuanli/' + endpoint, payload }) }));
    return (await response.json()).result;
  };
  const originalFetch = globalThis.fetch;
  const projectId = '11111111-1111-1111-1111-111111111111';
  globalThis.fetch = async url => ({ ok: true, json: async () => ({ code: 200, data:
    url.endsWith('/token') ? { clientId: 'xiaosuanli-dsh', channel: 'dsh', projectId, accessToken: 'secret', scopes: ['project:read'], expiresAt: new Date(Date.now() + 600000).toISOString() } :
    url.endsWith('/capabilities') ? { clientId: 'xiaosuanli-dsh', channel: 'dsh', projectId, tools: [{ operation: 'project_get', description: 'Read project', inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] } }] } : { revoked: true } }) });
  const ctx = {
    credentials: { readRecord: async key => values.get(key), modifyRecord: async (key, fn) => values.set(key, await fn(values.get(key))), deleteRecord: async key => values.delete(key) },
    tools: { register(definition) { tools.set(definition.name, definition); return () => tools.delete(definition.name); } },
    skills: { register(skill) { skills.push(skill); } },
    connection: { fetch: { register(route) { routes.set(route.path, route); return async () => {}; } } },
    effect(fn) { effects.push(fn()); }, on() {},
  };
  try {
    await apply(ctx, { siteOrigin: 'https://www.example.com', apiOrigin: 'https://api.example.com' });
    assert.ok([...routes.keys()].every(path => path.startsWith('/api/xiaosuanli/')));
    const invalid = await routes.get('/api/xiaosuanli/status').fetch(new Request('https://localhost/api/xiaosuanli/status', { method: 'POST', body: '{}' }));
    assert.equal(invalid.status, 400);
    const owner = { principal: { kind: 'owner' } };
    const begun = await handler('begin-login', {}, undefined, owner);
    const done = await handler('complete-login', { code: 'once', state: begun.value.state }, undefined, owner);
    assert.equal(done.ok, true);
    assert.equal(JSON.stringify(done).includes('secret'), false);
    assert.equal(skills[0].name, 'xiaosuanli-director');
    assert.ok(tools.has('xiaosuanli_project_get'));
    assert.equal(tools.get('xiaosuanli_project_get').parameters.properties.projectId, undefined);
    assert.ok(tools.has('xiaosuanli_open_chapter'));
    assert.ok(tools.has('xiaosuanli_chapters'));
    const revoked = await handler('disconnect', {}, undefined, owner);
    assert.equal(revoked.ok, true);
    assert.equal(tools.has('xiaosuanli_project_get'), false);
    assert.ok(tools.has('xiaosuanli_connection'));
  } finally { globalThis.fetch = originalFetch; }
});

test('client registers a floating launcher and settings; binds a chapter before opening a chat in the current workspace', async () => {
  const code = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  let module;
  runInNewContext(code, {
    window: { __ModuleLoader__: { load(value) { module = value; } } },
    document: { createElement: () => ({ remove() {} }), head: { appendChild() {} } },
  });
  const plugin = module.factory(name => { assert.equal(name, 'react'); return { createElement() {} }; });
  const slots = new Map(), effects = [], order = [];
  const ctx = {
    slots: { inject(_name, fn) { fn(); }, register(options) { slots.set(options.name, options); } },
    inputTriggers: { registerSource() { return () => {}; } },
    effect(fn) { effects.push(fn()); },
    sidebarRight: { mounted: { getSnapshot: () => 'current-conversation' } },
    workspaces: { list: { getSnapshot: () => ({ items: [{ workspaceId: 'workspace-a', sessionIds: ['current-conversation'] }] }) } },
    sessions: {
      list: { getSnapshot: () => ({ byId: { 'current-conversation': { cwd: '/example/project' } } }) },
      create: async options => { assert.deepEqual(JSON.parse(JSON.stringify(options)), { workspaceId: 'workspace-a' }); order.push('create'); return 'new-conversation'; },
    },
    uiWorkspace: { openSession: id => order.push('open:' + id) },
    connection: { rpc: { call: async (_path, method, payload) => {
      order.push(method); assert.equal(payload.conversationId, 'new-conversation');
      assert.equal(payload.projectId, 'project-a'); assert.equal(payload.chapterId, 'chapter-a');
      return { ok: true, value: { notice: 'open does not claim' } };
    } } },
  };
  plugin.apply(ctx);
  assert.equal(slots.get('settings.section').id, 'xiaosuanli');
  assert.equal(slots.has('sidebar.right.pane.tab'), false);
  const panel = slots.get('shell.overlay').inject();
  await panel.createChat('project-a', 'chapter-a');
  assert.deepEqual(order, ['create', 'xiaosuanli/open-chapter', 'open:new-conversation']);
  order.length = 0;
  ctx.connection.rpc.call = async () => ({ ok: false, error: { message: 'chapter unavailable' } });
  await assert.rejects(panel.createChat('project-a', 'chapter-a'), /chapter unavailable/);
  assert.deepEqual(order, ['create'], 'failed binding must not navigate or send a message');
});
