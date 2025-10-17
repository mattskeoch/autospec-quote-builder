export const runtime = 'edge';

/**
 * Accepts items in EITHER format:
 *   A) { variantId: number, quantity?: number }
 *   B) { variantIdByStore: { autospec?: number|string, linex?: number|string }, quantity?: number }
 *
 * Server chooses correct variantId by store (state: WA -> LINEX, else AUTOSPEC).
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

function shopifyError(status, payload, summary) {
  return new Response(JSON.stringify({ ok: false, error: 'shopify_error', status, summary, payload }), {
    status: 502,
    headers: { 'content-type': 'application/json' },
  });
}

// Try to fetch a variant to verify it exists in this shop
async function variantExists(domain, token, variantId) {
  const url = `https://${domain}/admin/api/2024-10/variants/${variantId}.json`;
  const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': token } });
  if (res.status === 404) return false;
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw { status: res.status, payload: j };
  }
  return true;
}

// Flatten Shopify error payloads into a readable single string
function summarizeShopifyErrors(errPayload) {
  try {
    if (!errPayload) return 'Unknown Shopify error';
    if (typeof errPayload === 'string') return errPayload;

    // Common shapes: { errors: {base:[{message}]}} or { base: ['...'] } or { errors: '...' }
    const e = errPayload.errors ?? errPayload;

    if (Array.isArray(e)) return e.join(', ');
    if (typeof e === 'string') return e;

    if (e.base) {
      if (Array.isArray(e.base)) {
        const msgs = e.base.map(b => (typeof b === 'string' ? b : (b?.message || JSON.stringify(b))));
        return msgs.join(', ');
      }
      if (typeof e.base === 'string') return e.base;
    }

    // key -> array or string
    const parts = [];
    for (const [k, v] of Object.entries(e)) {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`);
      else if (typeof v === 'string') parts.push(`${k}: ${v}`);
      else parts.push(`${k}: ${JSON.stringify(v)}`);
    }
    return parts.length ? parts.join(' | ') : 'Unknown Shopify error';
  } catch {
    return 'Unknown Shopify error';
  }
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON body'); }

  const customer = body?.customer || {};
  const itemsIn = Array.isArray(body?.items) ? body.items : [];
  const selections = body?.meta?.selections || undefined;

  if (!customer?.email) return badRequest('customer.email is required');
  if (!itemsIn.length) return badRequest('items must contain at least one item');

  // Route store
  const storeKey = pickStoreByState(customer.state);
  const { domain, token } = getStoreEnv(storeKey);
  if (!domain || !token) {
    return badRequest(`Missing env for store ${storeKey}. Ensure *_SHOP_DOMAIN and *_ADMIN_TOKEN are set.`);
  }

  // Resolve per-store variant IDs and coerce quantities
  const line_items = [];
  for (const it of itemsIn) {
    let variantId = it?.variantId;
    if (!variantId && it?.variantIdByStore) {
      const vbs = it.variantIdByStore || {};
      variantId = storeKey === 'LINEX' ? vbs.linex : vbs.autospec;
    }
    const numId = Number(variantId);
    const qty = Number(it?.quantity ?? 1);
    if (!Number.isFinite(numId) || numId <= 0) {
      return badRequest('Each item must include a valid variantId or variantIdByStore for the target store');
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return badRequest('All items must have a positive quantity');
    }
    line_items.push({ variant_id: numId, quantity: qty });
  }

  // Validate variants exist in the target store (clearer 422s)
  const invalid = [];
  try {
    await Promise.all(line_items.map(async li => {
      const ok = await variantExists(domain, token, li.variant_id);
      if (!ok) invalid.push(li.variant_id);
    }));
  } catch (e) {
    return shopifyError(e?.status ?? 500, e?.payload ?? { message: 'Variant validation error' }, 'Variant validation error');
  }
  if (invalid.length) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'invalid_variant_for_store',
      store: storeKey.toLowerCase(),
      message: 'One or more variant IDs do not exist in the target store.',
      invalidVariantIds: invalid
    }), { status: 422, headers: { 'content-type': 'application/json' } });
  }

  // Build Draft Order payload (Shopify expects tags as a STRING)
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
    return shopifyError(0, { message: 'Network error calling Shopify', detail: String(e) }, 'Network error');
  }

  if (!shopRes.ok || !shopJson?.draft_order) {
    const payload = shopJson?.errors || shopJson || { message: 'Unknown Shopify error' };
    const summary = summarizeShopifyErrors(payload);
    return shopifyError(shopRes.status, payload, summary);
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