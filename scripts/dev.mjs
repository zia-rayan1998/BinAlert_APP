#!/usr/bin/env node
/**
 * Cross-platform process manager for local development. Zero dependencies —
 * `npm run dev` at the repository root works without installing anything here.
 *
 *   node scripts/dev.mjs            frontend + API
 *   node scripts/dev.mjs --ai       frontend + API + Python AI service
 *   node scripts/dev.mjs --only web frontend only
 *
 * Ctrl+C shuts every child process down.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const IS_WINDOWS = process.platform === 'win32';

const args = process.argv.slice(2);
const onlyIndex = args.indexOf('--only');
const only = onlyIndex === -1 ? null : args[onlyIndex + 1];
const includeAi = args.includes('--ai') || process.env.START_AI === '1' || only === 'ai';

const COLORS = { web: '\x1b[36m', api: '\x1b[35m', ai: '\x1b[33m', root: '\x1b[32m' };
const RESET = '\x1b[0m';

function log(tag, message) {
  const color = COLORS[tag] ?? COLORS.root;
  const prefix = `${color}[${tag}]${RESET}`;
  for (const line of message.toString().split(/\r?\n/)) {
    if (line.trim().length > 0) process.stdout.write(`${prefix} ${line}\n`);
  }
}

function npmCommand(cwd, script) {
  return IS_WINDOWS
    ? { file: 'npm.cmd', args: ['run', script], cwd }
    : { file: 'npm', args: ['run', script], cwd };
}

function pythonCommand(cwd) {
  const venv = IS_WINDOWS ? path.join(cwd, '.venv', 'Scripts', 'python.exe') : path.join(cwd, '.venv', 'bin', 'python');
  const interpreter = existsSync(venv) ? venv : IS_WINDOWS ? 'python.exe' : 'python3';
  return {
    file: interpreter,
    args: ['-m', 'uvicorn', 'app.main:app', '--host', process.env.AI_HOST ?? '127.0.0.1', '--port', process.env.AI_PORT ?? '8000', '--reload'],
    cwd,
  };
}

const targets = [];
if (!only || only === 'web') targets.push({ tag: 'web', ...npmCommand(path.join(ROOT, 'binalert'), 'dev') });
if (!only || only === 'api') targets.push({ tag: 'api', ...npmCommand(path.join(ROOT, 'server'), 'dev') });
if (includeAi && (!only || only === 'ai')) targets.push({ tag: 'ai', ...pythonCommand(path.join(ROOT, 'ai-service')) });

if (targets.length === 0) {
  log('root', 'Nothing to start. Use --only web|api|ai, or drop --only entirely.');
  process.exit(1);
}

const children = [];
let shuttingDown = false;

for (const target of targets) {
  const { tag, file, args: childArgs, cwd } = target;

  if (tag === 'api' && !existsSync(path.join(cwd, 'node_modules'))) {
    log(tag, 'Dependencies are not installed yet. Run:  npm --prefix server install');
  }
  if (tag === 'web' && !existsSync(path.join(cwd, 'node_modules'))) {
    log(tag, 'Dependencies are not installed yet. Run:  npm --prefix binalert install');
  }
  if (tag === 'ai' && !existsSync(path.join(cwd, '.venv'))) {
    log(tag, 'No virtualenv found. Run:  .\\scripts\\setup.ps1  (or see README §AI service)');
  }

  log(tag, `starting: ${file} ${childArgs.join(' ')}  (cwd ${path.relative(ROOT, cwd) || '.'})`);

  const child = spawn(file, childArgs, {
  cwd,
  shell: tag !== 'ai' && IS_WINDOWS,
  env: process.env,
});
  child.stdout.on('data', (d) => log(tag, d));
  child.stderr.on('data', (d) => log(tag, d));
  child.on('error', (err) => log(tag, `failed to start — ${err.message}`));
  child.on('exit', (code, signal) => {
    log(tag, `exited (${signal ?? code ?? 0})`);
    if (!shuttingDown) shutdown(code ?? 0);
  });

  children.push(child);
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('root', 'stopping…');
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        child.kill(IS_WINDOWS ? undefined : 'SIGTERM');
      } catch {
        /* already gone */
      }
    }
  }
  setTimeout(() => process.exit(code), 400).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

log('root', `BinAlert dev — ${targets.map((t) => t.tag).join(' + ')}`);
log('root', 'web  http://localhost:5173   api  http://localhost:4000   ai  http://localhost:8000');
