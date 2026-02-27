export interface OHLCVCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export type SMCSignalType = 'OrderBlock' | 'FVG' | 'BOS' | 'CHoCH' | 'LiquidityZone';

export interface SMCSignal {
  type: SMCSignalType;
  priceLevel: number;
  direction: 'bullish' | 'bearish';
  confidenceScore: number; // 0-100
  description?: string;
  priceLevelHigh?: number;
  priceLevelLow?: number;
}

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  timestamp: number;
}

export interface StructureBreak {
  index: number;
  price: number;
  type: 'BOS' | 'CHoCH';
  direction: 'bullish' | 'bearish';
  brokenLevel: number;
}

export type RecommendationLabel = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';

export interface AssetAnalysis {
  symbol: string;
  signals: SMCSignal[];
  recommendation: RecommendationLabel;
  overallScore: number; // -100 to 100
  isFavorite: boolean;
  localScore?: number;
  globalScore?: number;
}
