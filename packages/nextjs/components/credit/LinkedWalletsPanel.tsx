"use client";

import { motion } from "framer-motion";
import { Wallet, Plus, Trash2, Shield } from "lucide-react";
import type { LinkedWallet } from "~~/types/credit";
import { truncateAddress } from "~~/lib/utils";
import { staggerContainer, staggerItem } from "~~/lib/animations";

interface LinkedWalletsPanelProps {
  wallets: LinkedWallet[];
  onLinkWallet: () => void;
  onUnlinkWallet: (address: string) => void;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: "#627EEA",
  polygon: "#8247E5",
  arbitrum: "#2D374B",
  optimism: "#FF0420",
  base: "#0052FF",
};

export default function LinkedWalletsPanel({
  wallets,
  onLinkWallet,
  onUnlinkWallet,
}: LinkedWalletsPanelProps) {
  return (
    <div className="rounded-xl border border-[#2A2F4D] bg-[#1A1F3D]/50 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Linked Wallets</h3>
        </div>
        <button
          onClick={onLinkWallet}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Link Wallet
        </button>
      </div>

      <motion.div
        className="space-y-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {wallets.map((wallet) => (
          <motion.div
            key={wallet.id}
            variants={staggerItem}
            className="flex items-center justify-between rounded-lg border border-[#2A2F4D] bg-[#111631]/80 px-4 py-3 group hover:border-[#3B82F6]/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  backgroundColor: CHAIN_COLORS[wallet.chain.toLowerCase()] ?? "#6B7280",
                }}
              >
                {wallet.chain.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">
                    {truncateAddress(wallet.address)}
                  </span>
                  {wallet.isPrimary && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      <Shield className="w-2.5 h-2.5" />
                      Primary
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 capitalize">{wallet.chain}</span>
              </div>
            </div>

            {!wallet.isPrimary && (
              <button
                onClick={() => onUnlinkWallet(wallet.address)}
                className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                title="Unlink wallet"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ))}

        {wallets.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#2A2F4D] py-8 text-center">
            <Wallet className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No wallets linked yet</p>
            <button
              onClick={onLinkWallet}
              className="mt-2 text-xs text-blue-400 hover:underline"
            >
              Link your first wallet
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
