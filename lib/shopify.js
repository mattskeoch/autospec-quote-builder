// lib/shopify.js
const META_NS = "quote";
const META_KEY = "compatible_vehicle_types";

function parseCompatValue(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const arr = JSON.parse(text);
      return Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
    } catch { }
  }
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function readVariantCompat(domain, token, variantId) {
  const url = `https://${domain}/admin/api/2024-10/variants/${variantId}/metafields.json`;
  const { ok, data } = await getJson(url, { "X-Shopify-Access-Token": token });
  if (!ok) return [];
  const list = Array.isArray(data?.metafields) ? data.metafields : [];
  const mf = list.find((m) => m.namespace === META_NS && m.key === META_KEY);
  return mf?.value ? parseCompatValue(mf.value) : [];
}

async function getProductIdForVariant(domain, token, variantId) {
  const url = `https://${domain}/admin/api/2024-10/variants/${variantId}.json`;
  const { ok, data } = await getJson(url, { "X-Shopify-Access-Token": token });
  if (!ok) return null;
  return data?.variant?.product_id ?? null;
}

async function readProductCompat(domain, token, productId) {
  const url = `https://${domain}/admin/api/2024-10/products/${productId}/metafields.json`;
  const { ok, data } = await getJson(url, { "X-Shopify-Access-Token": token });
  if (!ok) return [];
  const list = Array.isArray(data?.metafields) ? data.metafields : [];
  const mf = list.find((m) => m.namespace === META_NS && m.key === META_KEY);
  return mf?.value ? parseCompatValue(mf.value) : [];
}

/**
 * Prefer matching shop by which ID we have; fallback to the other.
 * Returns [] if neither has a value (treated as "fits all").
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

  async function readFor(domain, token, variantId) {
    // 1) Try variant-level metafield
    const v = await readVariantCompat(domain, token, variantId);
    if (v.length) return v;
    // 2) Fallback to product-level metafield
    const productId = await getProductIdForVariant(domain, token, variantId);
    if (!productId) return [];
    const p = await readProductCompat(domain, token, productId);
    return p;
  }

  if (autospecId && AUTOSPEC_SHOP_DOMAIN && AUTOSPEC_ADMIN_TOKEN) {
    const v = await readFor(AUTOSPEC_SHOP_DOMAIN, AUTOSPEC_ADMIN_TOKEN, autospecId);
    if (v.length) return v;
  }
  if (linexId && LINEX_SHOP_DOMAIN && LINEX_ADMIN_TOKEN) {
    const v = await readFor(LINEX_SHOP_DOMAIN, LINEX_ADMIN_TOKEN, linexId);
    if (v.length) return v;
  }

  // Try the other shop as a last resort (in case of mismatched ID usage)
  if (linexId && AUTOSPEC_SHOP_DOMAIN && AUTOSPEC_ADMIN_TOKEN) {
    const v = await readFor(AUTOSPEC_SHOP_DOMAIN, AUTOSPEC_ADMIN_TOKEN, linexId);
    if (v.length) return v;
  }
  if (autospecId && LINEX_SHOP_DOMAIN && LINEX_ADMIN_TOKEN) {
    const v = await readFor(LINEX_SHOP_DOMAIN, LINEX_ADMIN_TOKEN, autospecId);
    if (v.length) return v;
  }

  return [];
}
