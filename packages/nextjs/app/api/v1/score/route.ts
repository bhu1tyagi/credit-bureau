import { NextRequest, NextResponse } from "next/server";
import { aggregateWalletData } from "~~/lib/data/aggregator";
import { computeCreditScore } from "~~/lib/scoring/deterministic";
import { getMLPrediction, blendScores } from "~~/lib/scoring/ml-client";
import { createServerClient } from "~~/lib/supabase/server";
import { isAddress } from "viem";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const chainsParam = searchParams.get("chains");

  // Validate input
  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Valid Ethereum address required" } },
      { status: 400 },
    );
  }

  const chains = chainsParam
    ? chainsParam.split(",").map(c => c.trim())
    : ["eth-mainnet", "base-mainnet", "arbitrum-mainnet"];

  try {
    // Aggregate on-chain data from all sources
    const { profile, dataSources, failedSources, confidence } = await aggregateWalletData(address, chains);

    // Compute deterministic score
    const deterministicResult = computeCreditScore(profile);

    // Attempt ML prediction
    const mlPrediction = await getMLPrediction(profile);
    const { score, modelVersion, confidence: blendedConfidence } = blendScores(
      deterministicResult.score,
      mlPrediction,
    );

    const result = {
      address,
      score,
      riskTier: deterministicResult.riskTier,
      breakdown: deterministicResult.breakdown,
      confidence: Math.min(confidence, blendedConfidence),
      timestamp: new Date().toISOString(),
      modelVersion,
      chains,
      dataSources,
      failedSources,
      cached: false,
    };

    // Persist to Supabase (best effort)
    try {
      const supabase = createServerClient();
      if (supabase) {
        await supabase.from("credit_scores").insert({
          wallet_address: address.toLowerCase(),
          score,
          risk_tier: deterministicResult.riskTier,
          breakdown: deterministicResult.breakdown,
          model_version: modelVersion,
          chains,
          has_offchain_data: false,
          confidence: Math.round(confidence * 100),
        });
      }
    } catch (error) {
      console.warn("[Score] Failed to persist score to database:", error);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Score computation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to compute credit score" } },
      { status: 500 },
    );
  }
}
