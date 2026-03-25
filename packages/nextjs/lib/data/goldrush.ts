/**
 * GoldRush / Covalent SDK Data Fetcher
 * Fetches on-chain wallet data across multiple chains using @covalenthq/client-sdk.
 */

import { GoldRushClient, type Chain } from "@covalenthq/client-sdk";

const GOLDRUSH_API_KEY = process.env.GOLDRUSH_API_KEY || "";

let _client: GoldRushClient | null = null;

function getClient(): GoldRushClient {
  if (!_client) {
    _client = new GoldRushClient(GOLDRUSH_API_KEY);
  }
  return _client;
}

// ---------- Stablecoin & DeFi Protocol Detection ----------

const STABLECOINS = new Set([
  "USDC", "USDT", "DAI", "FRAX", "LUSD", "BUSD", "TUSD", "GUSD", "USDP", "PYUSD",
]);

/** Map of token-symbol prefixes/names to the protocol they represent. */
const DEFI_TOKEN_MATCHERS: { test: (symbol: string, name: string) => boolean; protocol: string }[] = [
  // Aave aTokens & debt tokens
  { test: (s, n) => /^a[A-Z]/.test(s) || n.toLowerCase().includes("aave"), protocol: "Aave" },
  // Compound cTokens
  { test: (s, n) => /^c[A-Z]/.test(s) || n.toLowerCase().includes("compound"), protocol: "Compound" },
  // Lido
  { test: (s) => ["STETH", "WSTETH"].includes(s.toUpperCase()), protocol: "Lido" },
  // Rocket Pool
  { test: (s) => s.toUpperCase() === "RETH", protocol: "Rocket Pool" },
  // Curve
  { test: (_, n) => n.toLowerCase().includes("curve"), protocol: "Curve" },
  // Convex
  { test: (s, n) => s.startsWith("cvx") || n.toLowerCase().includes("convex"), protocol: "Convex" },
  // Yearn
  { test: (s, n) => s.startsWith("yv") || n.toLowerCase().includes("yearn"), protocol: "Yearn" },
];

function detectProtocol(symbol: string, name: string): string | null {
  for (const m of DEFI_TOKEN_MATCHERS) {
    if (m.test(symbol, name)) return m.protocol;
  }
  return null;
}

// ---------- Public helpers ----------

export interface TokenBalancesResult {
  totalValueUsd: number;
  stablecoinValueUsd: number;
  tokenCount: number;
  detectedProtocols: string[];
}

/**
 * Get token balances for a wallet on a specific chain.
 */
export async function getTokenBalances(
  address: string,
  chainName: string,
): Promise<TokenBalancesResult | null> {
  try {
    const client = getClient();
    const resp = await client.BalanceService.getTokenBalancesForWalletAddress(chainName as Chain, address);

    if (resp.error || !resp.data?.items) return null;

    let totalValueUsd = 0;
    let stablecoinValueUsd = 0;
    const protocols = new Set<string>();

    for (const token of resp.data.items) {
      const quote = token.quote ?? 0;
      totalValueUsd += quote;

      const symbol = token.contract_ticker_symbol ?? "";
      const name = token.contract_name ?? "";

      if (STABLECOINS.has(symbol.toUpperCase())) {
        stablecoinValueUsd += quote;
      }

      const proto = detectProtocol(symbol, name);
      if (proto) protocols.add(proto);
    }

    return {
      totalValueUsd,
      stablecoinValueUsd,
      tokenCount: resp.data.items.length,
      detectedProtocols: Array.from(protocols),
    };
  } catch (error) {
    console.error("[GoldRush]", error);
    return null;
  }
}

export interface TransactionSummaryResult {
  txCount: number;
  firstTxDate: string | null;
  lastTxDate: string | null;
}

/**
 * Get transaction summary (count + first/last tx dates) for a wallet on a specific chain.
 */
export async function getTransactionSummary(
  address: string,
  chainName: string,
): Promise<TransactionSummaryResult | null> {
  try {
    const client = getClient();
    const resp = await client.TransactionService.getTransactionSummary(chainName as Chain, address);

    if (resp.error || !resp.data?.items?.[0]) return null;

    const summary = resp.data.items[0];

    const firstTxDate = summary.earliest_transaction?.block_signed_at
      ? new Date(summary.earliest_transaction.block_signed_at).toISOString()
      : null;

    const lastTxDate = summary.latest_transaction?.block_signed_at
      ? new Date(summary.latest_transaction.block_signed_at).toISOString()
      : null;

    return {
      txCount: summary.total_count ?? 0,
      firstTxDate,
      lastTxDate,
    };
  } catch (error) {
    console.error("[GoldRush]", error);
    return null;
  }
}

/**
 * Get NFT count for a wallet on a specific chain.
 */
export async function getNftCount(address: string, chainName: string): Promise<number> {
  try {
    const client = getClient();
    const resp = await client.NftService.getNftsForAddress(chainName as Chain, address);

    if (resp.error || !resp.data?.items) return 0;
    return resp.data.items.length;
  } catch (error) {
    console.error("[GoldRush]", error);
    return 0;
  }
}

// ---------- Multi-chain aggregation ----------

export interface MultiChainWalletData {
  totalValueUsd: number;
  stablecoinRatio: number;
  txCount: number;
  tokenCount: number;
  nftCount: number;
  chainsWithActivity: string[];
  firstTxDate: string | null;
  detectedProtocols: string[];
}

/**
 * Aggregate wallet data across multiple chains.
 */
export async function getWalletDataMultiChain(
  address: string,
  chainNames: string[],
): Promise<MultiChainWalletData> {
  const results = await Promise.allSettled(
    chainNames.flatMap(chain => [
      getTokenBalances(address, chain).then(r => ({ chain, type: "balances" as const, data: r })),
      getTransactionSummary(address, chain).then(r => ({ chain, type: "txs" as const, data: r })),
      getNftCount(address, chain).then(r => ({ chain, type: "nfts" as const, data: r })),
    ]),
  );

  let totalValueUsd = 0;
  let stablecoinValueUsd = 0;
  let txCount = 0;
  let tokenCount = 0;
  let nftCount = 0;
  let earliestDate: Date | null = null;
  const chainsWithActivity: string[] = [];
  const allProtocols = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value.data) continue;

    const { chain, type, data } = result.value;

    if (type === "balances" && data && typeof data === "object" && "totalValueUsd" in data) {
      const bal = data as TokenBalancesResult;
      totalValueUsd += bal.totalValueUsd;
      stablecoinValueUsd += bal.stablecoinValueUsd;
      tokenCount += bal.tokenCount;
      for (const p of bal.detectedProtocols) allProtocols.add(p);
      if (bal.totalValueUsd > 0 && !chainsWithActivity.includes(chain)) {
        chainsWithActivity.push(chain);
      }
    } else if (type === "txs" && data && typeof data === "object" && "txCount" in data) {
      const tx = data as TransactionSummaryResult;
      txCount += tx.txCount;
      if (tx.firstTxDate) {
        const d = new Date(tx.firstTxDate);
        if (!earliestDate || d < earliestDate) {
          earliestDate = d;
        }
      }
      if (tx.txCount > 0 && !chainsWithActivity.includes(chain)) {
        chainsWithActivity.push(chain);
      }
    } else if (type === "nfts" && typeof data === "number") {
      nftCount += data;
    }
  }

  return {
    totalValueUsd,
    stablecoinRatio: totalValueUsd > 0 ? stablecoinValueUsd / totalValueUsd : 0,
    txCount,
    tokenCount,
    nftCount,
    chainsWithActivity,
    firstTxDate: earliestDate ? earliestDate.toISOString() : null,
    detectedProtocols: Array.from(allProtocols),
  };
}
