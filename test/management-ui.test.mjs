import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const code = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const text = node => typeof node === 'string' ? node : (node?.props?.children || []).map(text).join('');
const find = (node, predicate) => !node || typeof node !== 'object' ? undefined :
  predicate(node) ? node : (node.props?.children || []).map(child => find(child, predicate)).find(Boolean);
async function panel({ update, status } = {}) {
  const values = [], effects = [], calls = [];
  let index = 0, mounted = false, module, account, props, component;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) { const key = index++; if (!(key in values)) values[key] = initial;
      return [values[key], value => { values[key] = typeof value === 'function' ? value(values[key]) : value; }]; },
    useRef(initial) { const key = index++; if (!(key in values)) values[key] = { current: initial }; return values[key]; },
    useEffect(effect) { if (!mounted) effects.push(effect); },
  };
  const initial = { version: '1.0.2', installedVersion: '1.0.2', available: true, removable: true, channel: 'npm', uninstallCommand: 'remove-command' };
  let checked = 0;
  runInNewContext(code, { URL, window: { __ModuleLoader__: { load(value) { module = value; } } },
    document: { createElement: () => ({ remove() {} }), head: { appendChild() {} } } });
  module.factory(() => React).apply({ effect(fn) { fn(); }, inputTriggers: { registerSource() { return () => {}; } },
    connection: { rpc: { async call(_channel, method, payload) {
      calls.push({ method, payload });
      if (method.endsWith('/plugin-update')) return update();
      if (method.endsWith('/plugin-check-update')) return { ok: true, value: { ...initial, updateAvailable: true, latestVersion: '1.0.3', candidateId: 'candidate-' + ++checked } };
      return { ok: true, value: status ? status() : initial };
    } } },
    slots: { inject(_name, fn) { fn(); }, register(options, view) { if (options.name === 'settings.section') { account = view; props = options.inject(); } } },
  });
  const tree = account(props);
  const child = find(tree, node => typeof node.type === 'function' && node.type.name === 'PluginManagement');
  assert.ok(child); component = child.type;
  values.length = 0; effects.length = 0;
  const render = () => { index = 0; const node = component(child.props); mounted = true; return node; };
  render(); for (const effect of effects) effect(); await new Promise(resolve => setImmediate(resolve));
  const button = label => find(render(), node => node.type === 'button' && text(node) === label);
  return { render, button, calls };
}

test('failed update removes consumed candidate and fresh check enables a new retry', async () => {
  const ui = await panel({ update: async () => ({ ok: true, value: { changed: false, application: 'failed', message: '连接失败，请重试' } }) });
  await ui.button('检查更新').props.onClick();
  await ui.button('更新到 1.0.3').props.onClick();
  assert.equal(ui.button('更新到 1.0.3'), undefined, 'failed candidate must not remain clickable');
  assert.ok(text(ui.render()).includes('连接失败'));
  assert.ok(!text(ui.render()).includes('remove-command'), 'update failure must not suggest uninstall');
  await ui.button('检查更新').props.onClick();
  await ui.button('更新到 1.0.3').props.onClick();
  assert.deepEqual(ui.calls.filter(c => c.method.endsWith('/plugin-update')).map(c => c.payload.candidateId), ['candidate-1', 'candidate-2']);
});

test('expired candidate shows actionable error and removes stale update button', async () => {
  const ui = await panel({ update: async () => ({ ok: false, error: { code: 'STALE_UPDATE', message: '请重新检查更新后再安装。' } }) });
  await ui.button('检查更新').props.onClick(); await ui.button('更新到 1.0.3').props.onClick();
  assert.equal(ui.button('更新到 1.0.3'), undefined);
  assert.ok(text(ui.render()).includes('请重新检查更新后再安装'));
});

test('lost update response reads installed version and never repeats installation', async () => {
  let installed = '1.0.2';
  const ui = await panel({ update: async () => { installed = '1.0.3'; throw Error('connection closed'); },
    status: () => ({ version: '1.0.2', installedVersion: installed, available: true }) });
  await ui.button('检查更新').props.onClick(); await ui.button('更新到 1.0.3').props.onClick();
  assert.ok(text(ui.render()).includes('更新已安装'));
  assert.equal(ui.calls.filter(c => c.method.endsWith('/plugin-update')).length, 1);
});
