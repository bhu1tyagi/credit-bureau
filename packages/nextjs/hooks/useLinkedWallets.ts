"use client";

import { useState, useEffect, useCallback } from "react";
import type { LinkedWallet } from "~~/types/credit";
import { getSupabaseClient } from "~~/lib/supabase/client";

interface UseLinkedWalletsResult {
  wallets: LinkedWallet[];
  isLoading: boolean;
  linkWallet: (address: string, chain: string) => Promise<void>;
  unlinkWallet: (address: string) => Promise<void>;
  isLinking: boolean;
}

/**
 * Hook to manage linked wallets for a user.
 */
export function useLinkedWallets(primaryAddress?: string): UseLinkedWalletsResult {
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const fetchWallets = useCallback(async () => {
    if (!primaryAddress) return;
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from("linked_wallets")
        .select("*")
        .eq("user_id", primaryAddress);

      setWallets(
        ((data || []) as any[]).map((w: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id: w.id,
          address: w.wallet_address,
          chain: w.chain,
          isPrimary: w.wallet_address?.toLowerCase() === primaryAddress?.toLowerCase(),
          linkedAt: new Date(w.linked_at).getTime(),
        })),
      );
    } catch (error) {
      console.error("[useLinkedWallets]", error);
    } finally {
      setIsLoading(false);
    }
  }, [primaryAddress]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const linkWallet = useCallback(
    async (address: string, chain: string) => {
      setIsLinking(true);
      try {
        const supabase = getSupabaseClient();
        await (supabase as any).from("linked_wallets").insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
          user_id: primaryAddress,
          wallet_address: address,
          chain,
        });
        await fetchWallets();
      } finally {
        setIsLinking(false);
      }
    },
    [primaryAddress, fetchWallets],
  );

  const unlinkWallet = useCallback(
    async (address: string) => {
      try {
        const supabase = getSupabaseClient();
        await (supabase as any).from("linked_wallets").delete().eq("wallet_address", address); // eslint-disable-line @typescript-eslint/no-explicit-any
        await fetchWallets();
      } catch {
        // Silent failure
      }
    },
    [fetchWallets],
  );

  return { wallets, isLoading, linkWallet, unlinkWallet, isLinking };
}
