export async function onRequestPost(context) {
  const { env, request } = context;
  const { name, email, message } = await request.json();
  if (!name || !email || !message) return Response.json({ error: "All fields required" }, { status: 400 });
  await env.DB.prepare("INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)").bind(name, email, message).run();
  return Response.json({ success: true });
}
