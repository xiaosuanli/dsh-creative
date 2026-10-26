import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const login = { url: 'https://www.example.com/authorize/director?state=test', state: 'test' };
const code = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const text = node => typeof node === 'string' ? node : (node?.props?.children || []).map(text).join('');
const find = (node, predicate) => !node || typeof node !== 'object' ? undefined :
  predicate(node) ? node : (node.props?.children || []).map(child => find(child, predicate)).find(Boolean);

async function account({ desktop = true, open = () => null, begin = async () => login, clipboard } = {}) {
  const values = [], effects = [], calls = [];
  let index = 0, mounted = false, module, component, props;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) {
      const key = index++;
      if (!(key in values)) values[key] = initial;
      return [values[key], value => { values[key] = typeof value === 'function' ? value(values[key]) : value; }];
    },
    useRef(initial) {
      const key = index++;
      if (!(key in values)) values[key] = { current: initial };
      return values[key];
    },
    useEffect(effect) { if (!mounted) effects.push(effect); },
  };
  runInNewContext(code, { URL, navigator: { clipboard },
    window: { location: { protocol: desktop ? 'dsh-app:' : 'https:' }, open,
      __ModuleLoader__: { load(value) { module = value; } } },
    document: { createElement: () => ({ remove() {} }), head: { appendChild() {} } },
  });
  module.factory(() => React).apply({
    effect(fn) { fn(); },
    connection: { rpc: { async call(_channel, method, payload) {
      calls.push({ method, payload });
      return { ok: true, value: method.endsWith('/begin-login') ? await begin() : { connected: false } };
    } } },
    slots: { inject(_name, fn) { fn(); }, register(options, view) {
      if (options.name === 'settings.section') { component = view; props = options.inject(); }
    } },
  });
  const render = () => { index = 0; const node = component(props); mounted = true; return node; };
  render();
  for (const effect of effects) effect();
  await new Promise(resolve => setImmediate(resolve));
  return { render, calls,
    button(label) {
      const button = find(render(), node => node.type === 'button' && text(node) === label);
      assert.ok(button, `Missing button: ${label}`);
      return button;
    },
  };
}

test('Desktop login requests the returned HTTPS URL and retains a fallback when Electron returns no window', async () => {
  const opened = [];
  const ui = await account({ open: (...args) => { opened.push(args); return null; } });
  await ui.button('登录并连接小算狸').props.onClick();
  assert.equal(opened.length, 1, 'login click must request a browser, not merely show an anchor');
  assert.equal(opened[0][0], login.url);
  assert.ok(opened[0][2].includes('noopener'));
  assert.ok(text(ui.render()).includes('复制授权链接'));
  assert.ok(text(ui.render()).includes('已请求打开'));
  await ui.button('打开小算狸登录与授权页面').props.onClick();
  assert.equal(opened.length, 2);
  assert.equal(ui.calls.filter(call => call.method.endsWith('/begin-login')).length, 1, 'retry must reuse the same authorization');
});

test('Web login opens a tab during the click before awaiting RPC and clears its opener', async () => {
  let resolveLogin;
  const request = new Promise(resolve => { resolveLogin = resolve; });
  const order = [], popup = { opener: 'parent', closed: false, location: { replace: url => order.push(url) }, close() {} };
  const ui = await account({ desktop: false, open: url => { order.push(url); return popup; }, begin: () => request });
  const pending = ui.button('登录并连接小算狸').props.onClick();
  assert.equal(order[0], 'about:blank');
  assert.equal(popup.opener, null);
  resolveLogin(login);
  await pending;
  assert.deepEqual(order, ['about:blank', login.url]);
});

test('failed browser and clipboard access keep the authorization available for manual copying', async () => {
  const ui = await account({ open() { throw new Error('blocked'); }, clipboard: { async writeText() { throw new Error('denied'); } } });
  await ui.button('登录并连接小算狸').props.onClick();
  const field = find(ui.render(), node => node.type === 'input' && node.props.value === login.url);
  assert.ok(field, 'the full URL must remain selectable even if both APIs fail');
  assert.equal(field.props.readOnly, true);
  await ui.button('复制授权链接').props.onClick();
  assert.ok(text(ui.render()).includes('手动复制'));
  assert.ok(ui.button('完成连接'));
});

test('a failed authorization request closes only its preopened Web tab', async () => {
  let closed = 0;
  const ui = await account({ desktop: false, open: () => ({ opener: null, close() { closed++; } }),
    begin: async () => { throw new Error('connection unavailable'); } });
  await ui.button('登录并连接小算狸').props.onClick();
  assert.equal(closed, 1);
  assert.ok(text(ui.render()).includes('connection unavailable'));
});
