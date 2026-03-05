# Specification

## Summary
**Goal:** Update the Binance position risk API endpoint from v1 to v2 in the frontend.

**Planned changes:**
- In `frontend/src/lib/binance-auth.ts`, replace all references to `https://fapi.binance.com/fapi/v1/positionRisk` with `https://fapi.binance.com/fapi/v2/positionRisk`
- In `frontend/src/hooks/useQueries.ts`, replace all references to `https://fapi.binance.com/fapi/v1/positionRisk` with `https://fapi.binance.com/fapi/v2/positionRisk`
- Leave HMAC-SHA256 signing logic, polling interval, credential handling, and all other code unchanged

**User-visible outcome:** The Open Positions section in the Search tab correctly fetches and displays live position data using the v2 Binance Futures endpoint.
