import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { chapterReferences } from '../src/connect/references.mjs';

const fixture = () => ({ project: { id: 'project' }, document: {
  currentChapterId: 'chapter',
  resourceGroups: [{ id: 'group', chapterId: 'chapter' }, { id: 'foreign-group', chapterId: 'other' }],
  resources: [
    { id: 'person-1', groupId: 'group', kind: 'character', name: '主角', description: 'private story', reference: { url: 'https://private.example/image' } },
    { id: 'person-2', groupId: 'group', kind: 'character', name: '主角' },
    { id: 'prop', groupId: 'group', kind: 'prop', name: '怀表' },
    { id: 'scene', groupId: 'group', kind: 'scene', name: '码头' },
    { id: 'doc', groupId: 'group', kind: 'prompt', name: '对白要求' },
    { id: 'foreign-person', groupId: 'foreign-group', kind: 'character', name: '另一章秘密人物' },
  ],
  acts: [{ id: 'act', chapterId: 'chapter', title: '第一幕' }, { id: 'foreign-act', chapterId: 'other', title: '另一章秘密幕' }],
  videoNodes: [{ id: 'video', actId: 'act', title: '镜头一' }, { id: 'foreign-video', actId: 'foreign-act', title: '另一章秘密镜头' }],
} });

test('reference discovery projects only the bound chapter, stable IDs and display metadata without claiming a turn', async () => {
  const calls = [], signal = new AbortController().signal;
  const connect = {
    async conversation(id) { calls.push(['context', id]); return { projectId: 'project', chapterId: 'chapter' }; },
    async execute(operation, args, context) { calls.push([operation, args, context]); return fixture(); },
  };
  const result = await chapterReferences(connect, 'chat', '', signal);
  assert.deepEqual(result.items.map(item => item.id), ['person-1', 'person-2', 'prop', 'scene', 'doc', 'video', 'act']);
  assert.equal(result.items.filter(item => item.name === '主角').length, 2);
  assert.ok(result.items.every(item => item.projectId === 'project' && item.chapterId === 'chapter' && item.conversationId === 'chat'));
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(JSON.stringify(result).includes('另一章'), false);
  assert.deepEqual(calls, [['context', 'chat'], ['project_get', { scope: 'full' }, { conversationId: 'chat', signal }]]);
  assert.deepEqual((await chapterReferences(connect, 'chat', '对白')).items.map(item => item.id), ['doc']);
  assert.deepEqual((await chapterReferences(connect, 'chat', '视频节点')).items.map(item => item.id), ['video']);
});

test('unbound chats, revoked access, mismatched projection and cancellation do not expose candidates', async () => {
  assert.deepEqual(await chapterReferences({ conversation: async () => { throw Object.assign(new Error(), { code: 'CHAPTER_NOT_OPEN' }); } }, 'chat'), { bound: false, items: [] });
  await assert.rejects(chapterReferences({ conversation: async () => { throw Object.assign(new Error('denied'), { code: 401 }); } }, 'chat'), /denied/);
  const connect = { conversation: async () => ({ projectId: 'wrong-project', chapterId: 'chapter' }), execute: async () => fixture() };
  await assert.rejects(chapterReferences(connect, 'chat'), error => error.code === 'REFERENCE_SCOPE_MISMATCH');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(chapterReferences({}, 'chat', '', controller.signal), { name: 'AbortError' });
});

async function referenceClient(call) {
  let module, source, disposed = false;
  runInNewContext(await readFile(new URL('../client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(value) { module = value; } } },
    document: { createElement: () => ({ remove() {} }), head: { appendChild() {} } },
  });
  const effects = [];
  module.factory(() => ({ createElement() {} })).apply({
    effect(fn) { effects.push(fn()); }, connection: { rpc: { call } },
    inputTriggers: { registerSource(value) { source = value; return () => { disposed = true; }; } },
    slots: { inject(_name, fn) { fn(); }, register() {} },
  });
  return { source, dispose() { effects.forEach(fn => fn?.()); return disposed; } };
}

test('native @ source binds the requested chat and serializes selected IDs without browsing or writing', async () => {
  const item = { conversationId: 'chat', projectId: 'project', chapterId: 'chapter', kind: 'resource', id: 'person-2', name: '同名人物', section: '人物' };
  const calls = [], signal = new AbortController().signal;
  const client = await referenceClient(async (...args) => { calls.push(args); return { ok: true, value: { items: [item] } }; });
  const { source } = client;
  assert.equal(source.trigger, '@'); assert.equal(source.name, 'xiaosuanli');
  const candidates = await source.candidates({ sessionId: 'chat' }, { query: '同名', signal });
  assert.equal(candidates[0].section, '小算狸 · 人物');
  assert.equal(calls[0][1], 'xiaosuanli/references');
  assert.equal(calls[0][2].conversationId, 'chat'); assert.equal(calls[0][3], signal);
  assert.equal(source.onPick({ candidate: candidates[0], session: { sessionId: 'other-chat' } }), undefined);
  const { insert } = source.onPick({ candidate: candidates[0], session: { sessionId: 'chat' } });
  assert.equal(insert.label, item.name);
  const expected = { projectId: 'project', chapterId: 'chapter', kind: 'resource', id: 'person-2', name: '同名人物' };
  assert.deepEqual(JSON.parse(insert.ref), expected);
  assert.equal(source.codec.clipboardText(insert.ref), insert.clipboardText);
  assert.equal(await source.codec.serialize(insert.ref), '【小算狸章节引用】' + JSON.stringify(expected));
  assert.equal(calls.length, 1, 'pick and serialization must not perform writes or read another chat');
  assert.equal(client.dispose(), true);
});

test('superseded candidates and quoted file tokens leave the native file/session source alone', async () => {
  const controller = new AbortController();
  let calls = 0;
  const { source } = await referenceClient(async () => { calls++; controller.abort(); return { ok: true, value: { items: [] } }; });
  const quoted = await source.candidates({ sessionId: 'chat' }, { quoted: true, query: 'file', signal: controller.signal });
  assert.equal(quoted.length, 0); assert.equal(calls, 0);
  const result = await source.candidates({ sessionId: 'chat' }, { query: '', signal: controller.signal });
  assert.equal(result.length, 0);
  assert.equal(calls, 1);
});
