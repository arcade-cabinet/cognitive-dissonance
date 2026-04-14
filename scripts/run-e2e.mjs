#!/usr/bin/env node
// Cross-platform E2E runner:
// - Linux headless (CI): wraps playwright in xvfb-run so headed Chromium gets a display
// - macOS / Windows: runs playwright directly (system provides the display)
//
// Extra args are forwarded to playwright test (e.g. --headed, --workers=1, --grep=...).

import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const extraArgs = process.argv.slice(2);
const isLinux = platform() === 'linux';

const [cmd, args] = isLinux
  ? ['xvfb-run', ['--auto-servernum', 'pnpm', 'exec', 'playwright', 'test', ...extraArgs]]
  : ['pnpm', ['exec', 'playwright', 'test', ...extraArgs]];

const child = spawn(cmd, args, { stdio: 'inherit' });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
