import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Key, Loader2, Search, Wifi } from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import ErrorBanner from "../components/ErrorBanner";
import PositionRow from "../components/PositionRow";
import RecommendationCard from "../components/RecommendationCard";
import { useFavorites } from "../hooks/useFavorites";
import { useGlobalScoreForSymbol } from "../hooks/useGlobalLearning";
import { useLocalLearning } from "../hooks/useLocalLearning";
import {
  useKlines,
  usePositionRisk,
  useTickerForSymbol,
} from "../hooks/useQueries";
import {
  clearCredentials,
  getStoredCredentials,
  storeCredentials,
} from "../lib/binance-auth";
import type { BinancePosition } from "../lib/binance-auth";
import {
  computeOverallScore,
  runSMCAnalysis,
  scoreToRecommendation,
} from "../lib/smc-engine";
import type { AssetAnalysis, OHLCVCandle } from "../lib/smc-types";

export default function SearchTab() {
  const [searchInput, setSearchInput] = useState("");
  const [activeSymbol, setActiveSymbol] = useState("");
  const queryClient = useQueryClient();

  // Credentials state
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);

  const { isFavorite } = useFavorites();
  const { getLocalScore } = useLocalLearning();
  const globalScore = useGlobalScoreForSymbol(activeSymbol);

  // Load stored credentials on mount
  useEffect(() => {
    const stored = getStoredCredentials();
    if (stored) {
      setApiKey(stored.apiKey);
      setSecretKey(stored.secretKey);
      setCredsSaved(true);
    }
  }, []);

  const {
    data: ticker,
    isLoading: tickerLoading,
    error: tickerError,
  } = useTickerForSymbol(activeSymbol);
  const { data: klines, isLoading: klinesLoading } = useKlines(
    activeSymbol,
    "1h",
    100,
  );

  // Fetch positions directly from Binance in the browser (no canister proxy)
  // Only requires API Keys — no Internet Identity needed
  const positionsEnabled = credsSaved && !!apiKey && !!secretKey;
  const {
    data: positionsData,
    isLoading: positionsLoading,
    error: positionsError,
    dataUpdatedAt,
    refetch: refetchPositions,
  } = usePositionRisk(
    credsSaved ? apiKey : null,
    credsSaved ? secretKey : null,
    positionsEnabled,
  );

  // Explicitly typed to avoid TypeScript narrowing to `never`
  const positions: BinancePosition[] = positionsData ?? [];

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const analysis = useMemo<AssetAnalysis | null>(() => {
    if (!klines || klines.length < 10 || !activeSymbol) return null;
    const candles: OHLCVCandle[] = klines.map((k) => ({
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      timestamp: k.openTime,
    }));
    const signals = runSMCAnalysis(candles);
    const overallScore = computeOverallScore(signals, isFavorite(activeSymbol));
    const recommendation = scoreToRecommendation(overallScore);
    return {
      symbol: activeSymbol,
      signals,
      recommendation,
      overallScore,
      isFavorite: isFavorite(activeSymbol),
      localScore: getLocalScore(activeSymbol),
      globalScore,
    };
  }, [klines, activeSymbol, isFavorite, getLocalScore, globalScore]);

  const handleSearch = () => {
    const sym = searchInput.trim().toUpperCase();
    if (!sym) return;
    const normalized = sym.endsWith("USDT") ? sym : `${sym}USDT`;
    setActiveSymbol(normalized);
  };

  const handleSaveCredentials = () => {
    if (apiKey.trim() && secretKey.trim()) {
      storeCredentials(apiKey.trim(), secretKey.trim());
      setCredsSaved(true);
    }
  };

  const handleClearCredentials = () => {
    clearCredentials();
    setApiKey("");
    setSecretKey("");
    setCredsSaved(false);
    // Invalidate position risk cache
    queryClient.removeQueries({ queryKey: ["positionRisk"] });
  };

  const formatPrice = (price: string) => {
    const n = Number.parseFloat(price);
    if (n >= 1000)
      return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  };

  const positionsErrorMessage =
    positionsError instanceof Error
      ? positionsError.message
      : positionsError
        ? "Failed to fetch positions"
        : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Search Input */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search any pair (e.g. LINK, LINKUSDT)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-green/50 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-neon-green/20 border border-neon-green/40 text-neon-green text-sm font-semibold hover:bg-neon-green/30 transition-colors"
          >
            Analyze
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Analysis Result */}
        {activeSymbol && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Analysis: {activeSymbol}
            </div>

            {(tickerLoading || klinesLoading) && (
              <div className="flex items-center gap-2 text-neon-green text-sm py-4">
                <Loader2 size={16} className="animate-spin" />
                <span>Fetching data...</span>
              </div>
            )}

            {tickerError && (
              <ErrorBanner
                message={`Symbol "${activeSymbol}" not found or API error.`}
              />
            )}

            {ticker && !tickerLoading && (
              <div className="rounded-xl border border-white/10 bg-surface p-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    Last Price
                  </div>
                  <div className="font-mono font-bold text-foreground">
                    ${formatPrice(ticker.lastPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    24h Change
                  </div>
                  <div
                    className={`font-mono font-bold ${Number.parseFloat(ticker.priceChangePercent) >= 0 ? "text-neon-green" : "text-neon-red"}`}
                  >
                    {Number.parseFloat(ticker.priceChangePercent) >= 0
                      ? "+"
                      : ""}
                    {Number.parseFloat(ticker.priceChangePercent).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    24h High
                  </div>
                  <div className="font-mono text-sm text-foreground">
                    ${formatPrice(ticker.highPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    24h Low
                  </div>
                  <div className="font-mono text-sm text-foreground">
                    ${formatPrice(ticker.lowPrice)}
                  </div>
                </div>
              </div>
            )}

            {analysis && !klinesLoading && (
              <RecommendationCard
                analysis={analysis}
                globalScore={globalScore}
              />
            )}
          </div>
        )}

        {!activeSymbol && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <Search size={32} className="text-neon-blue/40" />
            <div className="text-sm text-muted-foreground">
              Search any Binance USD-M perpetual pair
              <br />
              <span className="text-neon-blue/60">
                e.g. LINK, DOGE, PEPE, WIF
              </span>
            </div>
          </div>
        )}

        {/* Open Positions Section */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span>Posições Binance</span>
            {credsSaved && (
              <div className="flex items-center gap-1">
                {positionsLoading ? (
                  <Loader2 size={10} className="animate-spin text-neon-green" />
                ) : (
                  <Wifi size={10} className="text-neon-green" />
                )}
                {lastUpdated && dataUpdatedAt > 0 && (
                  <span className="text-[9px] text-muted-foreground">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* API Key Input — shown when no credentials saved */}
          {!credsSaved ? (
            <div className="rounded-xl border border-neon-blue/30 bg-neon-blue/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neon-blue">
                <Key size={14} />
                <span>Chaves API Binance</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                As chaves ficam apenas no seu dispositivo e são usadas para
                assinar as requisições direto no browser. Nunca são enviadas a
                nenhum servidor.
              </div>
              <div className="space-y-2">
                <input
                  data-ocid="positions.api_key.input"
                  type="text"
                  placeholder="API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 font-mono"
                />
                <div className="relative">
                  <input
                    data-ocid="positions.secret_key.input"
                    type={showSecret ? "text" : "password"}
                    placeholder="Secret Key"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 font-mono"
                  />
                  <button
                    type="button"
                    data-ocid="positions.show_secret.toggle"
                    onClick={() => setShowSecret((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  data-ocid="positions.save_credentials.button"
                  onClick={handleSaveCredentials}
                  disabled={!apiKey.trim() || !secretKey.trim()}
                  className="w-full py-2 rounded-lg bg-neon-blue/20 border border-neon-blue/40 text-neon-blue text-sm font-semibold hover:bg-neon-blue/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Salvar Credenciais
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {positionsErrorMessage && (
                <ErrorBanner message={positionsErrorMessage} />
              )}

              {positionsLoading && positions.length === 0 && (
                <div
                  className="flex items-center gap-2 text-neon-green text-sm py-3"
                  data-ocid="positions.loading_state"
                >
                  <Loader2 size={14} className="animate-spin" />
                  <span>Carregando posições...</span>
                </div>
              )}

              {!positionsLoading &&
                !positionsErrorMessage &&
                positions.length === 0 && (
                  <div
                    className="rounded-xl border border-white/10 bg-surface p-4 text-center"
                    data-ocid="positions.empty_state"
                  >
                    <div className="text-sm text-muted-foreground">
                      Nenhuma posição encontrada
                    </div>
                    <div className="text-[11px] text-muted-foreground/60 mt-1">
                      Suas posições Binance Futures aparecerão aqui
                    </div>
                  </div>
                )}

              {positions.length > 0 && (
                <div className="space-y-2">
                  {positions.map((pos, i) => (
                    <PositionRow
                      key={`${pos.symbol}-${pos.positionSide}-${i}`}
                      position={pos}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  data-ocid="positions.refresh.button"
                  onClick={() => refetchPositions()}
                  className="text-[11px] text-neon-green/70 hover:text-neon-green transition-colors"
                >
                  Atualizar agora
                </button>
                <button
                  type="button"
                  data-ocid="positions.clear_credentials.button"
                  onClick={handleClearCredentials}
                  className="text-[11px] text-muted-foreground hover:text-neon-red transition-colors"
                >
                  Limpar credenciais
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
