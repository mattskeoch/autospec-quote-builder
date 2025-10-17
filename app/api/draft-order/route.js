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

  // TODO: replace with Shopify Admin draft order create; stub for now
  const routed = String(customer?.state || '').toUpperCase() === 'WA' ? 'linex' : 'autospec';
  const id = Math.floor(Date.now() / 1000);
  const url = `https://example.com/${routed}/draft_orders/${id}`;

  return new Response(JSON.stringify({ ok: true, draftOrderId: id, orderUrl: url, store: routed }), {
    headers: { 'content-type': 'application/json' },
  });
}
