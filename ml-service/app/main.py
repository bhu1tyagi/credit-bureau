"""CredBureau ML Service -- FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import router, set_model
from app.models.credit_model import CreditModel

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load the credit-score model."""
    logger.info("Loading credit-score model ...")
    model = CreditModel()
    model.load_model()
    set_model(model)
    logger.info(
        "Model ready (version=%s, fallback=%s).",
        model.model_version,
        model.is_fallback,
    )
    yield
    logger.info("Shutting down ML service.")


app = FastAPI(
    title="CredBureau ML Service",
    description="Credit-score prediction API for DeFi wallets.",
    version="0.1.0",
    lifespan=lifespan,
)

# -- CORS middleware --------------------------------------------------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Routes ------------------------------------------------------------------ #
app.include_router(router)
