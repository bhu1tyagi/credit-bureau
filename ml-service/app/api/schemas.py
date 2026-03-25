"""Pydantic request / response models for the credit scoring API."""

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """Input features describing a wallet's on-chain profile."""

    wallet_age_days: float = Field(..., ge=0, description="Age of the wallet in days")
    tx_count: int = Field(..., ge=0, description="Total transaction count")
    defi_protocol_count: int = Field(
        ..., ge=0, description="Number of distinct DeFi protocols used"
    )
    repayment_ratio: float = Field(
        ..., ge=0.0, le=1.0, description="Ratio of successful loan repayments"
    )
    liquidation_count: int = Field(
        ..., ge=0, description="Number of liquidation events"
    )
    stablecoin_ratio: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Proportion of holdings in stablecoins",
    )
    total_value_usd: float = Field(
        ..., ge=0.0, description="Total portfolio value in USD"
    )
    unique_token_count: int = Field(
        default=0, ge=0, description="Number of unique tokens held"
    )
    nft_count: int = Field(default=0, ge=0, description="Number of NFTs held")
    governance_votes: int = Field(
        default=0, ge=0, description="Number of governance votes cast"
    )
    bridge_tx_count: int = Field(
        default=0, ge=0, description="Number of cross-chain bridge transactions"
    )
    avg_tx_value_usd: float = Field(
        default=0.0, ge=0.0, description="Average transaction value in USD"
    )
    max_single_tx_usd: float = Field(
        default=0.0, ge=0.0, description="Largest single transaction in USD"
    )
    active_days_ratio: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Ratio of days with at least one transaction",
    )


class PredictResponse(BaseModel):
    """Credit score prediction result."""

    score: int = Field(..., ge=300, le=850, description="Predicted credit score")
    risk_tier: str = Field(
        ..., description="Risk classification (excellent/good/fair/poor)"
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Model confidence in prediction"
    )
    model_version: int = Field(..., description="Version of the model used")


class HealthResponse(BaseModel):
    """Service health check response."""

    status: str
    model_loaded: bool
    model_version: int


class ModelInfoResponse(BaseModel):
    """Metadata about the currently loaded model."""

    model_version: int
    features: list[str]
    training_date: str
