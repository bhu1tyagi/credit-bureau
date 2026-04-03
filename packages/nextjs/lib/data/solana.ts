/**
 * Solana on-chain data fetching via Helius DAS API and standard RPC.
 */
import { SOLANA_CONFIG } from "~~/lib/constants";

const KNOWN_STABLECOINS = new Set([
  SOLANA_CONFIG.stablecoinMints.USDC,
  SOLANA_CONFIG.stablecoinMints.USDT,
]);

const KNOWN_DEFI_TOKENS: Record<string, string> = {
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: "marinade",
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: "jito",
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": "kamino",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "bonk",
};

interface HeliusAsset {
  id: string;
  content?: {
    metadata?: { name?: string; symbol?: string };
  };
  token_info?: {
    balance?: number;
    decimals?: number;
    price_info?: { price_per_token?: number; total_price?: number };
    mint_authority?: string;
    associated_token_address?: string;
  };
  interface?: string;
  ownership?: { owner?: string };
}

interface HeliusDASResponse {
  result?: {
    total?: number;
    items?: HeliusAsset[];
  };
}

export async function getSolanaTokenBalances(address: string) {
  const heliusUrl = SOLANA_CONFIG.heliusRpcUrl || SOLANA_CONFIG.rpcUrl;

  const response = await fetch(heliusUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "get-assets",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: address,
        page: 1,
        limit: 1000,
        displayOptions: { showFungible: true, showNativeBalance: true },
      },
    }),
  });

  const data: HeliusDASResponse = await response.json();
  const items = data.result?.items || [];

  let totalValueUsd = 0;
  let stablecoinValueUsd = 0;
  let tokenCount = 0;
  let nftCount = 0;
  const defiProtocols = new Set<string>();

  for (const item of items) {
    if (item.interface === "FungibleToken" || item.interface === "FungibleAsset") {
      tokenCount++;
      const price = item.token_info?.price_info?.total_price || 0;
      totalValueUsd += price;

      if (KNOWN_STABLECOINS.has(item.id)) {
        stablecoinValueUsd += price;
      }

      if (KNOWN_DEFI_TOKENS[item.id]) {
        defiProtocols.add(KNOWN_DEFI_TOKENS[item.id]);
      }
    } else if (
      item.interface === "V1_NFT" ||
      item.interface === "ProgrammableNFT" ||
      item.interface === "V2_NFT"
    ) {
      nftCount++;
    }
  }

  const stablecoinRatio = totalValueUsd > 0 ? stablecoinValueUsd / totalValueUsd : 0;

  return {
    totalValueUsd,
    stablecoinRatio,
    tokenCount,
    nftCount,
    defiProtocols: Array.from(defiProtocols),
  };
}

export async function getSolanaTransactionHistory(address: string) {
  const heliusUrl = SOLANA_CONFIG.heliusRpcUrl || SOLANA_CONFIG.rpcUrl;

  const response = await fetch(heliusUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "get-sigs",
      method: "getSignaturesForAddress",
      params: [address, { limit: 1000 }],
    }),
  });

  const data = await response.json();
  const signatures = data.result || [];
  const txCount = signatures.length;

  let walletAgeDays = 0;
  if (signatures.length > 0) {
    const oldestTx = signatures[signatures.length - 1];
    const firstTxTimestamp = oldestTx.blockTime ? oldestTx.blockTime * 1000 : Date.now();
    walletAgeDays = Math.floor((Date.now() - firstTxTimestamp) / (1000 * 60 * 60 * 24));
  }

  return { txCount, walletAgeDays };
}

export async function getSolanaPortfolioValue(mintAddresses: string[]): Promise<Record<string, number>> {
  if (mintAddresses.length === 0) return {};

  try {
    const ids = mintAddresses.join(",");
    const response = await fetch(`https://api.jup.ag/price/v2?ids=${ids}`);
    const data = await response.json();

    const prices: Record<string, number> = {};
    if (data.data) {
      for (const [mint, info] of Object.entries(data.data)) {
        prices[mint] = (info as { price?: number })?.price || 0;
      }
    }
    return prices;
  } catch {
    return {};
  }
}
