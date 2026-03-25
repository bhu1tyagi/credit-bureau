import type { CreditScore, ScoreBreakdown, WalletProfile } from "~~/types/credit";
import { SCORE_MAX, SCORE_MIN, getRiskTier } from "~~/types/credit";

// ============================================
// Deterministic Weighted Scoring Algorithm
// ============================================

// Weight configuration
const WEIGHTS = {
  walletAge: 0.15,
  txFrequency: 0.05,
  defiDiversity: 0.1,
  repaymentHistory: 0.3,
  liquidationPenalty: 0.25,
  stablecoinRatio: 0.1,
  totalValue: 0.05,
} as const;

// Max scores per factor
const MAX_SCORES = {
  walletAge: 150,
  txFrequency: 100,
  defiDiversity: 100,
  repaymentHistory: 200,
  liquidationPenalty: 150, // negative
  stablecoinRatio: 100,
  totalValue: 100,
} as const;

// ============================================
// Individual Factor Scoring Functions
// ============================================

function scoreWalletAge(days: number): { score: number; details: string } {
  let score: number;
  if (days < 30) {
    score = 0;
  } else if (days < 180) {
    score = 50;
  } else if (days < 365) {
    score = 100;
  } else {
    score = 150;
  }
  return { score, details: `Wallet age: ${days} days` };
}

function scoreTxFrequency(txCount: number): { score: number; details: string } {
  let score: number;
  if (txCount < 10) {
    score = 0;
  } else if (txCount < 50) {
    score = 30;
  } else if (txCount < 200) {
    score = 60;
  } else {
    score = 100;
  }
  return { score, details: `Transaction count: ${txCount}` };
}

function scoreDefiDiversity(protocolCount: number): { score: number; details: string } {
  let score: number;
  if (protocolCount === 0) {
    score = 0;
  } else if (protocolCount <= 2) {
    score = 25;
  } else if (protocolCount <= 5) {
    score = 50;
  } else if (protocolCount <= 10) {
    score = 75;
  } else {
    score = 100;
  }
  return { score, details: `DeFi protocols used: ${protocolCount}` };
}

function scoreRepaymentHistory(repaymentRatio: number, totalBorrows: number): { score: number; details: string } {
  // If no borrows, neutral score
  if (totalBorrows === 0) {
    return { score: 100, details: "No lending history (neutral)" };
  }

  let score: number;
  if (repaymentRatio < 0.5) {
    score = 0;
  } else if (repaymentRatio < 0.75) {
    score = 50;
  } else if (repaymentRatio < 0.9) {
    score = 100;
  } else if (repaymentRatio < 1.0) {
    score = 150;
  } else {
    score = 200;
  }
  return {
    score,
    details: `Repayment ratio: ${(repaymentRatio * 100).toFixed(1)}% (${totalBorrows} borrows)`,
  };
}

function scoreLiquidationPenalty(liquidationCount: number): { score: number; details: string } {
  let penalty: number;
  if (liquidationCount === 0) {
    penalty = 0;
  } else if (liquidationCount === 1) {
    penalty = -50;
  } else if (liquidationCount <= 3) {
    penalty = -100;
  } else {
    penalty = -150;
  }
  return {
    score: penalty,
    details: `Liquidations: ${liquidationCount}`,
  };
}

function scoreStablecoinRatio(ratio: number): { score: number; details: string } {
  let score: number;
  if (ratio < 0.05) {
    score = 0;
  } else if (ratio < 0.15) {
    score = 25;
  } else if (ratio < 0.3) {
    score = 50;
  } else if (ratio < 0.5) {
    score = 75;
  } else {
    score = 100;
  }
  return { score, details: `Stablecoin ratio: ${(ratio * 100).toFixed(1)}%` };
}

function scoreTotalValue(valueUsd: number): { score: number; details: string } {
  let score: number;
  if (valueUsd < 100) {
    score = 0;
  } else if (valueUsd < 1_000) {
    score = 25;
  } else if (valueUsd < 10_000) {
    score = 50;
  } else if (valueUsd < 100_000) {
    score = 75;
  } else {
    score = 100;
  }
  return { score, details: `Total portfolio: $${valueUsd.toLocaleString()}` };
}

// ============================================
// Off-Chain Bonus Scoring
// ============================================

export interface OffChainData {
  ficoScore?: number;
  bankBalanceUsd?: number;
  annualIncomeUsd?: number;
}

function computeOffChainBonus(data?: OffChainData): { score: number; maxScore: number; details: string } {
  if (!data) {
    return { score: 0, maxScore: 100, details: "No off-chain data verified" };
  }

  let bonus = 0;
  const parts: string[] = [];

  if (data.ficoScore && data.ficoScore > 700) {
    bonus += 50;
    parts.push(`FICO ${data.ficoScore}: +50`);
  }
  if (data.bankBalanceUsd && data.bankBalanceUsd > 10_000) {
    bonus += 30;
    parts.push(`Bank balance >$10K: +30`);
  }
  if (data.annualIncomeUsd && data.annualIncomeUsd > 50_000) {
    bonus += 20;
    parts.push(`Income >$50K: +20`);
  }

  return {
    score: Math.min(bonus, 100),
    maxScore: 100,
    details: parts.length > 0 ? parts.join(", ") : "Off-chain data below thresholds",
  };
}

// ============================================
// Main Scoring Function
// ============================================

export function computeCreditScore(profile: WalletProfile, offChainData?: OffChainData): CreditScore {
  const BASE_SCORE = 300;

  // Compute each factor
  const walletAge = scoreWalletAge(profile.walletAgeDays);
  const txFrequency = scoreTxFrequency(profile.txCount);
  const defiDiversity = scoreDefiDiversity(profile.defiProtocolCount);
  const repayment = scoreRepaymentHistory(profile.repaymentRatio, profile.totalBorrows);
  const liquidation = scoreLiquidationPenalty(profile.liquidationCount);
  const stablecoin = scoreStablecoinRatio(profile.stablecoinRatio);
  const totalValue = scoreTotalValue(profile.totalValueUsd);
  const offChainBonus = computeOffChainBonus(offChainData);

  // Sum weighted scores
  const rawScore =
    BASE_SCORE +
    walletAge.score +
    txFrequency.score +
    defiDiversity.score +
    repayment.score +
    liquidation.score + // negative
    stablecoin.score +
    totalValue.score +
    offChainBonus.score;

  // Clamp to valid range
  const finalScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(rawScore)));

  const breakdown: ScoreBreakdown = {
    walletAge: {
      score: walletAge.score,
      maxScore: MAX_SCORES.walletAge,
      weight: WEIGHTS.walletAge,
      details: walletAge.details,
    },
    txFrequency: {
      score: txFrequency.score,
      maxScore: MAX_SCORES.txFrequency,
      weight: WEIGHTS.txFrequency,
      details: txFrequency.details,
    },
    defiDiversity: {
      score: defiDiversity.score,
      maxScore: MAX_SCORES.defiDiversity,
      weight: WEIGHTS.defiDiversity,
      details: defiDiversity.details,
    },
    repaymentHistory: {
      score: repayment.score,
      maxScore: MAX_SCORES.repaymentHistory,
      weight: WEIGHTS.repaymentHistory,
      details: repayment.details,
    },
    liquidationPenalty: {
      score: liquidation.score,
      maxScore: MAX_SCORES.liquidationPenalty,
      weight: WEIGHTS.liquidationPenalty,
      details: liquidation.details,
    },
    stablecoinRatio: {
      score: stablecoin.score,
      maxScore: MAX_SCORES.stablecoinRatio,
      weight: WEIGHTS.stablecoinRatio,
      details: stablecoin.details,
    },
    totalValue: {
      score: totalValue.score,
      maxScore: MAX_SCORES.totalValue,
      weight: WEIGHTS.totalValue,
      details: totalValue.details,
    },
    offChainBonus: {
      score: offChainBonus.score,
      maxScore: offChainBonus.maxScore,
      weight: 0,
      details: offChainBonus.details,
    },
  };

  return {
    score: finalScore,
    riskTier: getRiskTier(finalScore),
    breakdown,
    confidence: 1.0, // deterministic model always full confidence
    timestamp: Date.now(),
    modelVersion: 1,
    chains: [],
    hasOffChainData: !!offChainData,
  };
}
