"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Code, ArrowRight } from "lucide-react";
import Link from "next/link";

const SDK_EXAMPLE = `import { CredBureau } from '@credburo/sdk';

const client = new CredBureau({
  apiKey: process.env.CREDBURO_API_KEY,
});

// Get a credit score
const score = await client.getScore(
  '0x1234...5678'
);

console.log(score.score);     // 742
console.log(score.riskTier);  // "Good"
console.log(score.breakdown); // { walletAge: {...}, ... }`;

const API_EXAMPLE = `# Get credit score via REST API
curl https://api.credburo.xyz/v1/score \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "0x1234...5678",
    "chains": ["ethereum", "base"],
    "includeBreakdown": true
  }'

# Response
{
  "score": 742,
  "riskTier": "Good",
  "confidence": 0.92,
  "breakdown": { ... }
}`;

const tabs = [
  { id: "sdk", label: "SDK" },
  { id: "api", label: "API" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function DeveloperSection() {
  const [activeTab, setActiveTab] = useState<TabId>("sdk");

  return (
    <section className="bg-[#111631]/50 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2A2F4D] bg-[#1A1F3D] px-3 py-1 text-xs text-blue-400">
              <Code className="w-3.5 h-3.5" />
              For Developers
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Integrate Credit Scores
              <br />
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                in Minutes
              </span>
            </h2>
            <p className="mb-6 text-gray-400 leading-relaxed">
              Use our TypeScript SDK or REST API to fetch credit scores, verify
              attestations, and build credit-aware DeFi applications.
              Under-collateralized lending, tiered rates, and credit delegation
              are just a few lines of code away.
            </p>
            <ul className="mb-8 space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                TypeScript SDK with full type safety
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                REST API with 99.9% uptime SLA
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                On-chain verification via EAS
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Webhooks for score change events
              </li>
            </ul>
            <Link
              href="/developers"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow"
            >
              Developer Docs
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* Right: Code */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="rounded-xl border border-[#2A2F4D] bg-[#0A0E27] overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-[#2A2F4D]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                      activeTab === tab.id
                        ? "border-b-2 border-blue-500 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Code block */}
              <div className="overflow-x-auto p-4">
                <pre className="font-mono text-xs leading-relaxed text-gray-300 whitespace-pre">
                  {activeTab === "sdk" ? SDK_EXAMPLE : API_EXAMPLE}
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
