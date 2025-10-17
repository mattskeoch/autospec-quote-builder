export const runtime = 'edge';

export async function POST(req) {
  const json = await req.json().catch(() => ({}));
  const { store, variantIds } = json || {};
  if (!store || !Array.isArray(variantIds) || variantIds.length === 0) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // TODO: replace with Shopify call; stub for now
  const variants = Object.fromEntries(
    variantIds.map(id => [String(id), {
      price: 2890,
      weight: 42000,
      image: 'https://via.placeholder.com/600x400',
      handle: 'placeholder',
      stock: 'in_stock',
    }])
  );

  return new Response(JSON.stringify({ variants }), {
    headers: { 'content-type': 'application/json' },
  });
}
