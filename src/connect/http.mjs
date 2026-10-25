export class ConnectError extends Error {
  constructor(code, message, data) {
    super(message);
    this.name = 'ConnectError';
    this.code = code;
    this.data = data;
  }
}

export function origin(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new ConnectError('INVALID_ORIGIN', '请配置 HTTPS 服务地址；本地开发可使用 localhost HTTP');
  }
  return url.origin;
}

export async function request(fetcher, base, path, { token, body, method = 'GET', signal, userTurnId } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (userTurnId) headers['X-Director-User-Turn'] = userTurnId;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    const timeout = AbortSignal.timeout(60000);
    response = await fetcher(base + path, { method, headers, redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch {
    throw new ConnectError('RESULT_UNKNOWN', '连接中断。写操作可能已接受，请按原任务或原 requestId 查询，不要重复生成');
  }
  let envelope;
  try { envelope = await response.json(); }
  catch { throw new ConnectError('INVALID_RESPONSE', '服务响应不可读取，请稍后查询原请求'); }
  if (!response.ok || envelope.code !== 200) {
    const code = envelope.code ?? response.status;
    const fallback = code === 401 ? '登录已失效，请重新连接小算狸' :
      code === 403 ? '当前授权不允许此操作，请检查工程与权限' :
      code === 409 ? '工程版本或请求发生冲突，请读取当前状态后继续' :
      code === 402 ? '可用积分不足，请在小算狸账户中查看' : '小算狸服务暂未完成请求，请查询原任务后重试';
    let message = code >= 400 && code < 500 && typeof envelope.message === 'string' ? envelope.message : fallback;
    if (token) message = message.split(token).join('[redacted]');
    message = message.replace(/https?:\/\/\S+/g, '[service address]').slice(0, 500);
    throw new ConnectError(code, message || fallback, envelope.data);
  }
  return envelope.data;
}
