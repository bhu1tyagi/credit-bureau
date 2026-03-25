"use client";

import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Shield, Clock, Activity, Layers, DollarSign, AlertTriangle,
  Coins, TrendingUp, Plus, Wallet, ArrowRight,
} from "lucide-react";
import { useCreditScore } from "~~/hooks/useCreditScore";
import { useScoreHistory } from "~~/hooks/useScoreHistory";
import { staggerContainer, staggerItem } from "~~/lib/animations";
import { RISK_TIER_COLORS, type ScoreFactor, type RiskTier } from "~~/types/credit";
import { truncateAddress } from "~~/lib/utils";

// ============================================
// Dashboard Page
// ============================================

function DashboardPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return <ConnectWalletPrompt />;
  }

  return <DashboardContent address={address} />;
}

function ConnectWalletPrompt() {
  return (
    <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <Wallet className="w-16 h-16 text-blue-400 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
        <p className="text-gray-400 mb-8">
          Connect your wallet to view your DeFi credit score and mint your Credit Passport.
        </p>
        <p className="text-sm text-gray-500">
          Use the connect button in the header to get started.
        </p>
      </div>
    </div>
  );
}

function DashboardContent({ address }: { address: string }) {
  const { score, isLoading, isError, refetch } = useCreditScore(address);
  useScoreHistory(address);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !score) {
    return (
      <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-white mb-4">Unable to Load Score</h2>
          <p className="text-gray-400 mb-6">We couldn&apos;t fetch your credit data. This may be due to network issues.</p>
          <button
            onClick={refetch}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const tierColor = RISK_TIER_COLORS[score.riskTier];

  return (
    <div className="min-h-screen bg-[#0A0E27] py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Credit Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              {truncateAddress(address)} &middot; Updated {new Date(score.timestamp).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-[#1A1F3D] border border-[#2A2F4D] rounded-lg text-gray-300 hover:text-white transition-colors text-sm"
          >
            Refresh Score
          </button>
        </div>

        {/* Score + Summary Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Score Gauge */}
          <motion.div
            className="md:col-span-1 p-8 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D] flex flex-col items-center justify-center"
            style={{ boxShadow: `0 0 60px ${tierColor}20` }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ScoreDisplay score={score.score} riskTier={score.riskTier} />
          </motion.div>

          {/* Summary Cards */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <SummaryCard
              icon={<Shield className="w-5 h-5" />}
              label="Risk Tier"
              value={score.riskTier}
              color={tierColor}
            />
            <SummaryCard
              icon={<Activity className="w-5 h-5" />}
              label="Confidence"
              value={`${Math.round(score.confidence * 100)}%`}
              color="#06B6D4"
            />
            <SummaryCard
              icon={<Layers className="w-5 h-5" />}
              label="Chains Analyzed"
              value={String(score.chains.length)}
              color="#3B82F6"
            />
            <SummaryCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Model Version"
              value={score.modelVersion === 1 ? "Deterministic" : "AI Enhanced"}
              color="#10B981"
            />
          </div>
        </div>

        {/* Score Breakdown */}
        <h2 className="text-lg font-semibold text-white mb-4">Score Breakdown</h2>
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <BreakdownCard name="Wallet Age" factor={score.breakdown.walletAge} icon={<Clock className="w-5 h-5" />} />
          <BreakdownCard name="Tx Frequency" factor={score.breakdown.txFrequency} icon={<Activity className="w-5 h-5" />} />
          <BreakdownCard name="DeFi Diversity" factor={score.breakdown.defiDiversity} icon={<Layers className="w-5 h-5" />} />
          <BreakdownCard name="Repayment History" factor={score.breakdown.repaymentHistory} icon={<DollarSign className="w-5 h-5" />} />
          <BreakdownCard name="Liquidation Risk" factor={score.breakdown.liquidationPenalty} icon={<AlertTriangle className="w-5 h-5" />} isNegative />
          <BreakdownCard name="Stablecoin Ratio" factor={score.breakdown.stablecoinRatio} icon={<Coins className="w-5 h-5" />} />
          <BreakdownCard name="Portfolio Value" factor={score.breakdown.totalValue} icon={<DollarSign className="w-5 h-5" />} />
          <BreakdownCard name="Off-Chain Bonus" factor={score.breakdown.offChainBonus} icon={<Shield className="w-5 h-5" />} />
        </motion.div>

        {/* Actions Row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard
            title="Mint Credit Passport"
            description="Create an on-chain attestation of your score via EAS"
            icon={<Shield className="w-6 h-6 text-blue-400" />}
            href="/dashboard"
            cta="Mint Now"
          />
          <ActionCard
            title="View Full Report"
            description="Detailed credit report with lending history and risk factors"
            icon={<Activity className="w-6 h-6 text-cyan-400" />}
            href="/report"
            cta="View Report"
          />
          <ActionCard
            title="Link Another Wallet"
            description="Aggregate scores across multiple wallets for a unified identity"
            icon={<Plus className="w-6 h-6 text-emerald-400" />}
            href="/settings"
            cta="Link Wallet"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function ScoreDisplay({ score, riskTier }: { score: number; riskTier: RiskTier }) {
  const color = RISK_TIER_COLORS[riskTier];

  // SVG gauge parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const sweepAngle = 0.75; // 270 degrees
  const arcLength = circumference * sweepAngle;
  const progress = (score - 300) / 550; // normalize 300-850 to 0-1
  const dashOffset = arcLength - arcLength * progress;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="180" height="180" viewBox="0 0 200 200" className="-rotate-[135deg]">
        {/* Background arc */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#2A2F4D"
          strokeWidth="12"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        <motion.circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>

      {/* Score number overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-5xl font-bold text-white"
          style={{ fontFamily: "var(--font-mono, monospace)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {score}
        </motion.span>
        <span className="text-sm font-medium mt-1" style={{ color }}>
          {riskTier}
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color }}>{icon}</div>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function BreakdownCard({
  name,
  factor,
  icon,
  isNegative = false,
}: {
  name: string;
  factor: ScoreFactor;
  icon: React.ReactNode;
  isNegative?: boolean;
}) {
  const progress = isNegative
    ? Math.max(0, (factor.maxScore + factor.score) / factor.maxScore) // negative score
    : factor.maxScore > 0
      ? factor.score / factor.maxScore
      : 0;

  const barColor = isNegative
    ? factor.score < 0
      ? "#EF4444"
      : "#10B981"
    : progress > 0.7
      ? "#10B981"
      : progress > 0.4
        ? "#F59E0B"
        : "#EF4444";

  return (
    <motion.div
      variants={staggerItem}
      className="p-4 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D] hover:border-[#3B82F6]/30 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-gray-400">{icon}</div>
          <span className="text-sm font-medium text-white">{name}</span>
        </div>
        <span className="text-xs text-gray-500">{Math.round(factor.weight * 100)}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#2A2F4D] rounded-full mb-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress * 100, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {factor.score} / {factor.maxScore}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{factor.details}</p>
    </motion.div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  href,
  cta,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="p-6 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D] hover:border-blue-500/30 transition-all group"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <span className="text-blue-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
        {cta}
        <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0E27] py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="h-8 w-48 bg-[#1A1F3D] rounded mb-8 animate-pulse" />
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="h-64 bg-[#1A1F3D] rounded-2xl animate-pulse" />
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-[#1A1F3D] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 bg-[#1A1F3D] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(DashboardPage), { ssr: false });
