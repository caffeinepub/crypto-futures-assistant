import { useState, useCallback } from 'react';
import {
  loadPatternLog,
  recordSignalObservation as recordObs,
  getLocalScoreForSymbol,
  resetLocalLearning as resetAll,
} from '../lib/local-learning';

export function useLocalLearning() {
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion(v => v + 1), []);

  const recordSignal = useCallback(
    (symbol: string, signalType: string, precededSignificantMove: boolean) => {
      recordObs(symbol, signalType, precededSignificantMove);
      refresh();
    },
    [refresh]
  );

  const getLocalScore = useCallback(
    (symbol: string): number => {
      void version; // track version for reactivity
      return getLocalScoreForSymbol(symbol);
    },
    [version]
  );

  const resetLocalLearning = useCallback(() => {
    resetAll();
    refresh();
  }, [refresh]);

  const getLog = useCallback(() => {
    void version;
    return loadPatternLog();
  }, [version]);

  return { recordSignal, getLocalScore, resetLocalLearning, getLog };
}
