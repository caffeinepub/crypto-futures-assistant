import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BinanceTicker } from '../hooks/useQueries';

interface AssetRowProps {
  ticker: BinanceTicker;
  onClick?: () => void;
}

function formatPrice(price: string): string {
  const n = parseFloat(price);
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function formatVolume(vol: string): string {
  const n = parseFloat(vol);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export default function AssetRow({ ticker, onClick }: AssetRowProps) {
  const changePercent = parseFloat(ticker.priceChangePercent);
  const isPositive = changePercent > 0.1;
  const isNegative = changePercent < -0.1;

  const changeColor = isPositive
    ? 'text-neon-green'
    : isNegative
    ? 'text-neon-red'
    : 'text-neon-orange';

  const glowClass = isPositive
    ? 'neon-glow-green'
    : isNegative
    ? 'neon-glow-red'
    : 'neon-glow-orange';

  const DirectionIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const symbolBase = ticker.symbol.replace('USDT', '');

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-bold text-neon-purple">{symbolBase.slice(0, 3)}</span>
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-foreground">{symbolBase}</div>
          <div className="text-[10px] text-muted-foreground">USDT Perp</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-mono text-sm font-semibold text-foreground">
            ${formatPrice(ticker.lastPrice)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Vol: {formatVolume(ticker.quoteVolume)}
          </div>
        </div>

        <div
          className={`flex items-center gap-1 min-w-[70px] justify-end ${changeColor} ${glowClass}`}
        >
          <DirectionIcon size={14} className={isPositive ? 'animate-bounce-subtle' : ''} />
          <span className="font-mono text-sm font-bold">
            {changePercent > 0 ? '+' : ''}
            {changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
