import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Loader2, RefreshCw, Key, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';
import { useTickerForSymbol, useKlines } from '../hooks/useQueries';
import { useFavorites } from '../hooks/useFavorites';
import { useLocalLearning } from '../hooks/useLocalLearning';
import { useGlobalScoreForSymbol } from '../hooks/useGlobalLearning';
import { runSMCAnalysis, computeOverallScore, scoreToRecommendation } from '../lib/smc-engine';
import type { OHLCVCandle, AssetAnalysis } from '../lib/smc-types';
import {
  fetchOpenPositions,
  getStoredCredentials,
  storeCredentials,
  clearCredentials,
  type BinancePosition,
} from '../lib/binance-auth';
import RecommendationCard from '../components/RecommendationCard';
import PositionRow from '../components/PositionRow';
import AuthGate from '../components/AuthGate';
import ErrorBanner from '../components/ErrorBanner';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGlobalPatternScores } from '../hooks/useGlobalLearning';

export default function SearchTab() {
  const [searchInput, setSearchInput] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('');
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  // Credentials state
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);

  // Positions state
  const [positions, setPositions] = useState<BinancePosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const { data: ticker, isLoading: tickerLoading, error: tickerError } = useTickerForSymbol(activeSymbol);
  const { data: klines, isLoading: klinesLoading } = useKlines(activeSymbol, '1h', 100);

  const analysis = useMemo<AssetAnalysis | null>(() => {
    if (!klines || klines.length < 10 || !activeSymbol) return null;
    const candles: OHLCVCandle[] = klines.map(k => ({
      open: k.open, high: k.high, low: k.low, close: k.close,
      volume: k.volume, timestamp: k.openTime,
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
    const normalized = sym.endsWith('USDT') ? sym : `${sym}USDT`;
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
    setApiKey('');
    setSecretKey('');
    setCredsSaved(false);
    setPositions([]);
    stopPolling();
  };

  const fetchPositions = async () => {
    const creds = getStoredCredentials();
    if (!creds) return;
    setPositionsLoading(true);
    setPositionsError(null);
    try {
      const data = await fetchOpenPositions(creds);
      setPositions(data);
      setLastUpdated(new Date());
    } catch (err) {
      setPositionsError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setPositionsLoading(false);
    }
  };

  const startPolling = () => {
    fetchPositions();
    pollingRef.current = setInterval(fetchPositions, 7000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    if (credsSaved && isAuthenticated) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [credsSaved, isAuthenticated]);

  const formatPrice = (price: string) => {
    const n = parseFloat(price);
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Search Input */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search any pair (e.g. LINK, LINKUSDT)..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-green/50 transition-colors"
            />
          </div>
          <button
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
              <ErrorBanner message={`Symbol "${activeSymbol}" not found or API error.`} />
            )}

            {ticker && !tickerLoading && (
              <div className="rounded-xl border border-white/10 bg-surface p-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-muted-foreground">Last Price</div>
                  <div className="font-mono font-bold text-foreground">${formatPrice(ticker.lastPrice)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">24h Change</div>
                  <div className={`font-mono font-bold ${parseFloat(ticker.priceChangePercent) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                    {parseFloat(ticker.priceChangePercent) >= 0 ? '+' : ''}{parseFloat(ticker.priceChangePercent).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">24h High</div>
                  <div className="font-mono text-sm text-foreground">${formatPrice(ticker.highPrice)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">24h Low</div>
                  <div className="font-mono text-sm text-foreground">${formatPrice(ticker.lowPrice)}</div>
                </div>
              </div>
            )}

            {analysis && !klinesLoading && (
              <RecommendationCard analysis={analysis} globalScore={globalScore} />
            )}
          </div>
        )}

        {!activeSymbol && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <Search size={32} className="text-neon-blue/40" />
            <div className="text-sm text-muted-foreground">
              Search any Binance USD-M perpetual pair<br />
              <span className="text-neon-blue/60">e.g. LINK, DOGE, PEPE, WIF</span>
            </div>
          </div>
        )}

        {/* Open Positions Section */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span>Open Positions</span>
            {credsSaved && isAuthenticated && (
              <div className="flex items-center gap-1">
                {positionsLoading ? (
                  <Loader2 size={10} className="animate-spin text-neon-green" />
                ) : (
                  <Wifi size={10} className="text-neon-green" />
                )}
                {lastUpdated && (
                  <span className="text-[9px] text-muted-foreground">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <AuthGate message="Connect with Internet Identity to monitor your Binance positions">
            <div className="space-y-3">
              {/* API Key Input */}
              {!credsSaved ? (
                <div className="rounded-xl border border-neon-blue/30 bg-neon-blue/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neon-blue">
                    <Key size={14} />
                    <span>Binance API Credentials</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Credentials are stored only on your device and never sent to any server.
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="API Key"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 font-mono"
                    />
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        placeholder="Secret Key"
                        value={secretKey}
                        onChange={e => setSecretKey(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 font-mono"
                      />
                      <button
                        onClick={() => setShowSecret(s => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={handleSaveCredentials}
                      disabled={!apiKey.trim() || !secretKey.trim()}
                      className="w-full py-2 rounded-lg bg-neon-blue/20 border border-neon-blue/40 text-neon-blue text-sm font-semibold hover:bg-neon-blue/30 transition-colors disabled:opacity-40"
                    >
                      Save & Connect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-neon-green/30 bg-neon-green/5">
                  <div className="flex items-center gap-2 text-xs text-neon-green">
                    <Wifi size={12} />
                    <span>API Connected • Polling every 7s</span>
                  </div>
                  <button
                    onClick={handleClearCredentials}
                    className="text-[10px] text-neon-red/70 hover:text-neon-red border border-neon-red/30 px-2 py-0.5 rounded"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Positions Error */}
              {positionsError && (
                <ErrorBanner
                  message={positionsError}
                  onRetry={fetchPositions}
                />
              )}

              {/* Positions List */}
              {credsSaved && !positionsError && (
                <>
                  {positions.length === 0 && !positionsLoading && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No open positions found
                    </div>
                  )}
                  {positions.map(pos => (
                    <PositionRow key={`${pos.symbol}-${pos.positionSide}`} position={pos} />
                  ))}
                </>
              )}
            </div>
          </AuthGate>
        </div>
      </div>
    </div>
  );
}
