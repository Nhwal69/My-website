export async function onRequest({ request, env, next }) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const session = await env.KV.get(`session:${token}`);
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const user = JSON.parse(session);
  if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  return next();
}
