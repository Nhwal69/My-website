export async function onRequestPost(context) {
  const { env, request } = context;
  const { email, password } = await request.json();
  const enc = new TextEncoder();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(password)))).map(b => b.toString(16).padStart(2,"0")).join("");
  const user = await env.DB.prepare("SELECT id, name, email FROM users WHERE email = ? AND password_hash = ?").bind(email, hash).first();
  if (!user) return Response.json({ error: "Invalid credentials" }, { status: 401 });
  const token = crypto.randomUUID();
  await env.KV.put(`session:${token}`, JSON.stringify(user), { expirationTtl: 86400 });
  return Response.json({ user, token });
}
