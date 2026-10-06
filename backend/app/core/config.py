from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "CropGuard API"

    environment: Literal[
        "development",
        "test",
        "production",
    ] = "development"

    api_v1_prefix: str = "/api/v1"

    secret_key: str = (
        "development-only-change-this-secret-key"
    )

    access_token_minutes: int = Field(
        default=15,
        ge=5,
        le=120,
    )

    refresh_token_days: int = Field(
        default=7,
        ge=1,
        le=90,
    )

    refresh_cookie_name: str = (
        "cropguard_refresh"
    )

    cookie_secure: bool = False

    database_url: str = (
        "mysql+pymysql://"
        "cropguard_user:"
        "cropguard123@"
        "127.0.0.1:"
        "3306/"
        "cropguard"
        "?charset=utf8mb4"
    )

    cors_origins: list[str] = [
        "http://localhost:4141",
    ]

    upload_dir: Path = Path(
        "uploads"
    )

    max_upload_mb: int = Field(
        default=8,
        ge=1,
        le=25,
    )

    ml_model_path: Path = Path(
        "ml/artifacts/field_robust_v2/cropguard_field_robust_v2.onnx"
    )

    ml_metadata_path: Path = Path(
        "ml/artifacts/field_robust_v2/cropguard_field_robust_v2_metadata.json"
    )

    ml_min_confidence: float = Field(
        default=0.65,
        ge=0.0,
        le=1.0,
    )

    weather_provider: Literal[
        "open_meteo",
        "development",
    ] = "open_meteo"

    weather_timeout_seconds: float = Field(
        default=8.0,
        ge=1.0,
        le=30.0,
    )

    weather_forecast_days: int = Field(
        default=5,
        ge=3,
        le=7,
    )

    weather_cache_minutes: int = Field(
        default=15,
        ge=1,
        le=120,
    )

    @model_validator(
        mode="after",
    )
    def validate_production_settings(
        self,
    ) -> "Settings":
        if (
            self.environment
            == "production"
        ):
            if (
                self.secret_key
                == "development-only-change-this-secret-key"
            ):
                raise ValueError(
                    "SECRET_KEY must be changed in production"
                )

            if not self.cookie_secure:
                raise ValueError(
                    "COOKIE_SECURE must be true in production"
                )

            if (
                "cropguard123"
                in self.database_url
            ):
                raise ValueError(
                    "Development database credentials "
                    "must not be used in production"
                )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()