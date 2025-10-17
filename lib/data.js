// lib/data.js
import seed from "../data/products.json" assert { type: "json" };
import { getVariantCompatKeys } from "./shopify";

/**
 * Load seed, then (if env is set) enrich each item with `vehicleTypeKeys`
 * by reading the variant metafield: quote.compatible_vehicle_types
 *
 * Fallbacks:
 * - If no env or API error -> return seed as-is (items show for all vehicles).
 * - We read compatibility from AUTOSPEC shop using the AUTOSPEC variant id
 *   (mirrors are expected across stores; you can switch to per-store later).
 */
export async function loadData() {
  const steps = seed?.steps ?? [];
  const vehicles = seed?.vehicles ?? [];
  const items = seed?.items ?? [];

  const domain = process.env.AUTOSPEC_SHOP_DOMAIN;
  const token = process.env.AUTOSPEC_ADMIN_TOKEN;

  // If we can't call Shopify, just return the seed.
  if (!domain || !token) {
    return { steps, vehicles, items };
  }

  // Enrich each item with vehicleTypeKeys (fits-all fallback = [])
  const enriched = await Promise.all(
    items.map(async (it) => {
      const vbs = it.variantIdByStore || {};
      const sampleId = vbs.autospec ?? vbs.linex; // use autospec id when available
      let vehicleTypeKeys = [];
      if (sampleId) {
        try {
          vehicleTypeKeys = await getVariantCompatKeys(domain, token, Number(sampleId));
        } catch {
          vehicleTypeKeys = [];
        }
      }
      return { ...it, vehicleTypeKeys };
    })
  );

  return { steps, vehicles, items: enriched };
}
