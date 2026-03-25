"use client";

import { motion } from "framer-motion";
import { cn } from "~~/lib/utils";
import type { RiskTier } from "~~/types/credit";
import { RISK_TIER_COLORS } from "~~/types/credit";

interface RiskTierBadgeProps {
  tier: RiskTier;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

export default function RiskTierBadge({ tier, size = "md" }: RiskTierBadgeProps) {
  const color = RISK_TIER_COLORS[tier];
  const label = tier === "VeryPoor" ? "Very Poor" : tier;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full font-semibold", SIZE_CLASSES[size])}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {/* Animated pulse dot */}
      <motion.span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {label}
    </span>
  );
}
