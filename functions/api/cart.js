export async function onRequestGet(context) {
  const { env, request } = context;
  const token = request.headers.get("Authorization")?.replace("Bearer ","");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await env.KV.get(`cart:${token}`);
  return Response.json({ cart: data ? JSON.parse(data) : { items: [] } });
}
export async function onRequestPost(context) {
  const { env, request } = context;
  const token = request.headers.get("Authorization")?.replace("Bearer ","");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { productId, quantity = 1 } = await request.json();
  const data = await env.KV.get(`cart:${token}`);
  const cart = data ? JSON.parse(data) : { items: [] };
  const existing = cart.items.find(i => i.productId === productId);
  if (existing) existing.quantity += quantity; else cart.items.push({ productId, quantity });
  await env.KV.put(`cart:${token}`, JSON.stringify(cart));
  return Response.json({ cart });
}
