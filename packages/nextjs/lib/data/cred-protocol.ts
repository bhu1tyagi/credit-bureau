/**
 * Cred Protocol API Client
 * Fetches pre-built credit scores as a baseline calibration signal.
 */

const CRED_API_KEY = process.env.CRED_PROTOCOL_API_KEY || "";
const CRED_BASE_URL = process.env.CRED_PROTOCOL_API_URL || "https://api.credprotocol.com/api";

interface CredScore {
  score: number; // 300–1000
  factors: CredFactor[];
  updated_at: string;
}

interface CredFactor {
  name: string;
  value: number;
  weight: number;
}

/**
 * Get a Cred Protocol credit score for a wallet address.
 * Used as a baseline/calibration signal, not a direct scoring factor.
 */
export async function getCredScore(address: string): Promise<CredScore | null> {
  if (!CRED_API_KEY) return null;

  try {
    const response = await fetch(`${CRED_BASE_URL}/score/address/${address}?include_factors=true`, {
      headers: {
        Authorization: `Bearer ${CRED_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      score: data.score || 0,
      factors: data.factors || [],
      updated_at: data.updated_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error("[CredProtocol]", error);
    return null;
  }
}
