// ============================================================
//  POST /api/auth/login  — customer login
//  Preserved from original. Fixes: standardized response shape,
//  uses shared helpers, consistent error messages.
// ============================================================
import { json, cors, rateLimit, sha256, isValidEmail, sanitize, logError } from "../_helpers.js";

export async function onRequestOptions() { return cors(); }

export async function onRequestPost(context) {
  const { env, request } = context;

  // ── Rate limit: 5 attempts per IP per 5 minutes ───────
  const ip      = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await rateLimit(env.RATE_LIMIT, "login:" + ip, 5, 300);
  if (!allowed) {
    return json({ error: "Too many attempts. Try again in 5 minutes." }, 429);
  }

  // ── Parse + validate ──────────────────────────────────
  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const email    = sanitize(body.email    || "").toLowerCase();
  const password = String(body.password   || "");

  if (!isValidEmail(email))          return json({ error: "Invalid credentials" }, 401);
  if (!password || password.length > 200) return json({ error: "Invalid credentials" }, 401);

  // ── Fetch user ────────────────────────────────────────
  let user;
  try {
    user = await env.DB.prepare(
      "SELECT id, name, email, password_hash, salt FROM users WHERE email = ?"
    ).bind(email).first();
  } catch (e) {
    logError("POST /api/auth/login — DB fetch", e);
    return json({ error: "Login failed. Please try again." }, 500);
  }

  if (!user) return json({ error: "Invalid credentials" }, 401);

  // ── Verify password hash ──────────────────────────────
  const inputHash = await sha256(user.salt + password);
  if (inputHash !== user.password_hash) {
    return json({ error: "Invalid credentials" }, 401);
  }

  // ── Issue session token ───────────────────────────────
  const safeUser = { id: user.id, name: user.name, email: user.email };
  const token    = crypto.randomUUID();
  try {
    await env.KV.put(
      "session:" + token,
      JSON.stringify(safeUser),
      { expirationTtl: 86400 }  // 24 hours
    );
  } catch (e) {
    logError("POST /api/auth/login — KV write", e);
    return json({ error: "Session creation failed" }, 500);
  }

  return json({ user: safeUser, token });
}
