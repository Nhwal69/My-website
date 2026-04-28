export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  return Response.json({ orders: results });
}

export async function onRequestPut(context) {
  const { env, request } = context;
  const { id, status } = await request.json();
  await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
  return Response.json({ success: true });
}
