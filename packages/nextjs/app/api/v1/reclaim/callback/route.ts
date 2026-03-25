import { NextRequest, NextResponse } from "next/server";
import { type Proof, type ProviderType, RECLAIM_PROVIDERS, verifyReclaimProof } from "~~/lib/reclaim/client";
import { createServerClient } from "~~/lib/supabase/server";

/**
 * Map a Reclaim provider string to the internal verification type.
 */
function mapProviderToVerificationType(providerName: string): string | null {
  for (const [key, value] of Object.entries(RECLAIM_PROVIDERS)) {
    if (value.id === providerName || value.name.toLowerCase() === providerName.toLowerCase()) {
      const typeMap: Record<ProviderType, string> = {
        fico_score: "fico",
        bank_balance: "bank_balance",
        income: "income",
        identity: "identity",
      };
      return typeMap[key as ProviderType] || key;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  let proof: Proof;

  try {
    proof = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Invalid JSON body" } }, { status: 400 });
  }

  if (!proof || !proof.claimData || !proof.signatures) {
    return NextResponse.json(
      { error: { code: "INVALID_PROOF", message: "Proof is missing required fields" } },
      { status: 400 },
    );
  }

  try {
    const result = await verifyReclaimProof(proof);

    if (!result) {
      return NextResponse.json(
        { error: { code: "VERIFICATION_FAILED", message: "Proof verification failed" } },
        { status: 400 },
      );
    }

    const userAddress =
      (proof.extractedParameterValues?.wallet_address as string) ||
      (proof.extractedParameterValues?.address as string) ||
      "";

    if (!userAddress) {
      return NextResponse.json(
        { error: { code: "MISSING_ADDRESS", message: "Could not extract user address from proof" } },
        { status: 400 },
      );
    }

    const verificationType = mapProviderToVerificationType(result.provider);

    const supabase = createServerClient();
    const { error: insertError } = await supabase.from("offchain_verifications").insert({
      user_address: userAddress.toLowerCase(),
      verification_type: verificationType || result.provider,
      proof_hash: result.proofHash,
      metadata: result.extractedData,
      verified_at: new Date(result.timestamp * 1000).toISOString(),
    });

    if (insertError) {
      console.error("Failed to insert offchain verification:", insertError);
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: "Failed to store verification" } },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      verificationType: verificationType || result.provider,
      userAddress: userAddress.toLowerCase(),
      proofHash: result.proofHash,
    });
  } catch (error) {
    console.error("Reclaim callback processing error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process proof callback" } },
      { status: 500 },
    );
  }
}
