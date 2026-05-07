// ============================================================
//  PATCH /api/orders/:id  — update order status (admin only)
//  GET   /api/orders/:id  — fetch single order  (admin only)
// ============================================================
import { json, cors, sanitize, getAdminSession, logError } from "../_helpers.js";

const VALID_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];

export async function onRequestOptions() { return cors(); }

// ── GET — fetch single order ──────────────────────────────
export async function onRequestGet(context) {
  const { env, request, params } = context;

  const adminToken = await getAdminSession(request, env.KV);
  if (!adminToken) return json({ error: "Unauthorized" }, 401);

  const id = sanitize(params.id || "");
  if (!id) return json({ error: "Order ID required" }, 400);

  try {
    const order = await env.DB.prepare(
      `SELECT id, name, phone, email, address, items, total,
              payment_method, status, created_at
       FROM orders WHERE id = ?`
    ).bind(id).first();

    if (!order) return json({ error: "Order not found" }, 404);
    order.items = safeParseJSON(order.items, []);
    return json({ order });
  } catch (e) {
    logError("GET /api/orders/:id", e);
    return json({ error: "Failed to fetch order" }, 500);
  }
}

// ── PATCH — update order status ───────────────────────────
export async function onRequestPatch(context) {
  const { env, request, params } = context;

  const adminToken = await getAdminSession(request, env.KV);
  if (!adminToken) return json({ error: "Unauthorized" }, 401);

  const id = sanitize(params.id || "");
  if (!id) return json({ error: "Order ID required" }, 400);

  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const status = sanitize(body.status || "");
  if (!VALID_STATUSES.includes(status)) {
    return json({ error: "Invalid status. Must be one of: " + VALID_STATUSES.join(", ") }, 400);
  }

  try {
    const result = await env.DB.prepare(
      "UPDATE orders SET status = ? WHERE id = ?"
    ).bind(status, id).run();

    if (result.meta?.changes === 0) return json({ error: "Order not found" }, 404);
    return json({ success: true, id, status });
  } catch (e) {
    logError("PATCH /api/orders/:id", e);
    return json({ error: "Failed to update order status" }, 500);
  }
}

// ── Helper ────────────────────────────────────────────────
function safeParseJSON(str, fallback) {
  try { return typeof str === "string" ? JSON.parse(str) : (str || fallback); } catch { return fallback; }
}
