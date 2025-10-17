// lib/orders.js
function getBaseUrl() {
  // In server/edge contexts there’s no window — use an env.
  // Prefer SITE_URL (server-only), fallback to NEXT_PUBLIC_SITE_URL for convenience.
  const fromEnv = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  // Ensure no trailing slash
  return fromEnv.replace(/\/+$/, "");
}

export async function createDraftOrder(payload) {
  const isServer = typeof window === "undefined";
  const base = isServer ? getBaseUrl() : "";
  const url = `${base}/api/draft-order`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return { ok: false };
  return res.json();
}
