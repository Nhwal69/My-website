// ============================================================
//  POST /api/auth/logout  — invalidate session token
// ============================================================
import { json, cors, logError } from "../_helpers.js";

export async function onRequestOptions() { return cors(); }

export async function onRequestPost(context) {
  const { env, request } = context;

  const auth  = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!token) return json({ success: true }); // nothing to invalidate

  try {
    // Try both namespaces — works for customer and admin sessions
    await Promise.allSettled([
      env.KV.delete("session:"       + token),
      env.KV.delete("admin_session:" + token),
    ]);
  } catch (e) {
    logError("POST /api/auth/logout", e);
  }

  return json({ success: true });
}
