# Crypto Futures Assistant

## Current State
The Search tab displays open Binance positions fetched directly from the browser using HMAC-SHA256 signed requests to `fapi.binance.com/fapi/v2/positionRisk`. Each position is shown via `PositionRow` with entry price, mark price, unrealized P&L, liquidation price, and leverage. No actionable recommendations exist beyond visual alerts (AlertTriangle icon for large P&L).

## Requested Changes (Diff)

### Add
- A new **"Painel de Recomendações"** section in the Search tab, rendered above the full positions list when any position has P&L% below -10%.
- A utility function `computePositionRecommendations(positions: BinancePosition[])` that evaluates each position and returns structured recommendations based on:
  - P&L percentage = (unRealizedProfit / |entryPrice * positionAmt|) * 100
  - Proximity to liquidation price (distance %)
  - Leverage level
  - Returns one of: "considere reduzir posição", "mover stop-loss para X", "fechar posição — risco de liquidação alto"
- A `PositionRecommendationPanel` component displaying the list of critical recommendations with visual severity levels (warning/danger).

### Modify
- `SearchTab.tsx`: import and render `PositionRecommendationPanel` above the positions list when `credsSaved && positions.length > 0`.
- The `fetchOpenPositions` function already returns all positions (no filter needed); the panel filters to only those with pnlPct < -10%.

### Remove
- Nothing removed.

## Implementation Plan
1. Create `src/lib/position-recommendations.ts` with `computePositionRecommendations()` logic:
   - Calculate P&L% for each position
   - Filter positions where pnlPct < -10%
   - For each: check liq distance (<5% → "fechar posição — risco de liquidação alto"), check leverage (>=20x AND pnlPct < -15% → same), else if pnlPct < -20% → "fechar posição", else if pnlPct < -15% → "considere reduzir posição", else → "mover stop-loss para {suggested_price}"
   - Suggest stop-loss = entry price * (1 - 0.05) for LONG, entry price * (1 + 0.05) for SHORT
2. Create `src/components/PositionRecommendationPanel.tsx`:
   - Accept `positions: BinancePosition[]` prop
   - Internally call `computePositionRecommendations`
   - Render a card-style panel with neon-orange/neon-red accent depending on severity
   - List each recommendation with symbol, direction badge, P&L%, and action text
   - Show nothing if no recommendations
3. Update `SearchTab.tsx`:
   - Import and render `<PositionRecommendationPanel positions={positions} />` above the positions list, inside the `credsSaved` block
