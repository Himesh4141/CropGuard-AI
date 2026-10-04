from app.core.config import settings
from app.integrations.weather.provider import (
    DevelopmentWeatherProvider,
    OpenMeteoWeatherProvider,
    ResilientWeatherProvider,
    WeatherProvider,
)


def build_weather_provider() -> WeatherProvider:
    fallback = (
        DevelopmentWeatherProvider()
    )

    if (
        settings.weather_provider
        == "development"
    ):
        return fallback

    primary = (
        OpenMeteoWeatherProvider(
            timeout_seconds=(
                settings
                .weather_timeout_seconds
            ),
        )
    )

    return ResilientWeatherProvider(
        primary=primary,
        fallback=fallback,
    )