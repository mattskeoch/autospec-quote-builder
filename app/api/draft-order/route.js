export const runtime = 'edge';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : [];
  const customer = body?.customer || {};
  if (!items.length || !customer?.email) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // pick store (example: WA -> LINEX)
  const state = String(customer?.state || '').toUpperCase();
  const storeKey = state === 'WA' ? 'LINEX' : 'AUTOSPEC';

  const {
    AUTOSPEC_SHOP_DOMAIN,
    AUTOSPEC_ADMIN_TOKEN,
    LINEX_SHOP_DOMAIN,
    LINEX_ADMIN_TOKEN,
  } = process.env;

  const shopDomain =
    storeKey === 'LINEX' ? LINEX_SHOP_DOMAIN : AUTOSPEC_SHOP_DOMAIN;
  const adminToken =
    storeKey === 'LINEX' ? LINEX_ADMIN_TOKEN : AUTOSPEC_ADMIN_TOKEN;

  // TODO: swap stub with real Shopify Admin call using shopDomain/adminToken
  const id = Math.floor(Date.now() / 1000);
  const url = `https://${shopDomain}/admin/draft_orders/${id}`;

  return new Response(JSON.stringify({
    ok: true,
    draftOrderId: id,
    orderUrl: url,
    store: storeKey.toLowerCase(),
  }), {
    headers: { 'content-type': 'application/json' },
  });
}
