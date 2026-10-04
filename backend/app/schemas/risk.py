from pydantic import BaseModel, Field


class RiskRequest(BaseModel):
    temperature_c: float = Field(
        ge=-20,
        le=60,
    )

    humidity_percent: float = Field(
        ge=0,
        le=100,
    )

    rainfall_mm: float = Field(
        ge=0,
        le=500,
    )

    leaf_wetness_hours: float = Field(
        ge=0,
        le=24,
    )


class RiskResponse(BaseModel):
    score: int = Field(
        ge=0,
        le=100,
    )

    level: str

    factors: list[str]