#!/usr/bin/env node
// Publish only committed source. Authentication stays in the local environment.
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { 'artifacts-dir': { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } });
if (!values['artifacts-dir']) throw new Error('Usage: npm run release -- --artifacts-dir /absolute/path/to/artifacts [--dry-run]');
try { process.loadEnvFile(join(root, '.env')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const token = process.env.NPM_TOKEN;
const redact = text => token ? text.replaceAll(token, '[redacted]') : text;
const artifacts = resolve(values['artifacts-dir']);
const registry = 'https://registry.npmjs.org';
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
// Keep npm diagnostics with the release artifacts, including authentication errors.
process.env.NPM_CONFIG_LOGS_DIR = join(artifacts, 'npm-logs');
process.env.npm_config_logs_dir = join(artifacts, 'npm-logs');

function run(program, args, { env = process.env, quiet = false } = {}) {
  const result = spawnSync(program, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const stdout = redact(result.stdout ?? '');
  const stderr = redact(result.stderr ?? '');
  if (!quiet || result.status !== 0) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }
  if (result.error) throw new Error(redact(result.error.message));
  if (result.status !== 0) throw new Error(`${program} exited with status ${result.status}`);
  return stdout.trim();
}

function npm(args, options) {
  const cli = process.env.npm_execpath;
  return cli ? run(process.execPath, [cli, ...args], options) : run('npm', args, options);
}

let authDirectory;
let releaseState;
try {
  const revision = run('git', ['rev-parse', 'HEAD'], { quiet: true });
  const branch = run('git', ['branch', '--show-current'], { quiet: true });
  const pending = run('git', ['status', '--porcelain'], { quiet: true });
  if (pending) throw new Error('Commit release inputs before validation or publication');
  if (!values['dry-run'] && branch !== 'master') throw new Error('Publish from master after validating test');
  if (!values['dry-run']) {
    if (!token) throw new Error('Set NPM_TOKEN in the local .env or environment');
    const remote = run('git', ['ls-remote', 'origin', 'refs/heads/master'], { quiet: true });
    if (remote.split(/\s+/)[0] !== revision) throw new Error('Push the master release commit before publishing');
  }

  // The same command validates a candidate on test and publishes a master release.
  npm(['test']);
  await mkdir(artifacts, { recursive: true });
  const [packed] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', artifacts], { quiet: true }));
  const archive = join(artifacts, packed.filename);
  const result = { name: packageJson.name, version: packageJson.version, sourceRevision: revision,
    artifact: packed.filename, integrity: packed.integrity, files: packed.files.map(file => file.path), published: false };
  releaseState = result;
  await writeFile(join(artifacts, 'release.json'), JSON.stringify(result, null, 2) + '\n');
  if (values['dry-run']) {
    console.log(JSON.stringify({ ...result, dryRun: true }));
  } else {
    authDirectory = await mkdtemp(join(artifacts, '.npm-auth-'));
    await chmod(authDirectory, 0o700);
    const userconfig = join(authDirectory, 'npmrc');
    await writeFile(userconfig, '//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n', { mode: 0o600 });
    const env = { ...process.env, NPM_TOKEN: token, NPM_CONFIG_USERCONFIG: userconfig, npm_config_userconfig: userconfig };
    const options = { env };
    npm(['whoami', '--registry', registry], options);
    npm(['publish', archive, '--access', 'public', '--ignore-scripts', '--registry', registry, '--tag', 'latest'], options);
    result.published = true;
    await writeFile(join(artifacts, 'release.json'), JSON.stringify(result, null, 2) + '\n');

    for (let attempt = 0; attempt < 6; attempt++) {
      const response = await fetch(`${registry}/${encodeURIComponent(packageJson.name)}/${packageJson.version}`, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const published = await response.json();
        if (published.dist?.integrity !== packed.integrity) throw new Error('Published package integrity differs from the packed artifact');
        result.registryVerified = true;
        result.url = `https://www.npmjs.com/package/${packageJson.name}/v/${packageJson.version}`;
        break;
      }
      if (response.status !== 404) throw new Error(`Registry verification returned ${response.status}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    await writeFile(join(artifacts, 'release.json'), JSON.stringify(result, null, 2) + '\n');
    if (!result.registryVerified) throw new Error('Published successfully, but registry readback is pending; inspect release.json before retrying');
    console.log(JSON.stringify(result));
  }
} catch (error) {
  if (releaseState) {
    releaseState.error = redact(error.message);
    await writeFile(join(artifacts, 'release.json'), JSON.stringify(releaseState, null, 2) + '\n');
  }
  console.error(redact(error.message));
  process.exitCode = 1;
} finally {
  if (authDirectory) await rm(authDirectory, { recursive: true, force: true });
}
