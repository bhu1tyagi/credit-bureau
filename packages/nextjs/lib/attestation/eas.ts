/**
 * EAS (Ethereum Attestation Service) Integration
 * Handles schema registration, attestation creation, and verification.
 */

import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import {
  EAS_ADDRESSES,
  CREDIT_SCORE_SCHEMA,
  CREDIT_SCORE_SCHEMA_UIDS,
  EASSCAN_URLS,
  ATTESTATION_TTL_SECONDS,
} from "~~/lib/constants";
import { getOrRegisterSchemaUid } from "~~/lib/attestation/register-schema";

/**
 * Create a credit score attestation on-chain.
 */
export async function createCreditScoreAttestation(params: {
  chain: string;
  signer: ethers.Signer;
  walletAddress: string;
  creditScore: number;
  riskTier: number; // 1=Excellent, 2=Good, 3=Fair, 4=Poor, 5=VeryPoor
  dataHash: string; // bytes32 hash of scoring inputs
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
  const txHash = typeof tx === "object" && "tx" in tx ? (tx as any).tx?.hash : attestationUid; // eslint-disable-line @typescript-eslint/no-explicit-any
  const easScanUrl = `${EASSCAN_URLS[params.chain]}/attestation/view/${attestationUid}`;

  return {
    attestationUid,
    txHash,
    easScanUrl,
    schemaUid,
  };
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

    // Decode the data
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

/**
 * Compute a deterministic hash of scoring inputs for attestation.
 */
export function computeDataHash(profile: Record<string, unknown>): string {
  const sorted = JSON.stringify(profile, Object.keys(profile).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(sorted));
}

/**
 * Map risk tier string to uint8 for attestation.
 */
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
