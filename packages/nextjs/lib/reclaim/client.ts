/**
 * Reclaim Protocol Integration
 * Privacy-preserving off-chain data verification via zkTLS.
 */
import { type Proof, ReclaimProofRequest, verifyProof as reclaimVerifyProof } from "@reclaimprotocol/js-sdk";

export type { Proof };

const RECLAIM_APP_ID = process.env.RECLAIM_APP_ID || "";
const RECLAIM_APP_SECRET = process.env.RECLAIM_APP_SECRET || "";
const RECLAIM_CALLBACK_URL = process.env.RECLAIM_CALLBACK_URL || "";

// Provider IDs for different data sources (from Reclaim's provider catalog)
export const RECLAIM_PROVIDERS = {
  fico_score: {
    id: process.env.RECLAIM_FICO_PROVIDER_ID || "",
    name: "FICO Score",
    description: "Verify your FICO credit score",
    icon: "CreditCard",
  },
  bank_balance: {
    id: process.env.RECLAIM_BANK_PROVIDER_ID || "",
    name: "Bank Balance",
    description: "Verify your bank account balance",
    icon: "Landmark",
  },
  income: {
    id: process.env.RECLAIM_INCOME_PROVIDER_ID || "",
    name: "Income Verification",
    description: "Verify your annual income",
    icon: "DollarSign",
  },
  identity: {
    id: process.env.RECLAIM_IDENTITY_PROVIDER_ID || "",
    name: "Identity Verification",
    description: "Verify your identity (KYC)",
    icon: "UserCheck",
  },
} as const;

export type ProviderType = keyof typeof RECLAIM_PROVIDERS;

interface ProofRequestResult {
  requestUrl: string;
  statusUrl: string;
  sessionJson: string;
}

interface VerifiedProofResult {
  proofHash: string;
  extractedData: Record<string, unknown>;
  provider: string;
  timestamp: number;
}

/**
 * Create a Reclaim proof request for a specific data source.
 */
export async function createProofRequest(providerType: ProviderType): Promise<ProofRequestResult> {
  const provider = RECLAIM_PROVIDERS[providerType];

  if (!RECLAIM_APP_ID) {
    throw new Error("RECLAIM_APP_ID is not configured");
  }
  if (!RECLAIM_APP_SECRET) {
    throw new Error("RECLAIM_APP_SECRET is not configured");
  }
  if (!provider.id) {
    throw new Error(`Provider ID for "${providerType}" is not configured`);
  }

  const proofRequest = await ReclaimProofRequest.init(RECLAIM_APP_ID, RECLAIM_APP_SECRET, provider.id);

  if (RECLAIM_CALLBACK_URL) {
    proofRequest.setAppCallbackUrl(RECLAIM_CALLBACK_URL);
  }

  const requestUrl = await proofRequest.getRequestUrl();
  const statusUrl = proofRequest.getStatusUrl();
  const sessionJson = proofRequest.toJsonString();

  return { requestUrl, statusUrl, sessionJson };
}

/**
 * Verify a Reclaim proof submission.
 * Returns structured verification result or null if the proof is invalid.
 */
export async function verifyReclaimProof(proof: Proof): Promise<VerifiedProofResult | null> {
  const isValid = await reclaimVerifyProof(proof);
  if (!isValid) {
    return null;
  }

  const proofHash = proof.signatures.length > 0 ? proof.signatures[0] : proof.identifier;
  const extractedData: Record<string, unknown> = { ...proof.extractedParameterValues };
  const provider = proof.claimData.provider;
  const timestamp = Number(proof.claimData.timestampS);

  return { proofHash, extractedData, provider, timestamp };
}

/**
 * Extract score bonus from verified off-chain data.
 */
export function computeOffChainBonus(verifications: { type: string; metadata: Record<string, unknown> }[]): {
  ficoScore?: number;
  bankBalanceUsd?: number;
  annualIncomeUsd?: number;
} {
  const result: { ficoScore?: number; bankBalanceUsd?: number; annualIncomeUsd?: number } = {};

  for (const v of verifications) {
    switch (v.type) {
      case "fico":
        result.ficoScore = (v.metadata.score as number) || undefined;
        break;
      case "bank_balance":
        result.bankBalanceUsd = (v.metadata.balance as number) || undefined;
        break;
      case "income":
        result.annualIncomeUsd = (v.metadata.annual_income as number) || undefined;
        break;
    }
  }

  return result;
}
