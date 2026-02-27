import React, { useMemo, useEffect } from 'react';
import { Loader2, RefreshCw, Brain } from 'lucide-react';
import { useKlines } from '../hooks/useQueries';
import { useFavorites } from '../hooks/useFavorites';
import { useLocalLearning } from '../hooks/useLocalLearning';
import { useGlobalScoreForSymbol } from '../hooks/useGlobalLearning';
import { runSMCAnalysis, computeOverallScore, scoreToRecommendation } from '../lib/smc-engine';
import type { OHLCVCandle, AssetAnalysis } from '../lib/smc-types';
import RecommendationCard from '../components/RecommendationCard';
import ErrorBanner from '../components/ErrorBanner';

const WHITELIST = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',
  'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT',
];

interface AssetCardWrapperProps {
  symbol: string;
  isFavorite: boolean;
  onToggleFavorite: (symbol: string) => void;
  getLocalScore: (symbol: string) => number;
}

function AssetCardWrapper({ symbol, isFavorite, onToggleFavorite, getLocalScore }: AssetCardWrapperProps) {
  const { data: klines, isLoading, error } = useKlines(symbol, '1h', 100);
  const globalScore = useGlobalScoreForSymbol(symbol);
  const localScore = getLocalScore(symbol);

  const analysis = useMemo<AssetAnalysis | null>(() => {
    if (!klines || klines.length < 10) return null;
    const candles: OHLCVCandle[] = klines.map(k => ({
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      timestamp: k.openTime,
    }));
    const signals = runSMCAnalysis(candles);
    const overallScore = computeOverallScore(signals, isFavorite);
    const recommendation = scoreToRecommendation(overallScore);
    return {
      symbol,
      signals,
      recommendation,
      overallScore,
      isFavorite,
      localScore,
      globalScore,
    };
  }, [klines, isFavorite, localScore, globalScore, symbol]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-surface p-4 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 size={14} className="animate-spin text-neon-green" />
        <span>Analyzing {symbol.replace('USDT', '')}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner message={`Failed to load data for ${symbol.replace('USDT', '')}`} />
    );
  }

  if (!analysis) return null;

  return (
    <RecommendationCard
      analysis={analysis}
      onToggleFavorite={onToggleFavorite}
      globalScore={globalScore}
    />
  );
}

export default function AITradeTab() {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { getLocalScore } = useLocalLearning();

  const sortedSymbols = useMemo(() => {
    const favs = WHITELIST.filter(s => favorites.includes(s));
    const rest = WHITELIST.filter(s => !favorites.includes(s));
    return [...favs, ...rest];
  }, [favorites]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <Brain size={16} className="text-neon-purple" />
        <div>
          <div className="text-sm font-semibold text-foreground">AI Trade Analysis</div>
          <div className="text-[10px] text-muted-foreground">SMC-based signals • 1H timeframe</div>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <RefreshCw size={10} />
          <span>Auto-refresh 1m</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedSymbols.map(symbol => (
          <AssetCardWrapper
            key={symbol}
            symbol={symbol}
            isFavorite={isFavorite(symbol)}
            onToggleFavorite={toggleFavorite}
            getLocalScore={getLocalScore}
          />
        ))}
      </div>
    </div>
  );
}
