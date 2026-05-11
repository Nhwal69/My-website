// ============================================================
//  POST /api/orders/lookup — public order status lookup
//  Customers look up their orders by phone number.
//  Returns only safe fields (no email, no full address).
// ============================================================
import { json, cors, sanitize, isValidPhone, rateLimit, logError } from "../_helpers.js";

export async function onRequestOptions() { return cors(); }

export async function onRequestPost(context) {
  const { env, request } = context;

  // Rate limit: 10 lookups per hour per IP
  const ip      = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await rateLimit(env.RATE_LIMIT, "lookup:" + ip, 10, 3600);
  if (!allowed) {
    return json({ error: "Too many lookup attempts. Please wait a while and try again." }, 429);
  }

  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const phone = sanitize(body.phone || "").replace(/[\s\-()]/g, "");

  if (!isValidPhone(phone)) {
    return json({ error: "Please enter a valid phone number." }, 400);
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, items, total, payment_method, status, created_at
       FROM orders
       WHERE replace(replace(replace(replace(phone,' ',''),'-',''),'(',''),')','') = ?
       ORDER BY created_at DESC
       LIMIT 10`
    ).bind(phone).all();

    if (!results || results.length === 0) {
      return json({ orders: [] });
    }

    const orders = results.map(o => ({
      id:             o.id,
      name:           o.name,
      items:          safeParseJSON(o.items, []),
      total:          o.total,
      payment_method: o.payment_method,
      status:         o.status,
      created_at:     o.created_at,
    }));

    return json({ orders });
  } catch (e) {
    logError("POST /api/orders/lookup", e);
    return json({ error: "Lookup failed. Please try again." }, 500);
  }
}

function safeParseJSON(str, fallback) {
  try { return typeof str === "string" ? JSON.parse(str) : (str || fallback); } catch { return fallback; }
}
