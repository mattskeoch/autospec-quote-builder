// lib/shopify.js
const META_NS = "quote";
const META_KEY = "compatible_vehicle_types";

function parseCompatValue(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();

  // JSON array? (e.g., ["dual_cab","american"])
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const arr = JSON.parse(text);
      return Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(Boolean) : [];
    } catch {
      // fall through to non-JSON parsing
    }
  }

  // Single token (e.g., "dual_cab") or comma-separated (e.g., "dual_cab,american")
  return text
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

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
  return parseCompatValue(mf.value);
}

/**
 * Try the right shop based on which variant ID we have.
 * If both present, prefer AUTOSPEC (they should match).
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

  if (autospecId) {
    const a = await fetchVariantCompat(AUTOSPEC_SHOP_DOMAIN, AUTOSPEC_ADMIN_TOKEN, autospecId);
    if (a.length) return a;
  }
  if (linexId) {
    const l = await fetchVariantCompat(LINEX_SHOP_DOMAIN, LINEX_ADMIN_TOKEN, linexId);
    if (l.length) return l;
  }

  // If neither returned values, still try both (in case one shop has empty but other has data)
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
