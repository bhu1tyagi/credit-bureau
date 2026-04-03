/**
 * Coinbase Developer Platform (CDP) Paymaster integration for gas sponsorship on Base.
 * Uses ERC-4337 UserOperations via EIP-5792 wallet_sendCalls.
 */

const BASE_MAINNET_CHAIN_ID = 8453;

export function isPaymasterAvailable(chainId: number): boolean {
  return chainId === BASE_MAINNET_CHAIN_ID && !!getPaymasterUrl();
}

export function getPaymasterUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CDP_PAYMASTER_URL;
  return url || null;
}

/**
 * Build the paymaster capabilities object for EIP-5792 wallet_sendCalls.
 * Compatible with wagmi's useWriteContracts / useSendCalls hooks.
 */
export function getPaymasterCapabilities(chainId: number) {
  const paymasterUrl = getPaymasterUrl();
  if (!paymasterUrl || chainId !== BASE_MAINNET_CHAIN_ID) return undefined;

  return {
    [BASE_MAINNET_CHAIN_ID]: {
      paymasterService: {
        url: paymasterUrl,
      },
    },
  };
}

export function getGasDisplayText(chainId: number): string {
  if (isPaymasterAvailable(chainId)) {
    return "Sponsored (Free)";
  }
  return "~$0.01 - $0.05";
}
