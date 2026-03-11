import { useCallback, useEffect, useRef, useState } from "react";
import {
  FULL_TTL,
  type ScanResult,
  TOP50_TTL,
  type TickerInput,
  scanSymbols,
} from "../lib/pre-pump-scanner";
import type { BinanceTicker } from "./useQueries";

export interface PumpScannerState {
  results: ScanResult[];
  isScanning: boolean;
  progress: number;
  total: number;
  lastFullScan: Date | null;
  nextFullScan: Date | null;
  lastTop50Scan: Date | null;
  triggerScan: () => void;
}

const FULL_INTERVAL = 15 * 60 * 1000;
const TOP50_INTERVAL = 30 * 1000;

export function usePumpScanner(allTickers: BinanceTicker[]): PumpScannerState {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastFullScan, setLastFullScan] = useState<Date | null>(null);
  const [nextFullScan, setNextFullScan] = useState<Date | null>(null);
  const [lastTop50Scan, setLastTop50Scan] = useState<Date | null>(null);

  const scanningRef = useRef(false);
  const initializedRef = useRef(false);

  const getTop50 = useCallback(
    (tickers: BinanceTicker[]): TickerInput[] =>
      [...tickers]
        .sort(
          (a, b) =>
            Number.parseFloat(b.quoteVolume) - Number.parseFloat(a.quoteVolume),
        )
        .slice(0, 50)
        .map((t) => ({
          symbol: t.symbol,
          lastPrice: t.lastPrice,
          priceChangePercent: t.priceChangePercent,
          quoteVolume: t.quoteVolume,
        })),
    [],
  );

  const runScan = useCallback(
    async (tickers: TickerInput[], ttl: number, isFullScan: boolean) => {
      if (scanningRef.current) return;
      scanningRef.current = true;
      setIsScanning(true);
      setTotal(tickers.length);
      setProgress(0);

      try {
        const scanned = await scanSymbols(tickers, ttl, (done, tot) => {
          setProgress(done);
          setTotal(tot);
        });

        setResults((prev) => {
          const map = new Map(prev.map((r) => [r.symbol, r]));
          for (const r of scanned) map.set(r.symbol, r);
          return [...map.values()].sort(
            (a, b) => b.signals.score - a.signals.score,
          );
        });

        const now = new Date();
        if (isFullScan) {
          setLastFullScan(now);
          setNextFullScan(new Date(now.getTime() + FULL_INTERVAL));
        } else {
          setLastTop50Scan(now);
        }
      } finally {
        scanningRef.current = false;
        setIsScanning(false);
      }
    },
    [],
  );

  const tickersRef = useRef<BinanceTicker[]>(allTickers);
  useEffect(() => {
    tickersRef.current = allTickers;
  }, [allTickers]);

  // Initial scan of top 50 — fires once when tickers first become available
  useEffect(() => {
    if (allTickers.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const top50 = getTop50(allTickers);
    runScan(top50, TOP50_TTL, false);
  }, [allTickers, getTop50, runScan]);

  // Top 50 every 30s
  useEffect(() => {
    const id = setInterval(() => {
      const top50 = getTop50(tickersRef.current);
      if (top50.length > 0) runScan(top50, TOP50_TTL, false);
    }, TOP50_INTERVAL);
    return () => clearInterval(id);
  }, [getTop50, runScan]);

  // Full scan every 15min
  useEffect(() => {
    const id = setInterval(() => {
      const all = tickersRef.current.map((t) => ({
        symbol: t.symbol,
        lastPrice: t.lastPrice,
        priceChangePercent: t.priceChangePercent,
        quoteVolume: t.quoteVolume,
      }));
      if (all.length > 0) runScan(all, FULL_TTL, true);
    }, FULL_INTERVAL);
    return () => clearInterval(id);
  }, [runScan]);

  const triggerScan = useCallback(() => {
    const top50 = getTop50(tickersRef.current);
    if (top50.length > 0) runScan(top50, 0, false);
  }, [getTop50, runScan]);

  return {
    results,
    isScanning,
    progress,
    total,
    lastFullScan,
    nextFullScan,
    lastTop50Scan,
    triggerScan,
  };
}
