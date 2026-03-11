import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ScanResult } from "../lib/pre-pump-scanner";

interface ScannerResultRowProps {
  result: ScanResult;
  rank: number;
  dataOcid?: string;
}

function formatPrice(price: string): string {
  const n = Number.parseFloat(price);
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

const SIGNAL_LABELS: {
  key: keyof Omit<
    import("../lib/pre-pump-scanner").SignalResult,
    "score" | "rsiDetails"
  >;
  abbr: string;
  label: string;
}[] = [
  { key: "btcCorrelation", abbr: "BTC", label: "Correlação c/ BTC crescendo" },
  { key: "openInterest", abbr: "OI", label: "Open Interest subindo" },
  { key: "volume", abbr: "VOL", label: "Volume acima da média" },
  {
    key: "fundingRate",
    abbr: "FR",
    label: "Funding Rate negativo/negativando",
  },
  { key: "shortConfluence", abbr: "SHORT", label: "Shorts sendo abertos" },
  { key: "rsiPositive", abbr: "RSI", label: "RSI > 40 em todos os TFs" },
];

function ScoreBadge({ score }: { score: number }) {
  const cfg =
    score === 6
      ? "bg-neon-green/20 text-neon-green border-neon-green/60 shadow-[0_0_8px_rgba(0,255,128,0.4)]"
      : score === 5
        ? "bg-neon-green/15 text-neon-green border-neon-green/40"
        : score === 4
          ? "bg-neon-orange/20 text-neon-orange border-neon-orange/50"
          : score === 3
            ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
            : "bg-white/5 text-muted-foreground border-white/15";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 font-mono font-bold text-[11px] min-w-[34px] ${cfg}`}
    >
      {score}/6
    </span>
  );
}

export default function ScannerResultRow({
  result,
  rank,
  dataOcid,
}: ScannerResultRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { signals } = result;
  const changePercent = Number.parseFloat(result.priceChangePercent);
  const isPositive = changePercent > 0;
  const changeColor = isPositive ? "text-neon-green" : "text-neon-red";
  const symbolBase = result.symbol.replace("USDT", "");

  const rsiFailing = Object.entries(signals.rsiDetails).filter(([, v]) => !v);
  const rsiPassing = Object.entries(signals.rsiDetails).filter(([, v]) => v);
  const showRsiDetail =
    !signals.rsiPositive && (rsiPassing.length > 0 || rsiFailing.length > 0);

  return (
    <div
      data-ocid={dataOcid}
      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
    >
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        {/* Rank */}
        <span className="text-[10px] font-mono text-muted-foreground w-5 flex-shrink-0">
          {rank}
        </span>

        {/* Symbol icon */}
        <div className="w-7 h-7 rounded-md bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] font-bold text-neon-purple">
            {symbolBase.slice(0, 3)}
          </span>
        </div>

        {/* Symbol + chips */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {symbolBase}
            </span>
            <ScoreBadge score={signals.score} />
          </div>
          {/* Signal chips */}
          <div className="flex gap-1 mt-1 flex-wrap">
            {SIGNAL_LABELS.map(({ key, abbr }) => {
              const active = signals[key] as boolean;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium border ${
                    active
                      ? "bg-neon-green/15 text-neon-green border-neon-green/30"
                      : "bg-white/5 text-muted-foreground/50 border-white/10"
                  }`}
                >
                  {abbr}
                </span>
              );
            })}
          </div>
          {/* RSI partial detail */}
          {showRsiDetail && (
            <div className="mt-0.5 text-[9px] text-muted-foreground">
              RSI:{" "}
              {(Object.entries(signals.rsiDetails) as [string, boolean][]).map(
                ([tf, pass]) => (
                  <span
                    key={tf}
                    className={
                      pass ? "text-neon-green" : "text-muted-foreground/40"
                    }
                  >
                    {tf}
                    {pass ? "✓" : "✗"}{" "}
                  </span>
                ),
              )}
            </div>
          )}
        </div>

        {/* Price & change */}
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-xs font-semibold text-foreground">
            ${formatPrice(result.lastPrice)}
          </div>
          <div className={`font-mono text-[10px] font-bold ${changeColor}`}>
            {changePercent > 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </div>
        </div>

        {/* Expand chevron */}
        <div className="ml-1 text-muted-foreground flex-shrink-0">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 space-y-1.5">
          {SIGNAL_LABELS.map(({ key, abbr, label }) => {
            const active = signals[key] as boolean;
            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    active ? "bg-neon-green" : "bg-white/20"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    active ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  <span className="font-mono text-[10px] mr-1">{abbr}</span>
                  {label}
                </span>
                <span
                  className={`ml-auto text-[10px] font-bold ${
                    active ? "text-neon-green" : "text-muted-foreground/40"
                  }`}
                >
                  {active ? "✓" : "✗"}
                </span>
              </div>
            );
          })}
          {/* RSI per-TF breakdown */}
          {Object.keys(signals.rsiDetails).length > 0 && (
            <div className="mt-2 pl-3 border-l border-white/10">
              <div className="text-[10px] text-muted-foreground mb-1">
                RSI por timeframe:
              </div>
              <div className="flex gap-2 flex-wrap">
                {(
                  Object.entries(signals.rsiDetails) as [string, boolean][]
                ).map(([tf, pass]) => (
                  <span
                    key={tf}
                    className={`text-[10px] font-mono ${
                      pass ? "text-neon-green" : "text-muted-foreground/40"
                    }`}
                  >
                    {tf} {pass ? "✓" : "✗"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
