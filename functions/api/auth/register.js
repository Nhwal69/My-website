export async function onRequestPost(context) {
  const { env, request } = context;
  const { name, email, password } = await request.json();
  if (!name || !email || !password) return Response.json({ error: "All fields required" }, { status: 400 });
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return Response.json({ error: "Email already registered" }, { status: 409 });
  const enc = new TextEncoder();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(password)))).map(b => b.toString(16).padStart(2,"0")).join("");
  const user = await env.DB.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id, name, email").bind(name, email, hash).first();
  const token = crypto.randomUUID();
  await env.KV.put(`session:${token}`, JSON.stringify(user), { expirationTtl: 86400 });
  return Response.json({ user, token });
}
