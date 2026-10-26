import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { win32 } from 'node:path';

const execute = promisify(execFile);

// Only open the authorization URL created by this Host. No client-provided
// command or URL crosses this boundary; argv and the PowerShell program are fixed.
export async function openWindowsAuthorization(attempt, siteOrigin, {
  platform = process.platform, env = process.env, run = execute,
} = {}) {
  if (platform !== 'win32') return { handled: false };
  try {
    const url = new URL(attempt.url);
    if (url.protocol !== 'https:' || url.origin !== new URL(siteOrigin).origin ||
      url.pathname !== '/authorize/director' || url.username || url.password) throw new Error('Invalid authorization destination');
    const encodedUrl = Buffer.from(url.href, 'utf8').toString('base64');
    const script = "$ErrorActionPreference = 'Stop'\n$url = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + encodedUrl + "'))\nStart-Process -FilePath $url -ErrorAction Stop";
    const environment = {};
    const allowed = new Set(['systemroot', 'windir', 'path', 'pathext', 'comspec', 'temp', 'tmp', 'userprofile', 'appdata', 'localappdata', 'homedrive', 'homepath', 'username', 'userdomain', 'programfiles', 'programfiles(x86)', 'programdata']);
    for (const [key, value] of Object.entries(env)) if (allowed.has(key.toLowerCase())) environment[key] = value;
    const windows = Object.entries(env).find(([key]) => key.toLowerCase() === 'systemroot')?.[1] || 'C:\\Windows';
    await run(win32.join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      { shell: false, windowsHide: true, timeout: 5000, maxBuffer: 16384, env: environment });
    return { handled: true, requested: true };
  } catch {
    // Do not expose a command line, authorization URL or native diagnostic.
    return { handled: true, requested: false };
  }
}
