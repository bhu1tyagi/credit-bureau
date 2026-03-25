import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "~~/lib/supabase/server";
import { isAddress } from "viem";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Valid Ethereum address required" } },
      { status: 400 },
    );
  }

  try {
    const supabase = createServerClient();

    // Fetch all data in parallel
    const [scoresResult, attestationsResult, verificationsResult] = await Promise.allSettled([
      supabase
        .from("credit_scores")
        .select("*")
        .eq("wallet_address", address.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("attestations")
        .select("*")
        .eq("user_address", address.toLowerCase())
        .order("created_at", { ascending: false }),
      supabase
        .from("offchain_verifications")
        .select("*")
        .eq("user_address", address.toLowerCase()),
    ]);

    const scores = scoresResult.status === "fulfilled" ? scoresResult.value.data || [] : [];
    const attestations = attestationsResult.status === "fulfilled" ? attestationsResult.value.data || [] : [];
    const verifications = verificationsResult.status === "fulfilled" ? verificationsResult.value.data || [] : [];

    const latestScore = scores[0] || null;

    return NextResponse.json({
      address,
      generatedAt: new Date().toISOString(),
      score: latestScore
        ? {
            score: latestScore.score,
            riskTier: latestScore.risk_tier,
            breakdown: latestScore.breakdown,
            modelVersion: latestScore.model_version,
            computedAt: latestScore.created_at,
            chains: latestScore.chains,
            hasOffChainData: latestScore.has_offchain_data,
            confidence: latestScore.confidence,
          }
        : null,
      scoreHistory: scores.map(s => ({
        score: s.score,
        riskTier: s.risk_tier,
        timestamp: s.created_at,
        modelVersion: s.model_version,
      })),
      attestations: attestations.map(a => ({
        attestationUid: a.attestation_uid,
        chain: a.chain,
        txHash: a.tx_hash,
        isOnChain: a.is_onchain,
        expiresAt: a.expires_at,
        revoked: a.revoked,
        createdAt: a.created_at,
      })),
      offChainVerifications: verifications.map(v => ({
        type: v.verification_type,
        verifiedAt: v.verified_at,
        expiresAt: v.expires_at,
      })),
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate report" } },
      { status: 500 },
    );
  }
}
