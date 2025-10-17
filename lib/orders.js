// lib/orders.js
export async function createDraftOrder(payload) {
  // Replace later with Shopify / Cloudflare call.
  const routed = String(payload?.customer?.state || "").toUpperCase() === "WA" ? "linex" : "autospec";
  const id = Math.floor(Date.now() / 1000);
  const url = `https://example.com/${routed}/draft_orders/${id}`;
  return { ok: true, orderId: id, orderUrl: url, store: routed };
}
