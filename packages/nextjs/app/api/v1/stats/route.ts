import { NextResponse } from "next/server";
import { createServerClient } from "~~/lib/supabase/server";
import { SUPPORTED_CHAINS } from "~~/lib/constants";

export async function GET() {
  try {
    const supabase = createServerClient();

    const [walletsResult, attestationsResult] = await Promise.allSettled([
      (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from("credit_scores")
        .select("wallet_address", { count: "exact", head: true }),
      (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from("attestations")
        .select("id", { count: "exact", head: true }),
    ]);

    const walletsScored =
      walletsResult.status === "fulfilled" ? walletsResult.value.count || 0 : 0;
    const attestationsCreated =
      attestationsResult.status === "fulfilled" ? attestationsResult.value.count || 0 : 0;

    return NextResponse.json({
      walletsScored,
      attestationsCreated,
      chainsSupported: SUPPORTED_CHAINS.length,
      scoreRange: "300–850",
    });
  } catch (error) {
    console.error("[Stats] Failed to fetch stats:", error);
    return NextResponse.json({
      walletsScored: 0,
      attestationsCreated: 0,
      chainsSupported: SUPPORTED_CHAINS.length,
      scoreRange: "300–850",
    });
  }
}
