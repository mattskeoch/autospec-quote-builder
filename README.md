# Autospec Quote Builder — Tailwind **v4** + Next.js + CF Pages

This starter has Tailwind **v4** wired in using the official v4 PostCSS plugin (no `tailwind.config.*` needed), plus Cloudflare Pages Functions stubs for `/api/enrich` and `/api/draft-order`.

## Run locally
```bash
npm i
npm run dev
# open http://localhost:3000
```

## Install Tailwind v4 (already done here)
- We followed the official Next.js guide for Tailwind v4:
  - `npm install tailwindcss @tailwindcss/postcss postcss`
  - `postcss.config.mjs` uses the `@tailwindcss/postcss` plugin
  - `app/globals.css` contains `@import "tailwindcss";`
Docs: https://tailwindcss.com/docs/installation/framework-guides/nextjs

## Add shadcn/ui
shadcn/ui now supports Tailwind v4. Use the CLI to generate components into `components/ui/*`.
```bash
npx shadcn@latest init
npx shadcn@latest add button card input label textarea select checkbox radio-group
npx shadcn@latest add separator dialog drawer sheet toast
```
Docs: https://ui.shadcn.com/docs/tailwind-v4

> Tip: The CLI may generate TSX files — that’s fine in a JS app. Next compiles them. If a component imports `cn` from `@/lib/utils`, create `lib/cn.js` with a simple join helper and adjust imports.

## Cloudflare Pages
1) Create a Pages project from this repo and deploy.  
2) Add env vars:
```
AUTOSEC_SHOP_DOMAIN=autospec-group.myshopify.com
AUTOSEC_ADMIN_TOKEN=***
LINEX_SHOP_DOMAIN=line-x-australia.myshopify.com
LINEX_ADMIN_TOKEN=***
ALLOWED_ORIGINS=https://<your>.pages.dev,https://quote.autospec4x4.com.au
```
3) Test stubs:
```bash
# ENRICH
curl -s -X POST https://<your>.pages.dev/api/enrich -H "content-type: application/json"   -d '{ "store":"autospec", "variantIds":[50506304749888,44263190003887] }'

# DRAFT ORDER
curl -s -X POST https://<your>.pages.dev/api/draft-order -H "content-type: application/json"   -d '{ "customer": { "firstName":"A","lastName":"B","email":"a@b.com","phone":"000","state":"WA","postcode":"6000" }, "items":[{"variantId":50506304749888,"quantity":1}], "meta":{"vehicleId":"toyota_hilux"} }'
```

## Data
- Seed data in `/data/products.json` with vehicles, steps, and items.
- Compatibility: `item.compat.vehicles = "*" | [vehicleId...]`
- Variants: `item.variantIdByStore = { autospec, linex }`

## Next steps (hand-off to Codex)
- Fill more products in `/data/products.json` **or** wire Shopify (Storefront + Admin) calls in the functions.
- Build the full UI with shadcn components (cards, inputs, dialogs).
- Implement localStorage persistence + full validation + draft order flow.

## Acceptance
- WA → linex; else autospec (server enforced).
- Disabled incompatible items (don’t hide).
- Required steps gate Next with helper text.
- Prices shown from the **routed** store enrichment.

# autospec-quote-builder
