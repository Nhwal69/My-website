export async function onRequestDelete(context) {
  const { env, params } = context;
  const id = params?.id?.[0];
  if (!id) return Response.json({ error: "ID required" }, { status: 400 });
  try {
    await env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
