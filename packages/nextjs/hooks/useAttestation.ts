"use client";

import { useState, useCallback } from "react";
import type { AttestationResult } from "~~/types/credit";

interface UseAttestationResult {
  mint: (address: string, chain?: string) => Promise<AttestationResult | null>;
  isMinting: boolean;
  error: string | null;
}

/**
 * Hook to create EAS attestations.
 */
export function useAttestation(): UseAttestationResult {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mint = useCallback(async (address: string, chain = "base"): Promise<AttestationResult | null> => {
    setIsMinting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to create attestation");
      }

      const data = await response.json();
      return {
        attestationUid: data.attestationUID,
        txHash: data.txHash,
        chain: data.chain,
        easScanUrl: data.easScanURL,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      return null;
    } finally {
      setIsMinting(false);
    }
  }, []);

  return { mint, isMinting, error };
}
