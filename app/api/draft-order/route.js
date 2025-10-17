function routeStoreByState(state) {
  return String(state || '').toUpperCase() === 'WA' ? 'linex' : 'autospec';
}

export async function POST(req) {
  const body = await req.json();
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) {
    return new Response(JSON.stringify({ error: 'no_items' }), { status: 400 });
  }

  const routed = routeStoreByState(body?.customer?.state);
  const id = Math.floor(Date.now() / 1000);
  const url = `https://example.com/${routed}/draft_orders/${id}`;

  return new Response(JSON.stringify({ ok: true, draftOrderId: id, orderUrl: url, store: routed }), {
    headers: { 'content-type': 'application/json' }
  });
}
