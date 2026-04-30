// Shared CORS helper — keeps responses consistent
function cors(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// GET — list all orders
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM orders ORDER BY created_at DESC"
    ).all();
    // Parse items JSON string back to array for each order
    const orders = results.map(o => ({
      ...o,
      items: (() => { try { return typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []); } catch { return []; } })()
    }));
    return cors({ orders });
  } catch (e) {
    return cors({ error: "Database error: " + e.message }, 500);
  }
}

// POST — create new order AND decrement stock
export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try { body = await request.json(); } catch {
    return cors({ error: "Invalid JSON" }, 400);
  }

  const {
    id, name, phone, email, address,
    items, total, payment_method, status = "pending",
  } = body;

  if (!id || !items || !Array.isArray(items) || items.length === 0) {
    return cors({ error: "Missing required fields" }, 400);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO orders (id, user_id, name, phone, email, address, items, total, payment_method, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id,
      name || email || "guest",
      name || "",
      phone || "",
      email || "",
      address || "",
      JSON.stringify(items),
      total || 0,
      payment_method || "cash",
      status
    ).run();
  } catch (e) {
    // Fallback: try old schema without extra columns
    await env.DB.prepare(
      `INSERT INTO orders (id, user_id, items, total, status, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, name || email || "guest", JSON.stringify(items), total || 0, status).run();
  }

  // Decrement stock
  for (const item of items) {
    if (!item.pid || item.pid === 6) continue;
    const qty = Math.max(1, parseInt(item.qty) || 1);
    await env.DB.prepare(
      `UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?`
    ).bind(qty, item.pid).run();
  }

  return cors({ success: true, id });
}

// PUT — update order status
export async function onRequestPut(context) {
  const { env, request } = context;
  try {
    const { id, status } = await request.json();
    if (!id || !status) return cors({ error: "id and status required" }, 400);
    await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
    return cors({ success: true });
  } catch (e) {
    return cors({ error: e.message }, 500);
  }
}
