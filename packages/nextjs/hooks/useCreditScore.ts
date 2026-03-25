"use client";

import { useState, useEffect, useCallback } from "react";
import type { CreditScore } from "~~/types/credit";

interface UseCreditScoreResult {
  score: CreditScore | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch credit score for a wallet address.
 */
export function useCreditScore(address?: string): UseCreditScoreResult {
  const [score, setScore] = useState<CreditScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch(`/api/v1/score?address=${address}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to fetch score");
      }

      const data = await response.json();
      setScore({
        score: data.score,
        riskTier: data.riskTier,
        breakdown: data.breakdown,
        confidence: data.confidence,
        timestamp: new Date(data.timestamp).getTime(),
        modelVersion: data.modelVersion,
        chains: data.chains,
        hasOffChainData: data.hasOffChainData || false,
      });
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  return { score, isLoading, isError, error, refetch: fetchScore };
}
