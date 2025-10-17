// lib/orders.js
export async function createDraftOrder(payload) {
  const res = await fetch('/api/draft-order', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { ok: false };
  return res.json();
}
