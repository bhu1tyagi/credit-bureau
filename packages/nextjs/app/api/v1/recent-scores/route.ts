import { NextResponse } from "next/server";
import { createServerClient } from "~~/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch recent distinct wallet scores
    const { data, error } = await (supabase as any)
      .from("credit_scores")
      .select("wallet_address, score, risk_tier, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[RecentScores] Query error:", error);
      throw error;
    }

    // Deduplicate by wallet address (keep most recent)
    const seen = new Set<string>();
    const unique = (data || [])
      .filter((row: any) => {
        const addr = row.wallet_address?.toLowerCase();
        if (seen.has(addr)) return false;
        seen.add(addr);
        return true;
      })
      .slice(0, 6);

    return NextResponse.json({ wallets: unique });
  } catch (error) {
    console.error("[RecentScores] Failed:", error);
    return NextResponse.json({ wallets: [] });
  }
}
