import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const text = node => typeof node === 'string' ? node : (node?.props?.children || []).map(text).join('');
const find = (node, match) => !node || typeof node !== 'object' ? undefined : match(node) ? node :
  (node.props?.children || []).map(child => find(child, match)).find(Boolean);

async function select() {
  const states = new Map();
  let current, cursor, module, floating;
  const state = initial => {
    const key = cursor++, values = states.get(current);
    if (!(key in values)) values[key] = initial;
    return [values[key], next => { values[key] = typeof next === 'function' ? next(values[key]) : next; }];
  };
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState: state, useRef: initial => state({ current: initial })[0], useId: () => state('field-' + cursor)[0],
    useEffect() {}, useCallback: fn => fn };
  runInNewContext(await readFile(new URL('../client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(value) { module = value; } } },
    document: { createElement: () => ({ remove() {} }), head: { appendChild() {} } },
  });
  module.factory(() => React).apply({ effect(fn) { fn(); }, connection: { rpc: { call() {} } },
    slots: { inject(_name, fn) { fn(); }, register(options, view) { if (options.name === 'shell.overlay') floating = view; } } });
  const render = (component, props) => {
    current = component; cursor = 0;
    if (!states.has(component)) states.set(component, []);
    return component(props);
  };
  find(render(floating, {}), node => node.type === 'button').props.onClick();
  const panel = find(render(floating, {}), node => typeof node.type === 'function' && node.type.name === 'ProjectPanel');
  const field = find(render(panel.type, panel.props), node => typeof node.type === 'function' && node.type.name === 'SelectField');
  const changes = [], props = { ...field.props, value: 'a', disabled: false,
    options: [{ id: 'a', title: '当前工程' }, { id: 'b', title: '很长的工程名称需要保持可读而且能完整选择' }],
    onChange: event => { changes.push(event.target.value); props.value = event.target.value; } };
  const view = () => render(field.type, props);
  const trigger = () => find(view(), node => node.props.role === 'combobox');
  return { view, props, changes, trigger, key: key => trigger().props.onKeyDown({ key, preventDefault() {}, stopPropagation() {} }) };
}

test('styled dropdown selects by stable ID, displays selection and supports keyboard cancellation', async () => {
  const ui = await select();
  assert.equal(find(ui.view(), node => node.type === 'select'), undefined);
  assert.ok(text(ui.trigger()).includes('当前工程'));
  ui.key('ArrowDown'); ui.key('End'); ui.key('Enter');
  assert.deepEqual(ui.changes, ['b']);
  assert.equal(ui.trigger().props['aria-expanded'], false);
  assert.ok(text(ui.trigger()).includes('很长的工程名称'));
  ui.trigger().props.onClick();
  assert.equal(find(ui.view(), node => node.props.role === 'option' && node.props['aria-selected']).props['aria-selected'], true);
  ui.key('Home'); ui.key('Escape');
  assert.deepEqual(ui.changes, ['b']);
  assert.equal(ui.trigger().props['aria-expanded'], false);
});

test('dropdown supports clearing, blur dismissal and disabled/loading states', async () => {
  const ui = await select();
  ui.trigger().props.onClick(); ui.key('Home'); ui.key('Enter');
  assert.deepEqual(ui.changes, ['']);
  ui.trigger().props.onClick();
  ui.view().props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null });
  assert.equal(ui.trigger().props['aria-expanded'], false);
  ui.props.disabled = true;
  ui.key('ArrowDown'); ui.trigger().props.onClick();
  assert.equal(ui.trigger().props.disabled, true);
  assert.equal(ui.trigger().props['aria-expanded'], false);
  assert.equal(find(ui.view(), node => node.props.role === 'listbox'), undefined);
});
