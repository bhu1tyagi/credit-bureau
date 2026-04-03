import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
  burnerWalletMode: "localNetworksOnly" | "allNetworks" | "disabled";
};

export type ScaffoldConfig = BaseConfig;

export const DEFAULT_ALCHEMY_API_KEY = "cR4WnXePioePZ5fFrnSiR";

const isMainnetMode = process.env.NEXT_PUBLIC_NETWORK_MODE === "mainnet";

const mainnetNetworks = [chains.base, chains.arbitrum, chains.optimism, chains.mainnet] as const;
const testnetNetworks = [
  chains.baseSepolia,
  chains.sepolia,
  chains.arbitrumSepolia,
  chains.optimismSepolia,
  chains.foundry,
] as const;

const scaffoldConfig = {
  targetNetworks: isMainnetMode ? mainnetNetworks : testnetNetworks,
  pollingInterval: isMainnetMode ? 6000 : 3000,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,
  rpcOverrides: {
    ...(process.env.BASE_MAINNET_RPC_URL ? { [chains.base.id]: process.env.BASE_MAINNET_RPC_URL } : {}),
    ...(process.env.ARBITRUM_MAINNET_RPC_URL ? { [chains.arbitrum.id]: process.env.ARBITRUM_MAINNET_RPC_URL } : {}),
    ...(process.env.OPTIMISM_MAINNET_RPC_URL ? { [chains.optimism.id]: process.env.OPTIMISM_MAINNET_RPC_URL } : {}),
  },
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  burnerWalletMode: isMainnetMode ? ("disabled" as const) : ("localNetworksOnly" as const),
} satisfies ScaffoldConfig;

export default scaffoldConfig;
