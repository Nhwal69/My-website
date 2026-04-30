// GET /api/products — list all products
export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params?.id?.[0];

  if (id) {
    // GET /api/products/:id
    const product = await env.DB.prepare(
      "SELECT * FROM products WHERE id = ?"
    ).bind(id).first();
    if (!product) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ product });
  }

  // GET /api/products — list all
  const { results } = await env.DB.prepare(
    "SELECT * FROM products ORDER BY id ASC"
  ).all();
  return Response.json({ products: results });
}

// POST /api/products — create a new product
export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, price, stock = 0, category = "Tees", image = "", description = "", tags = "" } = body;
  if (!name || !price) {
    return Response.json({ error: "name and price are required" }, { status: 400 });
  }
  const result = await env.DB.prepare(
    `INSERT INTO products (name, price, stock, category, image, description, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(name, price, stock, category, image, description, tags).run();

  return Response.json({ success: true, id: result.meta?.last_row_id });
}

// PUT /api/products/:id — update a product
export async function onRequestPut(context) {
  const { env, request, params } = context;
  const id = params?.id?.[0];
  if (!id) return Response.json({ error: "ID required" }, { status: 400 });

  const data = await request.json();
  const fields = [], vals = [];
  if (data.name !== undefined)        { fields.push("name = ?");        vals.push(data.name); }
  if (data.price !== undefined)       { fields.push("price = ?");       vals.push(data.price); }
  if (data.stock !== undefined)       { fields.push("stock = ?");       vals.push(data.stock); }
  if (data.category !== undefined)    { fields.push("category = ?");    vals.push(data.category); }
  if (data.image !== undefined)       { fields.push("image = ?");       vals.push(data.image); }
  if (data.description !== undefined) { fields.push("description = ?"); vals.push(data.description); }
  if (data.tags !== undefined)        { fields.push("tags = ?");        vals.push(data.tags); }
  if (!fields.length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  vals.push(id);
  await env.DB.prepare("UPDATE products SET " + fields.join(", ") + " WHERE id = ?").bind(...vals).run();
  return Response.json({ success: true });
}

// DELETE /api/products/:id
export async function onRequestDelete(context) {
  const { env, params } = context;
  const id = params?.id?.[0];
  if (!id) return Response.json({ error: "ID required" }, { status: 400 });
  await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  return Response.json({ success: true });
}
