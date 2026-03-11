// Pre-Pump Scanner — all Binance Futures API calls run in the browser

export interface SignalResult {
  btcCorrelation: boolean;
  openInterest: boolean;
  volume: boolean;
  fundingRate: boolean;
  shortConfluence: boolean;
  rsiPositive: boolean;
  rsiDetails: Record<string, boolean>;
  score: number;
}

export interface ScanResult {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  signals: SignalResult;
  scannedAt: number;
}

const BASE = "https://fapi.binance.com/fapi/v1";

// ---------- RSI ----------
export function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ---------- Kline fetch ----------
type RawKline = [number, string, string, string, string, string, ...unknown[]];

async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number,
): Promise<{ closes: number[]; volumes: number[] }> {
  const res = await fetch(
    `${BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`klines ${symbol} ${interval} ${res.status}`);
  const raw = (await res.json()) as RawKline[];
  return {
    closes: raw.map((k) => Number.parseFloat(k[4])),
    volumes: raw.map((k) => Number.parseFloat(k[5])),
  };
}

// ---------- BTC klines cache ----------
let btcKlinesCache: { data: number[]; ts: number } | null = null;
const BTC_CACHE_TTL = 10 * 60 * 1000;

async function getBtcCloses(): Promise<number[]> {
  if (btcKlinesCache && Date.now() - btcKlinesCache.ts < BTC_CACHE_TTL) {
    return btcKlinesCache.data;
  }
  const { closes } = await fetchKlines("BTCUSDT", "1h", 48);
  btcKlinesCache = { data: closes, ts: Date.now() };
  return closes;
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sumA = 0;
  let sumB = 0;
  let sumAB = 0;
  let sumA2 = 0;
  let sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA ** 2) * (n * sumB2 - sumB ** 2));
  return den === 0 ? 0 : num / den;
}

function logReturns(closes: number[]): number[] {
  const lr: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    lr.push(Math.log(closes[i] / closes[i - 1]));
  }
  return lr;
}

// ---------- Signal implementations ----------
async function signalBtcCorrelation(symbol: string): Promise<boolean> {
  try {
    if (symbol === "BTCUSDT") return false;
    const [btcCloses, { closes }] = await Promise.all([
      getBtcCloses(),
      fetchKlines(symbol, "1h", 48),
    ]);
    const btcLR = logReturns(btcCloses);
    const symLR = logReturns(closes);
    const n = Math.min(btcLR.length, symLR.length);
    if (n < 24) return false;
    const corrAll = pearson(btcLR.slice(0, n), symLR.slice(0, n));
    const corrRecent = pearson(btcLR.slice(n - 24, n), symLR.slice(n - 24, n));
    return corrRecent > corrAll + 0.05;
  } catch {
    return false;
  }
}

async function signalOpenInterest(symbol: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE}/openInterestHist?symbol=${symbol}&period=5m&limit=6`,
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { sumOpenInterest: string }[];
    if (data.length < 4) return false;
    const latest = Number.parseFloat(data[data.length - 1].sumOpenInterest);
    const prev = Number.parseFloat(data[data.length - 4].sumOpenInterest);
    return latest > prev;
  } catch {
    return false;
  }
}

async function signalVolume(symbol: string): Promise<boolean> {
  try {
    const { volumes } = await fetchKlines(symbol, "15m", 10);
    if (volumes.length < 6) return false;
    const recent = volumes[volumes.length - 1];
    const avg =
      volumes
        .slice(volumes.length - 6, volumes.length - 1)
        .reduce((s, v) => s + v, 0) / 5;
    return recent > avg * 1.2;
  } catch {
    return false;
  }
}

async function signalFundingRate(symbol: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/fundingRate?symbol=${symbol}&limit=3`);
    if (!res.ok) return false;
    const data = (await res.json()) as { fundingRate: string }[];
    if (data.length < 2) return false;
    const latest = Number.parseFloat(data[data.length - 1].fundingRate);
    const prev = Number.parseFloat(data[data.length - 2].fundingRate);
    return latest < 0 || latest < prev;
  } catch {
    return false;
  }
}

async function signalShortConfluence(symbol: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE}/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=4`,
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { shortAccount: string }[];
    if (data.length < 2) return false;
    const latest = Number.parseFloat(data[data.length - 1].shortAccount);
    const prev = Number.parseFloat(data[data.length - 2].shortAccount);
    return latest > prev;
  } catch {
    return false;
  }
}

const RSI_TFS = ["3m", "5m", "15m", "1h", "4h", "1d"] as const;

async function signalRsi(
  symbol: string,
): Promise<{ rsiPositive: boolean; rsiDetails: Record<string, boolean> }> {
  const results = await Promise.allSettled(
    RSI_TFS.map(async (tf) => {
      const { closes } = await fetchKlines(symbol, tf, 20);
      if (closes.length < 16) return { tf, pass: false };
      const currRsi = computeRSI(closes);
      const prevRsi = computeRSI(closes.slice(0, closes.length - 1));
      const pass = currRsi > 40 || (prevRsi < 40 && currRsi > 40);
      return { tf, pass };
    }),
  );

  const details: Record<string, boolean> = {};
  for (let i = 0; i < RSI_TFS.length; i++) {
    const r = results[i];
    details[RSI_TFS[i]] = r.status === "fulfilled" ? r.value.pass : false;
  }
  const allPass = Object.values(details).every(Boolean);
  return { rsiPositive: allPass, rsiDetails: details };
}

// ---------- Cache ----------
interface CacheEntry {
  result: ScanResult;
  ts: number;
}

const scanCache = new Map<string, CacheEntry>();
const FULL_TTL = 14 * 60 * 1000;
const TOP50_TTL = 25 * 1000;

function getCached(symbol: string, ttl: number): ScanResult | null {
  const entry = scanCache.get(symbol);
  if (entry && Date.now() - entry.ts < ttl) return entry.result;
  return null;
}

async function scanSymbol(
  symbol: string,
  lastPrice: string,
  priceChangePercent: string,
  quoteVolume: string,
  ttl: number,
): Promise<ScanResult> {
  const cached = getCached(symbol, ttl);
  if (cached) return cached;

  const [
    btcCorrelation,
    openInterest,
    volume,
    fundingRate,
    shortConfluence,
    rsiResult,
  ] = await Promise.allSettled([
    signalBtcCorrelation(symbol),
    signalOpenInterest(symbol),
    signalVolume(symbol),
    signalFundingRate(symbol),
    signalShortConfluence(symbol),
    signalRsi(symbol),
  ]);

  const signals: SignalResult = {
    btcCorrelation:
      btcCorrelation.status === "fulfilled" ? btcCorrelation.value : false,
    openInterest:
      openInterest.status === "fulfilled" ? openInterest.value : false,
    volume: volume.status === "fulfilled" ? volume.value : false,
    fundingRate: fundingRate.status === "fulfilled" ? fundingRate.value : false,
    shortConfluence:
      shortConfluence.status === "fulfilled" ? shortConfluence.value : false,
    rsiPositive:
      rsiResult.status === "fulfilled" ? rsiResult.value.rsiPositive : false,
    rsiDetails:
      rsiResult.status === "fulfilled" ? rsiResult.value.rsiDetails : {},
    score: 0,
  };
  signals.score = [
    signals.btcCorrelation,
    signals.openInterest,
    signals.volume,
    signals.fundingRate,
    signals.shortConfluence,
    signals.rsiPositive,
  ].filter(Boolean).length;

  const result: ScanResult = {
    symbol,
    lastPrice,
    priceChangePercent,
    quoteVolume,
    signals,
    scannedAt: Date.now(),
  };
  scanCache.set(symbol, { result, ts: Date.now() });
  return result;
}

const DELAY_MS = 50;
const BATCH_SIZE = 15;

export interface TickerInput {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

export async function scanSymbols(
  tickers: TickerInput[],
  ttl: number = FULL_TTL,
  onProgress?: (done: number, total: number) => void,
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  let done = 0;

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((t) =>
        scanSymbol(
          t.symbol,
          t.lastPrice,
          t.priceChangePercent,
          t.quoteVolume,
          ttl,
        ),
      ),
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
    done += batch.length;
    onProgress?.(done, tickers.length);
    if (i + BATCH_SIZE < tickers.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return results.sort((a, b) => b.signals.score - a.signals.score);
}

export { TOP50_TTL, FULL_TTL };
