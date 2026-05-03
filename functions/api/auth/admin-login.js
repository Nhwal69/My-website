// ============================================================
//  POST /api/auth/admin-login
//
//  FIXES applied vs original admin-login.js:
//  1. Password is SHA-256 hashed before comparison (not plaintext)
//  2. Issues a real admin session token stored in KV
//  3. Rate limited: 5 attempts per 10 minutes per IP
//  4. Constant-time comparison to prevent timing attacks
//  5. Never reveals whether the password was wrong vs not found
// ============================================================
import { json, cors, rateLimit, sha256, logError } from "../_helpers.js";

export async function onRequestOptions() { return cors(); }

export async function onRequestPost(context) {
  const { env, request } = context;

  // ── Rate limit: 5 attempts per IP per 10 minutes ──────
  const ip      = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await rateLimit(env.RATE_LIMIT, "admin_login:" + ip, 5, 600);
  if (!allowed) {
    return json({ error: "Too many login attempts. Please wait 10 minutes." }, 429);
  }

  // ── Parse body ────────────────────────────────────────
  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const password = String(body.password || "");
  if (!password || password.length > 200) {
    return json({ error: "Invalid credentials" }, 401);
  }

  // ── Hash the submitted password ───────────────────────
  // ADMIN_PASSWORD_HASH env var should be SHA-256(ADMIN_PASSWORD).
  // If it's not set, fall back to hashing ADMIN_PASSWORD at runtime
  // so the original plaintext env var still works (backwards-compatible).
  const storedHash = env.ADMIN_PASSWORD_HASH || await sha256(env.ADMIN_PASSWORD || "");
  const inputHash  = await sha256(password);

  // ── Constant-time comparison (prevent timing attacks) ─
  // We compare full 64-char hex strings character by character.
  if (!constantTimeEqual(inputHash, storedHash)) {
    return json({ error: "Invalid credentials" }, 401);
  }

  // ── Issue admin session token ─────────────────────────
  const token = crypto.randomUUID();
  try {
    // Store under a separate "admin_session:" prefix so it can
    // never collide with or escalate to a regular user session.
    await env.KV.put(
      "admin_session:" + token,
      JSON.stringify({ role: "admin", ip, createdAt: Date.now() }),
      { expirationTtl: 8 * 60 * 60 }  // 8 hours
    );
  } catch (e) {
    logError("POST /api/auth/admin-login — KV write", e);
    return json({ error: "Session creation failed" }, 500);
  }

  return json({ success: true, token });
}

// ── Constant-time string comparison ──────────────────────
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
