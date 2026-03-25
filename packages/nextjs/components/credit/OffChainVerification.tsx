"use client";

import { motion } from "framer-motion";
import { CreditCard, DollarSign, Landmark, ShieldCheck, ShieldX, UserCheck } from "lucide-react";
import { staggerContainer, staggerItem } from "~~/lib/animations";
import { cn } from "~~/lib/utils";

interface Verification {
  type: string;
  verified: boolean;
}

interface OffChainVerificationProps {
  verifications: Verification[];
  onVerify: (type: string) => void;
}

const PROVIDER_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  fico: {
    label: "FICO Score",
    icon: <CreditCard className="w-6 h-6" />,
    description: "Traditional credit score verification via zkTLS",
  },
  bank_balance: {
    label: "Bank Balance",
    icon: <Landmark className="w-6 h-6" />,
    description: "Verify bank account balance without revealing amount",
  },
  income: {
    label: "Income",
    icon: <DollarSign className="w-6 h-6" />,
    description: "Proof of income via payroll or tax data",
  },
  identity: {
    label: "Identity",
    icon: <UserCheck className="w-6 h-6" />,
    description: "KYC identity verification via Reclaim Protocol",
  },
};

export default function OffChainVerification({ verifications, onVerify }: OffChainVerificationProps) {
  return (
    <div className="rounded-xl border border-[#2A2F4D] bg-[#1A1F3D]/50 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Off-Chain Verification</h3>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {verifications.map(v => {
          const meta = PROVIDER_META[v.type] ?? {
            label: v.type,
            icon: <ShieldCheck className="w-6 h-6" />,
            description: "",
          };

          return (
            <motion.div
              key={v.type}
              variants={staggerItem}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                v.verified
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-[#2A2F4D] bg-[#111631]/80 hover:border-cyan-500/20",
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={cn(
                    "rounded-lg p-2",
                    v.verified ? "bg-emerald-500/10 text-emerald-400" : "bg-[#2A2F4D] text-gray-400",
                  )}
                >
                  {meta.icon}
                </div>
                {v.verified ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                    <ShieldX className="w-3.5 h-3.5" />
                    Not Verified
                  </span>
                )}
              </div>

              <h4 className="text-sm font-medium text-white mb-1">{meta.label}</h4>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">{meta.description}</p>

              {!v.verified && (
                <button
                  onClick={() => onVerify(v.type)}
                  className="w-full rounded-lg bg-cyan-500/10 border border-cyan-500/20 py-2 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                >
                  Verify Now
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
