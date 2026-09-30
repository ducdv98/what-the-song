#!/usr/bin/env node
/**
 * `npm run dev`: the Next dev server and the NestJS API (backend/, in watch
 * mode) together, with one Ctrl+C for both. Plain child_process rather than a
 * `&` in package.json, which PowerShell and cmd.exe do not understand.
 *
 * Needs Postgres running and backend/.env filled in — see README.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
const nestBin = join('backend', 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js');

const posix = process.platform !== 'win32';

/**
 * Each child leads its own process group on POSIX, so stopping it also stops
 * what it spawned — `nest start --watch` runs the app as a grandchild, which
 * would otherwise be orphaned still holding the port.
 */
function run(args, opts = {}) {
  return spawn(process.execPath, args, { stdio: 'inherit', detached: posix, ...opts });
}

function kill(p) {
  if (p.exitCode !== null) return;
  if (posix) {
    try {
      process.kill(-p.pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  } else {
    spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
  }
}

const procs = [run([nextBin, 'dev', ...process.argv.slice(2)])];

if (existsSync(nestBin)) {
  procs.push(run([join('node_modules', '@nestjs', 'cli', 'bin', 'nest.js'), 'start', '--watch'], { cwd: 'backend' }));
} else {
  // The game still runs — as guest-only, with the account buttons hidden.
  console.warn('dev: backend/node_modules missing, so the API is not running.');
  console.warn('dev: run `npm install --prefix backend` to enable accounts.');
}

let exiting = false;
function stopAll(code) {
  if (exiting) return;
  exiting = true;
  for (const p of procs) kill(p);
  process.exitCode = code;
}

for (const p of procs) p.on('exit', (code) => stopAll(code ?? 0));
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
