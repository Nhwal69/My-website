export async function onRequestPost(context) {
  const { env, request } = context;

  // Step 3 — Rate limiting
  const ip = request.headers.get('CF-Connecting-IP');
  const rateKey = `login:${ip}`;
  const attempts = parseInt(await env.RATE_LIMIT.get(rateKey) || '0');
  if (attempts >= 5) {
    return new Response(JSON.stringify({ error: 'Too many attempts. Try again in 5 minutes.' }), { status: 429 });
  }
  await env.RATE_LIMIT.put(rateKey, String(attempts + 1), { expirationTtl: 300 });

  const { email, password } = await request.json();

  // Step 2 — Fetch user and verify salted hash
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(user.salt + password));
  const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (hash !== user.password_hash) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email };
  const token = crypto.randomUUID();
  await env.KV.put(`session:${token}`, JSON.stringify(safeUser), { expirationTtl: 86400 });
  return Response.json({ user: safeUser, token });
}
