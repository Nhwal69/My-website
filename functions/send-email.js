// ============================================================
//  POST /api/send-email  — server-side EmailJS proxy
//
//  Keeps EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID,
//  and EMAILJS_PUBLIC_KEY off the client entirely.
//  Validates the payload before forwarding to EmailJS.
// ============================================================
import { json, cors, sanitize, isValidEmail, rateLimit, logError } from "./_helpers.js";

export async function onRequestOptions() { return cors(); }

export async function onRequestPost(context) {
  const { env, request } = context;

  // ── Guard: required env vars ──────────────────────────
  if (!env.EMAILJS_SERVICE_ID || !env.EMAILJS_TEMPLATE_ID || !env.EMAILJS_PUBLIC_KEY) {
    logError("POST /api/send-email", "Missing EmailJS env vars");
    return json({ error: "Email service not configured" }, 500);
  }

  // ── Rate limit: 5 emails per IP per 10 minutes ────────
  const ip      = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await rateLimit(env.RATE_LIMIT, "email:" + ip, 5, 600);
  if (!allowed) {
    return json({ error: "Too many requests. Please wait before trying again." }, 429);
  }

  // ── Parse body ────────────────────────────────────────
  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const tp = body.templateParams || {};

  // ── Validate required template params ─────────────────
  const orderId   = sanitize(tp.order_id        || "");
  const custName  = sanitize(tp.customer_name   || "");
  const custEmail = sanitize(tp.customer_email  || "").toLowerCase();
  const toEmail   = sanitize(tp.to_email        || "").toLowerCase();
  const total     = sanitize(tp.total_amount    || "");

  if (!orderId || !/^ASB-[0-9]{7}$/.test(orderId)) {
    return json({ error: "Invalid order ID" }, 400);
  }
  if (!custName || custName.length < 2) {
    return json({ error: "customer_name is required" }, 400);
  }
  if (!isValidEmail(custEmail)) {
    return json({ error: "Invalid customer_email" }, 400);
  }
  if (!isValidEmail(toEmail)) {
    return json({ error: "Invalid to_email" }, 400);
  }
  if (!total) {
    return json({ error: "total_amount is required" }, 400);
  }

  // ── Build sanitized template params ───────────────────
  const cleanParams = {
    order_id:         orderId,
    customer_name:    custName,
    customer_phone:   sanitize(tp.customer_phone   || ""),
    customer_email:   custEmail,
    delivery_address: sanitize(tp.delivery_address || ""),
    delivery_notes:   sanitize(tp.delivery_notes   || "None").slice(0, 500),
    items_list:       sanitize(tp.items_list       || ""),
    total_amount:     total,
    payment_method:   sanitize(tp.payment_method   || ""),
    bkash_trx_id:     sanitize(tp.bkash_trx_id     || "N/A"),
    nagad_trx_id:     sanitize(tp.nagad_trx_id     || "N/A"),
    order_date:       sanitize(tp.order_date       || ""),
    to_email:         toEmail,
    reply_to:         custEmail,
  };

  // ── Forward to EmailJS ────────────────────────────────
  let response;
  try {
    response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        service_id:      env.EMAILJS_SERVICE_ID,
        template_id:     env.EMAILJS_TEMPLATE_ID,
        user_id:         env.EMAILJS_PUBLIC_KEY,
        template_params: cleanParams,
      }),
    });
  } catch (e) {
    logError("POST /api/send-email — EmailJS fetch", e);
    return json({ error: "Email delivery failed" }, 502);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    logError("POST /api/send-email — EmailJS error", response.status + " " + errText);
    return json({ success: false, error: "Email delivery failed" }, 502);
  }

  return json({ success: true });
}
