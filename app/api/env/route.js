export const runtime = 'edge';

export async function GET() {
  const {
    AUTOSPEC_SHOP_DOMAIN,
    AUTOSPEC_ADMIN_TOKEN,
    LINEX_SHOP_DOMAIN,
    LINEX_ADMIN_TOKEN,
  } = process.env;

  // return booleans only—never echo secrets
  const payload = {
    has_AUTOSPEC_SHOP_DOMAIN: !!AUTOSPEC_SHOP_DOMAIN,
    has_AUTOSPEC_ADMIN_TOKEN: !!AUTOSPEC_ADMIN_TOKEN,
    has_LINEX_SHOP_DOMAIN: !!LINEX_SHOP_DOMAIN,
    has_LINEX_ADMIN_TOKEN: !!LINEX_ADMIN_TOKEN,
  };

  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
  });
}
