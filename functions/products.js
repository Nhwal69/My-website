// ============================================================
//  GET  /api/products        — list all products (public)
//  POST /api/products        — create a product  (admin only)
// ============================================================
import { json, cors, sanitize, isPositiveInt, getAdminSession, logError } from "./_helpers.js";

export async function onRequestOptions() { return cors(); }

// ── GET — list all products ───────────────────────────────
export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    const { searchParams } = new URL(request.url);
    const category = sanitize(searchParams.get("category") || "");
    const search   = sanitize(searchParams.get("search")   || "");

    let query  = "SELECT id, name, description, price, image_url, category, stock, tags FROM products";
    const params = [];

    if (category) {
      query += " WHERE category = ?";
      params.push(category);
    } else if (search) {
      query += " WHERE name LIKE ?";
      params.push("%" + search + "%");
    }
    query += " ORDER BY id ASC";

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Ensure image_url is always a full URL or null, never a bare filename
    const products = results.map(p => ({
      ...p,
      image_url: buildImageUrl(p.image_url, env),
    }));

    return json({ products });
  } catch (e) {
    logError("GET /api/products", e);
    return json({ error: "Failed to fetch products" }, 500);
  }
}

// ── POST — create product (admin only) ────────────────────
export async function onRequestPost(context) {
  const { env, request } = context;

  // Auth check
  const adminToken = await getAdminSession(request, env.KV);
  if (!adminToken) return json({ error: "Unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Validate required fields
  const name  = sanitize(body.name  || "");
  const price = parseFloat(body.price);
  const stock = parseInt(body.stock ?? 0, 10);

  const errors = [];
  if (!name || name.length < 2 || name.length > 120) errors.push("name must be 2–120 characters");
  if (!Number.isFinite(price) || price < 0)           errors.push("price must be a non-negative number");
  if (!isPositiveInt(stock))                           errors.push("stock must be a non-negative integer");
  if (errors.length) return json({ errors }, 400);

  const description = sanitize(body.description || "");
  const category    = sanitize(body.category    || "Tees");
  const tags        = sanitize(body.tags        || "");
  const image_url   = sanitize(body.image_url   || body.image || "");

  try {
    const result = await env.DB.prepare(
      `INSERT INTO products (name, description, price, image_url, category, stock, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(name, description, price, image_url, category, stock, tags).run();

    return json({ success: true, id: result.meta?.last_row_id }, 201);
  } catch (e) {
    logError("POST /api/products", e);
    return json({ error: "Failed to create product" }, 500);
  }
}

// ── Helper: build full image URL ──────────────────────────
function buildImageUrl(raw, env) {
  if (!raw) return null;
  // Already a full URL
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // Bare filename — prepend R2 public bucket URL from env var
  const base = (env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (base) return base + "/" + raw;
  // Fallback: serve from /images/ on the same domain
  return "/images/" + raw;
}
