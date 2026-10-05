#!/usr/bin/env node
/**
 * One-shot local setup. Zero dependencies so it runs before any `npm install`.
 *
 *   node scripts/setup.mjs              frontend + API (+ Python venv if python is on PATH)
 *   node scripts/setup.mjs --skip-ai    skip the Python virtualenv
 *
 * Creates `.env` files from `.env.example` where missing. Never overwrites an
 * existing `.env`, and never writes secret values — placeholders only.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const IS_WINDOWS = process.platform === 'win32';
const SKIP_AI = process.argv.includes('--skip-ai') || process.env.SKIP_AI === '1';

const step = (message) => process.stdout.write(`\n\x1b[32m==>\x1b[0m ${message}\n`);
const info = (message) => process.stdout.write(`    ${message}\n`);
const warn = (message) => process.stdout.write(`\x1b[33m  !\x1b[0m ${message}\n`);

function run(file, args, cwd, label) {
  info(`$ ${path.basename(file)} ${args.join(' ')}`);
  const result = spawnSync(file, args, { cwd, stdio: 'inherit', shell: IS_WINDOWS });
  if (result.status !== 0) {
    warn(`${label} failed (exit ${result.status ?? 'signal'}). See the output above.`);
    return false;
  }
  return true;
}

const npm = IS_WINDOWS ? 'npm.cmd' : 'npm';
const runNpm = (args, cwd, label) => run(npm, args, cwd, label);

function which(command) {
  const probe = IS_WINDOWS ? spawnSync('where', [command], { encoding: 'utf8' }) : spawnSync('which', [command], { encoding: 'utf8' });
  return probe.status === 0 ? probe.stdout.trim().split(/\r?\n/)[0] : null;
}

function ensureEnv(dir) {
  const example = path.join(dir, '.env.example');
  const target = path.join(dir, '.env');
  if (!existsSync(example)) return;
  if (existsSync(target)) {
    info(`${path.relative(ROOT, target)} already exists — left untouched.`);
    return;
  }
  copyFileSync(example, target);
  info(`created ${path.relative(ROOT, target)} from ${path.basename(example)}`);
}

step('Checking prerequisites');
const nodeVersion = process.versions.node;
info(`node ${nodeVersion}`);
const [major] = nodeVersion.split('.').map(Number);
if (major < 20) warn('Node 20.11 or newer is required — the API will not start on older versions.');
info(`npm ${which('npm') ? 'found' : 'NOT FOUND'}`);
const python = which('python') ?? which('python3');
info(`python ${python ?? 'NOT FOUND'}`);

step('Writing .env files from .env.example');
for (const dir of ['binalert', 'server', 'ai-service']) {
  ensureEnv(path.join(ROOT, dir));
}
info('Open each .env and replace the placeholder JWT_SECRET and database password before first run.');

step('Installing frontend dependencies (binalert)');
runNpm(['install'], path.join(ROOT, 'binalert'), 'Frontend install');

step('Installing API dependencies (server)');
runNpm(['install'], path.join(ROOT, 'server'), 'API install');

step('Generating the Prisma client');
runNpm(['run', 'prisma:generate'], path.join(ROOT, 'server'), 'prisma generate');
info('Next: create the database, then run  npm run db:migrate  and  npm run db:seed');

if (SKIP_AI) {
  step('Skipping the Python AI service (--skip-ai)');
} else if (!python) {
  warn('Python was not found on PATH — skipping the AI service virtualenv.');
  info('Install Python 3.11+, then re-run:  node scripts/setup.mjs');
} else {
  step('Creating the AI service virtualenv (ai-service/.venv)');
  const venvDir = path.join(ROOT, 'ai-service', '.venv');
  const interpreter = /\s/.test(python) ? `"${python}"` : python;
  if (existsSync(venvDir)) {
    info('.venv already exists — reusing it.');
  } else {
    run(interpreter, ['-m', 'venv', '.venv'], path.join(ROOT, 'ai-service'), 'venv creation');
  }
  const venvPython = IS_WINDOWS ? path.join(venvDir, 'Scripts', 'python.exe') : path.join(venvDir, 'bin', 'python');
  if (existsSync(venvPython)) {
    const pipRunner = /\s/.test(venvPython) ? `"${venvPython}"` : venvPython;
    run(pipRunner, ['-m', 'pip', 'install', '--upgrade', 'pip'], path.join(ROOT, 'ai-service'), 'pip upgrade');
    run(pipRunner, ['-m', 'pip', 'install', '-r', 'requirements.txt'], path.join(ROOT, 'ai-service'), 'AI service install');
  } else {
    warn('Virtualenv creation did not produce an interpreter — install the AI service manually (see README §7).');
  }
}

step('Done');
info('Start everything with:  npm run dev          (frontend + API)');
info('Start everything with:  npm run dev:all      (frontend + API + AI service)');
info('Frontend http://localhost:5173   API http://localhost:4000   AI http://localhost:8000');
