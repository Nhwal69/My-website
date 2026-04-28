export async function onRequestPost(context) {
  const { env, request } = context;
  const token = request.headers.get("Authorization")?.replace("Bearer ","");
  const session = token ? await env.KV.get(`session:${token}`) : null;
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = JSON.parse(session);
  const { items, total } = await request.json();
  const order = await env.DB.prepare("INSERT INTO orders (user_id, total, status) VALUES (?, ?, 'pending') RETURNING id").bind(user.id, total).first();
  for (const item of items) {
    await env.DB.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)").bind(order.id, item.productId, item.quantity, item.price).run();
  }
  await env.KV.delete(`cart:${token}`);
  return Response.json({ order });
}
