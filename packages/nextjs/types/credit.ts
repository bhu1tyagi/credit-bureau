// ============================================
// CredBureau Core Type Definitions
// ============================================

export type RiskTier = "Excellent" | "Good" | "Fair" | "Poor" | "VeryPoor";

export interface CreditScore {
  score: number; // 300–850
  riskTier: RiskTier;
  breakdown: ScoreBreakdown;
  confidence: number; // 0–1
  timestamp: number;
  modelVersion: number; // 1=deterministic, 2=ML
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
  weight: number;
  details: string;
  trend?: "up" | "down" | "stable";
}

export interface ScoreHistoryPoint {
  score: number;
  riskTier: RiskTier;
  timestamp: number;
  modelVersion: number;
}

// ============================================
// Wallet Types
// ============================================

export interface LinkedWallet {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
  linkedAt: number;
  label?: string;
}

export interface WalletProfile {
  walletAgeDays: number;
  txCount: number;
  uniqueActiveMonths: number;
  defiProtocolCount: number;
  defiProtocols: string[];
  totalBorrows: number;
  totalRepays: number;
  repaymentRatio: number; // 0–1
  liquidationCount: number;
  liquidationVolumeUsd: number;
  stablecoinRatio: number; // 0–1
  totalValueUsd: number;
  tokenCount: number;
  nftCount: number;
  governanceParticipation: number;
  bridgeUsageCount: number;
}

// ============================================
// Attestation Types
// ============================================

export interface Attestation {
  id: string;
  attestationUid: string;
  chain: string;
  schemaUid: string;
  txHash: string | null;
  score: number;
  riskTier: RiskTier;
  isOnChain: boolean;
  expiresAt: number;
  revoked: boolean;
  createdAt: number;
  easScanUrl: string;
}

export interface AttestationResult {
  attestationUid: string;
  txHash: string;
  chain: string;
  easScanUrl: string;
}

export interface VerificationResult {
  valid: boolean;
  score: number;
  riskTier: RiskTier;
  timestamp: number;
  expired: boolean;
  revoked: boolean;
}

// ============================================
// Off-Chain Verification Types
// ============================================

export type VerificationType = "fico" | "bank_balance" | "income" | "identity";

export interface OffChainVerification {
  id: string;
  type: VerificationType;
  proofHash: string;
  verifiedAt: number;
  expiresAt: number | null;
  metadata: Record<string, unknown>;
}

// ============================================
// Credit Report Types
// ============================================

export interface CreditReport {
  score: CreditScore;
  walletProfile: WalletProfile;
  linkedWallets: LinkedWallet[];
  attestations: Attestation[];
  verifications: OffChainVerification[];
  lendingHistory: LendingEvent[];
  protocolInteractions: ProtocolInteraction[];
  riskFactors: RiskFactor[];
  generatedAt: number;
}

export interface LendingEvent {
  type: "borrow" | "repay" | "liquidation";
  protocol: string;
  chain: string;
  amount: number;
  asset: string;
  timestamp: number;
  txHash: string;
}

export interface ProtocolInteraction {
  protocol: string;
  chain: string;
  firstInteraction: number;
  lastInteraction: number;
  txCount: number;
  category: string;
}

export interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  description: string;
  impact: number; // estimated score impact
}

// ============================================
// API Types
// ============================================

export interface ApiKeyInfo {
  id: string;
  name: string | null;
  keyPrefix: string;
  tier: "free" | "pro" | "enterprise";
  rateLimit: number;
  createdAt: number;
  lastUsedAt: number | null;
  revoked: boolean;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: number;
}

// ============================================
// Score Constants
// ============================================

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

export const RISK_TIER_RANGES: Record<RiskTier, { min: number; max: number }> = {
  Excellent: { min: 750, max: 850 },
  Good: { min: 680, max: 749 },
  Fair: { min: 620, max: 679 },
  Poor: { min: 550, max: 619 },
  VeryPoor: { min: 300, max: 549 },
};

export const RISK_TIER_COLORS: Record<RiskTier, string> = {
  Excellent: "#10B981",
  Good: "#3B82F6",
  Fair: "#F59E0B",
  Poor: "#F97316",
  VeryPoor: "#EF4444",
};

export function getRiskTier(score: number): RiskTier {
  if (score >= 750) return "Excellent";
  if (score >= 680) return "Good";
  if (score >= 620) return "Fair";
  if (score >= 550) return "Poor";
  return "VeryPoor";
}
