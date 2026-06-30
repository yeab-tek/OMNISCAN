"""
app/core/config.py
Centralised settings — all environment variables land here.
Access anywhere with: from app.core.config import settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/omniscan"

    # JWT
    SECRET_KEY: str = "CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # GROQ
    GROQ_API_KEY: str = "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"

    # S3
    S3_BUCKET_NAME: str = "omniscan-documents"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    APP_ENV: str = "development"


settings = Settings()
