"use client";

import { motion } from "framer-motion";
import { Wallet, BarChart3, Stamp } from "lucide-react";
import { staggerContainer, staggerItem } from "~~/lib/animations";

const STEPS = [
  {
    number: 1,
    icon: <Wallet className="w-6 h-6" />,
    title: "Connect Wallet",
    description:
      "Link your wallets across Ethereum, Polygon, Arbitrum, Optimism, and Base. All your on-chain history is analyzed.",
  },
  {
    number: 2,
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Get Scored",
    description:
      "Our model evaluates 8 credit factors including repayment history, DeFi diversity, and wallet maturity to produce your 300-850 score.",
  },
  {
    number: 3,
    icon: <Stamp className="w-6 h-6" />,
    title: "Mint Passport",
    description:
      "Create an on-chain attestation via EAS. Use your Credit Passport to unlock better rates across DeFi lending protocols.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-[#0A0E27] px-4 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto max-w-lg text-gray-400">
            Three simple steps to build your on-chain credit identity.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="grid grid-cols-1 gap-8 md:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.number} variants={staggerItem} className="relative">
              {/* Connector line (between cards on desktop) */}
              {i < STEPS.length - 1 && (
                <div className="absolute right-0 top-12 hidden h-px w-8 translate-x-full bg-gradient-to-r from-[#2A2F4D] to-transparent md:block" />
              )}

              <div className="rounded-xl border border-[#2A2F4D] bg-[#111631]/50 p-6 text-center hover:border-blue-500/20 transition-colors">
                {/* Number circle */}
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-bold text-white shadow-lg shadow-blue-500/20">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  {step.icon}
                </div>

                {/* Text */}
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
