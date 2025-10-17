// app/actions/submitQuote.js
"use server";

import { parseJsonField } from "@/lib/schemas"; // keep your helper
import { createDraftOrder } from "@/lib/orders";

// Returned shape:
// { ok: boolean, errors?: { [field]: string }, general?: string, summary?: string, orderUrl?: string }
export async function submitQuoteAction(prevState, formData) {
  // ---- Customer fields ----
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
  const itemsIn = parseJsonField(formData, "itemsJSON", []);

  // ---- Basic field validation (clear, user-facing) ----
  const errors = {};
  if (!customer.firstName) errors.firstName = "First name is required";
  if (!customer.lastName) errors.lastName = "Last name is required";
  if (!customer.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) {
    errors.email = "Valid email is required";
  }
  if (!customer.state) errors.state = "State is required";
  if (!customer.postcode) errors.postcode = "Postcode is required";

  // ---- Items: accept BOTH shapes ----
  // A) { variantId: number|string, quantity?: number }
  // B) { variantIdByStore: { autospec?: number|string, linex?: number|string }, quantity?: number }
  const normalizedItems = [];
  if (!Array.isArray(itemsIn) || itemsIn.length === 0) {
    errors.items = "Select at least one item before submitting.";
  } else {
    for (const it of itemsIn) {
      const qty = Number(it?.quantity ?? 1);
      if (!Number.isFinite(qty) || qty <= 0) {
        errors.items = "All items must have a positive quantity.";
        break;
      }

      if (it?.variantIdByStore && typeof it.variantIdByStore === "object") {
        const a = it.variantIdByStore.autospec;
        const l = it.variantIdByStore.linex;
        const autospec = a != null && a !== "" ? Number(a) : undefined;
        const linex = l != null && l !== "" ? Number(l) : undefined;

        // require at least one store id present and numeric, but don't force both
        if (
          (autospec === undefined && linex === undefined) ||
          (autospec !== undefined && !Number.isFinite(autospec)) ||
          (linex !== undefined && !Number.isFinite(linex))
        ) {
          errors.items = "One or more items are invalid (store variant IDs).";
          break;
        }
        normalizedItems.push({
          variantIdByStore: {
            ...(autospec !== undefined ? { autospec } : {}),
            ...(linex !== undefined ? { linex } : {}),
          },
          quantity: qty,
        });
      } else {
        const vid = Number(it?.variantId);
        if (!Number.isFinite(vid) || vid <= 0) {
          errors.items = "One or more items are invalid.";
          break;
        }
        normalizedItems.push({ variantId: vid, quantity: qty });
      }
    }
  }

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  // ---- Create Draft Order via our helper (which calls /api/draft-order) ----
  try {
    const res = await createDraftOrder({
      customer,
      items: normalizedItems, // pass through with variantIdByStore if present
      meta: { vehicleId, selections },
    });

    if (!res?.ok) {
      // surface a helpful summary if the API provided one
      return {
        ok: false,
        general: res?.payload ? "Shopify error" : "Failed to create draft order",
        summary: res?.summary,
      };
    }
    return { ok: true, orderUrl: res.orderUrl };
  } catch (e) {
    return { ok: false, general: "Server error while creating draft order" };
  }
}
