import { readFile } from 'node:fs/promises';
import z from '@deepseek-ai/schemastery';
import { credentialKey } from '@deepseek-ai/dsh-credentials';
import { DirectorConnect, ConnectError } from './src/connect/index.mjs';
import { chapterReferences } from './src/connect/references.mjs';

export const name = 'xiaosuanli-connect';
export const inject = ['connection', 'credentials', 'tools', 'skills'];
export const Config = z.object({
  siteOrigin: z.string().default('https://www.xiaosuanli.com'),
  apiOrigin: z.string().default('https://api.xiaosuanli.com'),
});

const output = { schema: {}, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] };
const empty = { type: 'object', properties: {}, additionalProperties: false };

export async function apply(ctx, config) {
  const key = id => credentialKey(name, id);
  const connect = new DirectorConnect({
    client: { id: 'xiaosuanli-dsh', channel: 'dsh' },
    apiOrigin: config.apiOrigin, siteOrigin: config.siteOrigin,
    store: {
      async get(id) { const record = await ctx.credentials.readRecord(key(id)); return record?.kind === 'grant' ? record.payload : undefined; },
      async set(id, payload) { await ctx.credentials.modifyRecord(key(id), () => ({ kind: 'grant', payload })); },
      async delete(id) { await ctx.credentials.deleteRecord(key(id)); },
    },
  });
  // Capture the real user-message identity at tool-call time. A later message
  // must never lend its write authority to an older, still-running tool call.
  const messages = new Map(), calls = new Map(), turns = new Map(), currentTurns = new Map();
  let claims = Promise.resolve(), messageOrder = 0;
  const chapterMessages = new Map();
  const claim = (step, retryAfterOpen = false) => {
    if (step.claim && !retryAfterOpen) return step.claim;
    step.claim = claims.catch(() => {}).then(async () => {
      if (messages.get(step.conversationId) !== step) throw new ConnectError('USER_MESSAGE_REPLACED', '已有新的用户消息，旧操作已停止');
      try {
        const state = await connect.conversation(step.conversationId);
        const chapterKey = state.projectId + '/' + state.chapterId;
        if ((chapterMessages.get(chapterKey) ?? 0) > step.order) throw new ConnectError('USER_MESSAGE_REPLACED', '本章已有更新的用户消息，请发送新消息后继续');
        chapterMessages.set(chapterKey, step.order);
        return await connect.beginUserTurn(step.conversationId, step.userTurnId);
      }
      catch (error) { if (error.code === 'CHAPTER_NOT_OPEN') return connect.beginUserTurn(step.conversationId, step.userTurnId); throw error; }
    });
    claims = step.claim.catch(() => {});
    return step.claim;
  };
  ctx.on('session/event', (session, event) => {
    if (event.type === 'turn/start') {
      currentTurns.set(session.id, event.data.turn);
      const step = messages.get(session.id);
      if (step) turns.set(session.id + '/' + event.data.turn, step);
    } else if (event.type === 'user/message' && event.data?.source?.kind === 'user') {
      const step = { conversationId: session.id, userTurnId: event.data.id, order: ++messageOrder };
      messages.set(session.id, step);
      turns.set(session.id + '/' + currentTurns.get(session.id), step);
      void claim(step).catch(() => {});
    } else if (event.type === 'tool/call') {
      const step = turns.get(session.id + '/' + event.data.turn);
      if (step) calls.set(session.id + '/' + event.data.callId, step);
    } else if (event.type === 'tool/result') calls.delete(session.id + '/' + event.data?.message?.toolCallId);
  });
  const turn = exec => {
    const step = calls.get(exec.agent?.session.id + '/' + exec.callId);
    if (!step) throw new ConnectError('USER_TURN_REQUIRED', '请在当前对话发送消息后操作章节');
    if (messages.get(step.conversationId) !== step) throw new ConnectError('USER_MESSAGE_REPLACED', '已有新消息，旧消息的操作不能继续');
    return step;
  };
  const text = await readFile(new URL('./skills/xiaosuanli-director/SKILL.md', import.meta.url), 'utf8');
  const importGuide = await readFile(new URL('./skills/xiaosuanli-director/references/import-and-remake.md', import.meta.url), 'utf8');
  const workflow = await readFile(new URL('./skills/xiaosuanli-director/references/director-workflow.md', import.meta.url), 'utf8');
  ctx.skills.register({ name: 'xiaosuanli-director', source: 'bundled',
    description: '操作已授权的小算狸工程：剧情、节点、素材、图片、视频与成片。',
    content: text.replace(/^---\n[\s\S]*?\n---\n/, '') + '\n\n' + workflow + '\n\n' + importGuide });
  ctx.tools.register({ name: 'xiaosuanli_connection', description: '读取小算狸连接状态与已授权工程；未连接时请用户打开设置中的小算狸面板。', parameters: empty, output,
    async execute(_args, exec) {
      try { return await connect.conversation(exec.agent?.session.id); }
      catch (error) {
        if (!['CHAPTER_NOT_OPEN', 'CONVERSATION_REQUIRED'].includes(error.code)) throw error;
        return { ...await connect.status(), chapterOpen: false, notice: '请先列出并打开当前对话要操作的章节' };
      }
    } });
  ctx.tools.register({ name: 'xiaosuanli_account', description: '查看已授权的小算狸账号、会员、额度与积分。', parameters: empty, output,
    execute: () => connect.account() });
  for (const operation of ['project', 'chapter']) {
    const properties = { title: { type: 'string' }, requestId: { type: 'string' } };
    if (operation === 'chapter') Object.assign(properties, { projectId: { type: 'string' }, scriptId: { type: 'string' }, expectedVersion: { type: 'integer' } });
    ctx.tools.register({ name: 'xiaosuanli_create_' + operation,
      description: operation === 'project' ? '用户要求时创建工程，附带空白第一章。仅未绑定章节的对话可用，不提交生成。' : '用户要求时在指定工程和剧本创建空白章节。不改变旧对话绑定，不解析或生成。',
      parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false }, output,
      execute: (args, exec) => { const step = turn(exec); return connect.create(operation, args, { conversationId: step.conversationId }); },
    });
  }
  ctx.tools.register({ name: 'xiaosuanli_projects', description: '初始化：列出已授权工程供用户选择，不改变当前对话绑定。', parameters: empty, output, execute: () => connect.projects() });
  ctx.tools.register({ name: 'xiaosuanli_chapters', description: '列出当前已连接工程的章节目录；不读取其它章节正文，不改变当前对话。', parameters: { type: 'object', properties: { projectId: { type: 'string' } }, additionalProperties: false }, output, execute: args => connect.chapters(args.projectId) });
  ctx.tools.register({ name: 'xiaosuanli_open_chapter', description: '为当前对话打开并固定一个章节；同一对话不能换章。不同对话可打开同一章，最后一条真实用户消息拥有操作权。先等待打开成功再调用业务工具。',
    parameters: { type: 'object', properties: { projectId: { type: 'string' }, chapterId: { type: 'string' } }, required: ['chapterId'], additionalProperties: false }, output,
    async execute(args, exec) {
      const step = turn(exec);
      await connect.openChapter(step.conversationId, args.chapterId, args.projectId);
      await claim(step, true);
      return connect.conversation(step.conversationId);
    } });

  let disposed = false;
  let registrations = [];
  let serial = Promise.resolve();
  const clearTools = () => { for (const dispose of registrations) dispose(); registrations = []; };
  const syncTools = async () => {
    clearTools();
    const state = await connect.status();
    if (!state.connected || disposed) return;
    const capabilities = await connect.capabilities();
    if (disposed) return;
    for (const tool of capabilities.tools) {
      const parameters = structuredClone(tool.inputSchema);
      if (parameters.properties?.projectId) {
        delete parameters.properties.projectId;
        parameters.required = (parameters.required ?? []).filter(key => key !== 'projectId');
      }
      registrations.push(ctx.tools.register({ name: 'xiaosuanli_' + tool.operation, description: tool.description, parameters, output,
        async execute(args, exec) {
          const step = turn(exec);
          await claim(step);
          return connect.execute(tool.operation, args, { signal: exec.signal, conversationId: step.conversationId, userTurnId: step.userTurnId });
        },
      }));
    }
  };
  const enqueue = fn => {
    const task = serial.then(fn);
    serial = task.catch(() => {});
    return task;
  };
  const dispatch = async (endpoint, payload, signal) => {
    try {
      // Candidate reads must not queue behind a login exchange or a write.
      if (endpoint === 'references') return { ok: true, value: await chapterReferences(connect, payload?.conversationId, payload?.query, signal) };
      const value = await enqueue(async () => {
        switch (endpoint) {
          case 'status': return connect.status();
          case 'account': return connect.account();
          case 'projects': return connect.projects();
          case 'chapters': return connect.chapters(payload?.projectId);
          case 'conversation': return connect.conversation(payload?.conversationId);
          case 'open-chapter': return connect.openChapter(payload?.conversationId, payload?.chapterId, payload?.projectId);
          case 'begin-login': return connect.beginLogin();
          case 'complete-login': {
            if (!payload || typeof payload.code !== 'string' || payload.code.length > 128 || typeof payload.state !== 'string') throw new ConnectError('INVALID_LOGIN', '请填写当前登录的一次性授权码');
            const result = await connect.completeLogin(payload);
            await syncTools();
            return result;
          }
          case 'refresh': await syncTools(); return connect.status();
          case 'disconnect': { const result = await connect.disconnect(); clearTools(); return result; }
          default: throw new ConnectError('NOT_FOUND', '不支持的账户操作');
        }
      });
      return { ok: true, value };
    } catch (error) {
      return { ok: false, error: { code: String(error instanceof ConnectError ? error.code : 'UNAVAILABLE'),
        message: error instanceof ConnectError ? error.message : '小算狸连接暂不可用，请稍后重试', details: {} } };
    }
  };
  // Exact Connection Fetch routes are owner-only and share the Host's authenticated carrier.
  for (const endpoint of ['status', 'account', 'projects', 'chapters', 'conversation', 'references', 'open-chapter', 'begin-login', 'complete-login', 'refresh', 'disconnect']) {
    ctx.connection.fetch.register({ path: '/api/xiaosuanli/' + endpoint, methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        let message;
        try {
          const raw = await request.text();
          if (raw.length > 2048) return new Response('request too large', { status: 413 });
          message = JSON.parse(raw);
        } catch { return new Response('invalid request', { status: 400 }); }
        if (message?.type !== 'client-request' || typeof message.rpcId !== 'string' || message.rpcId.length > 128 || message.method !== 'xiaosuanli/' + endpoint) {
          return new Response('invalid request envelope', { status: 400 });
        }
        return Response.json({ type: 'server-response', rpcId: message.rpcId, result: await dispatch(endpoint, message.payload, request.signal) });
      },
    });
  }
  ctx.on('dispose', () => { disposed = true; clearTools(); });
  // Network unavailability should leave the login panel usable.
  await syncTools().catch(() => {});
}
