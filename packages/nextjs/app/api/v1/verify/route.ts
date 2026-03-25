import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { verifyAttestation } from "~~/lib/attestation/eas";

export async function GET(request: NextRequest) {
  const attestationUID = request.nextUrl.searchParams.get("attestationUID");
  const chain = request.nextUrl.searchParams.get("chain") || "base-sepolia";

  if (!attestationUID) {
    return NextResponse.json(
      { error: { code: "MISSING_PARAM", message: "attestationUID is required" } },
      { status: 400 },
    );
  }

  try {
    // Get RPC URL for the chain
    const rpcUrls: Record<string, string> = {
      sepolia: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      "base-sepolia": process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      "arbitrum-sepolia": process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      "optimism-sepolia": process.env.OPTIMISM_SEPOLIA_RPC_URL || "https://sepolia.optimism.io",
      // Mainnet fallbacks (for future production use)
      ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    };

    const rpcUrl = rpcUrls[chain];
    if (!rpcUrl) {
      return NextResponse.json(
        { error: { code: "INVALID_CHAIN", message: `Unsupported chain: ${chain}` } },
        { status: 400 },
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const result = await verifyAttestation({ chain, attestationUid: attestationUID, provider });

    return NextResponse.json({
      attestationUID,
      chain,
      ...result,
    });
  } catch (error) {
    console.error("Attestation verification error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to verify attestation" } },
      { status: 500 },
    );
  }
}
