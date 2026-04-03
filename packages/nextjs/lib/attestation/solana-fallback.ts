/**
 * Fallback Solana attestation via Memo program.
 * Used when sas-lib SDK is unavailable or fails.
 * Stores a credit score hash on-chain as a memo transaction.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import type { SASConfig, SolanaAttestationData, SolanaAttestationResult } from "./sas";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function buildAttestationMemo(data: SolanaAttestationData): string {
  const payload = {
    type: "credbureau-attestation",
    version: data.modelVersion,
    score: data.creditScore,
    tier: data.riskTier,
    wallet: data.walletAddress,
    hash: data.dataHash,
    offchain: data.hasOffChainData,
    ts: data.timestamp,
  };
  return JSON.stringify(payload);
}

function computeAttestationId(txSignature: string, data: SolanaAttestationData): string {
  const input = `${txSignature}:${data.walletAddress}:${data.creditScore}:${data.timestamp}`;
  return createHash("sha256").update(input).digest("hex");
}

export async function createSolanaAttestationFallback(
  config: SASConfig,
  payer: Keypair,
  data: SolanaAttestationData,
): Promise<SolanaAttestationResult> {
  const memo = buildAttestationMemo(data);
  const memoBuffer = Buffer.from(memo, "utf-8");

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: memoBuffer,
  });

  const transaction = new Transaction().add(instruction);

  const txSignature = await sendAndConfirmTransaction(config.connection, transaction, [payer], {
    commitment: "confirmed",
  });

  const attestationId = computeAttestationId(txSignature, data);

  return { attestationId, txSignature };
}

export async function verifySolanaAttestationFallback(
  connection: Connection,
  txSignature: string,
): Promise<{ valid: boolean; data: SolanaAttestationData | null }> {
  try {
    const tx = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || tx.meta.err) {
      return { valid: false, data: null };
    }

    const memoInstruction = tx.transaction.message.compiledInstructions?.find(ix => {
      const programId = tx.transaction.message.staticAccountKeys[ix.programIdIndex];
      return programId?.equals(MEMO_PROGRAM_ID);
    });

    if (!memoInstruction) {
      return { valid: false, data: null };
    }

    const memoData = Buffer.from(memoInstruction.data).toString("utf-8");
    const parsed = JSON.parse(memoData);

    if (parsed.type !== "credbureau-attestation") {
      return { valid: false, data: null };
    }

    return {
      valid: true,
      data: {
        walletAddress: parsed.wallet,
        creditScore: parsed.score,
        riskTier: parsed.tier,
        timestamp: parsed.ts,
        dataHash: parsed.hash,
        hasOffChainData: parsed.offchain,
        modelVersion: parsed.version,
      },
    };
  } catch {
    return { valid: false, data: null };
  }
}
