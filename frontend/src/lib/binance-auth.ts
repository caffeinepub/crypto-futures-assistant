const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface BinanceCredentials {
  apiKey: string;
  secretKey: string;
}

export function getStoredCredentials(): BinanceCredentials | null {
  try {
    const apiKey = localStorage.getItem('cryptosmc-binance-api-key');
    const secretKey = localStorage.getItem('cryptosmc-binance-secret-key');
    if (apiKey && secretKey) return { apiKey, secretKey };
    return null;
  } catch {
    return null;
  }
}

export function storeCredentials(apiKey: string, secretKey: string): void {
  localStorage.setItem('cryptosmc-binance-api-key', apiKey);
  localStorage.setItem('cryptosmc-binance-secret-key', secretKey);
}

export function clearCredentials(): void {
  localStorage.removeItem('cryptosmc-binance-api-key');
  localStorage.removeItem('cryptosmc-binance-secret-key');
}

export async function fetchSignedBinance<T>(
  endpoint: string,
  credentials: BinanceCredentials,
  extraParams: Record<string, string> = {}
): Promise<T> {
  const timestamp = Date.now().toString();
  const params = new URLSearchParams({
    ...extraParams,
    timestamp,
    recvWindow: '5000',
  });

  const queryString = params.toString();
  const signature = await hmacSha256Hex(credentials.secretKey, queryString);
  const url = `${BINANCE_FUTURES_BASE}${endpoint}?${queryString}&signature=${signature}`;

  const response = await fetch(url, {
    headers: {
      'X-MBX-APIKEY': credentials.apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Binance API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export interface BinancePosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  positionSide: string;
  notional: string;
}

export async function fetchOpenPositions(credentials: BinanceCredentials): Promise<BinancePosition[]> {
  const positions = await fetchSignedBinance<BinancePosition[]>(
    '/fapi/v1/positionRisk',
    credentials
  );
  // Filter only positions with non-zero amount
  return positions.filter(p => parseFloat(p.positionAmt) !== 0);
}
