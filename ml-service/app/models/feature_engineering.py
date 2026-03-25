"""Transform raw wallet profile data into model-ready features."""

from __future__ import annotations

import numpy as np
import pandas as pd

# The canonical ordered list of features the model expects.
FEATURE_NAMES: list[str] = [
    "wallet_age_days",
    "tx_count",
    "defi_protocol_count",
    "repayment_ratio",
    "liquidation_count",
    "stablecoin_ratio",
    "total_value_usd",
    "unique_token_count",
    "nft_count",
    "governance_votes",
    "bridge_tx_count",
    "avg_tx_value_usd",
    "max_single_tx_usd",
    "active_days_ratio",
    # Derived features
    "log_total_value_usd",
    "log_tx_count",
    "activity_density",
    "defi_diversity_score",
    "value_per_tx",
    "liquidation_ratio",
]


def _fill_defaults(raw: dict) -> dict:
    """Ensure every expected raw field is present with a sensible default."""
    defaults = {
        "wallet_age_days": 0.0,
        "tx_count": 0,
        "defi_protocol_count": 0,
        "repayment_ratio": 0.0,
        "liquidation_count": 0,
        "stablecoin_ratio": 0.0,
        "total_value_usd": 0.0,
        "unique_token_count": 0,
        "nft_count": 0,
        "governance_votes": 0,
        "bridge_tx_count": 0,
        "avg_tx_value_usd": 0.0,
        "max_single_tx_usd": 0.0,
        "active_days_ratio": 0.0,
    }
    for key, default in defaults.items():
        if key not in raw or raw[key] is None:
            raw[key] = default
    return raw


def _add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create derived / engineered features from the raw columns."""
    # Log-scaled monetary values (add 1 to avoid log(0))
    df["log_total_value_usd"] = np.log1p(df["total_value_usd"])
    df["log_tx_count"] = np.log1p(df["tx_count"])

    # Activity density: transactions per day the wallet has existed
    df["activity_density"] = np.where(
        df["wallet_age_days"] > 0,
        df["tx_count"] / df["wallet_age_days"],
        0.0,
    )

    # DeFi diversity score (normalized 0-1, cap at 20 protocols)
    df["defi_diversity_score"] = np.clip(df["defi_protocol_count"] / 20.0, 0.0, 1.0)

    # Average value per transaction
    df["value_per_tx"] = np.where(
        df["tx_count"] > 0,
        df["total_value_usd"] / df["tx_count"],
        0.0,
    )

    # Liquidation ratio relative to total transactions
    df["liquidation_ratio"] = np.where(
        df["tx_count"] > 0,
        df["liquidation_count"] / df["tx_count"],
        0.0,
    )

    return df


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Min-max-style normalization for numeric features that are unbounded.

    Bounded features (ratios already in 0-1) are left untouched.
    """
    # Columns to normalize and their practical upper bounds (for clipping)
    caps = {
        "wallet_age_days": 3650.0,   # ~10 years
        "tx_count": 100_000.0,
        "total_value_usd": 10_000_000.0,
        "unique_token_count": 500.0,
        "nft_count": 10_000.0,
        "governance_votes": 1_000.0,
        "bridge_tx_count": 5_000.0,
        "avg_tx_value_usd": 1_000_000.0,
        "max_single_tx_usd": 10_000_000.0,
        "log_total_value_usd": np.log1p(10_000_000.0),
        "log_tx_count": np.log1p(100_000.0),
        "activity_density": 100.0,
        "value_per_tx": 1_000_000.0,
    }
    for col, cap in caps.items():
        if col in df.columns:
            df[col] = np.clip(df[col], 0.0, cap) / cap

    return df


def prepare_features(raw: dict) -> np.ndarray:
    """Full pipeline: fill defaults -> derive features -> normalize -> ndarray.

    Parameters
    ----------
    raw : dict
        Wallet profile data (field names matching ``PredictRequest``).

    Returns
    -------
    np.ndarray
        1-D feature vector in the order defined by ``FEATURE_NAMES``.
    """
    raw = _fill_defaults(raw)
    df = pd.DataFrame([raw])
    df = _add_derived_features(df)
    df = _normalize(df)

    # Guarantee column order matches FEATURE_NAMES
    for col in FEATURE_NAMES:
        if col not in df.columns:
            df[col] = 0.0

    return df[FEATURE_NAMES].values[0].astype(np.float32)


def prepare_features_batch(records: list[dict]) -> np.ndarray:
    """Vectorised version of ``prepare_features`` for training / batch scoring."""
    records = [_fill_defaults(r) for r in records]
    df = pd.DataFrame(records)
    df = _add_derived_features(df)
    df = _normalize(df)

    for col in FEATURE_NAMES:
        if col not in df.columns:
            df[col] = 0.0

    return df[FEATURE_NAMES].values.astype(np.float32)
