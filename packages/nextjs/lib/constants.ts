// ============================================
// CredBureau Constants
// ============================================

export type NetworkMode = "testnet" | "mainnet";

export function getNetworkMode(): NetworkMode {
  const mode = process.env.NEXT_PUBLIC_NETWORK_MODE;
  if (mode === "mainnet") return "mainnet";
  return "testnet";
}

export const isMainnet = () => getNetworkMode() === "mainnet";

// ============================================
// Mainnet Chain Configurations
// ============================================

export const MAINNET_CHAINS_CONFIG = {
  base: {
    id: 8453,
    name: "base" as const,
    label: "Base",
    rpcUrl: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    easContract: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
    easScanUrl: "https://base.easscan.org",
    isDefault: true,
  },
  arbitrum: {
    id: 42161,
    name: "arbitrum" as const,
    label: "Arbitrum One",
    rpcUrl: process.env.ARBITRUM_MAINNET_RPC_URL || "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
    easContract: "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458",
    schemaRegistry: "0xA7b39296258348C78294F95B872b282326A97BDF",
    easScanUrl: "https://arbitrum.easscan.org",
    isDefault: false,
  },
  optimism: {
    id: 10,
    name: "optimism" as const,
    label: "Optimism",
    rpcUrl: process.env.OPTIMISM_MAINNET_RPC_URL || "https://mainnet.optimism.io",
    blockExplorer: "https://optimistic.etherscan.io",
    easContract: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
    easScanUrl: "https://optimism.easscan.org",
    isDefault: false,
  },
  ethereum: {
    id: 1,
    name: "ethereum" as const,
    label: "Ethereum",
    rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL || "https://eth.llamarpc.com",
    blockExplorer: "https://etherscan.io",
    easContract: "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587",
    schemaRegistry: "0xA7b39296258348C78294F95B872b282326A97BDF",
    easScanUrl: "https://easscan.org",
    isDefault: false,
  },
} as const;

export const TESTNET_CHAINS_CONFIG = {
  "base-sepolia": {
    id: 84532,
    name: "base-sepolia" as const,
    label: "Base Sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    easContract: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
    easScanUrl: "https://base-sepolia.easscan.org",
    isDefault: true,
  },
  sepolia: {
    id: 11155111,
    name: "sepolia" as const,
    label: "Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
    easContract: "0xC2679fBD37d54388Ce493F1DB75320D236e1815e",
    schemaRegistry: "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0",
    easScanUrl: "https://sepolia.easscan.org",
    isDefault: false,
  },
  "arbitrum-sepolia": {
    id: 421614,
    name: "arbitrum-sepolia" as const,
    label: "Arbitrum Sepolia",
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    blockExplorer: "https://sepolia.arbiscan.io",
    easContract: "0xaEF4103A04090071165F78D45D83A0C0782c2B2a",
    schemaRegistry: "0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797",
    easScanUrl: "https://arbitrum-sepolia.easscan.org",
    isDefault: false,
  },
  "optimism-sepolia": {
    id: 11155420,
    name: "optimism-sepolia" as const,
    label: "Optimism Sepolia",
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || "https://sepolia.optimism.io",
    blockExplorer: "https://sepolia-optimistic.etherscan.io",
    easContract: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
    easScanUrl: "https://optimism-sepolia.easscan.org",
    isDefault: false,
  },
} as const;

export function getChainConfig() {
  return isMainnet() ? MAINNET_CHAINS_CONFIG : TESTNET_CHAINS_CONFIG;
}

// EAS Contract Addresses per chain (all environments merged for backward compatibility)
export const EAS_ADDRESSES: Record<string, string> = {
  ethereum: "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587",
  base: "0x4200000000000000000000000000000000000021",
  arbitrum: "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458",
  optimism: "0x4200000000000000000000000000000000000021",
  sepolia: "0xC2679fBD37d54388Ce493F1DB75320D236e1815e",
  "base-sepolia": "0x4200000000000000000000000000000000000021",
  "arbitrum-sepolia": "0xaEF4103A04090071165F78D45D83A0C0782c2B2a",
  "optimism-sepolia": "0x4200000000000000000000000000000000000021",
};

export const SCHEMA_REGISTRY_ADDRESSES: Record<string, string> = {
  ethereum: "0xA7b39296258348C78294F95B872b282326A97BDF",
  base: "0x4200000000000000000000000000000000000020",
  arbitrum: "0xA7b39296258348C78294F95B872b282326A97BDF",
  optimism: "0x4200000000000000000000000000000000000020",
  sepolia: "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0",
  "base-sepolia": "0x4200000000000000000000000000000000000020",
  "arbitrum-sepolia": "0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797",
  "optimism-sepolia": "0x4200000000000000000000000000000000000020",
};

export const CREDIT_SCORE_SCHEMA_UIDS: Record<string, string> = {
  ethereum: "",
  base: "",
  arbitrum: "",
  optimism: "",
  sepolia: "",
  "base-sepolia": "",
  "arbitrum-sepolia": "",
  "optimism-sepolia": "",
};

export const CREDIT_SCORE_SCHEMA =
  "uint16 creditScore, uint8 riskTier, uint256 timestamp, address wallet, bytes32 dataHash, bool hasOffChainData, uint8 modelVersion";

// Supported chains for data fetching (GoldRush chain names)
const MAINNET_SUPPORTED_CHAINS = [
  { id: 1, name: "eth-mainnet", label: "Ethereum", explorerUrl: "https://etherscan.io" },
  { id: 8453, name: "base-mainnet", label: "Base", explorerUrl: "https://basescan.org" },
  { id: 42161, name: "arbitrum-mainnet", label: "Arbitrum", explorerUrl: "https://arbiscan.io" },
  { id: 10, name: "optimism-mainnet", label: "Optimism", explorerUrl: "https://optimistic.etherscan.io" },
] as const;

const TESTNET_SUPPORTED_CHAINS = [
  { id: 11155111, name: "eth-mainnet", label: "Ethereum", explorerUrl: "https://sepolia.etherscan.io" },
  { id: 84532, name: "base-mainnet", label: "Base", explorerUrl: "https://sepolia.basescan.org" },
  { id: 421614, name: "arbitrum-mainnet", label: "Arbitrum", explorerUrl: "https://sepolia.arbiscan.io" },
  { id: 11155420, name: "optimism-mainnet", label: "Optimism", explorerUrl: "https://sepolia-optimistic.etherscan.io" },
] as const;

export const SUPPORTED_CHAINS = isMainnet() ? MAINNET_SUPPORTED_CHAINS : TESTNET_SUPPORTED_CHAINS;

export const DEFAULT_ATTESTATION_CHAIN = isMainnet() ? "base" : "base-sepolia";

// Aave V3 Subgraph IDs (always mainnet for scoring data)
export const AAVE_V3_SUBGRAPHS: Record<string, string> = {
  "eth-mainnet": "https://gateway.thegraph.com/api/subgraphs/id/Cd2gEDVeqnjBn1hSeqFMitw8Q1iiyV9FYUZkLNRcL87g",
  "base-mainnet": "https://gateway.thegraph.com/api/subgraphs/id/GQFbb95cE6d8mB4Obm1Z73VtBjfhT3DD6u4a2hEn13cA",
  "arbitrum-mainnet": "https://gateway.thegraph.com/api/subgraphs/id/DLuE98AEBw5dsmPtbJceXq6DBqQMbpJREBuBcoAt1YEQ",
  "optimism-mainnet": "https://gateway.thegraph.com/api/subgraphs/id/DSfLz8oQBUeU5atALgUFQKMTSYV5j3RHpMjCbK27BqHd",
};

// EASScan URLs
export const EASSCAN_URLS: Record<string, string> = {
  ethereum: "https://easscan.org",
  base: "https://base.easscan.org",
  arbitrum: "https://arbitrum.easscan.org",
  optimism: "https://optimism.easscan.org",
  sepolia: "https://sepolia.easscan.org",
  "base-sepolia": "https://base-sepolia.easscan.org",
  "arbitrum-sepolia": "https://arbitrum-sepolia.easscan.org",
  "optimism-sepolia": "https://optimism-sepolia.easscan.org",
};

// Solana configuration
export const SOLANA_CONFIG = {
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  heliusApiKey: process.env.HELIUS_API_KEY || "",
  heliusRpcUrl: process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "",
  sasProgramId: process.env.SAS_PROGRAM_ID || "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG",
  stablecoinMints: {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMF1kAPQHkYx0HMs7Uo8TYMAebYXHnZn4Mriignkv",
  },
} as const;

// Attestation TTL
export const ATTESTATION_TTL_DAYS = 30;
export const ATTESTATION_TTL_SECONDS = ATTESTATION_TTL_DAYS * 24 * 60 * 60;

// API Rate Limits
export const RATE_LIMITS = {
  free: 100,
  pro: 1000,
  enterprise: 10000,
} as const;

// Score cache TTL (seconds)
export const CACHE_TTL = {
  basicScore: 15 * 60,
  detailedScore: 5 * 60,
  walletData: 10 * 60,
  attestationVerify: 60 * 60,
  apiKeyLookup: 5 * 60,
} as const;

// Address format detection
export function isSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !address.startsWith("0x");
}

export function isEVMAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function detectChainType(address: string): "evm" | "solana" | "unknown" {
  if (isEVMAddress(address)) return "evm";
  if (isSolanaAddress(address)) return "solana";
  return "unknown";
}
