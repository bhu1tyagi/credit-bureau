import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { aggregateWalletData } from "~~/lib/data/aggregator";
import { aggregateSolanaWalletData } from "~~/lib/data/solana-aggregator";
import { detectChainType } from "~~/lib/constants";
import { computeCreditScore } from "~~/lib/scoring/deterministic";
import { blendScores, getMLPrediction } from "~~/lib/scoring/ml-client";
import { createServerClient } from "~~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const chainsParam = searchParams.get("chains");

  if (!address) {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Address is required" } },
      { status: 400 },
    );
  }

  const chainType = detectChainType(address);

  if (chainType === "unknown") {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Valid EVM or Solana address required" } },
      { status: 400 },
    );
  }

  if (chainType === "evm" && !isAddress(address)) {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Invalid EVM address checksum" } },
      { status: 400 },
    );
  }

  const chains = chainsParam
    ? chainsParam.split(",").map(c => c.trim())
    : chainType === "solana"
      ? ["solana-mainnet"]
      : ["eth-mainnet", "base-mainnet", "arbitrum-mainnet"];

  try {
    let profile, dataSources, failedSources, confidence;

    if (chainType === "solana") {
      const solanaResult = await aggregateSolanaWalletData(address);
      profile = solanaResult.profile;
      dataSources = solanaResult.dataSources;
      failedSources = solanaResult.failedSources;
      confidence = solanaResult.confidence;
    } else {
      const evmResult = await aggregateWalletData(address, chains);
      profile = evmResult.profile;
      dataSources = evmResult.dataSources;
      failedSources = evmResult.failedSources;
      confidence = evmResult.confidence;
    }

    const deterministicResult = computeCreditScore(profile);

    const mlPrediction = await getMLPrediction(profile);
    const { score, modelVersion, confidence: blendedConfidence } = blendScores(deterministicResult.score, mlPrediction);

    const result = {
      address,
      chainType,
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

    try {
      const supabase = createServerClient();
      if (supabase) {
        await supabase.from("credit_scores").insert({
          wallet_address: chainType === "evm" ? address.toLowerCase() : address,
          score,
          risk_tier: deterministicResult.riskTier,
          breakdown: deterministicResult.breakdown,
          model_version: modelVersion,
          chains,
          has_offchain_data: false,
          confidence: Math.round(confidence * 100),
          chain_type: chainType,
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
