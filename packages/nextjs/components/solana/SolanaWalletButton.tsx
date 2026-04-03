"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const SolanaWalletButton = () => {
  const { connected, publicKey } = useWallet();

  return (
    <div className="solana-wallet-btn">
      <WalletMultiButton
        style={{
          backgroundColor: connected ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.3)",
          color: "#e2e8f0",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          height: "2.5rem",
          padding: "0 1rem",
          border: "1px solid rgba(139, 92, 246, 0.3)",
        }}
      />
      {connected && publicKey && (
        <span className="ml-2 text-xs text-purple-400 hidden sm:inline">Solana</span>
      )}
    </div>
  );
};
