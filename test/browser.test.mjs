import test from 'node:test';
import assert from 'node:assert/strict';
import { openWindowsAuthorization } from '../src/connect/browser.mjs';

test('Windows Host opens only its authorization origin using literal encoded data and fixed argv', async () => {
  const url = 'https://test-app.xiaosuanli.com/authorize/director?state=a%26b&codeChallenge=c';
  const calls = [];
  const result = await openWindowsAuthorization({ url }, 'https://test-app.xiaosuanli.com', {
    platform: 'win32', env: { SystemRoot: 'C:\\Windows', PATH: 'native-path', PRIVATE_TOKEN: 'must-not-propagate' },
    run: async (...args) => calls.push(args),
  });
  assert.deepEqual(result, { handled: true, requested: true });
  const [program, args, options] = calls[0];
  assert.equal(program, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.deepEqual(args.slice(0, 4), ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand']);
  const script = Buffer.from(args[4], 'base64').toString('utf16le');
  assert.ok(script.includes('Start-Process -FilePath $url -ErrorAction Stop'));
  assert.equal(script.includes(url), false);
  assert.equal(Buffer.from(script.match(/FromBase64String\('([^']+)'\)/)[1], 'base64').toString('utf8'), url);
  assert.equal(options.shell, false); assert.equal(options.timeout, 5000);
  assert.equal(options.env.PRIVATE_TOKEN, undefined);
});

test('native failures retain the login and never expose diagnostics; non-Windows stays on the client path', async () => {
  const failed = await openWindowsAuthorization({ url: 'https://example.com/authorize/director' }, 'https://example.com', {
    platform: 'win32', run: async () => { throw new Error('private-native-error'); },
  });
  assert.deepEqual(failed, { handled: true, requested: false });
  assert.deepEqual(await openWindowsAuthorization({}, '', { platform: 'darwin' }), { handled: false });
  for (const url of ['file:///C:/Windows/example.exe', 'https://elsewhere.example/authorize/director', 'https://example.com/arbitrary']) {
    const result = await openWindowsAuthorization({ url }, 'https://example.com', { platform: 'win32', run: () => assert.fail('unexpected native launch') });
    assert.deepEqual(result, { handled: true, requested: false });
  }
});
