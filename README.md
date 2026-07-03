# SnapValue AI

Mobile-first resale estimate tool. Real AI vision estimate (Claude Haiku), no fake data.

## Run locally
```
npm install
npm run dev
```
Note: `/api/estimate` is a Vercel serverless function. It won't run under plain `vite dev`.
To test it locally, install the Vercel CLI and run `vercel dev` instead of `npm run dev`.

## Deploy to Vercel
1. Push this folder to GitHub.
2. Import the repo in Vercel. Framework: Vite (auto-detected).
3. Before first deploy (or right after), go to Project → Settings → Environment Variables
   and add:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
4. Redeploy if you added the key after the first deploy — env vars only apply to new builds.

The API key is never sent to the browser. The frontend calls your own `/api/estimate`
endpoint, which calls Anthropic server-side.

## Current behavior
- Dashboard and Full List
- Bottom camera button opens phone camera/file picker
- New photo → calls Claude Haiku (vision) via `/api/estimate` → real item ID + price range
  - If the AI can't confidently identify the item, item is marked "Needs More Info" instead
    of guessing
  - If the request fails (network/API error), item is marked "Scan failed" — edit it to retry
- Single tap item = details, double tap = edit
- Saved locally in browser localStorage (per-device only, not synced)

## Known limitations (by design, for the personal-use test phase)
- Price estimates come from the model's general knowledge, not live sold listings —
  treat as a ballpark, not gospel
- "Sold comps" section is empty for now (removed the fake numbers rather than keep faking it)
- Shipping cost is a rough placeholder (% of price), not a real carrier rate lookup
- No accounts/sync — single device, single browser

## If this earns its keep after real personal use
Next real investment would be a comps API (eBay Browse/Marketplace Insights, or a paid
comps provider) for actual sold-price data — that's the expensive, slow-approval part,
intentionally skipped for this test build.
