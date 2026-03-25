"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Code } from "lucide-react";
import { fadeIn, slideInFromBottom } from "~~/lib/animations";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0E27] px-4">
      {/* Animated mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute left-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Badge */}
        <motion.div
          {...fadeIn}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2A2F4D] bg-[#111631]/80 px-4 py-1.5 text-xs text-gray-400 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Built on Ethereum Attestation Service
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...slideInFromBottom}
          className="mb-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl"
        >
          <span className="text-white">The Credit Bureau</span>
          <br />
          <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            for DeFi
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 sm:text-xl"
        >
          Portable, composable credit identity for the on-chain economy.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
          >
            Check Your Score
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/developers"
            className="flex items-center gap-2 rounded-xl border border-[#2A2F4D] bg-[#111631]/50 px-8 py-3.5 text-sm font-semibold text-gray-300 backdrop-blur-sm hover:border-blue-500/30 hover:text-white transition-all"
          >
            <Code className="w-4 h-4" />
            For Developers
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
