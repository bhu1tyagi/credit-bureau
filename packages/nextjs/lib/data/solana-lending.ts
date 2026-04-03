/**
 * Solana lending protocol data fetching (Kamino Finance, marginfi).
 */

export interface SolanaLendingData {
  totalBorrows: number;
  totalRepays: number;
  liquidationCount: number;
  activeBorrows: number;
  protocols: string[];
  healthFactor: number;
}

const EMPTY_LENDING: SolanaLendingData = {
  totalBorrows: 0,
  totalRepays: 0,
  liquidationCount: 0,
  activeBorrows: 0,
  protocols: [],
  healthFactor: Infinity,
};

export async function getKaminoData(walletAddress: string): Promise<SolanaLendingData> {
  try {
    const response = await fetch(
      `https://api.kamino.finance/users/${walletAddress}/obligations`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) },
    );

    if (!response.ok) return EMPTY_LENDING;

    const data = await response.json();
    const obligations = Array.isArray(data) ? data : data?.obligations || [];

    let totalBorrows = 0;
    let totalRepays = 0;
    let liquidationCount = 0;
    let activeBorrows = 0;
    let lowestHealth = Infinity;

    for (const ob of obligations) {
      totalBorrows += ob.totalBorrowValueUsd || ob.borrowedValue || 0;
      totalRepays += ob.totalRepaidValueUsd || 0;
      liquidationCount += ob.liquidationCount || 0;
      activeBorrows += ob.activeBorrowValueUsd || ob.borrowedValue || 0;

      const health = ob.healthFactor || ob.loanToValue ? 1 / (ob.loanToValue || 1) : Infinity;
      if (health < lowestHealth) lowestHealth = health;
    }

    return {
      totalBorrows,
      totalRepays,
      liquidationCount,
      activeBorrows,
      protocols: obligations.length > 0 ? ["kamino"] : [],
      healthFactor: lowestHealth,
    };
  } catch {
    return EMPTY_LENDING;
  }
}

export async function getMarginfiData(walletAddress: string): Promise<SolanaLendingData> {
  try {
    const response = await fetch(
      `https://api.marginfi.com/v1/accounts?wallet=${walletAddress}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) },
    );

    if (!response.ok) return EMPTY_LENDING;

    const data = await response.json();
    const accounts = Array.isArray(data) ? data : data?.accounts || [];

    let totalBorrows = 0;
    let activeBorrows = 0;
    let lowestHealth = Infinity;

    for (const account of accounts) {
      totalBorrows += account.totalBorrowValue || 0;
      activeBorrows += account.activeBorrowValue || account.totalBorrowValue || 0;

      const health = account.healthFactor || Infinity;
      if (health < lowestHealth) lowestHealth = health;
    }

    return {
      totalBorrows,
      totalRepays: 0,
      liquidationCount: 0,
      activeBorrows,
      protocols: accounts.length > 0 ? ["marginfi"] : [],
      healthFactor: lowestHealth,
    };
  } catch {
    return EMPTY_LENDING;
  }
}

export async function getSolanaLendingData(walletAddress: string): Promise<SolanaLendingData> {
  const [kamino, marginfi] = await Promise.allSettled([
    getKaminoData(walletAddress),
    getMarginfiData(walletAddress),
  ]);

  const kaminoData = kamino.status === "fulfilled" ? kamino.value : EMPTY_LENDING;
  const marginfiData = marginfi.status === "fulfilled" ? marginfi.value : EMPTY_LENDING;

  return {
    totalBorrows: kaminoData.totalBorrows + marginfiData.totalBorrows,
    totalRepays: kaminoData.totalRepays + marginfiData.totalRepays,
    liquidationCount: kaminoData.liquidationCount + marginfiData.liquidationCount,
    activeBorrows: kaminoData.activeBorrows + marginfiData.activeBorrows,
    protocols: [...kaminoData.protocols, ...marginfiData.protocols],
    healthFactor: Math.min(kaminoData.healthFactor, marginfiData.healthFactor),
  };
}
