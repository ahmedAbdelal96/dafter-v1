/**
 * Zayna Dev Log Server
 *
 * Tiny Node.js HTTP server that receives log batches from the mobile app
 * and writes them to the project's logs/ directory.
 *
 * Usage:
 *   npm run logs          (in a second terminal while Metro is running)
 *
 * Mobile app sends POST http://{devMachineIP}:9001/log automatically in __DEV__
 * Logs are saved to: logs/YYYY-MM-DD.log (in the project root)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 9001;
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayFilePath() {
  const d    = new Date();
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
  return path.join(LOGS_DIR, `${date}.log`);
}

// ANSI color codes for terminal output
const C = {
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
  purple: '\x1b[35m',
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
};

function colorForLine(line) {
  if (line.includes('[ERROR]')) return C.red;
  if (line.includes('[WARN ]')) return C.yellow;
  if (line.includes('[NAV  ]')) return C.cyan;
  if (line.includes('[API  ]')) return C.green;
  if (line.includes('[DEBUG]')) return C.gray;
  return C.white;
}

function printLine(line) {
  const trimmed = line.trimEnd();
  if (!trimmed) return;
  process.stdout.write(`${colorForLine(trimmed)}${trimmed}${C.reset}\n`);
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // Allow requests from the mobile app (same LAN)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // POST /log — receive a batch of log lines
  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { lines } = JSON.parse(body);

        if (!Array.isArray(lines) || lines.length === 0) {
          res.writeHead(200);
          res.end('ok');
          return;
        }

        const batch = lines.join('');

        // Append to today's log file
        fs.appendFileSync(todayFilePath(), batch, 'utf8');

        // Print to terminal with colors
        lines.forEach(line => {
          line.split('\n').forEach(printLine);
        });

        res.writeHead(200);
        res.end('ok');
      } catch (err) {
        res.writeHead(400);
        res.end('bad request');
      }
    });
    return;
  }

  // GET /ping — health check
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  res.writeHead(404);
  res.end();
});

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  const now  = new Date().toTimeString().slice(0, 8);
  console.log(`\n${C.bold}${C.purple}╔═══════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.purple}║   Zayna Dev Log Server  🪵         ║${C.reset}`);
  console.log(`${C.bold}${C.purple}╚═══════════════════════════════════╝${C.reset}\n`);
  console.log(`${C.green}✓${C.reset}  Listening on   ${C.bold}0.0.0.0:${PORT}${C.reset}`);
  console.log(`${C.green}✓${C.reset}  Saving logs to ${C.bold}logs/YYYY-MM-DD.log${C.reset}`);
  console.log(`${C.gray}   Started at ${now}${C.reset}\n`);
  console.log(`${C.gray}─────────────────────────────────────${C.reset}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`${C.red}✗ Port ${PORT} is already in use.${C.reset}`);
    console.error(`  Kill the other process or change PORT in scripts/log-server.js`);
    process.exit(1);
  }
  throw err;
});
