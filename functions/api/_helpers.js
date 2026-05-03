// ============================================================
//  ARCTIC SHOP BD — Shared API Helpers
//  Imported by every route. Keep this file pure (no side-effects).
// ============================================================

// ── Standard JSON response ────────────────────────────────
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type":                "application/json",
      "X-Content-Type-Options":      "nosniff",
      "X-Frame-Options":             "DENY",
      "Referrer-Policy":             "strict-origin-when-cross-origin",
    },
  });
}

// ── CORS preflight response ───────────────────────────────
// Only same-origin and our own domain are allowed.
// Wildcard "*" is intentionally NOT used in production.
export function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "https://arcticshopbd.pages.dev",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Max-Age":       "86400",
    },
  });
}

// ── Input sanitizer ───────────────────────────────────────
// Strips HTML tags and trims whitespace.
export function sanitize(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/<[^>]*>/g, "").trim();
}

// ── Field validators ──────────────────────────────────────
export function isValidEmail(e) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(String(e || ""));
}

export function isValidPhone(p) {
  const digits = String(p || "").replace(/[\s\-()]/g, "");
  return /^\+?[0-9]{7,15}$/.test(digits);
}

export function isValidName(n) {
  const s = sanitize(n);
  return s.length >= 2 && s.length <= 80;
}

export function isValidAddress(a) {
  const s = sanitize(a);
  return s.length >= 5 && s.length <= 200;
}

export function isValidTrxId(t) {
  const s = String(t || "").trim().toUpperCase();
  return /^[A-Z0-9]{6,20}$/.test(s);
}

// ── Positive integer validator ─────────────────────────────
export function isPositiveInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0;
}

// ── Rate limiter (KV-backed) ──────────────────────────────
// Returns true if the request is allowed, false if rate-limited.
export async function rateLimit(kv, key, maxAttempts, windowSecs) {
  const raw      = await kv.get(key);
  const attempts = parseInt(raw || "0", 10);
  if (attempts >= maxAttempts) return false;
  await kv.put(key, String(attempts + 1), { expirationTtl: windowSecs });
  return true;
}

// ── Session validator ─────────────────────────────────────
// Returns the session user object, or null if invalid/expired.
export async function getSession(request, kv) {
  const auth  = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length < 10) return null;
  try {
    const raw = await kv.get("session:" + token);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Admin session validator ───────────────────────────────
// Returns the admin token string if valid, null otherwise.
// We store admin tokens separately under "admin_session:<token>"
// so they never share the key namespace with user sessions.
export async function getAdminSession(request, kv) {
  const auth  = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length < 10) return null;
  try {
    const raw = await kv.get("admin_session:" + token);
    return raw ? token : null;
  } catch {
    return null;
  }
}

// ── SHA-256 hex helper (Web Crypto) ───────────────────────
export async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Error logger ──────────────────────────────────────────
// Writes errors to the console (Cloudflare logs them automatically).
// In a future step this could push to a logging service.
export function logError(route, err) {
  // Structured JSON log — Cloudflare captures console output automatically.
  const msg   = err instanceof Error ? err.message : String(err);
  const stack = (err instanceof Error && err.stack)
    ? err.stack.split("\n").slice(0, 3).join(" | ") : undefined;
  const entry = { ts: new Date().toISOString(), level: "ERROR", route, message: msg };
  if (stack) entry.stack = stack;
  console.error(JSON.stringify(entry));
}
