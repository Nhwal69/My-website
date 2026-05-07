// ============================================================
//  POST /api/auth/register  — customer registration
//  Preserved from original. Fixes: uses shared helpers,
//  consistent response shape, no role column assumption.
// ============================================================
import { json, cors, rateLimit, sha256, isValidEmail, isValidName, sanitize, logError } from "../_helpers.js";

export async function onRequestOptions() { return cors(); }

export async function onRequestPost(context) {
  const { env, request } = context;

  // ── Rate limit: 5 registrations per IP per 10 minutes ─
  const ip      = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await rateLimit(env.RATE_LIMIT, "register:" + ip, 5, 600);
  if (!allowed) {
    return json({ error: "Too many attempts. Try again in 10 minutes." }, 429);
  }

  // ── Parse body ────────────────────────────────────────
  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const name     = sanitize(body.name     || "");
  const email    = sanitize(body.email    || "").toLowerCase();
  const password = String(body.password   || "");

  // ── Validate ──────────────────────────────────────────
  const errors = [];
  if (!isValidName(name))                          errors.push("name must be 2–80 characters");
  if (!isValidEmail(email))                        errors.push("Invalid email address");
  if (!password || password.length < 8)            errors.push("password must be at least 8 characters");
  if (password.length > 200)                       errors.push("password is too long");
  if (errors.length) return json({ errors }, 400);

  // ── Duplicate email check ─────────────────────────────
  try {
    const existing = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email).first();
    if (existing) return json({ error: "Email already registered" }, 409);
  } catch (e) {
    logError("POST /api/auth/register — duplicate check", e);
    return json({ error: "Registration failed. Please try again." }, 500);
  }

  // ── Hash password with salt ───────────────────────────
  const salt          = crypto.randomUUID();
  const password_hash = await sha256(salt + password);

  // ── Insert user ───────────────────────────────────────
  let user;
  try {
    user = await env.DB.prepare(
      "INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?) RETURNING id, name, email"
    ).bind(name, email, password_hash, salt).first();
  } catch (e) {
    logError("POST /api/auth/register — insert", e);
    return json({ error: "Registration failed. Please try again." }, 500);
  }

  // ── Issue session token ───────────────────────────────
  const token = crypto.randomUUID();
  try {
    await env.KV.put(
      "session:" + token,
      JSON.stringify(user),
      { expirationTtl: 86400 }
    );
  } catch (e) {
    logError("POST /api/auth/register — KV write", e);
    // Registration succeeded — don't fail the whole request
    return json({ user, token: null, warning: "Session creation failed, please log in." }, 201);
  }

  return json({ user, token }, 201);
}
