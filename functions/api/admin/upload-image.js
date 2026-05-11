// ============================================================
//  POST /api/admin/upload-image
//  Uploads a product image to Cloudflare R2
//  Auth: admin session (protected by _middleware.js)
// ============================================================

export async function onRequestPost(context) {
  const { env, request } = context;

  // Parse multipart form data
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Invalid form data" }, 400);
  }

  const file = formData.get("image");
  if (!file || typeof file === "string") {
    return json({ error: "No image file provided" }, 400);
  }

  // Validate file type
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({ error: "Only JPG, PNG, WebP, or GIF images are allowed" }, 400);
  }

  // Validate file size: max 5 MB
  const MAX_SIZE = 5 * 1024 * 1024;
  const buffer   = await file.arrayBuffer();
  if (buffer.byteLength > MAX_SIZE) {
    return json({ error: "Image must be under 5 MB" }, 400);
  }

  // Build unique filename: timestamp + sanitized original name
  const ext      = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const filename = Date.now() + "_" + safeName;

  try {
    await env.BUCKET.put(filename, buffer, {
      httpMetadata: { contentType: file.type },
    });
  } catch (e) {
    return json({ error: "Upload failed: " + e.message }, 500);
  }

  // Return the public URL
  const base      = (env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  const image_url = base ? base + "/" + filename : "/images/" + filename;

  return json({ success: true, filename, image_url });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
