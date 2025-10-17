export async function POST(req) {
  const { store, variantIds } = await req.json();
  if (!['autospec', 'linex'].includes(store) || !Array.isArray(variantIds)) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400 });
  }
  // STUB so the UI has data
  const variants = Object.fromEntries(
    variantIds.map(id => [String(id), {
      price: 2890,
      weight: 42000,
      image: 'https://via.placeholder.com/600x400',
      handle: 'placeholder',
      stock: 'in_stock'
    }])
  );
  return new Response(JSON.stringify({ variants }), {
    headers: { 'content-type': 'application/json' }
  });
}
