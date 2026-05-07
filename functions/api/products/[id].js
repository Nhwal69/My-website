// ============================================================
//  GET    /api/products/:id   — fetch one product  (public)
//  PUT    /api/products/:id   — update a product   (admin only)
//  DELETE /api/products/:id   — delete a product   (admin only)
// ============================================================
import { json, cors, sanitize, isPositiveInt, getAdminSession, logError } from "../_helpers.js";

export async function onRequestOptions() { return cors(); }

// ── GET — single product ──────────────────────────────────
export async function onRequestGet(context) {
  const { env, params } = context;
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return json({ error: "Invalid product ID" }, 400);

  try {
    const product = await env.DB.prepare(
      "SELECT id, name, description, price, image_url, category, stock, tags FROM products WHERE id = ?"
    ).bind(id).first();

    if (!product) return json({ error: "Product not found" }, 404);
    product.image_url = buildImageUrl(product.image_url, env);
    return json({ product });
  } catch (e) {
    logError("GET /api/products/:id", e);
    return json({ error: "Failed to fetch product" }, 500);
  }
}

// ── PUT — update product (admin only) ─────────────────────
export async function onRequestPut(context) {
  const { env, request, params } = context;
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return json({ error: "Invalid product ID" }, 400);

  const adminToken = await getAdminSession(request, env.KV);
  if (!adminToken) return json({ error: "Unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const fields = [], vals = [];

  if (body.name !== undefined) {
    const name = sanitize(body.name);
    if (name.length < 2 || name.length > 120) return json({ error: "name must be 2–120 characters" }, 400);
    fields.push("name = ?"); vals.push(name);
  }
  if (body.price !== undefined) {
    const price = parseFloat(body.price);
    if (!Number.isFinite(price) || price < 0) return json({ error: "price must be non-negative" }, 400);
    fields.push("price = ?"); vals.push(price);
  }
  if (body.stock !== undefined) {
    const stock = parseInt(body.stock, 10);
    if (!isPositiveInt(stock)) return json({ error: "stock must be a non-negative integer" }, 400);
    fields.push("stock = ?"); vals.push(stock);
  }
  if (body.description !== undefined) { fields.push("description = ?"); vals.push(sanitize(body.description)); }
  if (body.category    !== undefined) { fields.push("category = ?");    vals.push(sanitize(body.category)); }
  if (body.tags        !== undefined) { fields.push("tags = ?");        vals.push(sanitize(body.tags)); }
  if (body.image_url   !== undefined) { fields.push("image_url = ?");   vals.push(sanitize(body.image_url || body.image || "")); }

  if (!fields.length) return json({ error: "No fields to update" }, 400);

  try {
    vals.push(id);
    const result = await env.DB.prepare(
      "UPDATE products SET " + fields.join(", ") + " WHERE id = ?"
    ).bind(...vals).run();

    if (result.meta?.changes === 0) return json({ error: "Product not found" }, 404);
    return json({ success: true });
  } catch (e) {
    logError("PUT /api/products/:id", e);
    return json({ error: "Failed to update product" }, 500);
  }
}

// ── DELETE — remove product (admin only) ──────────────────
export async function onRequestDelete(context) {
  const { env, request, params } = context;
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return json({ error: "Invalid product ID" }, 400);

  const adminToken = await getAdminSession(request, env.KV);
  if (!adminToken) return json({ error: "Unauthorized" }, 401);

  try {
    const result = await env.DB.prepare(
      "DELETE FROM products WHERE id = ?"
    ).bind(id).run();

    if (result.meta?.changes === 0) return json({ error: "Product not found" }, 404);
    return json({ success: true });
  } catch (e) {
    logError("DELETE /api/products/:id", e);
    return json({ error: "Failed to delete product" }, 500);
  }
}

// ── Helper ────────────────────────────────────────────────
function buildImageUrl(raw, env) {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const base = (env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (base) return base + "/" + raw;
  return "/images/" + raw;
}
