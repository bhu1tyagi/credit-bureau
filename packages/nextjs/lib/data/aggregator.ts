/**
 * Data Aggregator
 * Orchestrates all data fetchers in parallel via Promise.allSettled.
 * Normalizes results into a unified WalletProfile.
 */
import { getWalletDataMultiChain } from "./goldrush";
import { getAaveDataMultiChain } from "./thegraph";
import { SUPPORTED_CHAINS } from "~~/lib/constants";
import type { WalletProfile } from "~~/types/credit";

const DEFAULT_CHAINS = SUPPORTED_CHAINS.map(c => c.name);

interface AggregatedData {
  profile: WalletProfile;
  dataSources: string[];
  failedSources: string[];
  confidence: number;
}

/**
 * Fetch and aggregate all on-chain data for a wallet address.
 * Uses Promise.allSettled so no single source failure blocks the result.
 */
export async function aggregateWalletData(address: string, chains: string[] = DEFAULT_CHAINS): Promise<AggregatedData> {
  const dataSources: string[] = [];
  const failedSources: string[] = [];

  // Run all fetchers in parallel
  const [goldrushResult, aaveResult] = await Promise.allSettled([
    getWalletDataMultiChain(address, chains),
    getAaveDataMultiChain(address, chains),
  ]);

  // Process GoldRush results
  let totalValueUsd = 0;
  let stablecoinRatio = 0;
  let txCount = 0;
  let tokenCount = 0;
  let nftCount = 0;
  let firstTxDate: string | null = null;
  let detectedProtocols: string[] = [];

  if (goldrushResult.status === "fulfilled") {
    const gr = goldrushResult.value;
    totalValueUsd = gr.totalValueUsd;
    stablecoinRatio = gr.stablecoinRatio;
    txCount = gr.txCount;
    tokenCount = gr.tokenCount;
    nftCount = gr.nftCount;
    firstTxDate = gr.firstTxDate;
    detectedProtocols = gr.detectedProtocols;
    dataSources.push("goldrush");
  } else {
    failedSources.push("goldrush");
  }

  // Process Aave/The Graph results
  let totalBorrows = 0;
  let totalRepays = 0;
  let repaymentRatio = 0;
  let liquidationCount = 0;
  let liquidationVolumeUsd = 0;
  let hasLendingHistory = false;

  if (aaveResult.status === "fulfilled") {
    const aave = aaveResult.value;
    totalBorrows = aave.totalBorrows;
    totalRepays = aave.totalRepays;
    repaymentRatio = aave.repaymentRatio;
    liquidationCount = aave.liquidationCount;
    liquidationVolumeUsd = aave.liquidationVolumeUsd;
    hasLendingHistory = aave.hasLendingHistory;
    dataSources.push("aave_subgraph");
  } else {
    failedSources.push("aave_subgraph");
  }

  // Compute wallet age from the real first-transaction date
  const walletAgeDays = firstTxDate ? Math.floor((Date.now() - new Date(firstTxDate).getTime()) / 86400000) : 0;

  // Derive unique active months from wallet age
  const uniqueActiveMonths = Math.min(Math.floor(walletAgeDays / 30), 60);

  // Build the full detected-protocols list:
  // start with token-level detections from GoldRush, then add Aave if subgraph confirmed borrows/repays
  const allProtocols = new Set<string>(detectedProtocols);
  if (hasLendingHistory && !allProtocols.has("Aave")) {
    allProtocols.add("Aave");
  }
  const finalProtocols = Array.from(allProtocols);

  const defiProtocolCount = finalProtocols.length;

  const profile: WalletProfile = {
    walletAgeDays,
    txCount,
    uniqueActiveMonths,
    defiProtocolCount,
    defiProtocols: finalProtocols,
    totalBorrows,
    totalRepays,
    repaymentRatio,
    liquidationCount,
    liquidationVolumeUsd,
    stablecoinRatio,
    totalValueUsd,
    tokenCount,
    nftCount,
    governanceParticipation: 0, // Not yet integrated — honest zero
    bridgeUsageCount: 0, // Not yet integrated — honest zero
  };

  // Confidence is based on how many sources succeeded
  const totalSources = 2; // goldrush + aave
  const confidence = dataSources.length / totalSources;

  return {
    profile,
    dataSources,
    failedSources,
    confidence,
  };
}
