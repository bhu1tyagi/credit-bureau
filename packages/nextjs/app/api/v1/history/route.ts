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
    const { data, error } = await supabase
      .from("credit_scores")
      .select("score, risk_tier, model_version, created_at, chains, has_offchain_data, confidence")
      .eq("wallet_address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const history = (data || []).map(row => ({
      score: row.score,
      riskTier: row.risk_tier,
      modelVersion: row.model_version,
      timestamp: new Date(row.created_at).toISOString(),
      chains: row.chains,
      hasOffChainData: row.has_offchain_data,
      confidence: row.confidence,
    }));

    return NextResponse.json({ address, history });
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch score history" } },
      { status: 500 },
    );
  }
}
