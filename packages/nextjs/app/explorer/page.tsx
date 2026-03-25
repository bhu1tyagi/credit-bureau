"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { isAddress } from "viem";
import { RISK_TIER_COLORS, type RiskTier } from "~~/types/credit";
import { truncateAddress } from "~~/lib/utils";
import { staggerContainer, staggerItem } from "~~/lib/animations";

interface SearchResult {
  address: string;
  score: number;
  riskTier: RiskTier;
  timestamp: string;
}

export default function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    // Validate address
    if (!isAddress(query)) {
      setError("Please enter a valid Ethereum address");
      return;
    }

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/v1/score?address=${query}`);
      if (!response.ok) {
        throw new Error("Failed to fetch score");
      }
      const data = await response.json();
      setResult({
        address: data.address,
        score: data.score,
        riskTier: data.riskTier,
        timestamp: data.timestamp,
      });
    } catch {
      setError("Could not find score for this address. The wallet may not have enough DeFi activity.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E27] py-8">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <Search className="w-7 h-7 text-blue-400" />
          Explorer
        </h1>
        <p className="text-gray-400 mb-8">Search any wallet address to view its public credit score</p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter wallet address (0x...)"
              className="flex-1 px-4 py-3 bg-[#1A1F3D] border border-[#2A2F4D] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all font-mono text-sm"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Search Result */}
        {result && (
          <motion.div
            className="p-6 rounded-2xl bg-[#1A1F3D]/50 border border-[#2A2F4D] mb-8"
            style={{ boxShadow: `0 0 40px ${RISK_TIER_COLORS[result.riskTier]}15` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Wallet Address</p>
                <p className="text-white font-mono">{truncateAddress(result.address, 8)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                <p className="text-white text-sm">{new Date(result.timestamp).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-[#2A2F4D]">
              <div>
                <div className="text-4xl font-bold text-white" style={{ fontFamily: "monospace" }}>
                  {result.score}
                </div>
              </div>
              <div>
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${RISK_TIER_COLORS[result.riskTier]}20`,
                    color: RISK_TIER_COLORS[result.riskTier],
                  }}
                >
                  {result.riskTier}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recently Scored Wallets */}
        <RecentlyScored onSelect={(addr) => {
          setQuery(addr);
          setResult(null);
          setError(null);
        }} />
      </div>
    </div>
  );
}

function RecentlyScored({ onSelect }: { onSelect: (address: string) => void }) {
  const [wallets, setWallets] = useState<{ wallet_address: string; score: number; risk_tier: string; created_at: string }[]>([]);

  useEffect(() => {
    fetch("/api/v1/recent-scores")
      .then(res => res.json())
      .then(data => setWallets(data.wallets || []))
      .catch(err => console.error("[Explorer] Failed to load recent scores:", err));
  }, []);

  if (wallets.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Recently Scored</h2>
        <p className="text-gray-500 text-sm">No wallets have been scored yet. Search any address above to get started.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">Recently Scored</h2>
      <motion.div
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {wallets.map(wallet => (
          <motion.button
            key={wallet.wallet_address}
            variants={staggerItem}
            onClick={() => onSelect(wallet.wallet_address)}
            className="p-4 rounded-xl bg-[#1A1F3D]/50 border border-[#2A2F4D] hover:border-blue-500/30 transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-xs font-mono">{truncateAddress(wallet.wallet_address, 6)}</p>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${RISK_TIER_COLORS[wallet.risk_tier as RiskTier] || "#3B82F6"}20`,
                  color: RISK_TIER_COLORS[wallet.risk_tier as RiskTier] || "#3B82F6",
                }}
              >
                {wallet.risk_tier}
              </span>
            </div>
            <p className="text-white font-mono text-lg font-bold">{wallet.score}</p>
            <p className="text-gray-500 text-xs mt-1">{new Date(wallet.created_at).toLocaleDateString()}</p>
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
}
