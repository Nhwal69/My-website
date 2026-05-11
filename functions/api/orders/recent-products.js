// ============================================================
//  GET /api/orders/recent-products
//  Returns anonymised recent order data for social proof
//  notifications. No PII — only product name, city abbreviation,
//  and minutes since the order was placed.
// ============================================================
import { json, cors, logError } from "../_helpers.js";

export async function onRequestOptions() { return cors(); }

export async function onRequestGet(context) {
  const { env } = context;

  try {
    // Fetch the last 20 confirmed/delivered orders placed within 48 hours
    const { results } = await env.DB.prepare(
      `SELECT items, address, created_at
       FROM orders
       WHERE status IN ('confirmed','processing','shipped','delivered')
         AND created_at >= datetime('now', '-48 hours')
       ORDER BY created_at DESC
       LIMIT 20`
    ).all();

    if (!results || !results.length) return json({ entries: [] });

    const now = Date.now();
    const entries = [];

    results.forEach(function(o) {
      let items;
      try { items = typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []); } catch { return; }

      // Pick the first real product (not custom id=6)
      const item = items.find(function(i) { return i.pid !== 6; });
      if (!item) return;

      // Derive city: take the last comma-delimited segment of address
      const parts  = (o.address || "").split(",").map(function(s) { return s.trim(); });
      const city   = parts[parts.length - 1] || "Bangladesh";

      // Minutes since order
      const orderMs   = new Date(o.created_at + (o.created_at.indexOf("Z") < 0 ? "Z" : "")).getTime();
      const minutesAgo = Math.max(1, Math.round((now - orderMs) / 60000));

      entries.push({
        productName: item.name,
        city:        city.slice(0, 40),
        minutesAgo:  minutesAgo,
      });
    });

    return json({ entries });
  } catch (e) {
    logError("GET /api/orders/recent-products", e);
    return json({ entries: [] });
  }
}
