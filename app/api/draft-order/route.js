export const runtime = 'edge';

/**
 * Required Cloudflare Pages env vars (set in Dashboard → Pages → Project → Settings → Environment variables)
 * - AUTOSPEC_SHOP_DOMAIN  (e.g. autospec-group.myshopify.com)
 * - AUTOSPEC_ADMIN_TOKEN  (secret)
 * - LINEX_SHOP_DOMAIN     (e.g. line-x-australia.myshopify.com)
 * - LINEX_ADMIN_TOKEN     (secret)
 *
 * Shopify app scopes needed:
 * - write_draft_orders
 * - read_products (optional if you validate variants ahead of time)
 */

function pickStoreByState(state) {
  const s = String(state || '').toUpperCase().trim();
  return s === 'WA' ? 'LINEX' : 'AUTOSPEC';
}

function getStoreEnv(storeKey) {
  const {
    AUTOSPEC_SHOP_DOMAIN,
    AUTOSPEC_ADMIN_TOKEN,
    LINEX_SHOP_DOMAIN,
    LINEX_ADMIN_TOKEN,
  } = process.env;

  if (storeKey === 'LINEX') {
    return { domain: LINEX_SHOP_DOMAIN, token: LINEX_ADMIN_TOKEN };
  }
  return { domain: AUTOSPEC_SHOP_DOMAIN, token: AUTOSPEC_ADMIN_TOKEN };
}

function badRequest(message, extra = {}) {
  return new Response(JSON.stringify({ ok: false, error: 'bad_request', message, ...extra }), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  });
}

function shopifyError(status, payload) {
  return new Response(JSON.stringify({ ok: false, error: 'shopify_error', status, payload }), {
    status: 502,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const customer = body?.customer || {};
  const items = Array.isArray(body?.items) ? body.items : [];
  const selections = body?.meta?.selections || undefined; // optional passthrough metadata

  // ---- Validate minimal input ----
  if (!customer?.email) return badRequest('customer.email is required');
  if (!items.length) return badRequest('items must contain at least one item');

  // Coerce variant IDs & quantities
  const line_items = [];
  for (const it of items) {
    const variantId = Number(it?.variantId);
    const quantity = Number(it?.quantity ?? 1);
    if (!Number.isFinite(variantId) || variantId <= 0) {
      return badRequest('All items must have a valid numeric variantId');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return badRequest('All items must have a positive quantity');
    }
    line_items.push({ variant_id: variantId, quantity });
  }

  // ---- Route store by state (WA → LINEX) ----
  const storeKey = pickStoreByState(customer.state);
  const { domain, token } = getStoreEnv(storeKey);

  if (!domain || !token) {
    return badRequest(`Missing env for store ${storeKey}. Ensure *_SHOP_DOMAIN and *_ADMIN_TOKEN are set.`);
  }

  // ---- Build Shopify REST Draft Order payload ----
  // Docs: https://shopify.dev/docs/api/admin-rest/2024-10/resources/draftorder#post-draft-orders
  const draftPayload = {
    draft_order: {
      line_items,
      email: customer.email,
      note: selections ? `Quote Builder selections: ${JSON.stringify(selections)}` : undefined,
      shipping_address: normalizeAddress(customer),
      billing_address: normalizeAddress(customer),
      // You can set tags to help ops identify origin
      tags: ['quote-builder'],
      // Set invoice_sent to false; you can send later via Admin
      use_customer_default_address: true,
    },
  };

  // ---- Call Shopify ----
  const url = `https://${domain}/admin/api/2024-10/draft_orders.json`;
  let shopRes, shopJson;
  try {
    shopRes = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify(draftPayload),
    });
    shopJson = await shopRes.json().catch(() => ({}));
  } catch (e) {
    return shopifyError(0, { message: 'Network error calling Shopify', detail: String(e) });
  }

  if (!shopRes.ok || !shopJson?.draft_order) {
    // Shopify returns errors in several shapes; surface something helpful
    const payload = shopJson?.errors || shopJson || { message: 'Unknown Shopify error' };
    return shopifyError(shopRes.status, payload);
  }

  const d = shopJson.draft_order;
  const draftOrderId = d.id; // numeric
  const adminUrl = `https://${domain}/admin/draft_orders/${draftOrderId}`;
  const invoiceUrl = d.invoice_url || null;

  return new Response(
    JSON.stringify({
      ok: true,
      store: storeKey.toLowerCase(),
      draftOrderId,
      orderUrl: adminUrl,   // Admin URL
      invoiceUrl,           // Public invoice link (if present)
    }),
    { headers: { 'content-type': 'application/json' } }
  );
}

/**
 * Map our simple customer fields into a Shopify address object.
 * Only includes available fields; Shopify accepts partial addresses.
 */
function normalizeAddress(c = {}) {
  const addr = {
    first_name: c.firstName || undefined,
    last_name: c.lastName || undefined,
    phone: c.phone || undefined,
    zip: c.postcode || undefined,
    province: c.state || undefined,
    // optional if you capture them later
    address1: c.address1 || undefined,
    address2: c.address2 || undefined,
    city: c.city || undefined,
    country: c.country || 'Australia',
  };
  // Remove undefined keys so we don’t send noise
  return Object.fromEntries(Object.entries(addr).filter(([, v]) => v != null && v !== ''));
}
