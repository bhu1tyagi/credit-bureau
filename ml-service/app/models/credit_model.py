"""Credit-score model wrapper with a deterministic fallback."""

from __future__ import annotations

import os
import pickle
import logging
from typing import Optional

import numpy as np

from app.config import settings
from app.models.feature_engineering import FEATURE_NAMES, prepare_features

logger = logging.getLogger(__name__)


def _risk_tier(score: int) -> str:
    """Map a numeric score (300-850) to a human-readable risk tier."""
    if score >= 750:
        return "excellent"
    if score >= 670:
        return "good"
    if score >= 580:
        return "fair"
    return "poor"


class CreditModel:
    """Thin wrapper around the trained model (or a deterministic fallback)."""

    def __init__(self) -> None:
        self._model: Optional[object] = None
        self.model_version: int = settings.MODEL_VERSION
        self.is_fallback: bool = True

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------
    def load_model(self) -> None:
        """Attempt to load a pickled model; fall back to deterministic scoring."""
        model_path = settings.MODEL_PATH
        if os.path.isfile(model_path):
            try:
                with open(model_path, "rb") as fh:
                    self._model = pickle.load(fh)
                self.is_fallback = False
                logger.info("Loaded trained model from %s", model_path)
            except Exception as exc:
                logger.warning(
                    "Failed to load model from %s (%s). Using fallback.", model_path, exc
                )
                self._model = None
                self.is_fallback = True
        else:
            logger.info(
                "No model file at %s. Using deterministic fallback.", model_path
            )
            self._model = None
            self.is_fallback = True

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------
    def predict(self, raw_features: dict) -> dict:
        """Run inference and return score, risk_tier, and confidence.

        Parameters
        ----------
        raw_features : dict
            Wallet profile dict (same keys as ``PredictRequest``).

        Returns
        -------
        dict with keys ``score``, ``risk_tier``, ``confidence``, ``model_version``.
        """
        features = prepare_features(raw_features)

        if self._model is not None and not self.is_fallback:
            return self._predict_with_model(features)

        return self._predict_fallback(features, raw_features)

    # ------------------------------------------------------------------
    # Trained model path
    # ------------------------------------------------------------------
    def _predict_with_model(self, features: np.ndarray) -> dict:
        """Predict using the loaded XGBoost / sklearn model."""
        X = features.reshape(1, -1)

        # Try predict_proba first (classifiers), then predict (regressors)
        if hasattr(self._model, "predict_proba"):
            proba = self._model.predict_proba(X)[0]
            # Assume higher class index = better credit
            raw_score = float(proba[-1])
            confidence = float(max(proba))
        else:
            raw_score = float(self._model.predict(X)[0])
            confidence = 0.85  # fixed confidence for regressors

        # Clamp to 300-850
        score = int(np.clip(raw_score, settings.MIN_SCORE, settings.MAX_SCORE))
        return {
            "score": score,
            "risk_tier": _risk_tier(score),
            "confidence": round(confidence, 4),
            "model_version": self.model_version,
        }

    # ------------------------------------------------------------------
    # Deterministic fallback
    # ------------------------------------------------------------------
    @staticmethod
    def _predict_fallback(features: np.ndarray, raw: dict) -> dict:
        """Simple weighted heuristic that maps features to 300-850.

        This allows the service to return meaningful results even before a
        model has been trained.
        """
        # Use the *raw* (un-normalized) values so weights are interpretable.
        repayment = raw.get("repayment_ratio", 0.0)
        liquidations = raw.get("liquidation_count", 0)
        tx_count = raw.get("tx_count", 0)
        wallet_age = raw.get("wallet_age_days", 0)
        total_value = raw.get("total_value_usd", 0.0)
        defi_protocols = raw.get("defi_protocol_count", 0)
        stablecoin_ratio = raw.get("stablecoin_ratio", 0.0)
        active_days_ratio = raw.get("active_days_ratio", 0.0)

        # Weighted score components (each contributes 0-1)
        components = [
            (repayment, 0.25),
            (min(wallet_age / 1825.0, 1.0), 0.15),          # ~5 yr cap
            (min(tx_count / 5000.0, 1.0), 0.10),
            (min(total_value / 500_000.0, 1.0), 0.10),
            (min(defi_protocols / 10.0, 1.0), 0.10),
            (stablecoin_ratio, 0.05),
            (active_days_ratio, 0.10),
            (max(0, 1.0 - liquidations / max(tx_count, 1)), 0.15),
        ]

        weighted = sum(value * weight for value, weight in components)

        # Map 0-1 -> 300-850
        score = int(300 + weighted * 550)
        score = max(300, min(850, score))

        # Confidence is lower for the fallback model
        confidence = round(0.55 + weighted * 0.2, 4)

        return {
            "score": score,
            "risk_tier": _risk_tier(score),
            "confidence": confidence,
            "model_version": settings.MODEL_VERSION,
        }

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------
    @property
    def feature_names(self) -> list[str]:
        return list(FEATURE_NAMES)

    @property
    def loaded(self) -> bool:
        return self._model is not None or self.is_fallback
