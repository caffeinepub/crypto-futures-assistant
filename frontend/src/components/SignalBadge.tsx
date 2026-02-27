import React from 'react';
import type { SMCSignal } from '../lib/smc-types';

interface SignalBadgeProps {
  signal: SMCSignal;
  compact?: boolean;
}

const signalColors: Record<string, { bg: string; text: string; border: string }> = {
  OrderBlock: { bg: 'bg-neon-purple/20', text: 'text-neon-purple', border: 'border-neon-purple/40' },
  FVG: { bg: 'bg-neon-blue/20', text: 'text-neon-blue', border: 'border-neon-blue/40' },
  BOS: { bg: 'bg-neon-green/20', text: 'text-neon-green', border: 'border-neon-green/40' },
  CHoCH: { bg: 'bg-neon-orange/20', text: 'text-neon-orange', border: 'border-neon-orange/40' },
  LiquidityZone: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
};

const signalLabels: Record<string, string> = {
  OrderBlock: 'OB',
  FVG: 'FVG',
  BOS: 'BOS',
  CHoCH: 'CHoCH',
  LiquidityZone: 'LIQ',
};

export default function SignalBadge({ signal, compact = false }: SignalBadgeProps) {
  const colors = signalColors[signal.type] || signalColors.FVG;
  const label = signalLabels[signal.type] || signal.type;
  const directionSymbol = signal.direction === 'bullish' ? '↑' : '↓';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border text-[10px] font-bold ${colors.bg} ${colors.text} ${colors.border}`}
      title={signal.description}
    >
      <span>{label}</span>
      <span>{directionSymbol}</span>
      {!compact && (
        <span className="opacity-70">{signal.confidenceScore}%</span>
      )}
    </div>
  );
}
