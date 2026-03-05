import { AlertTriangle, TrendingDown, XCircle } from "lucide-react";
import React from "react";
import type { BinancePosition } from "../lib/binance-auth";
import { computePositionRecommendations } from "../lib/position-recommendations";

interface Props {
  positions: BinancePosition[];
}

export default function PositionRecommendationPanel({ positions }: Props) {
  const recommendations = computePositionRecommendations(positions);
  if (recommendations.length === 0) return null;

  const dangerCount = recommendations.filter(
    (r) => r.severity === "danger",
  ).length;

  return (
    <div
      data-ocid="recommendations.panel"
      className="rounded-xl border border-neon-red/40 bg-neon-red/5 space-y-3 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={15}
            className={`${dangerCount > 0 ? "text-neon-red animate-pulse" : "text-neon-orange"}`}
          />
          <span className="text-sm font-bold text-neon-orange">
            Recomendações de Risco
          </span>
        </div>
        <span className="text-[11px] bg-neon-red/20 border border-neon-red/40 text-neon-red px-2 py-0.5 rounded-full font-bold">
          {recommendations.length}{" "}
          {recommendations.length === 1 ? "posição" : "posições"}
        </span>
      </div>

      {/* Recommendation list */}
      <div className="space-y-2" data-ocid="recommendations.list">
        {recommendations.map((rec, i) => {
          const symbolBase = rec.position.symbol.replace("USDT", "");
          const isLong = Number.parseFloat(rec.position.positionAmt) > 0;
          const isDanger = rec.severity === "danger";

          return (
            <div
              key={`${rec.position.symbol}-${rec.position.positionSide}-${i}`}
              data-ocid={`recommendations.item.${i + 1}`}
              className={`rounded-lg border p-3 space-y-1.5 transition-all ${
                isDanger
                  ? "border-neon-red/50 bg-neon-red/10"
                  : "border-neon-orange/40 bg-neon-orange/5"
              }`}
            >
              {/* Top row: symbol + badges + P&L% */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDanger ? (
                    <XCircle size={12} className="text-neon-red shrink-0" />
                  ) : (
                    <TrendingDown
                      size={12}
                      className="text-neon-orange shrink-0"
                    />
                  )}
                  <span className="font-bold text-sm text-foreground">
                    {symbolBase}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                      isLong
                        ? "bg-neon-green/20 text-neon-green border-neon-green/40"
                        : "bg-neon-red/20 text-neon-red border-neon-red/40"
                    }`}
                  >
                    {isLong ? "LONG" : "SHORT"}
                  </span>
                  <span className="text-[10px] text-muted-foreground border border-white/20 px-1.5 py-0.5 rounded">
                    {rec.position.leverage}x
                  </span>
                </div>
                <span
                  className={`text-sm font-mono font-bold ${
                    isDanger ? "text-neon-red" : "text-neon-orange"
                  }`}
                >
                  {rec.pnlPct.toFixed(2)}%
                </span>
              </div>

              {/* Action recommendation */}
              <div
                className={`flex items-center gap-1.5 text-[12px] font-semibold ${
                  isDanger ? "text-neon-red" : "text-neon-orange"
                }`}
              >
                <span className={`${isDanger ? "animate-pulse" : ""}`}>→</span>
                <span>{rec.action}</span>
              </div>

              {/* Extra context row */}
              <div className="flex gap-3 text-[10px] text-muted-foreground font-mono pt-0.5">
                <span>
                  Entrada:{" "}
                  <span className="text-foreground/70">
                    ${formatCompact(rec.position.entryPrice)}
                  </span>
                </span>
                <span>
                  Mark:{" "}
                  <span className="text-foreground/70">
                    ${formatCompact(rec.position.markPrice)}
                  </span>
                </span>
                {Number.parseFloat(rec.position.liquidationPrice) > 0 && (
                  <span>
                    Liq:{" "}
                    <span
                      className={`${isDanger ? "text-neon-red font-bold" : "text-neon-orange"}`}
                    >
                      ${formatCompact(rec.position.liquidationPrice)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCompact(price: string): string {
  const n = Number.parseFloat(price);
  if (n === 0) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}
