// ============================================================
//  GET  /api/orders   — list all orders   (admin only)
//  POST /api/orders   — place a new order (public, validated)
// ============================================================
import {
  json, cors, sanitize,
  isValidEmail, isValidPhone, isValidName, isValidAddress, isValidTrxId,
  getAdminSession, rateLimit, logError,
} from "./_helpers.js";

export async function onRequestOptions() { return cors(); }

// ── GET — list all orders (admin only) ────────────────────
export async function onRequestGet(context) {
  const { env, request } = context;

  const adminToken = await getAdminSession(request, env.KV);
  if (!adminToken) return json({ error: "Unauthorized" }, 401);

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, phone, email, address, items, total,
              payment_method, status, created_at
       FROM orders ORDER BY created_at DESC`
    ).all();

    const orders = results.map(o => ({
      ...o,
      items: safeParseJSON(o.items, []),
    }));
    return json({ orders });
  } catch (e) {
    logError("GET /api/orders", e);
    return json({ error: "Failed to fetch orders" }, 500);
  }
}

// ── POST — place a new order ──────────────────────────────
export async function onRequestPost(context) {
  const { env, request } = context;

  // ── IP-based rate limiting: 3 orders per hour ─────────
  const ip      = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await rateLimit(env.RATE_LIMIT, "order:" + ip, 3, 3600);
  if (!allowed) {
    return json({ error: "Too many orders submitted. Please wait before trying again." }, 429);
  }

  // ── Parse body ────────────────────────────────────────
  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // ── Sanitize inputs ───────────────────────────────────
  const id             = sanitize(body.id             || "");
  const name           = sanitize(body.name           || "");
  const phone          = sanitize(body.phone          || "");
  const email          = sanitize(body.email          || "").toLowerCase();
  const address        = sanitize(body.address        || "");
  const payment_method = sanitize(body.payment_method || "");
  const status         = "pending"; // always start as pending — never trust client
  const items          = body.items;
  const total          = parseFloat(body.total);

  // ── Validate ──────────────────────────────────────────
  const errors = [];

  if (!id || !/^ASB-[0-9]{7}$/.test(id))              errors.push("Invalid order ID format");
  if (!isValidName(name))                               errors.push("name must be 2–80 characters");
  if (!isValidPhone(phone))                             errors.push("Invalid phone number");
  if (!isValidEmail(email))                             errors.push("Invalid email address");
  if (!isValidAddress(address))                         errors.push("address must be 5–200 characters");
  if (!Array.isArray(items) || items.length === 0)      errors.push("items must be a non-empty array");
  if (!Number.isFinite(total) || total < 0)             errors.push("total must be a non-negative number");
  if (!payment_method)                                  errors.push("payment_method is required");

  // Validate each item
  if (Array.isArray(items)) {
    items.forEach(function (it, i) {
      if (!it.pid || !Number.isFinite(parseInt(it.pid, 10))) errors.push("item[" + i + "] invalid pid");
      if (!it.name || sanitize(it.name).length < 1)          errors.push("item[" + i + "] missing name");
      if (!it.qty  || parseInt(it.qty, 10) < 1)              errors.push("item[" + i + "] qty must be >= 1");
    });
  }

  if (errors.length) return json({ errors }, 400);

  // ── Sanitize item fields ──────────────────────────────
  const cleanItems = items.map(it => ({
    pid:   parseInt(it.pid, 10),
    name:  sanitize(it.name).slice(0, 120),
    sz:    sanitize(it.sz  || "").slice(0, 10),
    qty:   Math.min(parseInt(it.qty, 10), 50),
    price: Math.max(0, parseFloat(it.price) || 0),
  }));

  // ── Duplicate order ID check ──────────────────────────
  try {
    const existing = await env.DB.prepare(
      "SELECT id FROM orders WHERE id = ?"
    ).bind(id).first();
    if (existing) return json({ error: "Duplicate order ID" }, 409);
  } catch (e) {
    logError("POST /api/orders — duplicate check", e);
  }

  // ── Insert order ──────────────────────────────────────
  try {
    await env.DB.prepare(
      `INSERT INTO orders (id, name, phone, email, address, items, total, payment_method, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id, name, phone, email, address,
      JSON.stringify(cleanItems),
      total, payment_method, status
    ).run();
  } catch (e) {
    logError("POST /api/orders — insert", e);
    return json({ error: "Failed to save order" }, 500);
  }

  // ── Decrement stock (skip custom product id=6) ────────
  for (const item of cleanItems) {
    if (item.pid === 6) continue;
    try {
      await env.DB.prepare(
        "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?"
      ).bind(item.qty, item.pid).run();
    } catch (e) {
      // Non-fatal — log but don't fail the order
      logError("POST /api/orders — stock decrement pid=" + item.pid, e);
    }
  }

  return json({ success: true, id }, 201);
}

// ── Helper ────────────────────────────────────────────────
function safeParseJSON(str, fallback) {
  try { return typeof str === "string" ? JSON.parse(str) : (str || fallback); } catch { return fallback; }
}
