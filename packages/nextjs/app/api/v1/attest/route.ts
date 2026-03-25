import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { isAddress } from "viem";
import { computeDataHash, createCreditScoreAttestation, riskTierToUint8 } from "~~/lib/attestation/eas";
import { createServerClient } from "~~/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { address?: string; chain?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Invalid JSON body" } }, { status: 400 });
  }

  const { address, chain = "base-sepolia" } = body;

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Valid Ethereum address required" } },
      { status: 400 },
    );
  }

  const privateKey = process.env.EAS_ATTESTER_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ error: { code: "CONFIG_ERROR", message: "Attester not configured" } }, { status: 500 });
  }

  try {
    // Get latest score from Supabase
    const supabase = createServerClient();
    const { data: scoreData } = await supabase
      .from("credit_scores")
      .select("*")
      .eq("wallet_address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!scoreData) {
      return NextResponse.json(
        { error: { code: "NO_SCORE", message: "No credit score found. Compute a score first." } },
        { status: 404 },
      );
    }

    // Create signer
    const rpcUrls: Record<string, string> = {
      sepolia: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      "base-sepolia": process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      "arbitrum-sepolia": process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      "optimism-sepolia": process.env.OPTIMISM_SEPOLIA_RPC_URL || "https://sepolia.optimism.io",
      ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    };

    const provider = new ethers.JsonRpcProvider(rpcUrls[chain]);
    const signer = new ethers.Wallet(privateKey, provider);

    const dataHash = computeDataHash(scoreData.breakdown);

    const result = await createCreditScoreAttestation({
      chain,
      signer,
      walletAddress: address,
      creditScore: scoreData.score,
      riskTier: riskTierToUint8(scoreData.risk_tier),
      dataHash,
      hasOffChainData: scoreData.has_offchain_data || false,
      modelVersion: scoreData.model_version || 1,
    });

    // Store attestation in Supabase
    await supabase.from("attestations").insert({
      user_id: scoreData.user_id,
      score_id: scoreData.id,
      attestation_uid: result.attestationUid,
      chain,
      tx_hash: result.txHash,
      schema_uid: result.schemaUid,
      is_onchain: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      revoked: false,
    });

    return NextResponse.json({
      attestationUID: result.attestationUid,
      txHash: result.txHash,
      chain,
      easScanURL: result.easScanUrl,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("Attestation creation error:", { message: errMsg, stack: errStack, chain, address });
    return NextResponse.json(
      { error: { code: "ATTESTATION_FAILED", message: "Failed to create attestation" } },
      { status: 500 },
    );
  }
}
