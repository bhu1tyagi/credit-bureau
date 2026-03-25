// ============================================
// CredBureau Constants
// ============================================

// EAS Contract Addresses per chain
export const EAS_ADDRESSES: Record<string, string> = {
  ethereum: "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587",
  base: "0x4200000000000000000000000000000000000021",
  arbitrum: "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458",
  optimism: "0x4200000000000000000000000000000000000021",
  sepolia: "0xC2679fBD37d54388Ce493F1DB75320D236e1815e",
  "base-sepolia": "0x4200000000000000000000000000000000000021",
};

export const SCHEMA_REGISTRY_ADDRESSES: Record<string, string> = {
  ethereum: "0xA7b39296258348C78294F95B872b282326A97BDF",
  base: "0x4200000000000000000000000000000000000020",
  arbitrum: "0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB",
  optimism: "0x4200000000000000000000000000000000000020",
  sepolia: "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0",
  "base-sepolia": "0x4200000000000000000000000000000000000020",
};

// Schema UIDs are auto-registered on first attestation per chain.
// Pre-populate these after running the registration to avoid on-chain tx on every first attestation.
export const CREDIT_SCORE_SCHEMA_UIDS: Record<string, string> = {
  ethereum: "",
  base: "",
  arbitrum: "",
  optimism: "",
  sepolia: "",
  "base-sepolia": "",
};

export const CREDIT_SCORE_SCHEMA =
  "uint16 creditScore, uint8 riskTier, uint256 timestamp, address wallet, bytes32 dataHash, bool hasOffChainData, uint8 modelVersion";

// Supported chains for data fetching
// TESTNET MODE: Using testnets for development. Switch to mainnet names for production.
// GoldRush supports both mainnet and testnet chain names.
// For scoring on testnet, we still fetch mainnet data (wallets have history on mainnet).
export const SUPPORTED_CHAINS = [
  { id: 11155111, name: "eth-mainnet", label: "Ethereum", explorerUrl: "https://sepolia.etherscan.io" },
  { id: 84532, name: "base-mainnet", label: "Base", explorerUrl: "https://sepolia.basescan.org" },
  { id: 421614, name: "arbitrum-mainnet", label: "Arbitrum", explorerUrl: "https://sepolia.arbiscan.io" },
  { id: 11155420, name: "optimism-mainnet", label: "Optimism", explorerUrl: "https://sepolia-optimistic.etherscan.io" },
] as const;

// The default chain for attestations (testnet)
export const DEFAULT_ATTESTATION_CHAIN = "base-sepolia";

// Aave V3 Subgraph IDs (mainnet — used for scoring data even on testnet)
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
};

// Attestation TTL
export const ATTESTATION_TTL_DAYS = 30;
export const ATTESTATION_TTL_SECONDS = ATTESTATION_TTL_DAYS * 24 * 60 * 60;

// API Rate Limits
export const RATE_LIMITS = {
  free: 100, // req/min
  pro: 1000,
  enterprise: 10000,
} as const;

// Score cache TTL (seconds)
export const CACHE_TTL = {
  basicScore: 15 * 60, // 15 min
  detailedScore: 5 * 60, // 5 min
  walletData: 10 * 60, // 10 min
  attestationVerify: 60 * 60, // 60 min
  apiKeyLookup: 5 * 60, // 5 min
} as const;
