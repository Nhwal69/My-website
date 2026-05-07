// ============================================================
//  Admin Route Middleware
//  Protects all routes under /api/admin/*
//
//  FIX vs original:
//  - Original checked user.role === 'admin' but the users table
//    has no role column, so EVERY authenticated user got through.
//  - Now uses a dedicated "admin_session:" KV prefix that only
//    admin-login.js writes to. Regular user sessions can never
//    escalate to admin access.
// ============================================================
import { getAdminSession } from "../_helpers.js";

export async function onRequest({ request, env, next }) {
  const token = await getAdminSession(request, env.KV);

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return next();
}
