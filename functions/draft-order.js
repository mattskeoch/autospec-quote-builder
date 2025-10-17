import { routeStoreByState } from '../lib/_server_store.js';

const allow = (origin, env) => {
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : '';
};

export async function onRequestOptions({ request, env }){
  const origin = request.headers.get('origin') || '';
  const headers = {
    'Access-Control-Allow-Origin': allow(origin, env),
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
  return new Response(null, { headers });
}

export async function onRequestPost({ request, env }){
  const origin = request.headers.get('origin') || '';
  const headers = {
    'content-type':'application/json',
    'Access-Control-Allow-Origin': allow(origin, env),
    'Vary':'Origin'
  };
  try {
    const body = await request.json();
    const state = body?.customer?.state || '';
    const routed = routeStoreByState(state);
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return new Response(JSON.stringify({ error:'no_items' }), { status:400, headers });
    const id = Math.floor(Date.now()/1000);
    const url = `https://example.com/${routed}/draft_orders/${id}`;
    return new Response(JSON.stringify({ ok:true, draftOrderId:id, orderUrl:url, store:routed }), { headers });
  } catch {
    return new Response(JSON.stringify({ error:'server_error' }), { status:500, headers });
  }
}
