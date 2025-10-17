export const runtime = "edge";

async function getMetafields(domain, token, variantId) {
  const url = `https://${domain}/admin/api/2024-10/variants/${variantId}/metafields.json`;
  const res = await fetch(url, { headers: { "X-Shopify-Access-Token": token } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawVid = searchParams.get("variantId");
    const store = (searchParams.get("store") || "").toLowerCase();
    if (!rawVid) {
      return new Response(JSON.stringify({ ok: false, error: "variantId query param required" }), { status: 400 });
    }
    const variantId = Number(rawVid);
    const env = process.env;

    const targets = [];
    if (store === "autospec" || !store) {
      targets.push(["autospec", env.AUTOSPEC_SHOP_DOMAIN, env.AUTOSPEC_ADMIN_TOKEN]);
    }
    if (store === "linex" || !store) {
      targets.push(["linex", env.LINEX_SHOP_DOMAIN, env.LINEX_ADMIN_TOKEN]);
    }

    const results = [];
    for (const [label, domain, token] of targets) {
      if (!domain || !token) {
        results.push({ store: label, error: "missing domain/token" });
        continue;
      }
      const r = await getMetafields(domain, token, variantId);
      results.push({ store: label, ...r });
    }

    return new Response(JSON.stringify({ ok: true, variantId, results }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
