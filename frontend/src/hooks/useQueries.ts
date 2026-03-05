import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { fetchSignedBinance } from '../lib/binance-auth';
import type { BinancePosition } from '../lib/binance-auth';

export interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
  openInterest?: string;
}

export function useMarketTickers() {
  return useQuery<BinanceTicker[]>({
    queryKey: ['marketTickers'],
    queryFn: async () => {
      const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
      if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
      const data = await res.json() as BinanceTicker[];
      // Filter only USDT perpetual pairs
      return data.filter(t => t.symbol.endsWith('USDT'));
    },
    refetchInterval: 5000,
    retry: 2,
    staleTime: 4000,
  });
}

export function useTickerForSymbol(symbol: string) {
  return useQuery<BinanceTicker | null>({
    queryKey: ['ticker', symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const res = await fetch(
        `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol.toUpperCase()}`
      );
      if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
      return res.json() as Promise<BinanceTicker>;
    },
    enabled: !!symbol,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

export interface BinanceKline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export function useKlines(symbol: string, interval: string = '1h', limit: number = 100) {
  return useQuery<BinanceKline[]>({
    queryKey: ['klines', symbol, interval, limit],
    queryFn: async () => {
      if (!symbol) return [];
      const res = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
      );
      if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
      const raw = await res.json() as unknown[][];
      return raw.map(k => ({
        openTime: k[0] as number,
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
        closeTime: k[6] as number,
      }));
    },
    enabled: !!symbol,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCoinGeckoPrices() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ['coinGeckoPrices'],
    queryFn: async () => {
      if (!actor) return '';
      return actor.getCoinGeckoPrices();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

/**
 * Fetches open position risk directly from Binance Futures API in the browser
 * using HMAC-SHA256 signing. No canister proxy involved.
 * Credentials are read exclusively from localStorage and never sent to the backend.
 */
export function usePositionRisk(
  apiKey: string | null,
  apiSecret: string | null,
  enabled: boolean
) {
  return useQuery<BinancePosition[]>({
    queryKey: ['positionRisk', apiKey],
    queryFn: async () => {
      if (!apiKey || !apiSecret) return [];

      const positions = await fetchSignedBinance<BinancePosition[]>(
        '/fapi/v2/positionRisk',
        { apiKey, secretKey: apiSecret }
      );

      // Filter only positions with non-zero amount
      return positions.filter(p => parseFloat(p.positionAmt) !== 0);
    },
    enabled: enabled && !!apiKey && !!apiSecret,
    refetchInterval: 7000,
    staleTime: 6000,
    retry: 1,
  });
}
