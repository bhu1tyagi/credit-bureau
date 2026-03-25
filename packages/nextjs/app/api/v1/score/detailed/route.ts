import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { aggregateWalletData } from "~~/lib/data/aggregator";
import { getCredScore } from "~~/lib/data/cred-protocol";
import { type OffChainData, computeCreditScore } from "~~/lib/scoring/deterministic";
import { blendScores, getMLPrediction } from "~~/lib/scoring/ml-client";
import { createServerClient } from "~~/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { address?: string; chains?: string[]; includeOffChain?: boolean };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Invalid JSON body" } }, { status: 400 });
  }

  const { address, chains = ["eth-mainnet", "base-mainnet", "arbitrum-mainnet"], includeOffChain = false } = body;

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Valid Ethereum address required" } },
      { status: 400 },
    );
  }

  try {
    // Run all data fetches in parallel
    const [aggregatedData, credScore] = await Promise.allSettled([
      aggregateWalletData(address, chains),
      getCredScore(address),
    ]);

    const { profile, dataSources, failedSources, confidence } =
      aggregatedData.status === "fulfilled"
        ? aggregatedData.value
        : { profile: getEmptyProfile(), dataSources: [], failedSources: ["goldrush", "aave_subgraph"], confidence: 0 };

    // Get off-chain data if requested
    let offChainData: OffChainData | undefined;
    if (includeOffChain) {
      try {
        const supabase = createServerClient();
        const { data: verifications } = await supabase
          .from("offchain_verifications")
          .select("*")
          .eq("user_address", address);

        if (verifications && verifications.length > 0) {
          offChainData = {};
          for (const v of verifications) {
            if (v.verification_type === "fico") offChainData.ficoScore = v.metadata?.score;
            if (v.verification_type === "bank_balance") offChainData.bankBalanceUsd = v.metadata?.balance;
            if (v.verification_type === "income") offChainData.annualIncomeUsd = v.metadata?.annual_income;
          }
        }
      } catch (error) {
        console.warn("[DetailedScore] Off-chain data fetch failed:", error);
      }
    }

    // Compute score
    const deterministicResult = computeCreditScore(profile, offChainData);
    const mlPrediction = await getMLPrediction(profile);
    const blended = blendScores(deterministicResult.score, mlPrediction);

    const result = {
      address,
      score: blended.score,
      riskTier: deterministicResult.riskTier,
      breakdown: deterministicResult.breakdown,
      confidence: Math.min(confidence, blended.confidence),
      timestamp: new Date().toISOString(),
      modelVersion: blended.modelVersion,
      chains,
      hasOffChainData: !!offChainData,
      dataSources,
      failedSources,
      credProtocolBaseline: credScore.status === "fulfilled" ? credScore.value?.score : null,
      cached: false,
    };

    // Persist to Supabase
    try {
      const supabase = createServerClient();
      await supabase.from("credit_scores").insert({
        wallet_address: address.toLowerCase(),
        score: blended.score,
        risk_tier: deterministicResult.riskTier,
        breakdown: deterministicResult.breakdown,
        model_version: blended.modelVersion,
        chains,
        has_offchain_data: !!offChainData,
        confidence: Math.round(confidence * 100),
      });
    } catch (error) {
      console.warn("[DetailedScore] Failed to persist score:", error);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Detailed score error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to compute detailed score" } },
      { status: 500 },
    );
  }
}

function getEmptyProfile() {
  return {
    walletAgeDays: 0,
    txCount: 0,
    uniqueActiveMonths: 0,
    defiProtocolCount: 0,
    defiProtocols: [],
    totalBorrows: 0,
    totalRepays: 0,
    repaymentRatio: 0,
    liquidationCount: 0,
    liquidationVolumeUsd: 0,
    stablecoinRatio: 0,
    totalValueUsd: 0,
    tokenCount: 0,
    nftCount: 0,
    governanceParticipation: 0,
    bridgeUsageCount: 0,
  };
}
