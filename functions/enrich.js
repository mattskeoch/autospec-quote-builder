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
    const { store, variantIds } = await request.json();
    if (!['autospec','linex'].includes(store) || !Array.isArray(variantIds)){
      return new Response(JSON.stringify({ error:'bad_request' }), { status:400, headers });
    }
    const variants = Object.fromEntries(variantIds.map(id=>[String(id), {
      price: 2890, weight: 42000, image: 'https://via.placeholder.com/600x400', handle: 'placeholder', stock: 'in_stock'
    }]));
    return new Response(JSON.stringify({ variants }), { headers });
  } catch {
    return new Response(JSON.stringify({ error:'server_error' }), { status:500, headers });
  }
}
