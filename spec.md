# Crypto Futures Assistant

## Current State
MarketTab exibe lista de pares USD-M da Binance com preço, variação 24h e volume. Ordenação por volume/change/price. Filtro de busca por nome.

## Requested Changes (Diff)

### Add
- Nova aba/toggle "Scanner" dentro do MarketTab (ao lado dos botões de sort existentes)
- Módulo `lib/pre-pump-scanner.ts`: lógica de análise para os 6 sinais de pré-alta
- Componente `ScannerTab.tsx`: lista rankeada de ativos por score de confluência
- Varredura completa de todos os pares a cada 15 minutos (background)
- Monitoramento dos top 50 (por volume) a cada 30 segundos

### Modify
- `MarketTab.tsx`: adicionar toggle entre modo "Market" e modo "Scanner"

### Remove
- Nada

## Implementation Plan

### Sinais implementados em `lib/pre-pump-scanner.ts`
1. **Correlação exponencial ao BTC aumentando**: busca klines de BTC e do ativo em 1h, calcula correlação dos retornos log nas últimas 24 velas, verifica se está crescendo (comparando correlação recente vs anterior)
2. **Open Interest aumentando**: endpoint `GET /fapi/v1/openInterestHist` — compara OI atual vs 2 períodos atrás
3. **Volume de trades aumentando**: usa dados do ticker 24h + klines 15m para comparar volume atual vs médio
4. **Funding Rate negativo ou negativando**: endpoint `GET /fapi/v1/fundingRate` — último funding rate < 0 ou última variação < 0
5. **Confluência com shorts sendo abertos**: `GET /fapi/v1/topLongShortPositionRatio` — ratio short crescendo
6. **RSI positivo (>40 ou cruzando 40) em todos os 6 TFs**: calcula RSI(14) para 3m, 5m, 15m, 1h, 4h, 1d via klines

### Score de confluência
- Cada sinal ativo = 1 ponto (máximo 6)
- RSI conta como 1 ponto se TODOS os TFs passam no critério
- Lista ordenada por score desc, depois por volume

### Ciclos de varredura
- Varredura completa: todos os pares, a cada 15min — background com Web Worker ou setTimeout em lotes (20 pares por vez para não bloquear)
- Monitoramento rápido: top 50 por volume, a cada 30s — atualiza scores parciais

### UI (ScannerTab)
- Header com status do scanner (último scan, próximo scan, progresso)
- Lista de ativos com score visual (badge colorido por score), sinais ativos como ícones/chips
- Cada linha mostra: símbolo, score (ex: 5/6), sinais ativos, preço atual, variação 24h
- Filtragem mínima: score >= X (slider ou botões)
