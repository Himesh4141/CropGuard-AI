from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.integrations.weather.provider import (
    WeatherProvider,
    WeatherProviderResult,
)
from app.models.weather_record import WeatherRecord
from app.repositories.farm_repository import FarmRepository
from app.repositories.field_repository import FieldRepository
from app.repositories.weather_repository import WeatherRepository
from app.schemas.risk import RiskResponse
from app.schemas.weather import (
    CurrentWeather,
    FieldWeatherRiskResponse,
    WeatherForecastDay,
)
from app.services.risk_service import (
    calculate_field_risk,
)


class WeatherService:
    def __init__(
        self,
        db: Session,
        provider: WeatherProvider,
    ) -> None:
        self.farms = (
            FarmRepository(
                db,
            )
        )

        self.fields = (
            FieldRepository(
                db,
            )
        )

        self.weather = (
            WeatherRepository(
                db,
            )
        )

        self.provider = provider

    def get_field_weather(
        self,
        owner_id: UUID,
        field_id: UUID,
    ) -> FieldWeatherRiskResponse:
        field = self.fields.get_owned(
            field_id,
            owner_id,
        )

        if field is None:
            raise NotFoundError(
                "Field not found",
            )

        farm = self.farms.get_owned(
            field.farm_id,
            owner_id,
        )

        if farm is None:
            raise NotFoundError(
                "Farm not found",
            )

        if (
            farm.latitude
            is None
            or farm.longitude
            is None
        ):
            raise ValueError(
                "Farm latitude and longitude are required "
                "before weather risk can be calculated."
            )

        cached = (
            self.weather.latest_for_field(
                field.id,
            )
        )

        if (
            cached is not None
            and self._is_fresh(
                cached.observed_at,
            )
        ):
            return (
                self._from_record(
                    record=cached,
                    field_name=field.name,
                    farm_id=farm.id,
                    farm_name=farm.name,
                    crop_name=field.crop_name,
                    latitude=farm.latitude,
                    longitude=farm.longitude,
                    cached=True,
                )
            )

        provider_result = (
            self.provider.fetch(
                latitude=farm.latitude,
                longitude=farm.longitude,
                forecast_days=(
                    settings
                    .weather_forecast_days
                ),
            )
        )

        forecast = [
            WeatherForecastDay(
                date=day.date,
                temperature_max_c=(
                    day.temperature_max_c
                ),
                temperature_min_c=(
                    day.temperature_min_c
                ),
                precipitation_mm=(
                    day.precipitation_mm
                ),
                rainfall_mm=(
                    day.rainfall_mm
                ),
                wind_speed_max_kmh=(
                    day.wind_speed_max_kmh
                ),
            )
            for day in (
                provider_result
                .forecast
            )
        ]

        current = CurrentWeather(
            temperature_c=(
                provider_result
                .current
                .temperature_c
            ),
            humidity_percent=(
                provider_result
                .current
                .humidity_percent
            ),
            precipitation_mm=(
                provider_result
                .current
                .precipitation_mm
            ),
            rainfall_mm=(
                provider_result
                .current
                .rainfall_mm
            ),
            wind_speed_kmh=(
                provider_result
                .current
                .wind_speed_kmh
            ),
        )

        risk = (
            self._calculate_risk(
                crop_name=(
                    field.crop_name
                ),
                result=(
                    provider_result
                ),
            )
        )

        record = WeatherRecord(
            field_id=field.id,
            provider=(
                provider_result
                .provider
            ),
            observed_at=(
                provider_result
                .observed_at
            ),
            temperature_c=(
                current
                .temperature_c
            ),
            humidity_percent=(
                current
                .humidity_percent
            ),
            precipitation_mm=(
                current
                .precipitation_mm
            ),
            rainfall_mm=(
                current
                .rainfall_mm
            ),
            wind_speed_kmh=(
                current
                .wind_speed_kmh
            ),
            forecast_json=[
                item.model_dump(
                    mode="json",
                )
                for item in forecast
            ],
            risk_score=(
                risk.score
            ),
            risk_level=(
                risk.level
            ),
            risk_factors=(
                risk.factors
            ),
        )

        self.weather.add(
            record,
        )

        return (
            FieldWeatherRiskResponse(
                field_id=field.id,
                field_name=field.name,
                farm_id=farm.id,
                farm_name=farm.name,
                crop_name=field.crop_name,
                latitude=farm.latitude,
                longitude=farm.longitude,
                provider=(
                    provider_result
                    .provider
                ),
                observed_at=(
                    provider_result
                    .observed_at
                ),
                cached=False,
                current=current,
                forecast=forecast,
                risk=risk,
            )
        )

    @staticmethod
    def _calculate_risk(
        *,
        crop_name: str,
        result: WeatherProviderResult,
    ) -> RiskResponse:
        forecast_rainfall = sum(
            day.rainfall_mm
            for day in (
                result.forecast[
                    :3
                ]
            )
        )

        return calculate_field_risk(
            crop_name=crop_name,
            temperature_c=(
                result
                .current
                .temperature_c
            ),
            humidity_percent=(
                result
                .current
                .humidity_percent
            ),
            precipitation_mm=(
                result
                .current
                .precipitation_mm
            ),
            rainfall_mm=(
                result
                .current
                .rainfall_mm
            ),
            wind_speed_kmh=(
                result
                .current
                .wind_speed_kmh
            ),
            forecast_rainfall_mm=(
                forecast_rainfall
            ),
        )

    @staticmethod
    def _is_fresh(
        observed_at: datetime,
    ) -> bool:
        if (
            observed_at.tzinfo
            is None
        ):
            observed_at = (
                observed_at.replace(
                    tzinfo=timezone.utc,
                )
            )

        age = (
            datetime.now(
                timezone.utc,
            )
            - observed_at
        )

        return age <= timedelta(
            minutes=(
                settings
                .weather_cache_minutes
            ),
        )

    @staticmethod
    def _from_record(
        *,
        record: WeatherRecord,
        field_name: str,
        farm_id: UUID,
        farm_name: str,
        crop_name: str,
        latitude: float,
        longitude: float,
        cached: bool,
    ) -> FieldWeatherRiskResponse:
        return FieldWeatherRiskResponse(
            field_id=(
                record.field_id
            ),
            field_name=field_name,
            farm_id=farm_id,
            farm_name=farm_name,
            crop_name=crop_name,
            latitude=latitude,
            longitude=longitude,
            provider=(
                record.provider
            ),
            observed_at=(
                record.observed_at
            ),
            cached=cached,
            current=CurrentWeather(
                temperature_c=(
                    record
                    .temperature_c
                ),
                humidity_percent=(
                    record
                    .humidity_percent
                ),
                precipitation_mm=(
                    record
                    .precipitation_mm
                ),
                rainfall_mm=(
                    record
                    .rainfall_mm
                ),
                wind_speed_kmh=(
                    record
                    .wind_speed_kmh
                ),
            ),
            forecast=[
                WeatherForecastDay.model_validate(
                    item,
                )
                for item in (
                    record
                    .forecast_json
                )
            ],
            risk=RiskResponse(
                score=(
                    record
                    .risk_score
                ),
                level=(
                    record
                    .risk_level
                ),
                factors=list(
                    record
                    .risk_factors
                ),
            ),
        )