// ============================================================
//  GET /api/admin/analytics  — basic store analytics
//  Protected by admin _middleware.js
// ============================================================
import { json, cors, logError } from "../_helpers.js";

export async function onRequestOptions() { return cors(); }

export async function onRequestGet(context) {
  const { env } = context;

  try {
    // Run all queries in parallel
    const [ordersResult, revenueResult, statusResult, recentResult] = await Promise.all([

      // Total order count
      env.DB.prepare("SELECT COUNT(*) as total FROM orders").first(),

      // Total revenue (confirmed/delivered orders only)
      env.DB.prepare(
        "SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status NOT IN ('cancelled', 'refunded')"
      ).first(),

      // Orders by status
      env.DB.prepare(
        "SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC"
      ).all(),

      // 7 most recent orders
      env.DB.prepare(
        `SELECT id, name, total, status, created_at
         FROM orders ORDER BY created_at DESC LIMIT 7`
      ).all(),
    ]);

    // Product revenue — parse items JSON in JS since D1 can't JSON_EACH
    const allOrders = await env.DB.prepare(
      "SELECT items, total FROM orders WHERE status NOT IN ('cancelled', 'refunded')"
    ).all();

    const productRevenue = {};
    (allOrders.results || []).forEach(function (o) {
      let items;
      try { items = typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []); } catch { return; }
      items.forEach(function (it) {
        if (!it.name) return;
        const key = it.name;
        if (!productRevenue[key]) productRevenue[key] = { name: key, units: 0, revenue: 0 };
        productRevenue[key].units   += (parseInt(it.qty, 10)   || 1);
        productRevenue[key].revenue += (parseFloat(it.price)   || 0) * (parseInt(it.qty, 10) || 1);
      });
    });

    const topProducts = Object.values(productRevenue)
      .sort(function (a, b) { return b.revenue - a.revenue; })
      .slice(0, 5);

    return json({
      summary: {
        totalOrders:   ordersResult?.total   || 0,
        totalRevenue:  revenueResult?.revenue || 0,
      },
      byStatus:     statusResult.results  || [],
      recentOrders: recentResult.results  || [],
      topProducts,
    });

  } catch (e) {
    logError("GET /api/admin/analytics", e);
    return json({ error: "Failed to load analytics" }, 500);
  }
}
