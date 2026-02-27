import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { PatternEntry } from '../backend';

export function useGlobalPatternScores(symbol: string) {
  const { actor, isFetching } = useActor();

  return useQuery<PatternEntry[]>({
    queryKey: ['globalPatternScores', symbol],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPatternScores(symbol);
    },
    enabled: !!actor && !isFetching && !!symbol,
    staleTime: 60_000,
  });
}

export function useGlobalScoreForSymbol(symbol: string): number {
  const { data } = useGlobalPatternScores(symbol);
  if (!data || data.length === 0) return 0;
  const total = data.reduce((s, e) => s + Number(e.occurrenceCount), 0);
  const successful = data.reduce((s, e) => s + Number(e.precedingMoveCount), 0);
  if (total === 0) return 0;
  return Math.round((successful / total) * 100);
}

export function useRecordSignalObservation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      symbol,
      signalType,
      precededSignificantMove,
    }: {
      symbol: string;
      signalType: string;
      precededSignificantMove: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordSignalObservation(symbol, signalType, precededSignificantMove);
    },
    onSuccess: (_, { symbol }) => {
      queryClient.invalidateQueries({ queryKey: ['globalPatternScores', symbol] });
    },
  });
}
