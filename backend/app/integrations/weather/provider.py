from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Protocol

import httpx


class WeatherProviderError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProviderCurrentWeather:
    temperature_c: float
    humidity_percent: float
    precipitation_mm: float
    rainfall_mm: float
    wind_speed_kmh: float


@dataclass(frozen=True)
class ProviderForecastDay:
    date: date
    temperature_max_c: float
    temperature_min_c: float
    precipitation_mm: float
    rainfall_mm: float
    wind_speed_max_kmh: float


@dataclass(frozen=True)
class WeatherProviderResult:
    provider: str
    observed_at: datetime
    current: ProviderCurrentWeather
    forecast: list[ProviderForecastDay]


class WeatherProvider(Protocol):
    def fetch(
        self,
        *,
        latitude: float,
        longitude: float,
        forecast_days: int,
    ) -> WeatherProviderResult:
        ...


class OpenMeteoWeatherProvider:
    base_url = (
        "https://api.open-meteo.com/"
        "v1/forecast"
    )

    def __init__(
        self,
        timeout_seconds: float,
    ) -> None:
        self.timeout_seconds = (
            timeout_seconds
        )

    def fetch(
        self,
        *,
        latitude: float,
        longitude: float,
        forecast_days: int,
    ) -> WeatherProviderResult:
        params = {
            "latitude":
                latitude,

            "longitude":
                longitude,

            "current": (
                "temperature_2m,"
                "relative_humidity_2m,"
                "precipitation,"
                "rain,"
                "wind_speed_10m"
            ),

            "daily": (
                "temperature_2m_max,"
                "temperature_2m_min,"
                "precipitation_sum,"
                "rain_sum,"
                "wind_speed_10m_max"
            ),

            "forecast_days":
                forecast_days,

            "timezone":
                "UTC",
        }

        try:
            with httpx.Client(
                timeout=self.timeout_seconds,
            ) as client:
                response = client.get(
                    self.base_url,
                    params=params,
                )

                response.raise_for_status()

                payload = (
                    response.json()
                )

            return self._parse(
                payload,
            )

        except (
            httpx.HTTPError,
            KeyError,
            TypeError,
            ValueError,
        ) as exc:
            raise WeatherProviderError(
                "Unable to fetch weather from Open-Meteo"
            ) from exc

    @staticmethod
    def _parse(
        payload: dict,
    ) -> WeatherProviderResult:
        current_payload = payload[
            "current"
        ]

        daily_payload = payload[
            "daily"
        ]

        observed_at = (
            datetime.fromisoformat(
                current_payload[
                    "time"
                ]
            )
        )

        if (
            observed_at.tzinfo
            is None
        ):
            observed_at = (
                observed_at.replace(
                    tzinfo=timezone.utc,
                )
            )

        current = (
            ProviderCurrentWeather(
                temperature_c=float(
                    current_payload[
                        "temperature_2m"
                    ]
                ),

                humidity_percent=float(
                    current_payload[
                        "relative_humidity_2m"
                    ]
                ),

                precipitation_mm=max(
                    0.0,
                    float(
                        current_payload.get(
                            "precipitation",
                            0.0,
                        )
                        or 0.0
                    ),
                ),

                rainfall_mm=max(
                    0.0,
                    float(
                        current_payload.get(
                            "rain",
                            0.0,
                        )
                        or 0.0
                    ),
                ),

                wind_speed_kmh=max(
                    0.0,
                    float(
                        current_payload.get(
                            "wind_speed_10m",
                            0.0,
                        )
                        or 0.0
                    ),
                ),
            )
        )

        dates = daily_payload[
            "time"
        ]

        forecast: list[
            ProviderForecastDay
        ] = []

        for index, raw_date in enumerate(
            dates,
        ):
            forecast.append(
                ProviderForecastDay(
                    date=date.fromisoformat(
                        raw_date,
                    ),

                    temperature_max_c=float(
                        daily_payload[
                            "temperature_2m_max"
                        ][index]
                    ),

                    temperature_min_c=float(
                        daily_payload[
                            "temperature_2m_min"
                        ][index]
                    ),

                    precipitation_mm=max(
                        0.0,
                        float(
                            daily_payload[
                                "precipitation_sum"
                            ][index]
                            or 0.0
                        ),
                    ),

                    rainfall_mm=max(
                        0.0,
                        float(
                            daily_payload[
                                "rain_sum"
                            ][index]
                            or 0.0
                        ),
                    ),

                    wind_speed_max_kmh=max(
                        0.0,
                        float(
                            daily_payload[
                                "wind_speed_10m_max"
                            ][index]
                            or 0.0
                        ),
                    ),
                )
            )

        return WeatherProviderResult(
            provider="open_meteo",

            observed_at=observed_at,

            current=current,

            forecast=forecast,
        )


class DevelopmentWeatherProvider:
    def fetch(
        self,
        *,
        latitude: float,
        longitude: float,
        forecast_days: int,
    ) -> WeatherProviderResult:
        now = datetime.now(
            timezone.utc,
        )

        coordinate_seed = abs(
            latitude * 7.0
            + longitude * 3.0
        )

        temperature = round(
            23.0
            + coordinate_seed
            % 8.0,
            1,
        )

        humidity = round(
            66.0
            + coordinate_seed
            % 24.0,
            1,
        )

        rainfall = round(
            coordinate_seed
            % 5.0,
            1,
        )

        precipitation = round(
            rainfall
            + coordinate_seed
            % 1.5,
            1,
        )

        wind = round(
            6.0
            + coordinate_seed
            % 11.0,
            1,
        )

        forecast: list[
            ProviderForecastDay
        ] = []

        for offset in range(
            forecast_days,
        ):
            daily_variation = (
                offset * 1.7
                + coordinate_seed
            )

            forecast.append(
                ProviderForecastDay(
                    date=(
                        now.date()
                        + timedelta(
                            days=offset,
                        )
                    ),

                    temperature_max_c=round(
                        temperature
                        + 2.5
                        + (
                            daily_variation
                            % 2.0
                        ),
                        1,
                    ),

                    temperature_min_c=round(
                        temperature
                        - 4.0
                        + (
                            daily_variation
                            % 1.5
                        ),
                        1,
                    ),

                    precipitation_mm=round(
                        (
                            daily_variation
                            % 8.0
                        ),
                        1,
                    ),

                    rainfall_mm=round(
                        (
                            daily_variation
                            % 6.5
                        ),
                        1,
                    ),

                    wind_speed_max_kmh=round(
                        wind
                        + (
                            daily_variation
                            % 8.0
                        ),
                        1,
                    ),
                )
            )

        return WeatherProviderResult(
            provider=(
                "development_fallback"
            ),

            observed_at=now,

            current=ProviderCurrentWeather(
                temperature_c=temperature,
                humidity_percent=humidity,
                precipitation_mm=precipitation,
                rainfall_mm=rainfall,
                wind_speed_kmh=wind,
            ),

            forecast=forecast,
        )


class ResilientWeatherProvider:
    def __init__(
        self,
        primary: WeatherProvider,
        fallback: WeatherProvider,
    ) -> None:
        self.primary = primary
        self.fallback = fallback

    def fetch(
        self,
        *,
        latitude: float,
        longitude: float,
        forecast_days: int,
    ) -> WeatherProviderResult:
        try:
            return self.primary.fetch(
                latitude=latitude,
                longitude=longitude,
                forecast_days=forecast_days,
            )

        except WeatherProviderError:
            return self.fallback.fetch(
                latitude=latitude,
                longitude=longitude,
                forecast_days=forecast_days,
            )