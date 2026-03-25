"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import {
  Stamp,
  ExternalLink,
  Clock,
  Loader2,
  ChevronDown,
} from "lucide-react";
import type { Attestation } from "~~/types/credit";
import { truncateAddress, timeAgo } from "~~/lib/utils";
import { staggerContainer, staggerItem } from "~~/lib/animations";

interface AttestationSectionProps {
  attestations: Attestation[];
  onMint: (chain: string) => Promise<{ success: boolean; easScanUrl?: string } | void>;
  isMinting: boolean;
}

// Chain display names → API chain IDs
const SUPPORTED_CHAINS = [
  { label: "Base Sepolia", value: "base-sepolia" },
  { label: "Sepolia", value: "sepolia" },
  { label: "Arbitrum Sepolia", value: "arbitrum-sepolia" },
  { label: "Optimism Sepolia", value: "optimism-sepolia" },
];

function getExpiryText(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d remaining`;
  const hours = Math.floor(diff / 3600000);
  return `${hours}h remaining`;
}

export default function AttestationSection({
  attestations,
  onMint,
  isMinting,
}: AttestationSectionProps) {
  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[0].value);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const handleMint = async () => {
    try {
      const result = await onMint(selectedChain);
      if (result && "success" in result && result.success) {
        // Fire confetti!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#3B82F6", "#06B6D4", "#10B981", "#F59E0B"],
        });
        toast.success("Credit Passport minted successfully!");
      }
    } catch {
      toast.error("Failed to mint attestation. Please try again.");
    }
  };

  return (
    <div className="rounded-xl border border-[#2A2F4D] bg-[#1A1F3D]/50 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Stamp className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Credit Passport</h3>
      </div>

      {/* Mint section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        {/* Chain selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between gap-2 w-full sm:w-44 rounded-lg border border-[#2A2F4D] bg-[#111631] px-3 py-2.5 text-sm text-white hover:border-[#3B82F6]/30 transition-colors"
          >
            <span>{SUPPORTED_CHAINS.find(c => c.value === selectedChain)?.label || selectedChain}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#2A2F4D] bg-[#111631] py-1 shadow-xl">
              {SUPPORTED_CHAINS.map((chain) => (
                <button
                  key={chain.value}
                  onClick={() => {
                    setSelectedChain(chain.value);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[#1A1F3D] transition-colors ${
                    chain.value === selectedChain ? "text-blue-400" : "text-gray-300"
                  }`}
                >
                  {chain.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mint button */}
        <button
          onClick={handleMint}
          disabled={isMinting}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isMinting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Minting...
            </>
          ) : (
            <>
              <Stamp className="w-4 h-4" />
              Mint Credit Passport
            </>
          )}
        </button>
      </div>

      {/* Attestation list */}
      {attestations.length > 0 ? (
        <motion.div
          className="space-y-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {attestations.map((att) => (
            <motion.div
              key={att.id}
              variants={staggerItem}
              className="flex items-center justify-between rounded-lg border border-[#2A2F4D] bg-[#111631]/80 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Stamp className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white">
                      {truncateAddress(att.attestationUid, 6)}
                    </span>
                    <span className="rounded-full bg-[#2A2F4D] px-2 py-0.5 text-[10px] text-gray-400 capitalize">
                      {att.chain}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{timeAgo(att.createdAt)}</span>
                    <span className="text-xs text-gray-600">|</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {getExpiryText(att.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>

              <a
                href={att.easScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                EASScan
                <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#2A2F4D] py-8 text-center">
          <Stamp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No attestations yet</p>
          <p className="text-xs text-gray-600 mt-1">
            Mint your first Credit Passport above
          </p>
        </div>
      )}
    </div>
  );
}
