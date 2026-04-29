export async function onRequestPost(context) {
  const { name, email, message } = await context.request.json();

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: context.env.EMAILJS_SERVICE_ID,
      template_id: context.env.EMAILJS_TEMPLATE_ID,
      user_id: context.env.EMAILJS_PUBLIC_KEY,
      template_params: { name, email, message }
    })
  });

  return new Response(JSON.stringify({ success: response.ok }), {
    headers: { "Content-Type": "application/json" }
  });
}
