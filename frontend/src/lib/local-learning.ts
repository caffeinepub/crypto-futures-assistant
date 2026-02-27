export interface LocalPatternLog {
  symbol: string;
  signalType: string;
  occurrenceCount: number;
  precedingMoveCount: number;
}

const STORAGE_KEY = 'cryptosmc-local-learning';

export function loadPatternLog(): LocalPatternLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalPatternLog[];
  } catch {
    return [];
  }
}

export function savePatternLog(log: LocalPatternLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // ignore storage errors
  }
}

export function recordSignalObservation(
  symbol: string,
  signalType: string,
  precededSignificantMove: boolean
): void {
  const log = loadPatternLog();
  const existing = log.find(e => e.symbol === symbol && e.signalType === signalType);
  if (existing) {
    existing.occurrenceCount += 1;
    if (precededSignificantMove) existing.precedingMoveCount += 1;
  } else {
    log.push({
      symbol,
      signalType,
      occurrenceCount: 1,
      precedingMoveCount: precededSignificantMove ? 1 : 0,
    });
  }
  savePatternLog(log);
}

export function getLocalReliabilityScore(symbol: string, signalType: string): number {
  const log = loadPatternLog();
  const entry = log.find(e => e.symbol === symbol && e.signalType === signalType);
  if (!entry || entry.occurrenceCount === 0) return 0;
  return Math.round((entry.precedingMoveCount / entry.occurrenceCount) * 100);
}

export function getLocalScoreForSymbol(symbol: string): number {
  const log = loadPatternLog();
  const entries = log.filter(e => e.symbol === symbol);
  if (entries.length === 0) return 0;
  const total = entries.reduce((s, e) => s + e.occurrenceCount, 0);
  const successful = entries.reduce((s, e) => s + e.precedingMoveCount, 0);
  if (total === 0) return 0;
  return Math.round((successful / total) * 100);
}

export function resetLocalLearning(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
