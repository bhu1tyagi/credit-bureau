"use client";

import { motion } from "framer-motion";
import { formatNumber } from "~~/lib/utils";

interface PercentileRankingProps {
  percentile: number;
  totalWallets?: number;
}

export default function PercentileRanking({ percentile, totalWallets }: PercentileRankingProps) {
  const topPercent = 100 - percentile;

  return (
    <div className="rounded-xl border border-[#2A2F4D] bg-[#1A1F3D]/50 backdrop-blur-sm p-5">
      <h3 className="text-sm font-semibold text-white mb-3">Percentile Ranking</h3>

      {/* Distribution bar */}
      <div className="relative mb-3">
        <div className="h-3 w-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 via-60% to-emerald-500 opacity-30" />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-white/30"
          style={{ left: `${percentile}%` }}
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: `${percentile}%`, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {/* Position marker */}
        <motion.div
          className="absolute -top-6 -translate-x-1/2 rounded bg-[#111631] border border-[#2A2F4D] px-1.5 py-0.5 text-xs font-mono text-white"
          style={{ left: `${percentile}%` }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          {percentile}%
        </motion.div>
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-300">
        Top <span className="font-semibold text-cyan-400">{topPercent}%</span> of DeFi users
      </p>
      {totalWallets && <p className="text-xs text-gray-500 mt-1">Out of {formatNumber(totalWallets)} wallets scored</p>}
    </div>
  );
}
