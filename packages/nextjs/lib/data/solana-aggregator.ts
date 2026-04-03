/**
 * Solana Data Aggregator
 * Orchestrates all Solana data fetchers in parallel via Promise.allSettled.
 * Produces a SolanaWalletProfile for the unified scoring engine.
 */
import { getSolanaTokenBalances, getSolanaTransactionHistory } from "./solana";
import { getSolanaLendingData } from "./solana-lending";
import type { SolanaWalletProfile } from "~~/types/credit";

interface SolanaAggregatedData {
  profile: SolanaWalletProfile;
  dataSources: string[];
  failedSources: string[];
  confidence: number;
}

export async function aggregateSolanaWalletData(address: string): Promise<SolanaAggregatedData> {
  const [tokenResult, txResult, lendingResult] = await Promise.allSettled([
    getSolanaTokenBalances(address),
    getSolanaTransactionHistory(address),
    getSolanaLendingData(address),
  ]);

  const dataSources: string[] = [];
  const failedSources: string[] = [];

  const tokenData =
    tokenResult.status === "fulfilled"
      ? (dataSources.push("helius-das"), tokenResult.value)
      : (failedSources.push("helius-das"),
        { totalValueUsd: 0, stablecoinRatio: 0, tokenCount: 0, nftCount: 0, defiProtocols: [] as string[] });

  const txData =
    txResult.status === "fulfilled"
      ? (dataSources.push("solana-rpc"), txResult.value)
      : (failedSources.push("solana-rpc"), { txCount: 0, walletAgeDays: 0 });

  const lendingData =
    lendingResult.status === "fulfilled"
      ? (dataSources.push("solana-lending"), lendingResult.value)
      : (failedSources.push("solana-lending"),
        { totalBorrows: 0, totalRepays: 0, liquidationCount: 0, activeBorrows: 0, protocols: [] as string[], healthFactor: Infinity });

  const allProtocols = [...new Set([...tokenData.defiProtocols, ...lendingData.protocols])];
  const totalBorrows = lendingData.totalBorrows;
  const totalRepays = lendingData.totalRepays;
  const repaymentRatio = totalBorrows > 0 ? Math.min(totalRepays / totalBorrows, 1) : 0;

  const profile: SolanaWalletProfile = {
    chain: "solana-mainnet",
    address,
    walletAgeDays: txData.walletAgeDays,
    txCount: txData.txCount,
    uniqueActiveMonths: Math.min(Math.floor(txData.walletAgeDays / 30), 36),
    defiProtocolCount: allProtocols.length,
    defiProtocols: allProtocols,
    totalBorrows,
    totalRepays,
    repaymentRatio,
    liquidationCount: lendingData.liquidationCount,
    liquidationVolumeUsd: 0,
    stablecoinRatio: tokenData.stablecoinRatio,
    totalValueUsd: tokenData.totalValueUsd,
    tokenCount: tokenData.tokenCount,
    nftCount: tokenData.nftCount,
    governanceParticipation: 0,
    bridgeUsageCount: 0,
    stakingData: {
      totalStakedSol: 0,
      stakingProtocols: allProtocols.filter(p => ["marinade", "jito", "blaze"].includes(p)),
    },
    lendingData: {
      totalBorrowsUsd: lendingData.totalBorrows,
      totalRepaysUsd: lendingData.totalRepays,
      repaymentRatio,
      liquidationCount: lendingData.liquidationCount,
      activeBorrowsUsd: lendingData.activeBorrows,
      protocols: lendingData.protocols,
    },
  };

  const totalSources = 3;
  const succeededSources = dataSources.length;
  const confidence = succeededSources / totalSources;

  return { profile, dataSources, failedSources, confidence };
}
