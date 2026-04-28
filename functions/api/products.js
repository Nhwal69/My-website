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
  return Response.json({ products: results });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const data = await request.json();
  if (!data.name || !data.price) return Response.json({ error: "Name and price required" }, { status: 400 });
  const result = await env.DB.prepare(
    "INSERT INTO products (name, description, price, image, category, stock) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
  ).bind(data.name, data.description||"", data.price, data.image||"", data.category||"Tees", data.stock||0).first();
  return Response.json({ product: result });
}

