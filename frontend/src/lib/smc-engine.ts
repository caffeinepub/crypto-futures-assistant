import { OHLCVCandle, SMCSignal, SwingPoint, StructureBreak } from './smc-types';

const SWING_LOOKBACK = 5;
const STRONG_MOVE_THRESHOLD = 0.005; // 0.5%

function findSwingPoints(candles: OHLCVCandle[], lookback: number = SWING_LOOKBACK): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isSwingHigh = false;
      if (candles[j].low <= c.low) isSwingLow = false;
    }
    if (isSwingHigh) swings.push({ index: i, price: c.high, type: 'high', timestamp: c.timestamp });
    if (isSwingLow) swings.push({ index: i, price: c.low, type: 'low', timestamp: c.timestamp });
  }
  return swings;
}

function candleBodySize(c: OHLCVCandle): number {
  return Math.abs(c.close - c.open);
}

function candleRange(c: OHLCVCandle): number {
  return c.high - c.low;
}

function isBullishCandle(c: OHLCVCandle): boolean {
  return c.close > c.open;
}

function isBearishCandle(c: OHLCVCandle): boolean {
  return c.close < c.open;
}

/**
 * Detect Order Blocks: last significant opposing candle before a strong move
 */
export function detectOrderBlocks(candles: OHLCVCandle[]): SMCSignal[] {
  if (candles.length < 10) return [];
  const signals: SMCSignal[] = [];
  const avgRange = candles.slice(-20).reduce((s, c) => s + candleRange(c), 0) / Math.min(20, candles.length);

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    // Bullish Order Block: bearish candle followed by strong bullish move
    if (isBearishCandle(c)) {
      const moveUp = (next2.close - c.close) / c.close;
      if (moveUp > STRONG_MOVE_THRESHOLD && isBullishCandle(next1) && isBullishCandle(next2)) {
        const bodyRatio = candleBodySize(c) / (avgRange || 1);
        const confidence = Math.min(100, Math.round(40 + bodyRatio * 30 + moveUp * 1000));
        signals.push({
          type: 'OrderBlock',
          priceLevel: (c.open + c.close) / 2,
          priceLevelHigh: c.open,
          priceLevelLow: c.close,
          direction: 'bullish',
          confidenceScore: confidence,
          description: `Bullish OB at ${c.low.toFixed(4)}–${c.open.toFixed(4)}`,
        });
      }
    }

    // Bearish Order Block: bullish candle followed by strong bearish move
    if (isBullishCandle(c)) {
      const moveDown = (c.close - next2.close) / c.close;
      if (moveDown > STRONG_MOVE_THRESHOLD && isBearishCandle(next1) && isBearishCandle(next2)) {
        const bodyRatio = candleBodySize(c) / (avgRange || 1);
        const confidence = Math.min(100, Math.round(40 + bodyRatio * 30 + moveDown * 1000));
        signals.push({
          type: 'OrderBlock',
          priceLevel: (c.open + c.close) / 2,
          priceLevelHigh: c.close,
          priceLevelLow: c.open,
          direction: 'bearish',
          confidenceScore: confidence,
          description: `Bearish OB at ${c.open.toFixed(4)}–${c.high.toFixed(4)}`,
        });
      }
    }
  }

  // Return only the most recent 3 order blocks
  return signals.slice(-3);
}

/**
 * Detect Fair Value Gaps (FVG): three-candle imbalance gaps
 */
export function detectFVGs(candles: OHLCVCandle[]): SMCSignal[] {
  if (candles.length < 3) return [];
  const signals: SMCSignal[] = [];

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    // Bullish FVG: gap between prev.high and next.low (curr is the impulse candle)
    if (next.low > prev.high && isBullishCandle(curr)) {
      const gapSize = next.low - prev.high;
      const gapPercent = gapSize / prev.high;
      if (gapPercent > 0.001) {
        const confidence = Math.min(100, Math.round(50 + gapPercent * 5000));
        signals.push({
          type: 'FVG',
          priceLevel: (prev.high + next.low) / 2,
          priceLevelHigh: next.low,
          priceLevelLow: prev.high,
          direction: 'bullish',
          confidenceScore: confidence,
          description: `Bullish FVG: ${prev.high.toFixed(4)}–${next.low.toFixed(4)}`,
        });
      }
    }

    // Bearish FVG: gap between next.high and prev.low
    if (next.high < prev.low && isBearishCandle(curr)) {
      const gapSize = prev.low - next.high;
      const gapPercent = gapSize / prev.low;
      if (gapPercent > 0.001) {
        const confidence = Math.min(100, Math.round(50 + gapPercent * 5000));
        signals.push({
          type: 'FVG',
          priceLevel: (prev.low + next.high) / 2,
          priceLevelHigh: prev.low,
          priceLevelLow: next.high,
          direction: 'bearish',
          confidenceScore: confidence,
          description: `Bearish FVG: ${next.high.toFixed(4)}–${prev.low.toFixed(4)}`,
        });
      }
    }
  }

  return signals.slice(-3);
}

/**
 * Detect BOS (Break of Structure) and CHoCH (Change of Character)
 */
export function detectBOSAndCHoCH(candles: OHLCVCandle[]): SMCSignal[] {
  if (candles.length < 15) return [];
  const signals: SMCSignal[] = [];
  const swings = findSwingPoints(candles, 3);
  if (swings.length < 4) return [];

  const recentSwings = swings.slice(-8);
  const highs = recentSwings.filter(s => s.type === 'high').sort((a, b) => a.index - b.index);
  const lows = recentSwings.filter(s => s.type === 'low').sort((a, b) => a.index - b.index);

  const lastCandle = candles[candles.length - 1];

  // Check for BOS/CHoCH based on recent swing structure
  if (highs.length >= 2) {
    const prevHigh = highs[highs.length - 2];
    const lastHigh = highs[highs.length - 1];

    // Bullish BOS: higher high (trend continuation)
    if (lastHigh.price > prevHigh.price && lastCandle.close > lastHigh.price) {
      const breakStrength = (lastCandle.close - prevHigh.price) / prevHigh.price;
      const confidence = Math.min(100, Math.round(55 + breakStrength * 2000));
      signals.push({
        type: 'BOS',
        priceLevel: prevHigh.price,
        direction: 'bullish',
        confidenceScore: confidence,
        description: `Bullish BOS above ${prevHigh.price.toFixed(4)}`,
      });
    }

    // Bearish CHoCH: price breaks below recent swing low after uptrend (reversal)
    if (lows.length >= 2) {
      const lastLow = lows[lows.length - 1];
      if (lastHigh.price > prevHigh.price && lastCandle.close < lastLow.price) {
        const breakStrength = (lastLow.price - lastCandle.close) / lastLow.price;
        const confidence = Math.min(100, Math.round(60 + breakStrength * 2000));
        signals.push({
          type: 'CHoCH',
          priceLevel: lastLow.price,
          direction: 'bearish',
          confidenceScore: confidence,
          description: `Bearish CHoCH below ${lastLow.price.toFixed(4)}`,
        });
      }
    }
  }

  if (lows.length >= 2) {
    const prevLow = lows[lows.length - 2];
    const lastLow = lows[lows.length - 1];

    // Bearish BOS: lower low (trend continuation)
    if (lastLow.price < prevLow.price && lastCandle.close < lastLow.price) {
      const breakStrength = (prevLow.price - lastCandle.close) / prevLow.price;
      const confidence = Math.min(100, Math.round(55 + breakStrength * 2000));
      signals.push({
        type: 'BOS',
        priceLevel: prevLow.price,
        direction: 'bearish',
        confidenceScore: confidence,
        description: `Bearish BOS below ${prevLow.price.toFixed(4)}`,
      });
    }

    // Bullish CHoCH: price breaks above recent swing high after downtrend (reversal)
    if (highs.length >= 2) {
      const lastHigh = highs[highs.length - 1];
      if (lastLow.price < prevLow.price && lastCandle.close > lastHigh.price) {
        const breakStrength = (lastCandle.close - lastHigh.price) / lastHigh.price;
        const confidence = Math.min(100, Math.round(60 + breakStrength * 2000));
        signals.push({
          type: 'CHoCH',
          priceLevel: lastHigh.price,
          direction: 'bullish',
          confidenceScore: confidence,
          description: `Bullish CHoCH above ${lastHigh.price.toFixed(4)}`,
        });
      }
    }
  }

  return signals;
}

/**
 * Detect Liquidity Zones: swing highs/lows where stop orders cluster
 */
export function detectLiquidityZones(candles: OHLCVCandle[]): SMCSignal[] {
  if (candles.length < 10) return [];
  const signals: SMCSignal[] = [];
  const swings = findSwingPoints(candles, 4);

  // Group nearby swing points as liquidity clusters
  const recentSwings = swings.slice(-10);

  for (const swing of recentSwings) {
    // Count how many other swings are near this level (within 0.3%)
    const nearbyCount = recentSwings.filter(s => {
      return s !== swing && Math.abs(s.price - swing.price) / swing.price < 0.003;
    }).length;

    const confidence = Math.min(100, Math.round(45 + nearbyCount * 15));

    if (swing.type === 'high') {
      signals.push({
        type: 'LiquidityZone',
        priceLevel: swing.price,
        direction: 'bearish', // sell-side liquidity above
        confidenceScore: confidence,
        description: `Sell-side liquidity at ${swing.price.toFixed(4)}`,
      });
    } else {
      signals.push({
        type: 'LiquidityZone',
        priceLevel: swing.price,
        direction: 'bullish', // buy-side liquidity below
        confidenceScore: confidence,
        description: `Buy-side liquidity at ${swing.price.toFixed(4)}`,
      });
    }
  }

  // Return top 3 by confidence
  return signals.sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, 3);
}

/**
 * Run full SMC analysis on a set of candles
 */
export function runSMCAnalysis(candles: OHLCVCandle[]): SMCSignal[] {
  if (candles.length < 10) return [];
  return [
    ...detectOrderBlocks(candles),
    ...detectFVGs(candles),
    ...detectBOSAndCHoCH(candles),
    ...detectLiquidityZones(candles),
  ];
}

/**
 * Compute overall directional score from signals (-100 to 100)
 */
export function computeOverallScore(signals: SMCSignal[], isFavorite: boolean = false): number {
  if (signals.length === 0) return 0;
  let score = 0;
  let totalWeight = 0;

  const weights: Record<string, number> = {
    CHoCH: 3,
    BOS: 2.5,
    OrderBlock: 2,
    FVG: 1.5,
    LiquidityZone: 1,
  };

  for (const signal of signals) {
    const w = weights[signal.type] || 1;
    const directionMultiplier = signal.direction === 'bullish' ? 1 : -1;
    score += directionMultiplier * signal.confidenceScore * w;
    totalWeight += signal.confidenceScore * w;
  }

  const normalized = totalWeight > 0 ? (score / totalWeight) * 100 : 0;
  const favoriteBonus = isFavorite ? (normalized > 0 ? 5 : -5) : 0;
  return Math.max(-100, Math.min(100, normalized + favoriteBonus));
}

/**
 * Convert score to recommendation label
 */
export function scoreToRecommendation(score: number): import('./smc-types').RecommendationLabel {
  if (score >= 60) return 'Strong Buy';
  if (score >= 20) return 'Buy';
  if (score > -20) return 'Neutral';
  if (score > -60) return 'Sell';
  return 'Strong Sell';
}
