/**
 * EAS (Ethereum Attestation Service) Integration
 * Handles schema registration, attestation creation, and verification.
 */
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { getOrRegisterSchemaUid } from "~~/lib/attestation/register-schema";
import {
  ATTESTATION_TTL_SECONDS,
  CREDIT_SCORE_SCHEMA,
  CREDIT_SCORE_SCHEMA_UIDS,
  EASSCAN_URLS,
  EAS_ADDRESSES,
  SCHEMA_REGISTRY_ADDRESSES,
} from "~~/lib/constants";

export interface EASConfig {
  easAddress: string;
  schemaRegistry: string;
  easScanUrl: string;
}

const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: "ethereum",
  8453: "base",
  42161: "arbitrum",
  10: "optimism",
  11155111: "sepolia",
  84532: "base-sepolia",
  421614: "arbitrum-sepolia",
  11155420: "optimism-sepolia",
};

export function getEASConfig(chainIdOrName: number | string): EASConfig | null {
  const chainName = typeof chainIdOrName === "number" ? CHAIN_ID_TO_NAME[chainIdOrName] : chainIdOrName;
  if (!chainName) return null;

  const easAddress = EAS_ADDRESSES[chainName];
  const schemaRegistry = SCHEMA_REGISTRY_ADDRESSES[chainName];
  const easScanUrl = EASSCAN_URLS[chainName];

  if (!easAddress || !schemaRegistry || !easScanUrl) return null;
  return { easAddress, schemaRegistry, easScanUrl };
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[EAS] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("withRetry: unreachable");
}

export async function estimateAttestationGas(params: {
  chain: string;
  signer: ethers.Signer;
  walletAddress: string;
  creditScore: number;
  riskTier: number;
  dataHash: string;
  hasOffChainData: boolean;
  modelVersion: number;
}): Promise<{ gasEstimate: bigint; gasCostWei: bigint; gasCostEth: string }> {
  const easAddress = EAS_ADDRESSES[params.chain];
  if (!easAddress) throw new Error(`EAS not available on chain: ${params.chain}`);

  const provider = params.signer.provider;
  if (!provider) throw new Error("Signer must have a provider for gas estimation");

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;

  // Attestation transactions typically cost 100k-200k gas on L2s
  const estimatedGas = 200_000n;
  const gasCostWei = estimatedGas * gasPrice;
  const gasCostEth = ethers.formatEther(gasCostWei);

  return { gasEstimate: estimatedGas, gasCostWei, gasCostEth };
}

/**
 * Create a credit score attestation on-chain with retry logic.
 */
export async function createCreditScoreAttestation(params: {
  chain: string;
  signer: ethers.Signer;
  walletAddress: string;
  creditScore: number;
  riskTier: number;
  dataHash: string;
  hasOffChainData: boolean;
  modelVersion: number;
}): Promise<{
  attestationUid: string;
  txHash: string;
  easScanUrl: string;
  schemaUid: string;
}> {
  const easAddress = EAS_ADDRESSES[params.chain];
  if (!easAddress) throw new Error(`EAS not available on chain: ${params.chain}`);

  let schemaUid = CREDIT_SCORE_SCHEMA_UIDS[params.chain];
  if (!schemaUid) {
    schemaUid = await getOrRegisterSchemaUid(params.chain, params.signer);
  }

  const eas = new EAS(easAddress);
  eas.connect(params.signer);

  const encoder = new SchemaEncoder(CREDIT_SCORE_SCHEMA);
  const encodedData = encoder.encodeData([
    { name: "creditScore", value: params.creditScore, type: "uint16" },
    { name: "riskTier", value: params.riskTier, type: "uint8" },
    { name: "timestamp", value: BigInt(Math.floor(Date.now() / 1000)), type: "uint256" },
    { name: "wallet", value: params.walletAddress, type: "address" },
    { name: "dataHash", value: params.dataHash, type: "bytes32" },
    { name: "hasOffChainData", value: params.hasOffChainData, type: "bool" },
    { name: "modelVersion", value: params.modelVersion, type: "uint8" },
  ]);

  return withRetry(async () => {
    const tx = await eas.attest({
      schema: schemaUid,
      data: {
        recipient: params.walletAddress,
        expirationTime: BigInt(Math.floor(Date.now() / 1000) + ATTESTATION_TTL_SECONDS),
        revocable: true,
        data: encodedData,
      },
    });

    const attestationUid = await tx.wait();
    const txHash = typeof tx === "object" && "tx" in tx ? (tx as any).tx?.hash : attestationUid;
    const easScanUrl = `${EASSCAN_URLS[params.chain]}/attestation/view/${attestationUid}`;

    return { attestationUid, txHash, easScanUrl, schemaUid };
  });
}

/**
 * Verify an existing attestation.
 */
export async function verifyAttestation(params: {
  chain: string;
  attestationUid: string;
  provider: ethers.Provider;
}): Promise<{
  valid: boolean;
  score: number | null;
  riskTier: number | null;
  timestamp: number | null;
  expired: boolean;
  revoked: boolean;
}> {
  const easAddress = EAS_ADDRESSES[params.chain];
  if (!easAddress) {
    return { valid: false, score: null, riskTier: null, timestamp: null, expired: false, revoked: false };
  }

  try {
    const eas = new EAS(easAddress);
    eas.connect(params.provider);

    const attestation = await eas.getAttestation(params.attestationUid);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const expired = attestation.expirationTime > 0n && attestation.expirationTime < now;
    const revoked = attestation.revocationTime > 0n;

    const encoder = new SchemaEncoder(CREDIT_SCORE_SCHEMA);
    const decoded = encoder.decodeData(attestation.data);

    const scoreField = decoded.find(d => d.name === "creditScore");
    const tierField = decoded.find(d => d.name === "riskTier");
    const timestampField = decoded.find(d => d.name === "timestamp");

    return {
      valid: !expired && !revoked,
      score: scoreField ? Number(scoreField.value.value) : null,
      riskTier: tierField ? Number(tierField.value.value) : null,
      timestamp: timestampField ? Number(timestampField.value.value) : null,
      expired,
      revoked,
    };
  } catch {
    return { valid: false, score: null, riskTier: null, timestamp: null, expired: false, revoked: false };
  }
}

export function computeDataHash(profile: Record<string, unknown>): string {
  const sorted = JSON.stringify(profile, Object.keys(profile).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(sorted));
}

export function riskTierToUint8(tier: string): number {
  const mapping: Record<string, number> = {
    Excellent: 1,
    Good: 2,
    Fair: 3,
    Poor: 4,
    VeryPoor: 5,
  };
  return mapping[tier] || 5;
}
