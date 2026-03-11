import {
  Loader2,
  RefreshCw,
  ScanLine,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import AssetRow from "../components/AssetRow";
import ErrorBanner from "../components/ErrorBanner";
import ScannerResultRow from "../components/ScannerResultRow";
import { usePumpScanner } from "../hooks/usePumpScanner";
import { useMarketTickers } from "../hooks/useQueries";
import type { BinanceTicker } from "../hooks/useQueries";

type SortKey = "volume" | "change" | "price";
type ScanFilter = "all" | "5plus" | "4plus" | "3plus";

function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s atrás`;
  return `${Math.round(seconds / 60)}min atrás`;
}

export default function MarketTab() {
  const { data: tickers, isLoading, error, refetch } = useMarketTickers();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [scannerMode, setScannerMode] = useState(false);
  const [scanFilter, setScanFilter] = useState<ScanFilter>("all");

  const scanner = usePumpScanner(tickers ?? []);

  const filtered = useMemo(() => {
    if (!tickers) return [];
    let list = tickers;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((t) => t.symbol.includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortKey === "volume")
        return (
          Number.parseFloat(b.quoteVolume) - Number.parseFloat(a.quoteVolume)
        );
      if (sortKey === "change")
        return (
          Number.parseFloat(b.priceChangePercent) -
          Number.parseFloat(a.priceChangePercent)
        );
      if (sortKey === "price")
        return Number.parseFloat(b.lastPrice) - Number.parseFloat(a.lastPrice);
      return 0;
    });
  }, [tickers, search, sortKey]);

  const filteredResults = useMemo(() => {
    let list = scanner.results;
    if (scanFilter === "5plus") list = list.filter((r) => r.signals.score >= 5);
    else if (scanFilter === "4plus")
      list = list.filter((r) => r.signals.score >= 4);
    else if (scanFilter === "3plus")
      list = list.filter((r) => r.signals.score >= 3);
    return list;
  }, [scanner.results, scanFilter]);

  const gainers =
    tickers?.filter((t) => Number.parseFloat(t.priceChangePercent) > 0)
      .length ?? 0;
  const losers =
    tickers?.filter((t) => Number.parseFloat(t.priceChangePercent) < 0)
      .length ?? 0;

  const scanFilterOptions: { value: ScanFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "5plus", label: "5-6 sinais" },
    { value: "4plus", label: "4+ sinais" },
    { value: "3plus", label: "3+ sinais" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      <div className="px-4 py-2 flex items-center gap-4 border-b border-white/5">
        <div className="flex items-center gap-1.5 text-xs">
          <TrendingUp size={12} className="text-neon-green" />
          <span className="text-neon-green font-bold">{gainers}</span>
          <span className="text-muted-foreground">Gainers</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <TrendingDown size={12} className="text-neon-red" />
          <span className="text-neon-red font-bold">{losers}</span>
          <span className="text-muted-foreground">Losers</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="text-[10px] text-muted-foreground">
            {tickers ? `${tickers.length} pairs` : ""}
          </div>
          {/* Scanner toggle */}
          <button
            type="button"
            data-ocid="market.scanner_toggle"
            onClick={() => setScannerMode((p) => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              scannerMode
                ? "bg-neon-green/15 text-neon-green border-neon-green/40 shadow-[0_0_8px_rgba(0,255,128,0.2)]"
                : "bg-white/5 text-muted-foreground border-white/10 hover:border-neon-green/30 hover:text-neon-green/70"
            }`}
          >
            <ScanLine
              size={11}
              className={scannerMode ? "animate-pulse" : ""}
            />
            Scanner
          </button>
        </div>
      </div>

      {/* Scanner status bar */}
      {scannerMode && (
        <div
          data-ocid="market.scanner_status.panel"
          className="px-4 py-1.5 flex items-center gap-3 bg-neon-green/5 border-b border-neon-green/10 text-[10px] text-muted-foreground"
        >
          {scanner.isScanning ? (
            <span className="flex items-center gap-1 text-neon-green/70">
              <Loader2 size={9} className="animate-spin" />
              Varrendo {scanner.progress}/{scanner.total}
            </span>
          ) : (
            <span>Top 50 atualizado: {timeAgo(scanner.lastTop50Scan)}</span>
          )}
          <span className="text-white/20">|</span>
          <span>
            Próxima varredura:{" "}
            {timeAgo(
              scanner.nextFullScan
                ? new Date(scanner.nextFullScan.getTime() - 15 * 60 * 1000)
                : null,
            ) === "—"
              ? "—"
              : scanner.nextFullScan
                ? `em ${Math.max(0, Math.round((scanner.nextFullScan.getTime() - Date.now()) / 60000))}min`
                : "—"}
          </span>
          <button
            type="button"
            data-ocid="market.scanner_trigger.button"
            onClick={scanner.triggerScan}
            disabled={scanner.isScanning}
            className="ml-auto flex items-center gap-1 text-neon-green/70 hover:text-neon-green disabled:opacity-40 transition-colors"
          >
            <RefreshCw
              size={9}
              className={scanner.isScanning ? "animate-spin" : ""}
            />
            Varrer
          </button>
        </div>
      )}

      {/* Search & Sort / Scanner filters */}
      <div className="px-4 py-2 flex gap-2 border-b border-white/5">
        {scannerMode ? (
          <div className="flex gap-1 flex-wrap">
            {scanFilterOptions.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                data-ocid="market.scanner_filter.tab"
                onClick={() => setScanFilter(value)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  scanFilter === value
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/40"
                    : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground self-center">
              {filteredResults.length} ativos
            </span>
          </div>
        ) : (
          <>
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search pair..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-green/50 transition-colors"
              />
            </div>
            <div className="flex gap-1">
              {(["volume", "change", "price"] as SortKey[]).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSortKey(key)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-colors ${
                    sortKey === key
                      ? "bg-neon-green/20 text-neon-green border border-neon-green/40"
                      : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-neon-green">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading market data...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-4">
            <ErrorBanner
              message="Failed to load market data. Check your connection."
              onRetry={() => refetch()}
            />
          </div>
        )}

        {/* Scanner mode */}
        {scannerMode && !isLoading && !error && (
          <>
            {scanner.isScanning && filteredResults.length === 0 && (
              <div
                data-ocid="market.scanner_result.empty_state"
                className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
              >
                <ScanLine
                  size={32}
                  className="animate-pulse text-neon-green/50"
                />
                <div className="text-sm">Varrendo mercado...</div>
                <div className="text-[11px]">
                  {scanner.progress}/{scanner.total} pares analisados
                </div>
              </div>
            )}
            {!scanner.isScanning && filteredResults.length === 0 && (
              <div
                data-ocid="market.scanner_result.empty_state"
                className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
              >
                <ScanLine size={32} className="text-muted-foreground/30" />
                <div className="text-sm">Nenhum ativo com esses critérios</div>
                <button
                  type="button"
                  data-ocid="market.scanner_trigger.button"
                  onClick={scanner.triggerScan}
                  className="text-[11px] text-neon-green/70 hover:text-neon-green underline"
                >
                  Iniciar varredura
                </button>
              </div>
            )}
            {filteredResults.map((result, i) => (
              <ScannerResultRow
                key={result.symbol}
                result={result}
                rank={i + 1}
                dataOcid={`market.scanner_result.item.${Math.min(i + 1, 3)}`}
              />
            ))}
          </>
        )}

        {/* Normal mode */}
        {!scannerMode && (
          <>
            {!isLoading && !error && filtered.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                No pairs found
              </div>
            )}
            {!isLoading &&
              !error &&
              filtered.map((ticker: BinanceTicker) => (
                <AssetRow key={ticker.symbol} ticker={ticker} />
              ))}
          </>
        )}
      </div>
    </div>
  );
}
