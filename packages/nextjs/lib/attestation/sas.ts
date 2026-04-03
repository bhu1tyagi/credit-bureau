/**
 * Solana Attestation Service (SAS) Integration
 * Creates and verifies credit score attestations on Solana via SAS.
 *
 * SAS program ID: 22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG
 * SDK: sas-lib (npm)
 */
import { Connection, Keypair, PublicKey, type TransactionSignature } from "@solana/web3.js";
import { SOLANA_CONFIG } from "~~/lib/constants";

export interface SASConfig {
  programId: PublicKey;
  connection: Connection;
}

export interface SolanaAttestationData {
  walletAddress: string;
  creditScore: number;
  riskTier: number;
  timestamp: number;
  dataHash: string;
  hasOffChainData: boolean;
  modelVersion: number;
}

export interface SolanaAttestationResult {
  attestationId: string;
  txSignature: string;
}

export function getSASConfig(): SASConfig {
  const rpcUrl = SOLANA_CONFIG.heliusRpcUrl || SOLANA_CONFIG.rpcUrl;
  return {
    programId: new PublicKey(SOLANA_CONFIG.sasProgramId),
    connection: new Connection(rpcUrl, "confirmed"),
  };
}

/**
 * Create a credit score attestation on Solana via SAS.
 * Uses sas-lib SDK when available, falls back to direct program interaction.
 */
export async function createSolanaAttestation(
  config: SASConfig,
  payer: Keypair,
  data: SolanaAttestationData,
): Promise<SolanaAttestationResult> {
  try {
    // Dynamic import of sas-lib to handle cases where it may not be installed
    const sasLib = await import("sas-lib");

    const sas = new sasLib.SAS(config.connection, config.programId.toBase58());

    const schemaUid = await registerSolanaSchema(config, payer, sas);

    const attestation = await sas.attest({
      schema: schemaUid,
      payer,
      data: {
        creditScore: data.creditScore,
        riskTier: data.riskTier,
        timestamp: data.timestamp,
        wallet: data.walletAddress,
        dataHash: data.dataHash,
        hasOffChainData: data.hasOffChainData,
        modelVersion: data.modelVersion,
      },
      recipient: new PublicKey(data.walletAddress),
    });

    return {
      attestationId: attestation.attestationId || attestation.uid || "",
      txSignature: attestation.signature || attestation.txSignature || "",
    };
  } catch (error) {
    console.warn("[SAS] sas-lib not available or failed, using fallback:", error);
    const { createSolanaAttestationFallback } = await import("./solana-fallback");
    return createSolanaAttestationFallback(config, payer, data);
  }
}

async function registerSolanaSchema(
  config: SASConfig,
  payer: Keypair,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sas: any,
): Promise<string> {
  const schemaDefinition =
    "uint16 creditScore, uint8 riskTier, uint256 timestamp, string wallet, bytes32 dataHash, bool hasOffChainData, uint8 modelVersion";

  try {
    const schema = await sas.registerSchema({
      schema: schemaDefinition,
      payer,
      revocable: true,
    });
    return schema.schemaId || schema.uid || "";
  } catch {
    // Schema may already exist
    return "";
  }
}

/**
 * Verify a Solana attestation via SAS.
 */
export async function verifySolanaAttestation(
  config: SASConfig,
  attestationId: string,
): Promise<{ valid: boolean; data: SolanaAttestationData | null; expired: boolean }> {
  try {
    const sasLib = await import("sas-lib");
    const sas = new sasLib.SAS(config.connection, config.programId.toBase58());

    const attestation = await sas.getAttestation(attestationId);
    if (!attestation) {
      return { valid: false, data: null, expired: false };
    }

    const now = Math.floor(Date.now() / 1000);
    const expired = attestation.expirationTime > 0 && attestation.expirationTime < now;
    const revoked = attestation.revoked || false;

    return {
      valid: !expired && !revoked,
      data: attestation.data as SolanaAttestationData,
      expired,
    };
  } catch {
    return { valid: false, data: null, expired: false };
  }
}
