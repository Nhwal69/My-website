// ============================================================
//  ARCTIC SHOP BD — Global API Middleware
//  Runs before every /api/* request.
//  Handles: CORS preflight, security headers on all responses,
//  suspicious request detection, and basic logging.
// ============================================================

const ALLOWED_ORIGINS = [
  "https://arcticshopbd.pages.dev",
  "https://www.arcticshopbd.pages.dev",
  // Add your custom domain here if you have one:
  // "https://arcticshopbd.com",
];

// Paths that are truly public (no origin restriction needed)
const PUBLIC_PATHS = [
  "/api/products",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/admin-login",
  "/api/orders",          // POST only — checked in route handler
  "/api/send-email",      // rate limited in route handler
];

export async function onRequest({ request, env, next }) {
  const url    = new URL(request.url);
  const origin = request.headers.get("Origin") || "";
  const method = request.method.toUpperCase();

  // ── Handle CORS preflight ────────────────────────────────
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // ── Log suspicious patterns ───────────────────────────────
  const ua = request.headers.get("User-Agent") || "";
  if (isSuspicious(ua, url.pathname)) {
    console.warn("[Arctic API] Suspicious request:", method, url.pathname, "UA:", ua.slice(0, 80));
    // Still process — just log. Block only at firewall level.
  }

  // ── Execute route handler ─────────────────────────────────
  let response;
  try {
    response = await next();
  } catch (e) {
    console.error("[Arctic API] Unhandled error:", url.pathname, e instanceof Error ? e.message : e);
    response = new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Add security headers to all API responses ─────────────
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options",        "DENY");
  headers.set("Referrer-Policy",        "strict-origin-when-cross-origin");
  headers.set("Cache-Control",          "no-store");

  // Add CORS headers
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v));

  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── CORS headers builder ──────────────────────────────────
function corsHeaders(origin) {
  // In dev (no origin) or allowed origins, reflect the origin
  const allowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin)
    ? (origin || ALLOWED_ORIGINS[0])
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin":      allowedOrigin,
    "Access-Control-Allow-Methods":     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":     "Content-Type,Authorization",
    "Access-Control-Allow-Credentials": "false",
    "Access-Control-Max-Age":           "86400",
  };
}

// ── Suspicious request heuristics ────────────────────────
function isSuspicious(ua, path) {
  if (!ua) return true;                            // no User-Agent header
  if (/sqlmap|nikto|nmap|masscan/i.test(ua)) return true;
  if (/\.\.\//g.test(path)) return true;           // path traversal attempt
  if (/<script|%3Cscript/i.test(path)) return true; // XSS in URL
  return false;
}
