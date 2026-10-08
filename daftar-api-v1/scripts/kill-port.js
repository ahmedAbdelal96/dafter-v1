/**
 * kill-port.js — kills any process listening on the given port
 * Usage (via npm predev): node scripts/kill-port.js 7000
 * Works on Windows, macOS, and Linux.
 */

const { execSync } = require('child_process');

const port = process.argv[2] || '7000';

function killOnWindows(port) {
  try {
    const out = execSync(`netstat -ano`, { encoding: 'utf8' });
    const lines = out
      .split('\n')
      .filter((l) => l.includes(`:${port}`) && l.includes('LISTENING'));
    const pids = new Set(
      lines.map((l) => l.trim().split(/\s+/).pop()).filter(Boolean),
    );
    if (pids.size === 0) return;
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`  ✓ Killed PID ${pid} (port ${port})`);
      } catch {
        // already dead — ignore
      }
    }
  } catch {
    // netstat not available or port already free
  }
}

function killOnUnix(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
    if (!out) return;
    for (const pid of out.split('\n').filter(Boolean)) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        console.log(`  ✓ Killed PID ${pid} (port ${port})`);
      } catch {
        // already dead — ignore
      }
    }
  } catch {
    // lsof not found or port free
  }
}

if (process.platform === 'win32') {
  killOnWindows(port);
} else {
  killOnUnix(port);
}
