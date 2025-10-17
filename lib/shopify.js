// lib/shopify.js

// ----- Constants -----
const META_NS = "quote";
const META_KEY = "compatible_vehicle_types";

// ----- Small utils -----
export function ensureUrlBase(u = "") {
  return String(u || "").replace(/\/+$/, "");
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ----- Product/Variant fetch + shaping (for /api/enrich) -----
export async function getVariantWithProduct(domain, token, variantId) {
  if (!domain || !token || !variantId) return null;

  const vRes = await getJson(
    `https://${domain}/admin/api/2024-10/variants/${variantId}.json`,
    { "X-Shopify-Access-Token": token }
  );
  if (!vRes.ok || !vRes?.data?.variant) return null;

  const variant = vRes.data.variant;
  const productId = variant.product_id;

  const pRes = await getJson(
    `https://${domain}/admin/api/2024-10/products/${productId}.json`,
    { "X-Shopify-Access-Token": token }
  );
  const product = pRes.ok ? pRes?.data?.product ?? null : null;

  return { variant, product };
}

export function pickImageUrl(variant, product) {
  const vid = variant?.image_id;
  const productImages = product?.images || [];
  if (vid) {
    const match = productImages.find((img) => img.id === vid);
    if (match?.src) return match.src;
  }
  if (variant?.image?.src) return variant.image.src;
  return productImages[0]?.src || null;
}

export function productStorefrontUrl(handle, opts = {}) {
  const base = ensureUrlBase(
    opts.baseUrl ||
    process.env.NEXT_PUBLIC_AUTOSPEC_STOREFRONT ||
    "https://autospec4x4.com.au"
  );
  if (!handle) return null;
  return `${base}/products/${handle}`;
}

// ----- Compatibility (variant first, then product fallback) -----
function parseCompatValue(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();

  // JSON array?
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const arr = JSON.parse(text);
      return Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
    } catch {
      // fall through
    }
  }

  // single token or comma-separated
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function readVariantCompat(domain, token, variantId) {
  const r = await getJson(
    `https://${domain}/admin/api/2024-10/variants/${variantId}/metafields.json`,
    { "X-Shopify-Access-Token": token }
  );
  if (!r.ok) return [];
  const list = Array.isArray(r?.data?.metafields) ? r.data.metafields : [];
  const mf = list.find((m) => m.namespace === META_NS && m.key === META_KEY);
  return mf?.value ? parseCompatValue(mf.value) : [];
}

async function getProductIdForVariant(domain, token, variantId) {
  const r = await getJson(
    `https://${domain}/admin/api/2024-10/variants/${variantId}.json`,
    { "X-Shopify-Access-Token": token }
  );
  if (!r.ok) return null;
  return r?.data?.variant?.product_id ?? null;
}

async function readProductCompat(domain, token, productId) {
  const r = await getJson(
    `https://${domain}/admin/api/2024-10/products/${productId}/metafields.json`,
    { "X-Shopify-Access-Token": token }
  );
  if (!r.ok) return [];
  const list = Array.isArray(r?.data?.metafields) ? r.data.metafields : [];
  const mf = list.find((m) => m.namespace === META_NS && m.key === META_KEY);
  return mf?.value ? parseCompatValue(mf.value) : [];
}

/**
 * Prefer reading from the shop that matches the present variant id.
 * If no value at variant level, fallback to product level.
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
    if (!domain || !token || !variantId) return [];
    const v = await readVariantCompat(domain, token, variantId);
    if (v.length) return v;
    const productId = await getProductIdForVariant(domain, token, variantId);
    if (!productId) return [];
    const p = await readProductCompat(domain, token, productId);
    return p;
  }

  // Try matching shop first
  if (autospecId) {
    const v = await readFor(AUTOSPEC_SHOP_DOMAIN, AUTOSPEC_ADMIN_TOKEN, autospecId);
    if (v.length) return v;
  }
  if (linexId) {
    const v = await readFor(LINEX_SHOP_DOMAIN, LINEX_ADMIN_TOKEN, linexId);
    if (v.length) return v;
  }

  // Last resort: try the other shop in case of ID/store mismatch
  if (linexId) {
    const v = await readFor(AUTOSPEC_SHOP_DOMAIN, AUTOSPEC_ADMIN_TOKEN, linexId);
    if (v.length) return v;
  }
  if (autospecId) {
    const v = await readFor(LINEX_SHOP_DOMAIN, LINEX_ADMIN_TOKEN, autospecId);
    if (v.length) return v;
  }

  return [];
}
