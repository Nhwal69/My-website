import { validateRegistration, sanitize } from './_validate.js';

export async function onRequestPost(context) {
  const { env, request } = context;

  // Step 3 — Rate limiting
  const ip = request.headers.get('CF-Connecting-IP');
  const rateKey = `register:${ip}`;
  const attempts = parseInt(await env.RATE_LIMIT.get(rateKey) || '0');
  if (attempts >= 5) {
    return new Response(JSON.stringify({ error: 'Too many attempts. Try again in 5 minutes.' }), { status: 429 });
  }
  await env.RATE_LIMIT.put(rateKey, String(attempts + 1), { expirationTtl: 300 });

  // Step 4 — Sanitize & validate input
  const body = await request.json();
  const sanitized = {
    name: sanitize(body.name),
    email: sanitize(body.email),
    password: body.password,
  };
  const errors = validateRegistration(sanitized);
  if (errors.length) {
    return new Response(JSON.stringify({ errors }), { status: 400 });
  }

  const { name, email, password } = sanitized;

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return Response.json({ error: 'Email already registered' }, { status: 409 });

  // Step 1 — Hash password with salt
  const salt = crypto.randomUUID();
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(salt + password));
  const password_hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const user = await env.DB.prepare(
    'INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?) RETURNING id, name, email'
  ).bind(name, email, password_hash, salt).first();

  const token = crypto.randomUUID();
  await env.KV.put(`session:${token}`, JSON.stringify(user), { expirationTtl: 86400 });
  return Response.json({ user, token });
}
