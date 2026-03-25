"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb,
  TrendingUp,
  Clock,
  Repeat,
  Shield,
  Coins,
  BarChart3,
  Wallet,
} from "lucide-react";
import type { ScoreBreakdown } from "~~/types/credit";
import { staggerContainer, staggerItem } from "~~/lib/animations";

interface ImprovementTipsProps {
  breakdown: ScoreBreakdown;
}

interface Tip {
  icon: React.ReactNode;
  title: string;
  description: string;
  impact: number;
}

const FACTOR_TIPS: Record<
  string,
  { icon: React.ReactNode; title: string; description: string }
> = {
  walletAge: {
    icon: <Clock className="w-5 h-5" />,
    title: "Build Wallet History",
    description:
      "Continue using your wallet consistently. Older wallets with sustained activity score higher. Aim for regular monthly transactions.",
  },
  txFrequency: {
    icon: <Repeat className="w-5 h-5" />,
    title: "Increase Transaction Frequency",
    description:
      "Engage in regular on-chain activity. Consistent transaction patterns demonstrate active participation in the ecosystem.",
  },
  defiDiversity: {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Diversify DeFi Usage",
    description:
      "Interact with multiple DeFi protocols across lending, DEX, staking, and governance. Broader usage shows ecosystem familiarity.",
  },
  repaymentHistory: {
    icon: <Shield className="w-5 h-5" />,
    title: "Maintain Clean Repayments",
    description:
      "Always repay loans on time and maintain healthy collateral ratios. Consistent repayment is the strongest credit signal.",
  },
  liquidationPenalty: {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Avoid Liquidations",
    description:
      "Keep collateral ratios well above minimum thresholds. Set alerts for price drops and add collateral proactively.",
  },
  stablecoinRatio: {
    icon: <Coins className="w-5 h-5" />,
    title: "Hold More Stablecoins",
    description:
      "A higher stablecoin ratio in your portfolio signals financial stability and risk awareness to credit models.",
  },
  totalValue: {
    icon: <Wallet className="w-5 h-5" />,
    title: "Grow Portfolio Value",
    description:
      "A larger total portfolio value (including staked and deposited assets) contributes to a higher overall credit score.",
  },
  offChainBonus: {
    icon: <Shield className="w-5 h-5" />,
    title: "Complete Off-Chain Verification",
    description:
      "Verify your FICO score, bank balance, or income through zkTLS proofs to unlock bonus score points.",
  },
};

export default function ImprovementTips({ breakdown }: ImprovementTipsProps) {
  const tips = useMemo(() => {
    const factors = Object.entries(breakdown) as [string, { score: number; maxScore: number; weight: number }][];

    return factors
      .map(([key, factor]) => {
        const gap = factor.maxScore - factor.score;
        const potentialImpact = Math.round(gap * factor.weight * 10);
        const meta = FACTOR_TIPS[key];
        if (!meta || gap <= 0) return null;

        return {
          ...meta,
          impact: potentialImpact,
        } as Tip;
      })
      .filter((t): t is Tip => t !== null)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);
  }, [breakdown]);

  if (tips.length === 0) {
    return (
      <div className="rounded-xl border border-[#2A2F4D] bg-[#1A1F3D]/50 backdrop-blur-sm p-5 text-center">
        <Lightbulb className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-sm text-white font-medium">Perfect Score!</p>
        <p className="text-xs text-gray-500 mt-1">Your credit factors are fully optimized.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2A2F4D] bg-[#1A1F3D]/50 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Improvement Tips</h3>
      </div>

      <motion.div
        className="space-y-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {tips.map((tip, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className="flex gap-3 rounded-lg border border-[#2A2F4D] bg-[#111631]/80 p-4 hover:border-amber-500/20 transition-colors"
          >
            <div className="flex-shrink-0 rounded-lg bg-amber-500/10 p-2 text-amber-400 self-start">
              {tip.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-medium text-white">{tip.title}</h4>
                <span className="flex-shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  +{tip.impact} pts
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{tip.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
