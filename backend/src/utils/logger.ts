/**
 * logger.ts — lightweight structured logger for the Elderly backend.
 *
 * Provides coloured, levelled console output with ISO timestamps.
 * Usage:
 *   import { logger } from '../../utils/logger.js';
 *   logger.info('Server started');
 *   logger.error('Something broke', err);
 */

// ─── ANSI colours ─────────────────────────────────────────────────────────────
const RESET   = '\x1b[0m';
const DIM     = '\x1b[2m';
const BOLD    = '\x1b[1m';
const GREEN   = '\x1b[32m';
const YELLOW  = '\x1b[33m';
const RED     = '\x1b[31m';
const CYAN    = '\x1b[36m';
const MAGENTA = '\x1b[35m';

// ─── Level config ─────────────────────────────────────────────────────────────
type Level = 'info' | 'warn' | 'error' | 'debug' | 'http';

const LEVEL_META: Record<Level, { label: string; colour: string; fn: (...args: unknown[]) => void }> = {
  info:  { label: 'INFO ', colour: GREEN,   fn: console.info  },
  warn:  { label: 'WARN ', colour: YELLOW,  fn: console.warn  },
  error: { label: 'ERROR', colour: RED,     fn: console.error },
  debug: { label: 'DEBUG', colour: MAGENTA, fn: console.debug },
  http:  { label: 'HTTP ', colour: CYAN,    fn: console.log   },
};

// ─── Core formatter ───────────────────────────────────────────────────────────

function write(level: Level, message: string, ...meta: unknown[]): void {
  const { label, colour, fn } = LEVEL_META[level];
  const ts = new Date().toISOString();

  const prefix =
    `${DIM}[${ts}]${RESET} ` +
    `${colour}${BOLD}${label}${RESET} `;

  if (meta.length === 0) {
    fn(prefix + message);
  } else {
    fn(prefix + message, ...meta);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  /** General informational messages (startup, connections, etc.). */
  info(message: string, ...meta: unknown[]): void {
    write('info', message, ...meta);
  },

  /** Warnings — non-fatal issues worth investigation. */
  warn(message: string, ...meta: unknown[]): void {
    write('warn', message, ...meta);
  },

  /**
   * Errors — unexpected failures.
   * Pass the caught error/exception as the second argument so it prints with a full stack trace.
   */
  error(message: string, ...meta: unknown[]): void {
    write('error', message, ...meta);
  },

  /** Verbose debug output (useful during development). */
  debug(message: string, ...meta: unknown[]): void {
    write('debug', message, ...meta);
  },

  /**
   * HTTP request/response log — used by the request-logger middleware.
   * Applies status-code-based colouring on top of the standard prefix.
   */
  http(method: string, url: string, statusCode: number, durationMs: number): void {
    let statusColour = GREEN;
    if (statusCode >= 500) statusColour = RED;
    else if (statusCode >= 400) statusColour = YELLOW;
    else if (statusCode >= 300) statusColour = YELLOW;

    const ts = new Date().toISOString();
    const prefix =
      `${DIM}[${ts}]${RESET} ` +
      `${CYAN}${BOLD}HTTP ${RESET}`;

    console.log(
      prefix +
      `${statusColour}${method}${RESET} ` +
      `${url} ` +
      `${statusColour}${statusCode}${RESET} ` +
      `${DIM}${durationMs.toFixed(2)} ms${RESET}`,
    );
  },
};