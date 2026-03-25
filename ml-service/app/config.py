"""Environment configuration for the ML service."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables with defaults."""

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # CORS
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")

    # Model
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models/credit_model.pkl")
    MODEL_VERSION: int = int(os.getenv("MODEL_VERSION", "1"))
    MODEL_TRAINING_DATE: str = os.getenv("MODEL_TRAINING_DATE", "2026-03-01")

    # Supabase (for optional direct DB access)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # Feature defaults
    MIN_SCORE: int = 300
    MAX_SCORE: int = 850


settings = Settings()
