"use client";

import { useEffect, useState } from "react";
import type { ScoreHistoryPoint } from "~~/types/credit";

interface UseScoreHistoryResult {
  history: ScoreHistoryPoint[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to fetch score history for a wallet address.
 */
export function useScoreHistory(address?: string): UseScoreHistoryResult {
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!address) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const response = await fetch(`/api/v1/history?address=${address}`);
        if (!response.ok) throw new Error("Failed to fetch history");

        const data = await response.json();
        setHistory(
          (data.history || []).map(
            (h: { score: number; riskTier: string; timestamp: string; modelVersion: number }) => ({
              score: h.score,
              riskTier: h.riskTier,
              timestamp: new Date(h.timestamp).getTime(),
              modelVersion: h.modelVersion,
            }),
          ),
        );
      } catch (error) {
        console.error("[useScoreHistory] Failed to fetch:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [address]);

  return { history, isLoading, isError };
}
