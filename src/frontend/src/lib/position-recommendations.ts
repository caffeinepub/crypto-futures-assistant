import type { BinancePosition } from "./binance-auth";

export type RecommendationSeverity = "warning" | "danger";

export interface PositionRecommendation {
  position: BinancePosition;
  pnlPct: number; // negative percentage, e.g. -12.5
  severity: RecommendationSeverity;
  action: string; // human-readable recommendation in Portuguese
  suggestedStopLoss?: number; // price value for stop-loss suggestion
}

export function computePositionRecommendations(
  positions: BinancePosition[],
): PositionRecommendation[] {
  const results: PositionRecommendation[] = [];

  for (const pos of positions) {
    const posAmt = Number.parseFloat(pos.positionAmt);
    const entryPrice = Number.parseFloat(pos.entryPrice);
    const markPrice = Number.parseFloat(pos.markPrice);
    const liquidationPrice = Number.parseFloat(pos.liquidationPrice);
    const pnl = Number.parseFloat(pos.unRealizedProfit);
    const leverage = Number.parseFloat(pos.leverage);
    const isLong = posAmt > 0;

    if (entryPrice === 0 || posAmt === 0) continue;

    // P&L% relative to position notional value
    const notional = Math.abs(entryPrice * posAmt);
    const pnlPct = notional > 0 ? (pnl / notional) * 100 : 0;

    // Only process positions below -10%
    if (pnlPct >= -10) continue;

    // Liquidation distance %
    let liqDistancePct = 100;
    if (liquidationPrice > 0 && markPrice > 0) {
      liqDistancePct =
        Math.abs((markPrice - liquidationPrice) / markPrice) * 100;
    }

    let severity: RecommendationSeverity = "warning";
    let action = "";
    let suggestedStopLoss: number | undefined;

    // Decision logic
    if (liqDistancePct < 5 || (leverage >= 20 && pnlPct < -15)) {
      // Critical: very close to liquidation or high leverage + deep loss
      severity = "danger";
      action = "Fechar posição — risco de liquidação alto";
    } else if (pnlPct < -20) {
      severity = "danger";
      action = "Fechar posição — perda excessiva";
    } else if (pnlPct < -15) {
      severity = "warning";
      action = "Considere reduzir posição";
    } else {
      // -10% to -15%: suggest moving stop-loss
      severity = "warning";
      // Suggest stop-loss at 5% below entry for LONG, 5% above for SHORT
      suggestedStopLoss = isLong ? entryPrice * 0.95 : entryPrice * 1.05;

      const formatted =
        suggestedStopLoss >= 1000
          ? suggestedStopLoss.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })
          : suggestedStopLoss >= 1
            ? suggestedStopLoss.toFixed(4)
            : suggestedStopLoss.toFixed(6);

      action = `Mover stop-loss para $${formatted}`;
    }

    results.push({
      position: pos,
      pnlPct,
      severity,
      action,
      suggestedStopLoss,
    });
  }

  // Sort: danger first, then by pnlPct ascending (most negative first)
  results.sort((a, b) => {
    if (a.severity === b.severity) return a.pnlPct - b.pnlPct;
    return a.severity === "danger" ? -1 : 1;
  });

  return results;
}
