import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus, Brain, Globe } from 'lucide-react';
import type { AssetAnalysis } from '../lib/smc-types';
import SignalBadge from './SignalBadge';

interface RecommendationCardProps {
  analysis: AssetAnalysis;
  onToggleFavorite?: (symbol: string) => void;
  globalScore?: number;
}

const recommendationConfig = {
  'Strong Buy': { color: 'text-neon-green', bg: 'bg-neon-green/20', border: 'border-neon-green/50', glow: 'neon-glow-green' },
  'Buy': { color: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/30', glow: '' },
  'Neutral': { color: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/30', glow: '' },
  'Sell': { color: 'text-neon-red', bg: 'bg-neon-red/10', border: 'border-neon-red/30', glow: '' },
  'Strong Sell': { color: 'text-neon-red', bg: 'bg-neon-red/20', border: 'border-neon-red/50', glow: 'neon-glow-red' },
};

export default function RecommendationCard({
  analysis,
  onToggleFavorite,
  globalScore,
}: RecommendationCardProps) {
  const config = recommendationConfig[analysis.recommendation];
  const symbolBase = analysis.symbol.replace('USDT', '');
  const scoreAbs = Math.abs(analysis.overallScore);
  const scoreBarWidth = `${scoreAbs}%`;
  const scoreBarColor = analysis.overallScore > 0 ? 'bg-neon-green' : analysis.overallScore < 0 ? 'bg-neon-red' : 'bg-neon-blue';

  const DirectionIcon =
    analysis.overallScore > 20
      ? TrendingUp
      : analysis.overallScore < -20
      ? TrendingDown
      : Minus;

  return (
    <div
      className={`rounded-xl border ${config.border} bg-surface p-4 space-y-3 transition-all duration-200 hover:border-opacity-80`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-neon-purple">{symbolBase.slice(0, 3)}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-foreground">{symbolBase}</span>
              {analysis.isFavorite && (
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">USDT Perp</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${config.bg} ${config.color} ${config.border} ${config.glow}`}
          >
            <DirectionIcon size={12} />
            <span>{analysis.recommendation}</span>
          </div>
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(analysis.symbol)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Star
                size={14}
                className={analysis.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}
              />
            </button>
          )}
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Signal Strength</span>
          <span className={config.color}>{scoreAbs.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${scoreBarColor}`}
            style={{ width: scoreBarWidth }}
          />
        </div>
      </div>

      {/* Signals */}
      {analysis.signals.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {analysis.signals.map((signal, i) => (
            <SignalBadge key={i} signal={signal} />
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground italic">No signals detected</div>
      )}

      {/* Learning Scores */}
      <div className="flex gap-3 pt-1 border-t border-white/5">
        <div className="flex items-center gap-1 text-[10px]">
          <Brain size={10} className="text-neon-purple" />
          <span className="text-muted-foreground">Local:</span>
          <span className="text-neon-purple font-mono font-bold">
            {analysis.localScore !== undefined ? `${analysis.localScore}%` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <Globe size={10} className="text-neon-blue" />
          <span className="text-muted-foreground">Global:</span>
          <span className="text-neon-blue font-mono font-bold">
            {globalScore !== undefined ? `${globalScore}%` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
