#!/usr/bin/env python3
"""CredBureau -- Training pipeline for the credit-score model.

Usage:
    python train.py                   # generate synthetic data & train
    python train.py --csv data.csv    # train from a CSV file
"""

from __future__ import annotations

import argparse
import logging
import os
import pickle
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, mean_absolute_error
from xgboost import XGBRegressor

from app.models.feature_engineering import (
    FEATURE_NAMES,
    prepare_features_batch,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "credit_model.pkl")


# --------------------------------------------------------------------------- #
# Synthetic data generation
# --------------------------------------------------------------------------- #
def _generate_synthetic_data(n: int = 5_000, seed: int = 42) -> pd.DataFrame:
    """Create a synthetic dataset of wallet profiles with target scores."""
    rng = np.random.default_rng(seed)

    data = {
        "wallet_age_days": rng.exponential(scale=400, size=n).clip(1, 3650),
        "tx_count": rng.exponential(scale=500, size=n).clip(0, 100_000).astype(int),
        "defi_protocol_count": rng.poisson(lam=3, size=n).clip(0, 30),
        "repayment_ratio": rng.beta(5, 2, size=n),
        "liquidation_count": rng.poisson(lam=0.5, size=n),
        "stablecoin_ratio": rng.beta(2, 3, size=n),
        "total_value_usd": rng.exponential(scale=50_000, size=n).clip(0, 10_000_000),
        "unique_token_count": rng.poisson(lam=8, size=n).clip(0, 500),
        "nft_count": rng.poisson(lam=2, size=n).clip(0, 200),
        "governance_votes": rng.poisson(lam=1, size=n).clip(0, 100),
        "bridge_tx_count": rng.poisson(lam=1, size=n).clip(0, 50),
        "avg_tx_value_usd": rng.exponential(scale=500, size=n).clip(0, 1_000_000),
        "max_single_tx_usd": rng.exponential(scale=5_000, size=n).clip(0, 10_000_000),
        "active_days_ratio": rng.beta(2, 5, size=n),
    }

    df = pd.DataFrame(data)

    # Synthesize a target score with a known relationship to features.
    score = (
        300
        + 150 * df["repayment_ratio"]
        + 80 * np.clip(df["wallet_age_days"] / 1825, 0, 1)
        + 50 * np.clip(df["tx_count"] / 5000, 0, 1)
        + 60 * np.clip(df["total_value_usd"] / 500_000, 0, 1)
        + 40 * np.clip(df["defi_protocol_count"] / 10, 0, 1)
        + 20 * df["stablecoin_ratio"]
        + 30 * df["active_days_ratio"]
        - 80 * np.clip(df["liquidation_count"] / 5, 0, 1)
        + rng.normal(0, 15, size=n)  # noise
    )
    df["score"] = score.clip(300, 850).astype(int)

    return df


# --------------------------------------------------------------------------- #
# Training
# --------------------------------------------------------------------------- #
def train(df: pd.DataFrame) -> None:
    """Train an XGBoost regressor and persist the model artifact."""

    logger.info("Preparing features (%d records) ...", len(df))
    records = df.drop(columns=["score"]).to_dict(orient="records")
    X = prepare_features_batch(records)
    y = df["score"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    logger.info("Training XGBRegressor ...")
    model = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
    )
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    # Evaluate
    preds = model.predict(X_test)
    preds_clipped = np.clip(preds, 300, 850)
    mae = mean_absolute_error(y_test, preds_clipped)
    logger.info("Test MAE: %.2f", mae)

    # Binary classification metric: "good credit" = score >= 670
    y_binary = (y_test >= 670).astype(int)
    pred_binary = (preds_clipped >= 670).astype(float)
    if len(np.unique(y_binary)) > 1:
        auc = roc_auc_score(y_binary, pred_binary)
        logger.info("ROC AUC (score >= 670 threshold): %.4f", auc)
    else:
        logger.warning("Only one class in test set; skipping AUC.")

    # Persist
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_PATH, "wb") as fh:
        pickle.dump(model, fh)
    logger.info("Model saved to %s", MODEL_PATH)

    # Save metadata
    meta_path = os.path.join(MODEL_DIR, "metadata.txt")
    with open(meta_path, "w") as fh:
        fh.write(f"training_date={datetime.utcnow().isoformat()}\n")
        fh.write(f"n_samples={len(df)}\n")
        fh.write(f"test_mae={mae:.2f}\n")
        fh.write(f"features={','.join(FEATURE_NAMES)}\n")
    logger.info("Metadata saved to %s", meta_path)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def main() -> None:
    parser = argparse.ArgumentParser(description="Train the CredBureau credit model.")
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to a CSV file with wallet profiles and a 'score' column.",
    )
    parser.add_argument(
        "--n-samples",
        type=int,
        default=5_000,
        help="Number of synthetic samples to generate (ignored when --csv is set).",
    )
    args = parser.parse_args()

    if args.csv:
        logger.info("Loading data from %s ...", args.csv)
        df = pd.read_csv(args.csv)
        if "score" not in df.columns:
            raise ValueError("CSV must contain a 'score' column.")
    else:
        logger.info("Generating %d synthetic samples ...", args.n_samples)
        df = _generate_synthetic_data(n=args.n_samples)

    train(df)


if __name__ == "__main__":
    main()
