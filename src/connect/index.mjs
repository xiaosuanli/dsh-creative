import { createHash, randomBytes } from 'node:crypto';
import { ConnectError, origin, request } from './http.mjs';
import { operations } from './operations.mjs';
export { ConnectError } from './http.mjs';

// Store belongs to the host. get/set/delete handle JSON values in a private credential store.
export class DirectorConnect {
  #pending;
  #store;
  #fetch;
  #key;
  #client;
  #api;
  #site;
  #revision = 0;
  #loginExchange = false;
  #opening = new Map();

  constructor({ client, apiOrigin, siteOrigin, store, fetcher = fetch }) {
    if (!client?.id || !client?.channel || !store) throw new TypeError('Client identity and credential store are required');
    this.#client = Object.freeze({ ...client });
    this.#api = origin(apiOrigin);
    this.#site = origin(siteOrigin);
    this.#store = store;
    this.#fetch = fetcher;
    this.#key = 'director-' + createHash('sha256').update(JSON.stringify([this.#api, this.#site, client.id])).digest('hex');
  }

  beginLogin() {
    const verifier = randomBytes(32).toString('base64url');
    const state = randomBytes(24).toString('base64url');
    this.#pending = { verifier, state, expiresAt: Date.now() + 300000, revision: ++this.#revision };
    const url = new URL('/authorize/director', this.#site);
    url.search = new URLSearchParams({ clientId: this.#client.id, codeChallenge: createHash('sha256').update(verifier).digest('base64url'), codeChallengeMethod: 'S256', state }).toString();
    return { url: url.href, state, expiresAt: new Date(this.#pending.expiresAt).toISOString() };
  }

  async beginLoginPersisted() {
    const result = this.beginLogin();
    await this.#store.set(this.#key + '-pending-login', this.#pending);
    return result;
  }

  async completeLogin(input) {
    if (this.#loginExchange) throw new ConnectError('LOGIN_IN_PROGRESS', '授权正在兑换，请等待本次结果，不要重复提交');
    this.#loginExchange = true;
    try { return await this.#completeLogin(input); }
    finally { this.#loginExchange = false; }
  }

  async #completeLogin({ code, state }) {
    const pending = this.#pending ?? await this.#store.get(this.#key + '-pending-login');
    if (!this.#pending && pending) this.#revision = pending.revision;
    if (!pending || pending.state !== state || pending.expiresAt <= Date.now() || typeof code !== 'string' || !code.trim()) {
      throw new ConnectError('INVALID_LOGIN', '登录已过期或不匹配，请重新发起授权');
    }
    this.#pending = pending;
    let grant;
    try {
      grant = await request(this.#fetch, this.#api, '/api/subscriber/authorizations/token', {
        method: 'POST', body: { clientId: this.#client.id, code: code.trim(), codeVerifier: pending.verifier },
      });
    } catch (error) {
      if (pending.revision !== this.#revision) throw new ConnectError('LOGIN_CANCELLED', '登录已取消，请重新连接');
      if (['RESULT_UNKNOWN', 'INVALID_RESPONSE'].includes(error.code)) {
        pending.exchangeInterrupted = true;
        const persisted = await this.#store.get(this.#key + '-pending-login');
        if (persisted?.state === pending.state && pending.revision === this.#revision) {
          await this.#store.set(this.#key + '-pending-login', pending);
        }
        throw new ConnectError(error.code, '授权兑换中断，结果尚未确认；请先查询登录状态。未连接时可手动重试本次授权；若授权码已使用或过期，请重新发起授权。');
      }
      await this.#clearPendingLogin(pending);
      throw error;
    }
    if (pending.revision !== this.#revision) throw new ConnectError('LOGIN_CANCELLED', '登录已取消，请重新连接');
    try { this.#validateGrant(grant); }
    catch (error) { await this.#clearPendingLogin(pending); throw error; }
    const key = this.#key + '-' + (grant.projectId || 'account-' + grant.authorizationId);
    await this.#store.set(key, { ...grant, apiOrigin: this.#api, siteOrigin: this.#site });
    await this.#store.set(this.#key, { key });
    await this.#clearPendingLogin(pending);
    return this.status();
  }

  async #clearPendingLogin(pending) {
    if (pending.revision !== this.#revision || this.#pending?.state !== pending.state) return;
    this.#pending = undefined;
    const persisted = await this.#store.get(this.#key + '-pending-login');
    if (persisted?.state === pending.state && pending.revision === this.#revision) {
      await this.#store.delete(this.#key + '-pending-login');
    }
  }

  #validateGrant(grant) {
    if (grant?.clientId !== this.#client.id || grant?.channel !== this.#client.channel ||
        typeof grant.accessToken !== 'string' || !grant.accessToken || typeof grant.projectId !== 'string' ||
        !(grant.projectId === '' && grant.scopes?.includes('project:select') && typeof grant.authorizationId === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(grant.authorizationId) || /^[a-zA-Z0-9-]{1,80}$/.test(grant.projectId)) || !Array.isArray(grant.scopes) ||
        !Number.isFinite(Date.parse(grant.expiresAt)) || Date.parse(grant.expiresAt) <= Date.now()) {
      throw new ConnectError('INVALID_GRANT', '授权身份、渠道或有效期不匹配，请重新连接');
    }
  }

  async #grant() {
    const selection = await this.#store.get(this.#key);
    if (!selection || typeof selection.key !== 'string' || !selection.key.startsWith(this.#key + '-')) {
      throw new ConnectError('LOGIN_REQUIRED', '请先完成小算狸账号授权');
    }
    const grant = await this.#store.get(selection.key);
    this.#validateGrant(grant);
    if (grant.apiOrigin !== this.#api || grant.siteOrigin !== this.#site || selection.key !== this.#key + '-' + (grant.projectId || 'account-' + grant.authorizationId)) {
      throw new ConnectError('INVALID_GRANT', '授权服务或工程不匹配，请重新连接');
    }
    return grant;
  }

  async status() {
    try {
      const grant = await this.#grant();
      return { connected: true, clientId: grant.clientId, channel: grant.channel,
        projectId: grant.projectId, scopes: grant.scopes, expiresAt: grant.expiresAt };
    } catch (error) {
      if (!(error instanceof ConnectError)) throw error;
      if (error.code === 'LOGIN_REQUIRED') {
        const pending = this.#pending ?? await this.#store.get(this.#key + '-pending-login');
        if (pending?.expiresAt > Date.now()) {
          return { connected: false, clientId: this.#client.id, channel: this.#client.channel,
            reason: pending.exchangeInterrupted ? 'LOGIN_EXCHANGE_INTERRUPTED' : 'LOGIN_PENDING',
            state: pending.state, expiresAt: new Date(pending.expiresAt).toISOString(),
            message: pending.exchangeInterrupted
              ? '授权兑换结果未确认，可手动重试本次授权；若授权码已使用或过期，请重新发起授权。'
              : '授权尚未完成，请在网页确认后提交本次授权码。' };
        }
      }
      return { connected: false, clientId: this.#client.id, channel: this.#client.channel, reason: error.code };
    }
  }

  async account() {
    const grant = await this.#grant();
    return request(this.#fetch, this.#api, '/api/subscriber/account', { token: grant.accessToken });
  }

  async capabilities() {
    const grant = await this.#grant();
    const result = await request(this.#fetch, this.#api, '/api/subscriber/automated-director/capabilities', { token: grant.accessToken });
    if (result?.clientId !== grant.clientId || result.channel !== grant.channel || result.projectId !== grant.projectId || !Array.isArray(result.tools)) {
      throw new ConnectError('INVALID_CAPABILITIES', '服务能力与当前授权不匹配');
    }
    return { ...result, tools: result.tools.filter(tool => operations.has(tool.operation) && tool.inputSchema?.type === 'object') };
  }

  #conversationKey(conversationId) {
    if (typeof conversationId !== 'string' || !conversationId || conversationId.length > 128) throw new ConnectError('CONVERSATION_REQUIRED', '请在具体对话中打开章节');
    return this.#key + '-conversation-' + createHash('sha256').update(conversationId).digest('hex');
  }

  async #conversationGrant(conversationId) {
    const grant = await this.#store.get(this.#conversationKey(conversationId));
    if (!grant) throw new ConnectError('CHAPTER_NOT_OPEN', '请先在当前对话打开工程和章节');
    this.#validateGrant(grant);
    if (grant.conversationId !== conversationId || !grant.chapterId || grant.apiOrigin !== this.#api || grant.siteOrigin !== this.#site) throw new ConnectError('INVALID_GRANT', '对话的工程或章节绑定不匹配');
    return grant;
  }

  editorUrl(projectId) {
    const url = new URL('/apps/automated-director', this.#site);
    if (projectId) url.searchParams.set('project', projectId);
    return url.href;
  }

  async create(operation, input, { conversationId } = {}) {
    this.#conversationKey(conversationId);
    const existing = await this.#store.get(this.#conversationKey(conversationId));
    if (existing) throw new ConnectError('CHAPTER_ALREADY_BOUND', '当前对话已固定章节，请新建对话后创建');
    if (!['project', 'chapter'].includes(operation) || !input || typeof input !== 'object' || Array.isArray(input)) throw new ConnectError('INVALID_ARGUMENTS', '创建参数无效');
    const allowed = operation === 'project' ? ['title', 'requestId'] : ['projectId', 'scriptId', 'title', 'requestId', 'expectedVersion'];
    if (Object.keys(input).some(key => !allowed.includes(key))) throw new ConnectError('INVALID_ARGUMENTS', '创建请求不能覆盖身份或授权');
    const grant = await this.#grant();
    if (operation === 'chapter' && (!/^[a-zA-Z0-9-]{1,80}$/.test(input.projectId ?? '') || grant.projectId && grant.projectId !== input.projectId)) throw new ConnectError('PROJECT_NOT_AUTHORIZED', '请选择已授权工程');
    const suffix = operation === 'project' ? '/projects' : '/projects/' + input.projectId + '/chapters';
    const result = await request(this.#fetch, this.#api, '/api/subscriber/automated-director' + suffix, {
      token: grant.accessToken, method: 'POST', body: { ...input, conversationId },
    });
    return { ...result, editorUrl: this.editorUrl(result.project?.id || input.projectId), notice: '可在导演台网页中图形化调整；创建后请选择并打开章节' };
  }

  async projects() {
    const grant = await this.#grant();
    return request(this.#fetch, this.#api, '/api/subscriber/automated-director/projects', { token: grant.accessToken });
  }

  async chapters(projectId) {
    const grant = await this.#grant();
    projectId ||= grant.projectId;
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(projectId ?? '') || grant.projectId && grant.projectId !== projectId) throw new ConnectError('PROJECT_NOT_AUTHORIZED', '请选择已授权工程');
    return request(this.#fetch, this.#api, '/api/subscriber/automated-director/projects/' + projectId + '/chapters', { token: grant.accessToken });
  }

  async openChapter(conversationId, chapterId, projectId) {
    const key = this.#conversationKey(conversationId);
    const pending = (this.#opening.get(key) ?? Promise.resolve()).catch(() => {}).then(() => this.#openChapter(conversationId, chapterId, projectId));
    this.#opening.set(key, pending);
    try { return await pending; }
    finally { if (this.#opening.get(key) === pending) this.#opening.delete(key); }
  }

  async #openChapter(conversationId, chapterId, projectId) {
    const key = this.#conversationKey(conversationId);
    const existing = await this.#store.get(key);
    if (existing) {
      if (existing.chapterId !== chapterId || projectId && existing.projectId !== projectId) throw new ConnectError('CHAPTER_ALREADY_BOUND', '当前对话已固定到另一章节，请新建对话');
      return this.conversation(conversationId);
    }
    const parent = await this.#grant();
    const grant = await request(this.#fetch, this.#api, '/api/subscriber/automated-director/conversations/open', {
      token: parent.accessToken, method: 'POST', body: { conversationId, chapterId, projectId: projectId || parent.projectId },
    });
    this.#validateGrant(grant);
    if (grant.projectId !== (projectId || parent.projectId) || grant.chapterId !== chapterId || grant.conversationId !== conversationId) throw new ConnectError('INVALID_GRANT', '服务端对话绑定不匹配');
    await this.#store.set(key, { ...grant, apiOrigin: this.#api, siteOrigin: this.#site });
    return this.conversation(conversationId);
  }

  async conversation(conversationId) {
    const grant = await this.#conversationGrant(conversationId);
    const state = await request(this.#fetch, this.#api, '/api/subscriber/automated-director/capabilities', { token: grant.accessToken });
    if (state.projectId !== grant.projectId || state.chapterId !== grant.chapterId || state.sessionId !== grant.authorizationId) throw new ConnectError('INVALID_CAPABILITIES', '对话状态与固定章节不匹配');
    return { connected: true, clientId: grant.clientId, channel: grant.channel, projectId: grant.projectId,
      chapterId: grant.chapterId, conversationId, editorUrl: this.editorUrl(grant.projectId), canWrite: state.canWrite === true, userTurnId: state.userTurnId,
      notice: state.canWrite ? '当前对话拥有操作权' : '打开不会接管；在此对话发送新消息后接管章节，旧消息的写入会被拒绝' };
  }

  async beginUserTurn(conversationId, userTurnId) {
    if (typeof userTurnId !== 'string' || !userTurnId || userTurnId.length > 128) throw new ConnectError('USER_TURN_REQUIRED', '缺少真实用户消息标识');
    let grant;
    try { grant = await this.#conversationGrant(conversationId); }
    catch (error) { if (error.code !== 'CHAPTER_NOT_OPEN') throw error; grant = await this.#grant(); }
    return request(this.#fetch, this.#api, '/api/subscriber/automated-director/conversations/user-turn', {
      token: grant.accessToken, method: 'POST', body: { userTurnId, conversationId },
    });
  }

  async execute(operation, args, { signal, conversationId, userTurnId } = {}) {
    if (!operations.has(operation) || !args || typeof args !== 'object' || Array.isArray(args)) {
      throw new ConnectError('INVALID_OPERATION', '不支持的导演操作');
    }
    const grant = await this.#conversationGrant(conversationId);
    if ((args.projectId !== undefined && args.projectId !== grant.projectId) ||
        ['userId', 'clientId', 'channel', 'conversationId', 'userTurnId', 'billing', 'token', 'url'].some(key => key in args)) {
      throw new ConnectError('INVALID_ARGUMENTS', '只能操作当前授权工程，身份与计费由服务端确定');
    }
    return request(this.#fetch, this.#api, '/api/subscriber/automated-director/tools/' + operation, {
      method: 'POST', token: grant.accessToken, body: { ...args, projectId: grant.projectId }, signal, userTurnId,
    });
  }

  async disconnect() {
    ++this.#revision;
    this.#pending = undefined;
    await this.#store.delete(this.#key + '-pending-login');
    const selection = await this.#store.get(this.#key);
    if (!selection) return { connected: false };
    let grant;
    try { grant = await this.#grant(); }
    catch (error) { if (!(error instanceof ConnectError)) throw error; }
    if (grant) {
      try { await request(this.#fetch, this.#api, '/api/subscriber/authorizations/current', { method: 'DELETE', token: grant.accessToken }); }
      catch (error) { if (error.code !== 401) throw error; }
    }
    if (typeof selection.key === 'string' && selection.key.startsWith(this.#key + '-')) await this.#store.delete(selection.key);
    await this.#store.delete(this.#key);
    return { connected: false };
  }
}
