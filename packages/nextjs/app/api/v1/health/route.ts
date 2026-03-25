import { NextResponse } from "next/server";
import { checkMLHealth } from "~~/lib/scoring/ml-client";

export async function GET() {
  const mlHealthy = await checkMLHealth();

  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      mlService: mlHealthy,
    },
    chains: {
      base: true,
      arbitrum: true,
      optimism: true,
      polygon: true,
      ethereum: true,
    },
  });
}
