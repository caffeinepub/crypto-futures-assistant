# Specification

## Summary
**Goal:** Build CryptoSMC Pro — a professional crypto futures assistant PWA with a dark-neon UI, real-time Binance futures market data, browser-side Smart Money Concepts (SMC) analysis engine, local and global pattern learning, open positions monitoring, and Internet Identity authentication.

**Planned changes:**

### Frontend (React + TypeScript PWA)
- Apply global dark-neon Tailwind theme (dark background, neon green/red/orange/purple-blue accents, glow effects, animated directional arrows)
- Configure PWA manifest (standalone display, theme color, icons for Android/iOS/desktop) and service worker (app shell caching, explicit offline errors)
- Bottom navigation bar with four tabs: Market, AI Trade, Search, Preferences

**Market Tab**
- Fetch all Binance USD-M perpetual tickers from `https://fapi.binance.com/fapi/v1/ticker/24hr` every 5 seconds
- Display price, 24h change %, volume with neon directional signal badges; show explicit error on API failure

**AI Trade Tab**
- Run SMC engine on whitelist assets (BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, ADAUSDT, AVAXUSDT, DOGEUSDT)
- Show recommendation cards with detected signals, direction, neon confidence bar, and label (Strong Buy / Buy / Neutral / Sell / Strong Sell)
- Favorited assets appear first with bonus confidence weighting
- Display local learning score (localStorage) and global learning score (Motoko) per asset

**SMC Engine (`smc-engine.ts`)**
- Pure TypeScript, browser-side; accepts OHLCV candle arrays
- Detects: Order Blocks, Fair Value Gaps (FVG), Break of Structure (BOS), Change of Character (CHoCH), Liquidity Zones
- Returns typed signal objects: type, priceLevel, direction (bullish/bearish), confidenceScore (0–100)
- Deterministic, no external AI/API dependencies

**Local Learning System**
- Persist per-symbol pattern logs in localStorage (detection counts, successful signal outcomes)
- Compute local reliability score per symbol+signal type
- Reset function with confirmation dialog clears all local learning data
- Updates on signal detection in AI Trade and Search tabs

**Search Tab**
- Search input for any USD-M pair; fetch live ticker and run SMC engine; show signal breakdown
- Open Positions section (Internet Identity gated): enter Binance API Key + Secret (stored in localStorage/sessionStorage only, never sent to backend)
- Fetch positions from `https://fapi.binance.com/fapi/v1/positionRisk` with HMAC-SHA256 signing via Web Crypto API in browser
- Poll positions every 5–10 seconds; display symbol, side, entry price, mark price, unrealized P&L (neon green/red), leverage, liquidation price
- Visual P&L alerts on configurable thresholds

**Preferences Tab** (Internet Identity gated for API Key section)
- Favorite assets selection (persisted in localStorage, affects AI Trade ordering)
- Local learning reset button with confirmation dialog
- Binance API Key and Secret Key management (enter/update/clear)
- P&L alert toggle (persisted)

**Internet Identity Authentication**
- Market and AI Trade tabs freely accessible without login
- Open Positions (Search tab) and API Key management (Preferences tab) gated behind Internet Identity
- "Connect with Internet Identity" button shown for gated sections
- User principal used for Motoko backend calls; logout clears session

**PWA Icons & Assets**
- Reference generated icons in `frontend/public/assets/generated` in manifest.json and HTML head
- 192x192, 512x512, and 180x180 Apple touch icon; app wordmark in header

### Backend (Motoko canister)
- Stable variables for global pattern scoring (per-symbol: signal type, occurrence count, successful move count)
- `recordSignal(symbol, signalType, wasSuccessful)` update function
- `getGlobalScore(symbol)` query function
- HTTP outcall to `https://api.coingecko.com/api/v3/simple/price` for BTC/ETH/SOL prices; cache result
- `getMarketContext()` query returns cached CoinGecko prices without new HTTP call

**User-visible outcome:** Users can install CryptoSMC Pro as a native-like PWA, browse real-time Binance futures markets, view SMC-based trade recommendations with local and global confidence scores, search any USD-M pair for signal analysis, monitor their open Binance futures positions with live P&L alerts, and manage preferences — all within a dark-neon mobile-first interface.
