"use client";

import { motion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { staggerItem } from "~~/lib/animations";
import { cn } from "~~/lib/utils";
import type { ScoreFactor } from "~~/types/credit";

interface ScoreBreakdownCardProps {
  factor: ScoreFactor;
  name: string;
  icon: React.ReactNode;
}

export default function ScoreBreakdownCard({ factor, name, icon }: ScoreBreakdownCardProps) {
  const percent = (factor.score / factor.maxScore) * 100;
  const weightPercent = Math.round(factor.weight * 100);

  const trendIcon = {
    up: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    down: <TrendingDown className="w-4 h-4 text-red-400" />,
    stable: <Minus className="w-4 h-4 text-gray-400" />,
  };

  const trendColor = {
    up: "text-emerald-400",
    down: "text-red-400",
    stable: "text-gray-400",
  };

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.15)" }}
      className={cn(
        "rounded-xl border border-[#2A2F4D] bg-[#1A1F3D]/50 backdrop-blur-sm",
        "p-5 transition-colors hover:border-[#3B82F6]/30",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-blue-400">{icon}</div>
          <h3 className="text-sm font-semibold text-white">{name}</h3>
        </div>
        <span className="rounded-full bg-[#2A2F4D] px-2 py-0.5 text-xs text-gray-400">{weightPercent}% weight</span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-2 w-full rounded-full bg-[#2A2F4D]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      </div>

      {/* Score + Trend */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">
          <span className="font-mono font-semibold text-white">{factor.score}</span>
          <span className="text-gray-500"> / {factor.maxScore}</span>
        </span>
        <div className="flex items-center gap-1">
          {factor.trend && trendIcon[factor.trend]}
          {factor.trend && (
            <span className={cn("text-xs", trendColor[factor.trend])}>
              {factor.trend === "up" ? "Improving" : factor.trend === "down" ? "Declining" : "Stable"}
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <p className="text-xs text-gray-500 leading-relaxed">{factor.details}</p>
    </motion.div>
  );
}
