"use client";

import { useEffect, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { getRiskTier, RISK_TIER_COLORS, SCORE_MAX, SCORE_MIN } from "~~/types/credit";
import { cn } from "~~/lib/utils";
import { gaugeAnimation } from "~~/lib/animations";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const SIZE_MAP = {
  sm: { container: 120, strokeWidth: 8, fontSize: 28, labelSize: 10 },
  md: { container: 200, strokeWidth: 12, fontSize: 44, labelSize: 14 },
  lg: { container: 280, strokeWidth: 16, fontSize: 60, labelSize: 18 },
};

export default function ScoreGauge({ score, size = "md", animated = true }: ScoreGaugeProps) {
  const tier = getRiskTier(score);
  const tierColor = RISK_TIER_COLORS[tier];
  const dims = SIZE_MAP[size];

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 270 / 360;
  const arcLength = circumference * arcFraction;

  const scorePercent = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const filledLength = arcLength * scorePercent;

  // Animated counter
  const motionScore = useMotionValue(animated ? SCORE_MIN : score);
  const springScore = useSpring(motionScore, { stiffness: 50, damping: 15 });
  const displayScore = useTransform(springScore, (v) => Math.round(v));

  useEffect(() => {
    motionScore.set(score);
  }, [score, motionScore]);

  const startAngle = 135;

  // SVG arc path using stroke-dasharray
  const describeArc = useMemo(() => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + 270) * Math.PI) / 180;
    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2}`;
  }, []);

  return (
    <div
      className={cn("relative flex items-center justify-center")}
      style={{ width: dims.container, height: dims.container }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{ backgroundColor: tierColor }}
      />

      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-0">
        {/* Background arc */}
        <path
          d={describeArc}
          fill="none"
          stroke="#2A2F4D"
          strokeWidth={dims.strokeWidth}
          strokeLinecap="round"
        />

        {/* Foreground arc */}
        <motion.path
          d={describeArc}
          fill="none"
          stroke={tierColor}
          strokeWidth={dims.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength}`}
          strokeDashoffset={arcLength - filledLength}
          initial={animated ? { strokeDashoffset: arcLength } : undefined}
          animate={animated ? { strokeDashoffset: arcLength - filledLength } : undefined}
          transition={gaugeAnimation.transition}
          style={{
            filter: `drop-shadow(0 0 6px ${tierColor})`,
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono font-bold text-white"
          style={{ fontSize: dims.fontSize }}
        >
          {animated ? (
            <motion.span>{displayScore}</motion.span>
          ) : (
            score
          )}
        </motion.span>
        <span
          className="font-medium tracking-wide uppercase"
          style={{
            fontSize: dims.labelSize,
            color: tierColor,
          }}
        >
          {tier === "VeryPoor" ? "Very Poor" : tier}
        </span>
      </div>
    </div>
  );
}
