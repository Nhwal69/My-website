export async function onRequestDelete(context) {
  const { env, params } = context;
  await env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(params.id).run();
  await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(params.id).run();
  return Response.json({ success: true });
}
