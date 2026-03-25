"""API route handlers for the credit scoring ML service."""

from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    HealthResponse,
    ModelInfoResponse,
    PredictRequest,
    PredictResponse,
)
from app.config import settings

router = APIRouter()

# The model instance is injected at startup (see main.py).
_model = None


def set_model(model) -> None:  # noqa: ANN001
    """Called once during the FastAPI startup event."""
    global _model
    _model = model


# --------------------------------------------------------------------------- #
# POST /predict
# --------------------------------------------------------------------------- #
@router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest) -> PredictResponse:
    """Accept a wallet feature vector and return a predicted credit score."""
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    raw_features = request.model_dump()
    result = _model.predict(raw_features)

    return PredictResponse(**result)


# --------------------------------------------------------------------------- #
# GET /health
# --------------------------------------------------------------------------- #
@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return service health and model status."""
    return HealthResponse(
        status="ok" if _model is not None and _model.loaded else "degraded",
        model_loaded=_model is not None and _model.loaded,
        model_version=settings.MODEL_VERSION,
    )


# --------------------------------------------------------------------------- #
# GET /model-info
# --------------------------------------------------------------------------- #
@router.get("/model-info", response_model=ModelInfoResponse)
async def model_info() -> ModelInfoResponse:
    """Return metadata about the currently loaded model."""
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return ModelInfoResponse(
        model_version=_model.model_version,
        features=_model.feature_names,
        training_date=settings.MODEL_TRAINING_DATE,
    )
