export const runtime = 'edge';

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

async function variantExists(domain, token, variantId) {
  const url = `https://${domain}/admin/api/2024-10/variants/${variantId}.json`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'X-Shopify-Access-Token': token }
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    // Treat other errors as unknown; bubble up so user sees payload
    const j = await res.json().catch(() => ({}));
    throw { status: res.status, payload: j };
  }
  return true;
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON body'); }

  const customer = body?.customer || {};
  const items = Array.isArray(body?.items) ? body.items : [];
  const selections = body?.meta?.selections || undefined;

  if (!customer?.email) return badRequest('customer.email is required');
  if (!items.length) return badRequest('items must contain at least one item');

  // Coerce & validate shape
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

  // Route store
  const storeKey = pickStoreByState(customer.state);
  const { domain, token } = getStoreEnv(storeKey);
  if (!domain || !token) {
    return badRequest(`Missing env for store ${storeKey}. Ensure *_SHOP_DOMAIN and *_ADMIN_TOKEN are set.`);
  }

  // NEW: Pre-validate variants in the target store
  const invalid = [];
  try {
    await Promise.all(line_items.map(async li => {
      const ok = await variantExists(domain, token, li.variant_id);
      if (!ok) invalid.push(li.variant_id);
    }));
  } catch (e) {
    // Unexpected Shopify error while validating a variant
    return shopifyError(e?.status ?? 500, e?.payload ?? { message: 'Variant validation error' });
  }

  if (invalid.length) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'invalid_variant_for_store',
      store: storeKey.toLowerCase(),
      message: 'Some variant IDs do not exist in the target store. Use per-store variant IDs.',
      invalidVariantIds: invalid
    }), { status: 422, headers: { 'content-type': 'application/json' } });
  }

  // Build payload
  const draftPayload = {
    draft_order: {
      line_items,
      email: customer.email,
      note: selections ? `Quote Builder selections: ${JSON.stringify(selections)}` : undefined,
      shipping_address: normalizeAddress(customer),
      billing_address: normalizeAddress(customer),
      tags: 'quote-builder',
      use_customer_default_address: true,
    },
  };

  // Create draft order
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
    const payload = shopJson?.errors || shopJson || { message: 'Unknown Shopify error' };
    return shopifyError(shopRes.status, payload);
  }

  const d = shopJson.draft_order;
  const draftOrderId = d.id;
  const adminUrl = `https://${domain}/admin/draft_orders/${draftOrderId}`;
  const invoiceUrl = d.invoice_url || null;

  return new Response(JSON.stringify({
    ok: true,
    store: storeKey.toLowerCase(),
    draftOrderId,
    orderUrl: adminUrl,
    invoiceUrl,
  }), { headers: { 'content-type': 'application/json' } });
}

function normalizeAddress(c = {}) {
  const addr = {
    first_name: c.firstName || undefined,
    last_name: c.lastName || undefined,
    phone: c.phone || undefined,
    zip: c.postcode || undefined,
    province: c.state || undefined,
    address1: c.address1 || undefined,
    address2: c.address2 || undefined,
    city: c.city || undefined,
    country: c.country || 'Australia',
  };
  return Object.fromEntries(Object.entries(addr).filter(([, v]) => v != null && v !== ''));
}
