// lib/data.js
import seed from "../data/products.json" assert { type: "json" };
import { getVariantCompatKeysForItem } from "./shopify";

export async function loadData() {
  const steps = seed?.steps ?? [];
  const vehicles = seed?.vehicles ?? [];
  const items = seed?.items ?? [];

  const haveEnv =
    !!process.env.AUTOSPEC_SHOP_DOMAIN &&
    !!process.env.AUTOSPEC_ADMIN_TOKEN &&
    !!process.env.LINEX_SHOP_DOMAIN &&
    !!process.env.LINEX_ADMIN_TOKEN;

  if (!haveEnv) {
    // No Shopify access: return seed as-is
    return { steps, vehicles, items };
  }

  const enriched = await Promise.all(
    items.map(async (it) => {
      let vehicleTypeKeys = [];
      try {
        vehicleTypeKeys = await getVariantCompatKeysForItem(it.variantIdByStore, process.env);
      } catch {
        vehicleTypeKeys = [];
      }
      return { ...it, vehicleTypeKeys };
    })
  );

  return { steps, vehicles, items: enriched };
}
