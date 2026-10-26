import { ConnectError } from './http.mjs';

const resourceSections = { character: '人物', prop: '物品', scene: '场景', prompt: '文档' };
const rows = value => Array.isArray(value) ? value : [];

// Discovery uses the conversation's existing chapter grant. It never opens a
// chapter, claims a user turn, uploads media or invokes a writing operation.
export async function chapterReferences(connect, conversationId, query = '', signal) {
  if (typeof conversationId !== 'string' || !conversationId || conversationId.length > 128 || typeof query !== 'string') {
    throw new ConnectError('INVALID_REFERENCE_QUERY', '请从当前聊天选择章节引用');
  }
  signal?.throwIfAborted();
  let context;
  try { context = await connect.conversation(conversationId); }
  catch (error) {
    if (['LOGIN_REQUIRED', 'CHAPTER_NOT_OPEN', 'GRANT_EXPIRED'].includes(error.code)) return { bound: false, items: [] };
    throw error;
  }
  signal?.throwIfAborted();
  const view = await connect.execute('project_get', { scope: 'full' }, { conversationId, signal });
  signal?.throwIfAborted();
  const document = view.document;
  if (view.project?.id !== context.projectId || !document || document.currentChapterId !== context.chapterId) {
    throw new ConnectError('REFERENCE_SCOPE_MISMATCH', '章节内容已变化，请重新读取当前章节');
  }
  const groups = new Set(rows(document.resourceGroups).filter(row => row.chapterId === context.chapterId).map(row => row.id));
  const acts = rows(document.acts).filter(row => row.chapterId === context.chapterId);
  const actIds = new Set(acts.map(row => row.id));
  const items = [];
  const add = (row, kind, section, name, resourceKind) => {
    if (typeof row.id !== 'string' || !row.id) return;
    items.push({ conversationId, projectId: context.projectId, chapterId: context.chapterId,
      kind, id: row.id, name: typeof name === 'string' && name.trim() ? name : row.id, section,
      ...(resourceKind ? { resourceKind } : {}) });
  };
  for (const [kind, section] of Object.entries(resourceSections)) {
    for (const row of rows(document.resources)) {
      if (row.kind === kind && groups.has(row.groupId)) add(row, 'resource', section, row.name, kind);
    }
  }
  for (const row of rows(document.videoNodes)) if (actIds.has(row.actId)) add(row, 'video', '视频节点', row.title);
  for (const row of acts) add(row, 'act', '幕节点', row.title);
  const search = query.trim().toLocaleLowerCase();
  return { bound: true, projectId: context.projectId, chapterId: context.chapterId,
    items: items.filter(item => !search || [item.name, item.id, item.section].some(value => value.toLocaleLowerCase().includes(search))) };
}
