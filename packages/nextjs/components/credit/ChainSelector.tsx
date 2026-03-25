"use client";

import { cn } from "~~/lib/utils";

interface ChainSelectorProps {
  chains: string[];
  selected: string;
  onChange: (chain: string) => void;
}

const CHAIN_ICONS: Record<string, string> = {
  all: "🌐",
  ethereum: "Ξ",
  polygon: "P",
  arbitrum: "A",
  optimism: "O",
  base: "B",
};

export default function ChainSelector({ chains, selected, onChange }: ChainSelectorProps) {
  const allChains = ["all", ...chains];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[#2A2F4D] bg-[#111631] p-1">
      {allChains.map(chain => {
        const isSelected = chain === selected;
        const label = chain === "all" ? "All Chains" : chain.charAt(0).toUpperCase() + chain.slice(1);
        const icon = CHAIN_ICONS[chain.toLowerCase()] ?? chain.charAt(0).toUpperCase();

        return (
          <button
            key={chain}
            onClick={() => onChange(chain)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              isSelected
                ? "bg-[#1A1F3D] text-white shadow-sm border border-[#2A2F4D]"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            <span className="text-sm">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
