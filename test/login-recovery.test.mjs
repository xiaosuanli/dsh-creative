import test from 'node:test';
import assert from 'node:assert/strict';
import { DirectorConnect } from '../src/connect/index.mjs';

async function fixture(t) {
  const values = new Map();
  const store = { get: async key => values.get(key), set: async (key, value) => values.set(key, structuredClone(value)), delete: async key => values.delete(key) };
  const calls = [];
  const client = { id: 'xiaosuanli-dsh', channel: 'dsh' };
  const grant = { ...client, clientId: client.id, projectId: '', authorizationId: 'fixture-authorization',
    accessToken: 'fake-test-token', scopes: ['project:select'], expiresAt: new Date(Date.now() + 600000).toISOString() };
  let respond = async () => ({ ok: true, json: async () => ({ code: 200, data: grant }) });
  const create = () => new DirectorConnect({ client, apiOrigin: 'https://api.example.invalid',
    siteOrigin: 'https://site.example.invalid', store, fetcher: async (url, options) => {
      assert.equal(url, 'https://api.example.invalid/api/subscriber/authorizations/token');
      calls.push(JSON.parse(options.body));
      return respond();
    } });
  const hasPending = async () => [...values.keys()].some(name => name.endsWith('-pending-login'));
  return { create, calls, hasPending, respond: value => { respond = value; } };
}

for (const restart of [false, true]) {
  test(`interrupted exchange retains PKCE and supports explicit retry ${restart ? 'after restart' : 'in the same instance'}`, async t => {
    const f = await fixture(t);
    const connect = f.create();
    const start = await connect.beginLoginPersisted();
    assert.equal((await connect.status()).reason, 'LOGIN_PENDING');
    f.respond(async () => {
      assert.equal(await f.hasPending(), true);
      throw Error('simulated connection interruption');
    });
    const input = { code: 'fake-once', state: start.state };
    await assert.rejects(connect.completeLogin(input), error => error.code === 'RESULT_UNKNOWN' &&
      error.message.includes('授权码已使用或过期') && !error.message.includes('requestId'));
    assert.equal(await f.hasPending(), true);
    const retry = restart ? f.create() : connect;
    const status = await retry.status();
    assert.equal(status.reason, 'LOGIN_EXCHANGE_INTERRUPTED');
    assert.equal(status.state, start.state);
    assert.equal(JSON.stringify(status).includes(f.calls[0].codeVerifier), false);
    assert.equal(f.calls.length, 1, 'status must not automatically exchange the code');
    f.respond(async () => ({ ok: true, json: async () => ({ code: 200, data: {
      clientId: 'xiaosuanli-dsh', channel: 'dsh', projectId: '', authorizationId: 'fixture-retry',
      accessToken: 'fake-retry-token', scopes: ['project:select'], expiresAt: new Date(Date.now() + 600000).toISOString(),
    } }) }));
    assert.equal((await retry.completeLogin(input)).connected, true);
    assert.equal(f.calls.length, 2);
    assert.equal(f.calls[1].codeVerifier, f.calls[0].codeVerifier);
    assert.equal(await f.hasPending(), false);
    assert.equal((await f.create().status()).connected, true);
    await assert.rejects(retry.completeLogin(input), { code: 'INVALID_LOGIN' });
    assert.equal(f.calls.length, 2);
  });
}

test('normal exchange clears pending only after storing the grant', async t => {
  const f = await fixture(t);
  const connect = f.create();
  const start = await connect.beginLoginPersisted();
  assert.equal((await f.create().completeLogin({ code: 'fake-once', state: start.state })).connected, true);
  assert.equal(await f.hasPending(), false);
  assert.equal((await f.create().status()).connected, true);
});

test('a consumed code rejection never becomes success and requires a fresh authorization', async t => {
  const f = await fixture(t);
  const connect = f.create();
  const start = await connect.beginLoginPersisted();
  const input = { code: 'fake-consumed', state: start.state };
  f.respond(async () => { throw Error('server consumed code but response was lost'); });
  await assert.rejects(connect.completeLogin(input), { code: 'RESULT_UNKNOWN' });
  assert.equal(f.calls.length, 1);
  f.respond(async () => ({ ok: false, status: 401, json: async () => ({ code: 401, message: '授权码无效、已使用或已过期' }) }));
  await assert.rejects(f.create().completeLogin(input), { code: 401 });
  assert.equal(await f.hasPending(), false);
  assert.equal((await f.create().status()).reason, 'LOGIN_REQUIRED');
  assert.equal(f.calls.length, 2);
  assert.notEqual((await connect.beginLoginPersisted()).state, start.state);
  assert.equal((await f.create().status()).reason, 'LOGIN_PENDING');
});

test('unreadable token response preserves pending as an uncertain exchange', async t => {
  const f = await fixture(t);
  const connect = f.create();
  const start = await connect.beginLoginPersisted();
  f.respond(async () => ({ ok: true, json: async () => { throw Error('truncated body'); } }));
  await assert.rejects(connect.completeLogin({ code: 'fake-once', state: start.state }), { code: 'INVALID_RESPONSE' });
  assert.equal((await f.create().status()).reason, 'LOGIN_EXCHANGE_INTERRUPTED');
  assert.equal(await f.hasPending(), true);
  assert.equal(f.calls.length, 1);
});

for (const fail of [false, true]) {
  test(`disconnect during ${fail ? 'interrupted' : 'successful'} exchange cancels login without restoring pending`, async t => {
    const f = await fixture(t);
    const connect = f.create();
    const start = await connect.beginLoginPersisted();
    let release;
    f.respond(() => new Promise((resolve, reject) => { release = () => fail ? reject(Error('interrupted')) : resolve({ ok: true, json: async () => ({ code: 200 }) }); }));
    const completion = connect.completeLogin({ code: 'fake-once', state: start.state });
    await connect.disconnect();
    release();
    await assert.rejects(completion, { code: 'LOGIN_CANCELLED' });
    assert.equal(await f.hasPending(), false);
    assert.equal((await f.create().status()).reason, 'LOGIN_REQUIRED');
  });
}

for (const fail of [false, true]) {
  test(`new login survives older ${fail ? 'interrupted' : 'successful'} exchange`, async t => {
    const f = await fixture(t);
    const connect = f.create();
    const old = await connect.beginLoginPersisted();
    let release;
    f.respond(() => new Promise((resolve, reject) => { release = () => fail ? reject(Error('interrupted')) : resolve({ ok: true, json: async () => ({ code: 200 }) }); }));
    const completion = connect.completeLogin({ code: 'old-fake-once', state: old.state });
    const current = await connect.beginLoginPersisted();
    release();
    await assert.rejects(completion, { code: 'LOGIN_CANCELLED' });
    const status = await f.create().status();
    assert.equal(status.reason, 'LOGIN_PENDING');
    assert.equal(status.state, current.state);
    assert.equal(await f.hasPending(), true);
  });
}

test('concurrent exchange on the same instance sends only one request', async t => {
  const f = await fixture(t);
  const connect = f.create();
  const start = await connect.beginLoginPersisted();
  let reject;
  f.respond(() => new Promise((resolve, rejectPromise) => { reject = rejectPromise; }));
  const input = { code: 'fake-once', state: start.state };
  const completion = connect.completeLogin(input);
  await assert.rejects(connect.completeLogin(input), { code: 'LOGIN_IN_PROGRESS' });
  assert.equal(f.calls.length, 1);
  reject(Error('interrupted'));
  await assert.rejects(completion, { code: 'RESULT_UNKNOWN' });
  assert.equal(await f.hasPending(), true);
});
