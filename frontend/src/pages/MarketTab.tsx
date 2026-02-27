import React, { useState, useMemo } from 'react';
import { Search, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useMarketTickers } from '../hooks/useQueries';
import AssetRow from '../components/AssetRow';
import ErrorBanner from '../components/ErrorBanner';
import type { BinanceTicker } from '../hooks/useQueries';

type SortKey = 'volume' | 'change' | 'price';

export default function MarketTab() {
  const { data: tickers, isLoading, error, refetch } = useMarketTickers();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('volume');

  const filtered = useMemo(() => {
    if (!tickers) return [];
    let list = tickers;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(t => t.symbol.includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortKey === 'volume') return parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume);
      if (sortKey === 'change') return parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent);
      if (sortKey === 'price') return parseFloat(b.lastPrice) - parseFloat(a.lastPrice);
      return 0;
    });
  }, [tickers, search, sortKey]);

  const gainers = tickers?.filter(t => parseFloat(t.priceChangePercent) > 0).length ?? 0;
  const losers = tickers?.filter(t => parseFloat(t.priceChangePercent) < 0).length ?? 0;

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
        <div className="ml-auto text-[10px] text-muted-foreground">
          {tickers ? `${tickers.length} pairs` : ''}
        </div>
      </div>

      {/* Search & Sort */}
      <div className="px-4 py-2 flex gap-2 border-b border-white/5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search pair..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-green/50 transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {(['volume', 'change', 'price'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-colors ${
                sortKey === key
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                  : 'bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
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

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            No pairs found
          </div>
        )}

        {!isLoading && !error && filtered.map((ticker: BinanceTicker) => (
          <AssetRow key={ticker.symbol} ticker={ticker} />
        ))}
      </div>
    </div>
  );
}
