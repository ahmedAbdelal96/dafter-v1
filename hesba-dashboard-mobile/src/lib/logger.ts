/**
 * Logger — Zayna Mobile Dashboard
 *
 * Dual-mode logger:
 *   DEV  → sends logs to the local log server (scripts/log-server.js) running
 *           on the dev machine, which writes them to logs/YYYY-MM-DD.log in the
 *           project root. Also writes to device storage as fallback.
 *   PROD → writes only to device storage (logs/ in app document directory).
 *
 * Log format:
 *   [HH:MM:SS] [LEVEL] [Tag] Message | {"optional":"data"}
 *
 * Usage:
 *   logger.info('BookingScreen', 'User opened booking', { id: '123' });
 *   logger.error('API', 'Request failed', { status: 500 });
 *   logger.nav('/bookings/123');
 *   logger.api('GET', '/bookings', 200, 145);
 *
 * Dev server:
 *   Run `npm run logs` in a second terminal alongside Metro.
 *   Logs appear in terminal with color coding AND in logs/YYYY-MM-DD.log.
 */
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogLevel =
  | "DEBUG"
  | "INFO "
  | "WARN "
  | "ERROR"
  | "NAV  "
  | "API  ";

// ─── Dev server URL ───────────────────────────────────────────────────────────
// Metro's host URI is e.g. "192.168.100.10:8081" — we use the same IP on port 9001.
// This means the dev log server is always reachable as long as Metro is reachable.

function getDevServerUrl(): string | null {
  if (!__DEV__) return null;
  const cfg = Constants.expoConfig as unknown as { hostUri?: string };
  const mft = Constants as unknown as { manifest?: { debuggerHost?: string } };
  const hostUri = cfg?.hostUri ?? mft?.manifest?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0]; // "192.168.100.10"
  return `http://${host}:9001/log`;
}

// Cache the URL — computed once
const DEV_SERVER_URL = getDevServerUrl();

// ─── Constants ────────────────────────────────────────────────────────────────

/** Device-side log storage (always written, used by the in-app log viewer) */
const LOG_DIR = `${FileSystem.documentDirectory}logs/`;
const KEEP_DAYS = 7;

// ─── Write queues ─────────────────────────────────────────────────────────────

// Queue for device file writes (both DEV and PROD)
const deviceQueue: string[] = [];
let deviceTimer: ReturnType<typeof setTimeout> | null = null;

// Queue for dev server sends (DEV only)
const devQueue: string[] = [];
let devTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDate(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 8);
}

// ─── Device file flush ────────────────────────────────────────────────────────

async function flushToDevice(): Promise<void> {
  if (deviceQueue.length === 0) return;
  const batch = deviceQueue.splice(0, deviceQueue.length).join("");
  try {
    const dirInfo = await FileSystem.getInfoAsync(LOG_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(LOG_DIR, { intermediates: true });
    }
    const filePath = `${LOG_DIR}${todayDate()}.log`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    const existing = fileInfo.exists
      ? await FileSystem.readAsStringAsync(filePath)
      : "";
    await FileSystem.writeAsStringAsync(filePath, existing + batch);
  } catch {
    // Logging MUST NEVER crash the app
  }
}

function scheduleDeviceFlush(): void {
  if (deviceTimer !== null) return;
  deviceTimer = setTimeout(() => {
    deviceTimer = null;
    void flushToDevice();
  }, 400);
}

// ─── Dev server flush ─────────────────────────────────────────────────────────

async function flushToDevServer(): Promise<void> {
  if (!DEV_SERVER_URL || devQueue.length === 0) return;
  const lines = devQueue.splice(0, devQueue.length);
  try {
    await fetch(DEV_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
  } catch {
    // Dev server not running — silently ignore, device file still gets written
  }
}

function scheduleDevFlush(): void {
  if (devTimer !== null) return;
  devTimer = setTimeout(() => {
    devTimer = null;
    void flushToDevServer();
  }, 200); // Faster flush for dev so logs appear quickly in terminal
}

// ─── Core write ───────────────────────────────────────────────────────────────

function write(
  level: LogLevel,
  tag: string,
  message: string,
  data?: unknown,
): void {
  const dataStr = data !== undefined ? ` | ${JSON.stringify(data)}` : "";
  const line = `[${nowTime()}] [${level}] [${tag}] ${message}${dataStr}\n`;

  // Always queue for device storage (used by in-app log viewer)
  deviceQueue.push(line);
  scheduleDeviceFlush();

  if (__DEV__) {
    // Send to local dev server → written to project's logs/ directory
    devQueue.push(line);
    scheduleDevFlush();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug: (tag: string, msg: string, data?: unknown) =>
    write("DEBUG", tag, msg, data),
  info: (tag: string, msg: string, data?: unknown) =>
    write("INFO ", tag, msg, data),
  warn: (tag: string, msg: string, data?: unknown) =>
    write("WARN ", tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) =>
    write("ERROR", tag, msg, data),

  nav: (screen: string) => write("NAV  ", "Router", `→ ${screen}`),

  api: (
    method: string,
    url: string,
    status: number,
    ms: number,
    isError = false,
  ) =>
    write(
      isError ? "ERROR" : "API  ",
      "HTTP",
      `${method.toUpperCase()} ${url} → ${status} (${ms}ms)`,
    ),

  // ── Device file operations (for in-app viewer) ───────────────────────────────

  async readDate(date: string): Promise<string> {
    try {
      return await FileSystem.readAsStringAsync(`${LOG_DIR}${date}.log`);
    } catch {
      return "";
    }
  },

  async listDates(): Promise<string[]> {
    try {
      const info = await FileSystem.getInfoAsync(LOG_DIR);
      if (!info.exists) return [];
      const files = await FileSystem.readDirectoryAsync(LOG_DIR);
      return files
        .filter((f) => f.endsWith(".log"))
        .map((f) => f.replace(".log", ""))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  },

  getFilePath(date: string): string {
    return `${LOG_DIR}${date}.log`;
  },

  async cleanup(): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(LOG_DIR);
      if (!info.exists) return;
      const files = await FileSystem.readDirectoryAsync(LOG_DIR);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
      await Promise.all(
        files
          .filter((f) => {
            if (!f.endsWith(".log")) return false;
            const d = new Date(f.replace(".log", ""));
            return !isNaN(d.getTime()) && d < cutoff;
          })
          .map((f) =>
            FileSystem.deleteAsync(`${LOG_DIR}${f}`, { idempotent: true }),
          ),
      );
    } catch {
      /* ignore */
    }
  },

  async deleteDate(date: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(`${LOG_DIR}${date}.log`, {
        idempotent: true,
      });
    } catch {
      /* ignore */
    }
  },
};
