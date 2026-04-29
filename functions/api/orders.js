// GET — list all orders
export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    "SELECT * FROM orders ORDER BY created_at DESC"
  ).all();
  return Response.json({ orders: results });
}

// POST — create new order AND decrement stock
export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    id,           // e.g. "ASB-1234567"
    name,
    phone,
    email,
    address,
    items,        // [{ pid, name, sz, qty, price }]
    total,
    payment_method,
    status = "pending",
  } = body;

  if (!id || !items || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── 1. Insert the order row ─────────────────────────────────────
  await env.DB.prepare(
    `INSERT INTO orders (id, user_id, items, total, status, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(
      id,
      name || email || "guest",
      JSON.stringify(items),
      total || 0,
      status
    )
    .run();

  // ── 2. Decrement stock for each product in the order ────────────
  for (const item of items) {
    if (!item.pid || item.pid === 6) continue; // skip custom/quote items
    const qty = Math.max(1, parseInt(item.qty) || 1);
    await env.DB.prepare(
      `UPDATE products
       SET stock = MAX(0, stock - ?)
       WHERE id = ?`
    )
      .bind(qty, item.pid)
      .run();
  }

  return Response.json({ success: true, id });
}

// PUT — update order status
export async function onRequestPut(context) {
  const { env, request } = context;
  const { id, status } = await request.json();
  await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();
  return Response.json({ success: true });
}
