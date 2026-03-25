#!/usr/bin/env python3
"""
Export real wallet scoring data from Supabase for ML model training.

Usage:
    python export_training_data.py --output data/training_data.csv

Then train the model:
    python train.py --csv data/training_data.csv

Prerequisites:
    - Set SUPABASE_URL and SUPABASE_KEY environment variables
    - pip install supabase pandas
"""

import argparse
import os
import sys

import pandas as pd

try:
    from supabase import create_client
except ImportError:
    print("Install supabase: pip install supabase")
    sys.exit(1)


def export_data(output_path: str, limit: int = 10000) -> None:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Error: Set SUPABASE_URL and SUPABASE_KEY environment variables")
        print("  export SUPABASE_URL=https://your-project.supabase.co")
        print("  export SUPABASE_KEY=your-service-role-key")
        sys.exit(1)

    client = create_client(url, key)

    print(f"Fetching credit scores from Supabase (limit: {limit})...")
    response = (
        client.table("credit_scores")
        .select("wallet_address, score, risk_tier, breakdown, model_version, chains, has_offchain_data, confidence, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    if not response.data:
        print("No data found in credit_scores table.")
        return

    rows = []
    for record in response.data:
        breakdown = record.get("breakdown") or {}
        row = {
            "wallet_address": record["wallet_address"],
            "score": record["score"],
            "risk_tier": record["risk_tier"],
            "model_version": record["model_version"],
            "has_offchain_data": record["has_offchain_data"],
            "confidence": record["confidence"],
            "created_at": record["created_at"],
            # Extract individual factor scores from breakdown
            "wallet_age_score": _extract_factor(breakdown, "walletAge"),
            "tx_frequency_score": _extract_factor(breakdown, "txFrequency"),
            "defi_diversity_score": _extract_factor(breakdown, "defiDiversity"),
            "repayment_history_score": _extract_factor(breakdown, "repaymentHistory"),
            "liquidation_penalty_score": _extract_factor(breakdown, "liquidationPenalty"),
            "stablecoin_ratio_score": _extract_factor(breakdown, "stablecoinRatio"),
            "total_value_score": _extract_factor(breakdown, "totalValue"),
            "offchain_bonus_score": _extract_factor(breakdown, "offChainBonus"),
        }
        rows.append(row)

    df = pd.DataFrame(rows)

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Exported {len(df)} records to {output_path}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nScore distribution:")
    print(df["score"].describe())


def _extract_factor(breakdown: dict, key: str) -> float:
    factor = breakdown.get(key, {})
    if isinstance(factor, dict):
        return factor.get("score", 0)
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export training data from Supabase")
    parser.add_argument("--output", default="data/training_data.csv", help="Output CSV path")
    parser.add_argument("--limit", type=int, default=10000, help="Max records to export")
    args = parser.parse_args()
    export_data(args.output, args.limit)
