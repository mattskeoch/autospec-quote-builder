// lib/shopify.js
const META_NS = "quote";
const META_KEY = "compatible_vehicle_types";

/**
 * Fetch variant metafields via the variant-specific endpoint.
 * Returns the array from quote.compatible_vehicle_types, or [] if unset.
 */
async function fetchVariantCompat(domain, token, variantId) {
  if (!domain || !token || !variantId) return [];
  const url = `https://${domain}/admin/api/2024-10/variants/${variantId}/metafields.json`;
  const res = await fetch(url, { headers: { "X-Shopify-Access-Token": token } });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  const list = Array.isArray(json?.metafields) ? json.metafields : [];
  const mf = list.find(m => m.namespace === META_NS && m.key === META_KEY);
  if (!mf?.value) return [];
  try {
    const arr = JSON.parse(mf.value);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Try the right shop based on which variant ID we have.
 * If we only have AUTOSPEC id -> read AUTOSPEC.
 * If we only have LINEX id -> read LINEX.
 * If we have both, prefer AUTOSPEC (they should match).
 */
export async function getVariantCompatKeysForItem(vbs, env) {
  const autospecId = vbs?.autospec ? Number(vbs.autospec) : undefined;
  const linexId = vbs?.linex ? Number(vbs.linex) : undefined;

  const {
    AUTOSPEC_SHOP_DOMAIN,
    AUTOSPEC_ADMIN_TOKEN,
    LINEX_SHOP_DOMAIN,
    LINEX_ADMIN_TOKEN,
  } = env || process.env;

  // Prefer reading from the shop that matches the ID we’re using
  if (autospecId) {
    const a = await fetchVariantCompat(AUTOSPEC_SHOP_DOMAIN, AUTOSPEC_ADMIN_TOKEN, autospecId);
    if (a.length) return a;
  }
  if (linexId) {
    const l = await fetchVariantCompat(LINEX_SHOP_DOMAIN, LINEX_ADMIN_TOKEN, linexId);
    if (l.length) return l;
  }

  // Fallback: try both if we didn’t already
  if (autospecId) {
    const a = await fetchVariantCompat(AUTOSPEC_SHOP_DOMAIN, AUTOSPEC_ADMIN_TOKEN, autospecId);
    if (a.length) return a;
  }
  if (linexId) {
    const l = await fetchVariantCompat(LINEX_SHOP_DOMAIN, LINEX_ADMIN_TOKEN, linexId);
    if (l.length) return l;
  }

  return []; // treat as "fits all"
}
