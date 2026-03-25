// ============================================
// @credbureau/sdk Types
// ============================================

export interface CredBureauConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface CreditScore {
  score: number;
  riskTier: "excellent" | "good" | "fair" | "poor" | "very_poor";
  breakdown: ScoreBreakdown;
  confidence: number;
  timestamp: number;
  modelVersion: number;
  chains: string[];
  hasOffChainData: boolean;
}

export interface ScoreBreakdown {
  walletAge: ScoreFactor;
  txFrequency: ScoreFactor;
  defiDiversity: ScoreFactor;
  repaymentHistory: ScoreFactor;
  liquidationPenalty: ScoreFactor;
  stablecoinRatio: ScoreFactor;
  totalValue: ScoreFactor;
  offChainBonus: ScoreFactor;
}

export interface ScoreFactor {
  score: number;
  maxScore: number;
  details: string;
}

export interface AttestationResult {
  attestationUid: string;
  txHash: string;
  chain: string;
  easScanUrl: string;
}

export interface VerificationResult {
  valid: boolean;
  score: number | null;
  riskTier: string | null;
  timestamp: number | null;
  expired: boolean;
  revoked: boolean;
}

export interface ScoreHistoryEntry {
  score: number;
  riskTier: string;
  timestamp: string;
  modelVersion: number;
}

export interface CreditReport {
  address: string;
  generatedAt: string;
  score: CreditScore | null;
  scoreHistory: ScoreHistoryEntry[];
  attestations: unknown[];
  offChainVerifications: unknown[];
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface GetScoreParams {
  address: string;
  chains?: string[];
}

export interface GetDetailedScoreParams {
  address: string;
  chains?: string[];
  includeOffChain?: boolean;
}

export interface CreateAttestationParams {
  address: string;
  chain?: string;
}

export interface VerifyAttestationParams {
  attestationUID: string;
  chain?: string;
}

export interface RegisterWebhookParams {
  url: string;
  events: string[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
