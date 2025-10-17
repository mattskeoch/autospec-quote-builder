// app/actions/submitQuote.js
"use server";

import { CustomerSchema, parseJsonField } from "@/lib/schemas";
import { createDraftOrder } from "@/lib/orders";

// Return shape:
// { ok: boolean, errors?: { [field]: string }, general?: string, orderUrl?: string }
export async function submitQuoteAction(prevState, formData) {
  // Build payload from form inputs
  const customer = {
    firstName: String(formData.get("firstName") || ""),
    lastName: String(formData.get("lastName") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    state: String(formData.get("state") || ""),
    postcode: String(formData.get("postcode") || ""),
  };

  const vehicleId = (String(formData.get("vehicleId") || "") || null);
  const selections = parseJsonField(formData, "selectionsJSON", {});
  const items = parseJsonField(formData, "itemsJSON", []);

  // ---- Validate customer (explicit) ----
  const cust = CustomerSchema.safeParse(customer);
  const errors = {};
  if (!cust.success) {
    const flat = cust.error.flatten();
    // flat.fieldErrors keys match CustomerSchema fields directly
    for (const [k, arr] of Object.entries(flat.fieldErrors || {})) {
      if (arr && arr[0]) errors[k] = arr[0];
    }
  }

  // ---- Validate items (explicit) ----
  if (!Array.isArray(items) || items.length === 0) {
    errors.items = "Select at least one item before submitting.";
  } else {
    // Coerce variantId to number and ensure valid
    for (let i = 0; i < items.length; i++) {
      const n = Number(items[i]?.variantId);
      if (!Number.isFinite(n) || n <= 0) {
        errors.items = "One or more items are invalid.";
        break;
      }
      items[i] = { variantId: n };
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const res = await createDraftOrder({
      customer: cust.data,
      items,
      meta: { vehicleId, selections },
    });
    if (!res.ok) return { ok: false, general: "Failed to create draft order" };
    return { ok: true, orderUrl: res.orderUrl };
  } catch {
    return { ok: false, general: "Server error while creating draft order" };
  }
}
