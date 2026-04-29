export async function onRequestPost(context) {
  const { password } = await context.request.json();

  if (password === context.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ success: false }), { status: 401 });
}
