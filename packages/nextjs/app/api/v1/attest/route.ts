import { NextRequest, NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import { ethers } from "ethers";
import { isAddress } from "viem";
import { computeDataHash, createCreditScoreAttestation, riskTierToUint8 } from "~~/lib/attestation/eas";
import { createSolanaAttestation, getSASConfig } from "~~/lib/attestation/sas";
import { DEFAULT_ATTESTATION_CHAIN, detectChainType } from "~~/lib/constants";
import { createServerClient } from "~~/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { address?: string; chain?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Invalid JSON body" } }, { status: 400 });
  }

  const { address, chain = DEFAULT_ATTESTATION_CHAIN } = body;

  if (!address) {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Address is required" } },
      { status: 400 },
    );
  }

  const chainType = detectChainType(address);
  const isSolanaAttestation = chain === "solana" || chainType === "solana";

  if (chainType === "evm" && !isAddress(address)) {
    return NextResponse.json(
      { error: { code: "INVALID_ADDRESS", message: "Invalid EVM address" } },
      { status: 400 },
    );
  }

  try {
    const supabase = createServerClient();
    const walletAddr = chainType === "evm" ? address.toLowerCase() : address;

    const { data: scoreData } = await supabase
      .from("credit_scores")
      .select("*")
      .eq("wallet_address", walletAddr)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!scoreData) {
      return NextResponse.json(
        { error: { code: "NO_SCORE", message: "No credit score found. Compute a score first." } },
        { status: 404 },
      );
    }

    if (isSolanaAttestation) {
      return await handleSolanaAttestation(supabase, scoreData, address);
    }

    return await handleEVMAttestation(supabase, scoreData, address, chain);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Attestation creation error:", { message: errMsg, chain, address });
    return NextResponse.json(
      { error: { code: "ATTESTATION_FAILED", message: "Failed to create attestation" } },
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEVMAttestation(supabase: any, scoreData: any, address: string, chain: string) {
  const privateKey = process.env.EAS_ATTESTER_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ error: { code: "CONFIG_ERROR", message: "Attester not configured" } }, { status: 500 });
  }

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
    chain_type: "evm",
  });

  return NextResponse.json({
    attestationUID: result.attestationUid,
    txHash: result.txHash,
    chain,
    chainType: "evm",
    easScanURL: result.easScanUrl,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSolanaAttestation(supabase: any, scoreData: any, address: string) {
  const attesterKey = process.env.SOLANA_ATTESTER_PRIVATE_KEY || process.env.EAS_ATTESTER_PRIVATE_KEY;
  if (!attesterKey) {
    return NextResponse.json({ error: { code: "CONFIG_ERROR", message: "Solana attester not configured" } }, { status: 500 });
  }

  const config = getSASConfig();

  let payer: Keypair;
  try {
    const keyBytes = JSON.parse(attesterKey);
    payer = Keypair.fromSecretKey(Uint8Array.from(keyBytes));
  } catch {
    const bs58Module = await import("bs58");
    payer = Keypair.fromSecretKey(bs58Module.default.decode(attesterKey));
  }

  const dataHash = computeDataHash(scoreData.breakdown);

  const result = await createSolanaAttestation(config, payer, {
    walletAddress: address,
    creditScore: scoreData.score,
    riskTier: riskTierToUint8(scoreData.risk_tier),
    timestamp: Math.floor(Date.now() / 1000),
    dataHash,
    hasOffChainData: scoreData.has_offchain_data || false,
    modelVersion: scoreData.model_version || 1,
  });

  await supabase.from("attestations").insert({
    user_id: scoreData.user_id,
    score_id: scoreData.id,
    attestation_uid: result.attestationId,
    chain: "solana",
    tx_hash: result.txSignature,
    is_onchain: true,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    revoked: false,
    chain_type: "solana",
  });

  return NextResponse.json({
    attestationUID: result.attestationId,
    txSignature: result.txSignature,
    chain: "solana",
    chainType: "solana",
    solscanURL: `https://solscan.io/tx/${result.txSignature}`,
  });
}
