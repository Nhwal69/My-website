export async function onRequestPut(context) {
  const { env, request, params } = context;
  const id = params.id;
  const data = await request.json();
  const fields = [], vals = [];
  if (data.name !== undefined)        { fields.push("name = ?");        vals.push(data.name); }
  if (data.price !== undefined)       { fields.push("price = ?");       vals.push(data.price); }
  if (data.stock !== undefined)       { fields.push("stock = ?");       vals.push(data.stock); }
  if (data.category !== undefined)    { fields.push("category = ?");    vals.push(data.category); }
  if (data.image !== undefined)       { fields.push("image = ?");       vals.push(data.image); }
  if (data.description !== undefined) { fields.push("description = ?"); vals.push(data.description); }
  if (!fields.length) return Response.json({ error: "Nothing to update" }, { status: 400 });
  vals.push(id);
  await env.DB.prepare("UPDATE products SET " + fields.join(", ") + " WHERE id = ?").bind(...vals).run();
  return Response.json({ success: true });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(params.id).run();
  return Response.json({ success: true });
}
