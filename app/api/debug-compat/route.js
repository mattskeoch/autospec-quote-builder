export const runtime = "edge";

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const variantId = Number(searchParams.get("variantId") || "");
    const store = (searchParams.get("store") || "").toLowerCase();
    if (!variantId) {
      return new Response(JSON.stringify({ ok: false, error: "variantId required" }), { status: 400 });
    }

    const env = process.env;
    const targets = [];
    if (store === "autospec" || !store) {
      targets.push(["autospec", env.AUTOSPEC_SHOP_DOMAIN, env.AUTOSPEC_ADMIN_TOKEN]);
    }
    if (store === "linex" || !store) {
      targets.push(["linex", env.LINEX_SHOP_DOMAIN, env.LINEX_ADMIN_TOKEN]);
    }

    const out = [];
    for (const [label, domain, token] of targets) {
      if (!domain || !token) {
        out.push({ store: label, error: "missing domain/token" });
        continue;
      }
      const variantMetas = await getJson(
        `https://${domain}/admin/api/2024-10/variants/${variantId}/metafields.json`,
        { "X-Shopify-Access-Token": token }
      );
      const variantInfo = await getJson(
        `https://${domain}/admin/api/2024-10/variants/${variantId}.json`,
        { "X-Shopify-Access-Token": token }
      );
      const productId = variantInfo?.data?.variant?.product_id;
      let productMetas = null;
      if (productId) {
        productMetas = await getJson(
          `https://${domain}/admin/api/2024-10/products/${productId}/metafields.json`,
          { "X-Shopify-Access-Token": token }
        );
      }
      out.push({
        store: label,
        variantMetas,
        variantInfo: { status: variantInfo.status, ok: variantInfo.ok, productId },
        productMetas,
      });
    }

    return new Response(JSON.stringify({ ok: true, variantId, results: out }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
