export async function onRequestGet(context) {
  const { env } = context;
  const { searchParams } = new URL(context.request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  let query = "SELECT * FROM products";
  const params = [];
  if (category) { query += " WHERE category = ?"; params.push(category); }
  else if (search) { query += " WHERE name LIKE ?"; params.push(`%${search}%`); }
  query += " ORDER BY created_at DESC";
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return Response.json({ products: re
