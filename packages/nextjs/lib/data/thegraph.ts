/**
 * The Graph — Aave V3 Subgraph Data Fetcher
 * Queries borrow, repay, and liquidation events for credit scoring.
 */
import { AAVE_V3_SUBGRAPHS } from "~~/lib/constants";

interface AaveBorrow {
  id: string;
  amount: string;
  reserve: { symbol: string; decimals: number };
  timestamp: string;
  assetPriceUSD: string;
}

interface AaveRepay {
  id: string;
  amount: string;
  reserve: { symbol: string; decimals: number };
  timestamp: string;
  assetPriceUSD: string;
}

interface AaveLiquidation {
  id: string;
  collateralAmount: string;
  principalAmount: string;
  timestamp: string;
  collateralAssetPriceUSD: string;
  debtAssetPriceUSD: string;
}

export interface AaveData {
  borrows: AaveBorrow[];
  repays: AaveRepay[];
  liquidations: AaveLiquidation[];
  totalBorrowedUsd: number;
  totalRepaidUsd: number;
  totalLiquidatedUsd: number;
  repaymentRatio: number;
  liquidationCount: number;
}

async function querySubgraph(subgraphUrl: string, query: string): Promise<unknown | null> {
  try {
    const response = await fetch(subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[TheGraph]", error);
    return null;
  }
}

/**
 * Fetch Aave V3 lending data for a wallet on a specific chain.
 */
export async function getAaveData(address: string, chainName: string): Promise<AaveData | null> {
  const subgraphUrl = AAVE_V3_SUBGRAPHS[chainName];
  if (!subgraphUrl) return null;

  const addr = address.toLowerCase();

  const query = `{
    borrows(where: { user: "${addr}" }, first: 1000, orderBy: timestamp, orderDirection: desc) {
      id
      amount
      reserve { symbol decimals }
      timestamp
      assetPriceUSD
    }
    repays(where: { user: "${addr}" }, first: 1000, orderBy: timestamp, orderDirection: desc) {
      id
      amount
      reserve { symbol decimals }
      timestamp
      assetPriceUSD
    }
    liquidationCalls(where: { user: "${addr}" }, first: 100) {
      id
      collateralAmount
      principalAmount
      timestamp
      collateralAssetPriceUSD
      debtAssetPriceUSD
    }
  }`;

  const data = (await querySubgraph(subgraphUrl, query)) as {
    borrows?: AaveBorrow[];
    repays?: AaveRepay[];
    liquidationCalls?: AaveLiquidation[];
  } | null;

  if (!data) return null;

  const borrows = data.borrows || [];
  const repays = data.repays || [];
  const liquidations = data.liquidationCalls || [];

  // Calculate USD totals
  let totalBorrowedUsd = 0;
  for (const b of borrows) {
    const price = parseFloat(b.assetPriceUSD || "0");
    const amount = parseFloat(b.amount || "0") / Math.pow(10, b.reserve?.decimals || 18);
    totalBorrowedUsd += amount * price;
  }

  let totalRepaidUsd = 0;
  for (const r of repays) {
    const price = parseFloat(r.assetPriceUSD || "0");
    const amount = parseFloat(r.amount || "0") / Math.pow(10, r.reserve?.decimals || 18);
    totalRepaidUsd += amount * price;
  }

  let totalLiquidatedUsd = 0;
  for (const l of liquidations) {
    totalLiquidatedUsd += parseFloat(l.debtAssetPriceUSD || "0");
  }

  const repaymentRatio = totalBorrowedUsd > 0 ? Math.min(totalRepaidUsd / totalBorrowedUsd, 1.0) : 0;

  return {
    borrows,
    repays,
    liquidations,
    totalBorrowedUsd,
    totalRepaidUsd,
    totalLiquidatedUsd,
    repaymentRatio,
    liquidationCount: liquidations.length,
  };
}

/**
 * Fetch Aave data across multiple chains and aggregate.
 */
export async function getAaveDataMultiChain(
  address: string,
  chainNames: string[],
): Promise<{
  totalBorrows: number;
  totalRepays: number;
  repaymentRatio: number;
  liquidationCount: number;
  liquidationVolumeUsd: number;
  hasLendingHistory: boolean;
}> {
  const results = await Promise.allSettled(chainNames.map(chain => getAaveData(address, chain)));

  let totalBorrows = 0;
  let totalRepays = 0;
  let liquidationCount = 0;
  let liquidationVolumeUsd = 0;

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const data = result.value;
    totalBorrows += data.totalBorrowedUsd;
    totalRepays += data.totalRepaidUsd;
    liquidationCount += data.liquidationCount;
    liquidationVolumeUsd += data.totalLiquidatedUsd;
  }

  const repaymentRatio = totalBorrows > 0 ? Math.min(totalRepays / totalBorrows, 1.0) : 0;

  return {
    totalBorrows,
    totalRepays,
    repaymentRatio,
    liquidationCount,
    liquidationVolumeUsd,
    hasLendingHistory: totalBorrows > 0,
  };
}
