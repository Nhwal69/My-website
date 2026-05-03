// ============================================================
//  ARCTIC SHOP BD — Production Logger  (Step 9)
//  Drop-in replacement for logError() in _helpers.js.
//  Writes structured logs to Cloudflare's log stream.
//  Future: swap LOG_ENDPOINT for Better Stack / Axiom / Logtail.
// ============================================================

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const MIN_LEVEL  = LOG_LEVELS.WARN;  // only WARN and ERROR in production

/**
 * Structured log entry — always output as JSON for log parsers.
 * Cloudflare captures console.log output in its log stream.
 */
export function log(level, route, message, meta) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    ts:      new Date().toISOString(),
    level,
    route,
    message: message instanceof Error ? message.message : String(message),
    ...(meta ? { meta } : {}),
    stack: (message instanceof Error && message.stack)
      ? message.stack.split("\n").slice(0, 4).join(" | ")
      : undefined,
  };

  // Remove undefined keys
  Object.keys(entry).forEach(k => entry[k] === undefined && delete entry[k]);

  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logDebug = (r, m, meta) => log("DEBUG", r, m, meta);
export const logInfo  = (r, m, meta) => log("INFO",  r, m, meta);
export const logWarn  = (r, m, meta) => log("WARN",  r, m, meta);
export const logError = (r, m, meta) => log("ERROR", r, m, meta);
