"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Shield, Globe, ArrowRight, Code, BarChart3, Wallet } from "lucide-react";
import { staggerContainer, staggerItem, slideInFromBottom } from "~~/lib/animations";

// ============================================
// Landing Page
// ============================================

function LandingPageContent() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <DeveloperSection />
      <WaitlistSection />
      <Footer />
    </div>
  );
}

// Disable SSR to avoid localStorage errors from wagmi/zustand during server rendering
export default dynamic(() => Promise.resolve(LandingPageContent), { ssr: false });

// ============================================
// Hero Section
// ============================================

function HeroSection() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0E27] via-[#111631] to-[#0A0E27]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_70%)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div {...slideInFromBottom}>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              The Credit Bureau
            </span>
            <br />
            <span className="text-white">for DeFi</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Portable, composable credit identity for the on-chain economy.
            Score your wallet. Mint your passport. Unlock undercollateralized lending.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              Check Your Score
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/developers"
              className="px-8 py-4 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Code className="w-5 h-5" />
              For Developers
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Stats Bar
// ============================================

function StatsBar() {
  const [dynamicStats, setDynamicStats] = useState<{ walletsScored: number; attestationsCreated: number } | null>(null);

  useEffect(() => {
    fetch("/api/v1/stats")
      .then(res => res.json())
      .then(data => setDynamicStats(data))
      .catch(err => console.error("[Stats] Failed to load:", err));
  }, []);

  const stats = [
    { label: "Wallets Scored", value: dynamicStats ? dynamicStats.walletsScored.toLocaleString() : "—", icon: Wallet },
    { label: "Chains Supported", value: "5", icon: Globe },
    { label: "Score Range", value: "300–850", icon: BarChart3 },
    { label: "Attestations Created", value: dynamicStats ? dynamicStats.attestationsCreated.toLocaleString() : "—", icon: Shield },
  ];

  return (
    <section className="py-16 bg-[#111631] border-y border-[#2A2F4D]">
      <motion.div
        className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={staggerItem} className="text-center">
            <stat.icon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ============================================
// How It Works
// ============================================

function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: "Connect Wallet",
      description: "Link your wallets across any EVM chain. We aggregate your on-chain history.",
      icon: Wallet,
    },
    {
      number: 2,
      title: "Get Scored",
      description: "AI analyzes your lending history, portfolio diversity, and repayment behavior.",
      icon: BarChart3,
    },
    {
      number: 3,
      title: "Mint Passport",
      description: "Create an on-chain attestation via EAS. Use it across DeFi protocols.",
      icon: Shield,
    },
  ];

  return (
    <section className="py-24 bg-[#0A0E27]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center text-white mb-16"
          {...slideInFromBottom}
          viewport={{ once: true }}
        >
          How It Works
        </motion.h2>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={staggerItem}
              className="relative p-8 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D] backdrop-blur-sm hover:border-blue-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <span className="text-blue-400 font-bold text-lg">{step.number}</span>
              </div>
              <step.icon className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Developer Section
// ============================================

function DeveloperSection() {
  const codeSnippet = `import { CredBureau } from '@credbureau/sdk';

const cb = new CredBureau({ apiKey: 'cb_live_xxx' });

// Get a credit score
const score = await cb.score.get({
  address: '0x...',
  chains: ['base', 'arbitrum']
});

console.log(score.score);    // 742
console.log(score.riskTier); // "Good"

// Create an attestation
const attestation = await cb.attestation.create({
  address: '0x...',
  chain: 'base'
});`;

  return (
    <section className="py-24 bg-[#111631]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div {...slideInFromBottom} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              3 Lines of Code to
              <br />
              <span className="text-blue-400">Integrate Credit Scoring</span>
            </h2>
            <p className="text-gray-400 mb-8">
              Our SDK and REST API make it easy to add credit scoring to any DeFi protocol.
              Check scores, verify attestations, and receive real-time webhooks.
            </p>
            <Link
              href="/developers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all"
            >
              View Documentation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div {...slideInFromBottom} viewport={{ once: true }}>
            <div className="rounded-xl bg-[#0A0E27] border border-[#2A2F4D] overflow-hidden">
              <div className="px-4 py-3 bg-[#1A1F3D] border-b border-[#2A2F4D] flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500 ml-2">index.ts</span>
              </div>
              <pre className="p-6 text-sm text-gray-300 overflow-x-auto font-mono leading-relaxed">
                {codeSnippet}
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Waitlist Section
// ============================================

function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to join waitlist");
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="py-24 bg-[#0A0E27]">
      <div className="max-w-xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Get Early Access</h2>
        <p className="text-gray-400 mb-8">
          Join the waitlist to be among the first to build your on-chain credit identity.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 bg-[#1A1F3D] border border-[#2A2F4D] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
          >
            {status === "loading" ? "Joining..." : "Join Waitlist"}
          </button>
        </form>

        {status === "success" && (
          <p className="mt-4 text-emerald-400">You&apos;re on the list! We&apos;ll be in touch.</p>
        )}
        {status === "error" && (
          <p className="mt-4 text-red-400">Something went wrong. Please try again.</p>
        )}
      </div>
    </section>
  );
}

// ============================================
// Footer
// ============================================

function Footer() {
  return (
    <footer className="py-12 bg-[#0A0E27] border-t border-[#2A2F4D]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <span className="text-white font-bold text-lg">CredBureau</span>
          </div>

          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/developers" className="hover:text-white transition-colors">Developers</Link>
            <Link href="/explorer" className="hover:text-white transition-colors">Explorer</Link>
          </div>

          <div className="text-sm text-gray-500">
            Built on Scaffold-ETH 2
          </div>
        </div>
      </div>
    </footer>
  );
}
