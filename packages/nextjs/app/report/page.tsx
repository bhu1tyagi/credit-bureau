"use client";

import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { useCreditScore } from "~~/hooks/useCreditScore";
import { useScoreHistory } from "~~/hooks/useScoreHistory";
import { RISK_TIER_COLORS } from "~~/types/credit";
import { FileText, Download, Share2, Wallet, Clock, Activity, Shield, Layers, DollarSign, AlertTriangle, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "~~/lib/animations";
import { truncateAddress } from "~~/lib/utils";
import toast from "react-hot-toast";
import ScoreGauge from "~~/components/credit/ScoreGauge";
import ScoreHistoryChart from "~~/components/credit/ScoreHistoryChart";

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

function ReportPage() {
  const { address, isConnected } = useAccount();
  const { score, isLoading } = useCreditScore(address);
  const { history } = useScoreHistory(address);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/report?address=${address}`;
    if (navigator.share) {
      await navigator.share({ title: "CredBureau Credit Report", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Report link copied to clipboard!");
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-blue-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400">Connect your wallet to view your credit report.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E27] py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-8 w-48 bg-[#1A1F3D] rounded animate-pulse mb-8" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-[#1A1F3D] rounded-xl animate-pulse mb-4" />
          ))}
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-500 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-white mb-4">No Report Available</h2>
          <p className="text-gray-400">Generate a credit score first to view your report.</p>
        </div>
      </div>
    );
  }

  const tierColor = RISK_TIER_COLORS[score.riskTier];

  return (
    <div className="min-h-screen bg-[#0A0E27] py-8">
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-6">
        {/* Report Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-400" />
              Credit Report
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {truncateAddress(address)} &middot; Generated {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3 no-print">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-[#1A1F3D] border border-[#2A2F4D] rounded-lg text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-[#1A1F3D] border border-[#2A2F4D] rounded-lg text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </motion.div>

        {/* Executive Summary */}
        <motion.section
          className="p-6 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D] mb-6"
          style={{ boxShadow: `0 0 40px ${tierColor}15` }}
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Executive Summary</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex justify-center">
              <ScoreGauge score={score.score} size="md" animated />
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Model</p>
              <p className="text-white">{score.modelVersion === 1 ? "Deterministic v1" : "AI Enhanced v2"}</p>
              <p className="text-gray-400 text-sm mt-3 mb-2">Confidence</p>
              <p className="text-white">{Math.round(score.confidence * 100)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Chains Analyzed</p>
              <p className="text-white">{score.chains.length} chains</p>
              <p className="text-gray-400 text-sm mt-3 mb-2">Off-Chain Data</p>
              <p className="text-white">{score.hasOffChainData ? "Included" : "Not verified"}</p>
            </div>
          </div>
        </motion.section>

        {/* Detailed Breakdown */}
        <motion.section
          className="mb-6"
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Score Breakdown</h2>
          <motion.div className="space-y-3" variants={staggerContainer} initial="initial" animate="animate">
            {[
              { name: "Wallet Age", factor: score.breakdown.walletAge, icon: <Clock className="w-4 h-4" /> },
              { name: "Transaction Frequency", factor: score.breakdown.txFrequency, icon: <Activity className="w-4 h-4" /> },
              { name: "DeFi Diversity", factor: score.breakdown.defiDiversity, icon: <Layers className="w-4 h-4" /> },
              { name: "Repayment History", factor: score.breakdown.repaymentHistory, icon: <DollarSign className="w-4 h-4" /> },
              { name: "Liquidation Penalty", factor: score.breakdown.liquidationPenalty, icon: <AlertTriangle className="w-4 h-4" /> },
              { name: "Stablecoin Ratio", factor: score.breakdown.stablecoinRatio, icon: <Coins className="w-4 h-4" /> },
              { name: "Portfolio Value", factor: score.breakdown.totalValue, icon: <DollarSign className="w-4 h-4" /> },
              { name: "Off-Chain Bonus", factor: score.breakdown.offChainBonus, icon: <Shield className="w-4 h-4" /> },
            ].map(({ name, factor, icon }) => {
              const progress = factor.maxScore > 0 ? Math.abs(factor.score) / factor.maxScore : 0;
              const isNeg = factor.score < 0;

              return (
                <motion.div
                  key={name}
                  variants={staggerItem}
                  className="p-4 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{icon}</span>
                      <span className="text-sm font-medium text-white">{name}</span>
                    </div>
                    <span className={`text-sm font-mono ${isNeg ? "text-red-400" : "text-white"}`}>
                      {factor.score} / {factor.maxScore}
                    </span>
                  </div>
                  <div className="h-2 bg-[#2A2F4D] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(progress * 100, 100)}%`,
                        backgroundColor: isNeg ? "#EF4444" : progress > 0.7 ? "#10B981" : progress > 0.4 ? "#F59E0B" : "#EF4444",
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{factor.details}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>

        {/* Score History */}
        {history.length > 0 && (
          <motion.section
            className="mb-6"
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Score History</h2>
            <div className="p-6 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D]">
              <ScoreHistoryChart
                data={history.map(h => ({ score: h.score, timestamp: h.timestamp }))}
                timeRange="All Time"
              />
            </div>
          </motion.section>
        )}

        {/* Disclaimer */}
        <motion.div
          className="p-4 rounded-xl bg-[#1A1F3D]/30 border border-[#2A2F4D] text-xs text-gray-500"
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <p>
            This credit report is generated based on publicly available on-chain data.
            It is not a financial recommendation. Scores are computed using a deterministic algorithm
            and may not reflect all aspects of creditworthiness. Past performance does not guarantee future results.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(ReportPage), { ssr: false });
