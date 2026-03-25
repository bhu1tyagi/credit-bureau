import type { WalletProfile } from "~~/types/credit";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

interface MLPrediction {
  score: number;
  confidence: number;
  modelVersion: string;
}

/**
 * Call the Python ML service for an enhanced credit score prediction.
 * Returns null if the service is unavailable (graceful fallback).
 */
export async function getMLPrediction(profile: WalletProfile): Promise<MLPrediction | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_age_days: profile.walletAgeDays,
        tx_count: profile.txCount,
        unique_active_months: profile.uniqueActiveMonths,
        defi_protocol_count: profile.defiProtocolCount,
        total_borrows: profile.totalBorrows,
        total_repays: profile.totalRepays,
        repayment_ratio: profile.repaymentRatio,
        liquidation_count: profile.liquidationCount,
        liquidation_volume_usd: profile.liquidationVolumeUsd,
        stablecoin_ratio: profile.stablecoinRatio,
        total_value_usd: profile.totalValueUsd,
        token_count: profile.tokenCount,
        nft_count: profile.nftCount,
        governance_participation: profile.governanceParticipation,
        bridge_usage_count: profile.bridgeUsageCount,
      }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      score: data.score,
      confidence: data.confidence,
      modelVersion: data.model_version,
    };
  } catch (error) {
    console.warn("[MLClient] ML service unavailable, using deterministic fallback:", error);
    return null;
  }
}

/**
 * Blend deterministic and ML scores.
 * 70% deterministic + 30% ML when ML is available.
 */
export function blendScores(
  deterministicScore: number,
  mlPrediction: MLPrediction | null,
): { score: number; modelVersion: number; confidence: number } {
  if (!mlPrediction) {
    return {
      score: deterministicScore,
      modelVersion: 1,
      confidence: 1.0,
    };
  }

  const blended = Math.round(deterministicScore * 0.7 + mlPrediction.score * 0.3);
  const finalScore = Math.max(300, Math.min(850, blended));

  return {
    score: finalScore,
    modelVersion: 2,
    confidence: mlPrediction.confidence,
  };
}

/**
 * Check if ML service is healthy.
 */
export async function checkMLHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch (error) {
    console.warn("[MLClient] Health check failed:", error);
    return false;
  }
}
