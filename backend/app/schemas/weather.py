from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.risk import RiskResponse


class CurrentWeather(BaseModel):
    temperature_c: float

    humidity_percent: float = Field(
        ge=0,
        le=100,
    )

    precipitation_mm: float = Field(
        ge=0,
    )

    rainfall_mm: float = Field(
        ge=0,
    )

    wind_speed_kmh: float = Field(
        ge=0,
    )


class WeatherForecastDay(BaseModel):
    date: date

    temperature_max_c: float

    temperature_min_c: float

    precipitation_mm: float = Field(
        ge=0,
    )

    rainfall_mm: float = Field(
        ge=0,
    )

    wind_speed_max_kmh: float = Field(
        ge=0,
    )


class FieldWeatherRiskResponse(BaseModel):
    field_id: UUID

    field_name: str

    farm_id: UUID

    farm_name: str

    crop_name: str

    latitude: float

    longitude: float

    provider: str

    observed_at: datetime

    cached: bool

    current: CurrentWeather

    forecast: list[WeatherForecastDay]

    risk: RiskResponse