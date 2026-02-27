import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BinancePosition } from '../lib/binance-auth';

interface PositionRowProps {
  position: BinancePosition;
  pnlAlertThreshold?: number;
}

function formatPrice(price: string): string {
  const n = parseFloat(price);
  if (n === 0) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export default function PositionRow({ position, pnlAlertThreshold = 5 }: PositionRowProps) {
  const pnl = parseFloat(position.unRealizedProfit);
  const posAmt = parseFloat(position.positionAmt);
  const isLong = posAmt > 0;
  const isProfit = pnl > 0;
  const isLoss = pnl < 0;
  const pnlAbs = Math.abs(pnl);
  const hasAlert = pnlAbs >= pnlAlertThreshold;

  const symbolBase = position.symbol.replace('USDT', '');

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition-all ${
        hasAlert
          ? isProfit
            ? 'border-neon-green/60 bg-neon-green/5'
            : 'border-neon-red/60 bg-neon-red/5'
          : 'border-white/10 bg-surface'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center">
            <span className="text-[9px] font-bold text-neon-purple">{symbolBase.slice(0, 3)}</span>
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">{symbolBase}</div>
            <div className="text-[10px] text-muted-foreground">USDT Perp</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAlert && (
            <AlertTriangle
              size={14}
              className={isProfit ? 'text-neon-green animate-pulse' : 'text-neon-red animate-pulse'}
            />
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isLong
                ? 'bg-neon-green/20 text-neon-green border-neon-green/40'
                : 'bg-neon-red/20 text-neon-red border-neon-red/40'
            }`}
          >
            {isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-[10px] text-muted-foreground border border-white/20 px-1.5 py-0.5 rounded">
            {position.leverage}x
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-muted-foreground">Entry Price</div>
          <div className="font-mono font-semibold text-foreground">${formatPrice(position.entryPrice)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Mark Price</div>
          <div className="font-mono font-semibold text-foreground">${formatPrice(position.markPrice)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Unrealized P&L</div>
          <div
            className={`font-mono font-bold text-sm ${
              isProfit ? 'text-neon-green neon-glow-green' : isLoss ? 'text-neon-red neon-glow-red' : 'text-muted-foreground'
            }`}
          >
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Liq. Price</div>
          <div className="font-mono font-semibold text-neon-orange">
            ${formatPrice(position.liquidationPrice)}
          </div>
        </div>
      </div>
    </div>
  );
}
