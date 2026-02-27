# Specification

## Summary
**Goal:** Fix the service worker so it never intercepts or caches requests to external API domains (Binance, CoinGecko, ICP/IC endpoints) while the device is online, eliminating the erroneous 503 offline error during live API calls.

**Planned changes:**
- Update `frontend/public/service-worker.js` to pass all requests to `fapi.binance.com`, `api.binance.com`, `api.coingecko.com`, and ICP/IC endpoints directly to the network when the device is online (`navigator.onLine === true`)
- Retain the 503 JSON error response for those external API domains only when the device is genuinely offline (`navigator.onLine === false`)
- Keep all existing app-shell and static asset caching behavior unchanged

**User-visible outcome:** Users on the Search tab can search for Binance USD-M perpetual pairs (e.g., BTCUSDT) and receive live ticker and kline data without hitting a 503 error while connected to the internet.
