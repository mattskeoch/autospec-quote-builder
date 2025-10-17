// lib/shopify.js
const META_NS = "quote";
const META_KEY = "compatible_vehicle_types"; // list.single_line_text_field (JSON array string)

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Returns an array of strings (e.g., ['dual_cab','american']) or [] if unset.
 * variantId must be the numeric ID for the target shop.
 */
export async function getVariantCompatKeys(domain, token, variantId) {
  if (!domain || !token || !variantId) return [];
  const url =
    `https://${domain}/admin/api/2024-10/metafields.json` +
    `?metafield[owner_id]=${variantId}` +
    `&metafield[owner_resource]=variant` +
    `&metafield[namespace]=${META_NS}` +
    `&metafield[key]=${META_KEY}`;

  const { ok, data } = await fetchJson(url, { "X-Shopify-Access-Token": token });
  if (!ok || !Array.isArray(data?.metafields) || data.metafields.length === 0) return [];

  const raw = data.metafields[0]?.value;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
