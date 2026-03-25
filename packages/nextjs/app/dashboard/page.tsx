"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
import { type Variants, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Coins,
  DollarSign,
  Layers,
  Link2,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import AttestationSection from "~~/components/credit/AttestationSection";
import ImprovementTips from "~~/components/credit/ImprovementTips";
import LinkedWalletsPanel from "~~/components/credit/LinkedWalletsPanel";
import PercentileRanking from "~~/components/credit/PercentileRanking";
import ScoreHistoryChart from "~~/components/credit/ScoreHistoryChart";
import { useAttestation } from "~~/hooks/useAttestation";
import { useCreditScore } from "~~/hooks/useCreditScore";
import { useLinkedWallets } from "~~/hooks/useLinkedWallets";
import { useScoreHistory } from "~~/hooks/useScoreHistory";
import { staggerContainer, staggerItem } from "~~/lib/animations";
import { timeAgo, truncateAddress } from "~~/lib/utils";
import { type Attestation, RISK_TIER_COLORS, type RiskTier, type ScoreFactor } from "~~/types/credit";

// ============================================
// Section animation wrapper
// ============================================

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

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

// ============================================
// Connect Wallet Prompt
// ============================================

function ConnectWalletPrompt() {
  return (
    <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
      <motion.div
        className="text-center max-w-md px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          <Wallet className="relative w-16 h-16 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
        <p className="text-gray-400 mb-8">
          Connect your wallet to view your DeFi credit score and mint your Credit Passport.
        </p>
        <p className="text-sm text-gray-500">Use the connect button in the header to get started.</p>
      </motion.div>
    </div>
  );
}

// ============================================
// Dashboard Content
// ============================================

function DashboardContent({ address }: { address: string }) {
  const { score, isLoading, isError, refetch } = useCreditScore(address);
  const { history, isLoading: historyLoading } = useScoreHistory(address);
  const attestation = useAttestation();
  const linkedWallets = useLinkedWallets(address);

  // Attestation list state (populated on successful mint)
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Linked wallet modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkAddress, setLinkAddress] = useState("");
  const [linkChain, setLinkChain] = useState("ethereum");

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    toast.loading("Refreshing score...", { id: "refresh" });
    try {
      await refetch();
      toast.success("Score updated!", { id: "refresh" });
    } catch {
      toast.error("Failed to refresh score", { id: "refresh" });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleMint = useCallback(
    async (chain: string) => {
      toast.loading("Minting Credit Passport...", { id: "mint" });

      const result = await attestation.mint(address, chain);

      if (result) {
        toast.success(`Credit Passport minted on ${chain}!`, { id: "mint", duration: 5000 });

        // Fire confetti celebration
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#3B82F6", "#06B6D4", "#10B981", "#F59E0B"],
        });

        // Add the new attestation to the local list
        const newAttestation: Attestation = {
          id: result.attestationUid,
          attestationUid: result.attestationUid,
          chain: result.chain,
          schemaUid: "",
          txHash: result.txHash,
          score: score?.score ?? 0,
          riskTier: score?.riskTier ?? "Fair",
          isOnChain: true,
          expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
          revoked: false,
          createdAt: Date.now(),
          easScanUrl: result.easScanUrl,
        };
        setAttestations(prev => [newAttestation, ...prev]);
      } else {
        toast.error(attestation.error || "Failed to mint attestation", {
          id: "mint",
        });
      }
    },
    [attestation, address, score],
  );

  const handleLinkWallet = useCallback(async () => {
    if (!linkAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }
    toast.loading("Linking wallet...", { id: "link" });
    try {
      await linkedWallets.linkWallet(linkAddress.trim(), linkChain);
      toast.success("Wallet linked successfully!", { id: "link" });
      setLinkAddress("");
      setShowLinkModal(false);
    } catch {
      toast.error("Failed to link wallet", { id: "link" });
    }
  }, [linkAddress, linkChain, linkedWallets]);

  const handleUnlinkWallet = useCallback(
    async (walletAddress: string) => {
      toast.loading("Unlinking wallet...", { id: "unlink" });
      try {
        await linkedWallets.unlinkWallet(walletAddress);
        toast.success("Wallet unlinked", { id: "unlink" });
      } catch {
        toast.error("Failed to unlink wallet", { id: "unlink" });
      }
    },
    [linkedWallets],
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !score) {
    return (
      <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
        <motion.div
          className="text-center max-w-md px-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-white mb-4">Unable to Load Score</h2>
          <p className="text-gray-400 mb-6">
            We couldn&apos;t fetch your credit data. This may be due to network issues.
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  const tierColor = RISK_TIER_COLORS[score.riskTier];

  // Estimate percentile from score (simple heuristic)
  const percentile = Math.min(99, Math.max(1, Math.round(((score.score - 300) / 550) * 95 + 2)));

  return (
    <div className="min-h-screen bg-[#0A0E27] py-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${tierColor}, transparent 70%)` }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        {/* =============================================
            Section 1: Header + Score Overview
        ============================================= */}
        <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Credit Dashboard
                <Sparkles className="w-5 h-5 text-blue-400" />
              </h1>
              <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                {truncateAddress(address)} &middot;
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Updated {timeAgo(score.timestamp)}
                </span>
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1F3D]/80 border border-[#2A2F4D] rounded-lg text-gray-300 hover:text-white hover:border-blue-500/30 transition-all text-sm backdrop-blur-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Score Gauge + Summary Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {/* Score Gauge */}
            <motion.div
              className="md:col-span-1 p-8 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D] backdrop-blur-sm flex flex-col items-center justify-center relative overflow-hidden"
              style={{ boxShadow: `0 0 80px ${tierColor}15, inset 0 1px 0 rgba(255,255,255,0.05)` }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Inner glow */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-20 blur-2xl pointer-events-none"
                style={{ background: tierColor }}
              />
              <ScoreDisplay score={score.score} riskTier={score.riskTier} />
              <div
                className="mt-3 px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  color: tierColor,
                  borderColor: `${tierColor}40`,
                  backgroundColor: `${tierColor}10`,
                }}
              >
                {score.riskTier === "VeryPoor" ? "Very Poor" : score.riskTier}
              </div>
            </motion.div>

            {/* Summary Cards */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <SummaryCard
                icon={<Shield className="w-5 h-5" />}
                label="Risk Tier"
                value={score.riskTier === "VeryPoor" ? "Very Poor" : score.riskTier}
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
        </motion.section>

        {/* =============================================
            Section 2: Score Breakdown
        ============================================= */}
        <motion.section custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Score Breakdown
          </h2>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <BreakdownCard name="Wallet Age" factor={score.breakdown.walletAge} icon={<Clock className="w-5 h-5" />} />
            <BreakdownCard
              name="Tx Frequency"
              factor={score.breakdown.txFrequency}
              icon={<Activity className="w-5 h-5" />}
            />
            <BreakdownCard
              name="DeFi Diversity"
              factor={score.breakdown.defiDiversity}
              icon={<Layers className="w-5 h-5" />}
            />
            <BreakdownCard
              name="Repayment History"
              factor={score.breakdown.repaymentHistory}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <BreakdownCard
              name="Liquidation Risk"
              factor={score.breakdown.liquidationPenalty}
              icon={<AlertTriangle className="w-5 h-5" />}
              isNegative
            />
            <BreakdownCard
              name="Stablecoin Ratio"
              factor={score.breakdown.stablecoinRatio}
              icon={<Coins className="w-5 h-5" />}
            />
            <BreakdownCard
              name="Portfolio Value"
              factor={score.breakdown.totalValue}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <BreakdownCard
              name="Off-Chain Bonus"
              factor={score.breakdown.offChainBonus}
              icon={<Shield className="w-5 h-5" />}
            />
          </motion.div>
        </motion.section>

        {/* =============================================
            Section 3: Score History Chart + Percentile
        ============================================= */}
        <motion.section custom={2} variants={sectionVariants} initial="hidden" animate="visible" className="mb-10">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Score History Chart */}
            <div
              className="lg:col-span-2 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D] backdrop-blur-sm p-6"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Score History</h2>
              </div>
              {historyLoading ? (
                <div className="flex items-center justify-center h-60">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : history.length > 0 ? (
                <ScoreHistoryChart
                  data={history.map(h => ({ score: h.score, timestamp: h.timestamp }))}
                  timeRange="Last 90 days"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-60 text-center">
                  <TrendingUp className="w-10 h-10 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500">No history data yet</p>
                  <p className="text-xs text-gray-600 mt-1">Your score history will appear here over time</p>
                </div>
              )}
            </div>

            {/* Percentile Ranking */}
            <div className="lg:col-span-1">
              <PercentileRanking percentile={percentile} totalWallets={12847} />
            </div>
          </div>
        </motion.section>

        {/* =============================================
            Section 4: Mint Credit Passport (Inline)
        ============================================= */}
        <motion.section custom={3} variants={sectionVariants} initial="hidden" animate="visible" className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Credit Passport
          </h2>
          <AttestationSection attestations={attestations} onMint={handleMint} isMinting={attestation.isMinting} />
        </motion.section>

        {/* =============================================
            Section 5: Linked Wallets (Inline)
        ============================================= */}
        <motion.section custom={4} variants={sectionVariants} initial="hidden" animate="visible" className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-400" />
            Linked Wallets
          </h2>
          <LinkedWalletsPanel
            wallets={linkedWallets.wallets}
            onLinkWallet={() => setShowLinkModal(true)}
            onUnlinkWallet={handleUnlinkWallet}
          />

          {/* Link Wallet Modal */}
          {showLinkModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowLinkModal(false)}
            >
              <motion.div
                className="w-full max-w-md mx-4 rounded-2xl border border-[#2A2F4D] bg-[#111631] p-6 shadow-2xl"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  Link a Wallet
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Wallet Address</label>
                    <input
                      type="text"
                      value={linkAddress}
                      onChange={e => setLinkAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full rounded-lg border border-[#2A2F4D] bg-[#0A0E27] px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Chain</label>
                    <select
                      value={linkChain}
                      onChange={e => setLinkChain(e.target.value)}
                      className="w-full rounded-lg border border-[#2A2F4D] bg-[#0A0E27] px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors appearance-none"
                    >
                      <option value="ethereum">Ethereum</option>
                      <option value="base">Base</option>
                      <option value="arbitrum">Arbitrum</option>
                      <option value="optimism">Optimism</option>
                      <option value="polygon">Polygon</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setShowLinkModal(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-[#2A2F4D] text-gray-400 text-sm hover:text-white hover:border-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLinkWallet}
                      disabled={linkedWallets.isLinking}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {linkedWallets.isLinking ? "Linking..." : "Link Wallet"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.section>

        {/* =============================================
            Section 6: Improvement Tips
        ============================================= */}
        <motion.section custom={5} variants={sectionVariants} initial="hidden" animate="visible" className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Improvement Tips
          </h2>
          <ImprovementTips breakdown={score.breakdown} />
        </motion.section>

        {/* =============================================
            Quick Actions Footer
        ============================================= */}
        <motion.section custom={6} variants={sectionVariants} initial="hidden" animate="visible" className="mb-8">
          <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-[#2A2F4D] backdrop-blur-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold mb-1">Want a detailed breakdown?</h3>
              <p className="text-gray-400 text-sm">
                View your full credit report with lending history and risk factors.
              </p>
            </div>
            <a
              href="/report"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              View Full Report
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.section>
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
        <span className="text-xs text-gray-500 mt-1">/ 850</span>
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
    <motion.div
      className="p-4 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D] backdrop-blur-sm hover:border-[#3B82F6]/20 transition-all group"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)` }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg" style={{ color, backgroundColor: `${color}15` }}>
          {icon}
        </div>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </motion.div>
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
    ? Math.max(0, (factor.maxScore + factor.score) / factor.maxScore)
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
      className="p-4 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D] backdrop-blur-sm hover:border-[#3B82F6]/30 transition-all group"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-gray-400 group-hover:text-gray-300 transition-colors">{icon}</div>
          <span className="text-sm font-medium text-white">{name}</span>
        </div>
        <span className="text-xs text-gray-500">{Math.round(factor.weight * 100)}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#2A2F4D] rounded-full mb-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}40` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress * 100, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {factor.score} / {factor.maxScore}
        </span>
        {factor.trend && (
          <span
            className={`text-xs ${factor.trend === "up" ? "text-emerald-400" : factor.trend === "down" ? "text-red-400" : "text-gray-500"}`}
          >
            {factor.trend === "up" ? "Trending up" : factor.trend === "down" ? "Trending down" : "Stable"}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{factor.details}</p>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0E27] py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-52 bg-[#1A1F3D] rounded-lg animate-pulse" />
            <div className="h-4 w-36 bg-[#1A1F3D] rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-[#1A1F3D] rounded-lg animate-pulse" />
        </div>

        {/* Score + Summary skeleton */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="h-72 bg-[#1A1F3D]/50 border border-[#2A2F4D] rounded-2xl animate-pulse" />
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-[#1A1F3D]/50 border border-[#2A2F4D] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* Breakdown skeleton */}
        <div className="h-6 w-40 bg-[#1A1F3D] rounded mb-4 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 bg-[#1A1F3D]/50 border border-[#2A2F4D] rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Chart skeleton */}
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 h-80 bg-[#1A1F3D]/50 border border-[#2A2F4D] rounded-2xl animate-pulse" />
          <div className="h-48 bg-[#1A1F3D]/50 border border-[#2A2F4D] rounded-xl animate-pulse" />
        </div>

        {/* Attestation skeleton */}
        <div className="h-48 bg-[#1A1F3D]/50 border border-[#2A2F4D] rounded-xl mb-10 animate-pulse" />

        {/* Linked wallets skeleton */}
        <div className="h-48 bg-[#1A1F3D]/50 border border-[#2A2F4D] rounded-xl mb-10 animate-pulse" />
      </div>
    </div>
  );
}

// ============================================
// Default export with SSR disabled
// ============================================

export default dynamic(() => Promise.resolve(DashboardPage), { ssr: false });
