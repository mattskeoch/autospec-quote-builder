export const runtime = "edge";

import {
  getVariantWithProduct,
  pickImageUrl,
  productStorefrontUrl,
} from "@/lib/shopify";

// 5-minute in-memory cache per worker instance
const CACHE_TTL_MS = 5 * 60 * 1000;
const _cache = new Map(); // key: `${shop}:${id}` => { at: ts, data }

function shopEnv(store) {
  const s = (store || "autospec").toLowerCase();
  if (s === "linex") {
    return {
      shop: "linex",
      domain: process.env.LINEX_SHOP_DOMAIN,
      token: process.env.LINEX_ADMIN_TOKEN,
    };
  }
  return {
    shop: "autospec",
    domain: process.env.AUTOSPEC_SHOP_DOMAIN,
    token: process.env.AUTOSPEC_ADMIN_TOKEN,
  };
}

function readCache(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function writeCache(key, data) {
  _cache.set(key, { at: Date.now(), data });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { store = "autospec", variantIds = [] } = body || {};
    const env = shopEnv(store);

    if (!env.domain || !env.token) {
      return new Response(
        JSON.stringify({ variants: {}, note: "missing shop env" }),
        { headers: { "content-type": "application/json" } }
      );
    }

    const ids = [...new Set((variantIds || []).map((v) => Number(v)).filter(Boolean))];

    const pairs = await Promise.all(
      ids.map(async (id) => {
        const cacheKey = `${env.shop}:${id}`;
        const cached = readCache(cacheKey);
        if (cached) return [id, cached];

        const vp = await getVariantWithProduct(env.domain, env.token, id);
        if (!vp) {
          writeCache(cacheKey, null);
          return [id, null];
        }
        const { variant, product } = vp;

        // data shaping
        const price = Number(variant?.price ?? product?.variants?.[0]?.price ?? 0) || 0;
        const grams = Number(variant?.grams ?? 0) || 0;
        const weightKg = grams > 0 ? +(grams / 1000).toFixed(2) : null;
        const handle = product?.handle || null;
        const image = pickImageUrl(variant, product);
        const title = variant?.title && variant?.title !== "Default Title"
          ? `${product?.title || ""} – ${variant.title}`
          : product?.title || variant?.title || "";

        const productUrl = productStorefrontUrl(handle);

        const shaped = {
          id,
          price,
          weightKg,
          handle,
          image,
          title,
          productUrl,
        };

        writeCache(cacheKey, shaped);
        return [id, shaped];
      })
    );

    const variants = Object.fromEntries(
      pairs
        .filter(([, v]) => v) // drop nulls
        .map(([id, data]) => [String(id), data])
    );

    return new Response(JSON.stringify({ variants }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ variants: {}, error: String(e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
