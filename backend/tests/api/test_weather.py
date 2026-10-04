from datetime import (
    date,
    datetime,
    timedelta,
    timezone,
)

from app.api.v1.endpoints.weather import (
    get_weather_provider,
)
from app.integrations.weather.provider import (
    ProviderCurrentWeather,
    ProviderForecastDay,
    WeatherProviderResult,
)
from app.main import app


class StubWeatherProvider:
    def __init__(
        self,
    ) -> None:
        self.calls = 0

    def fetch(
        self,
        *,
        latitude: float,
        longitude: float,
        forecast_days: int,
    ) -> WeatherProviderResult:
        self.calls += 1

        forecast = [
            ProviderForecastDay(
                date=(
                    date.today()
                    + timedelta(
                        days=offset,
                    )
                ),
                temperature_max_c=29.0,
                temperature_min_c=21.0,
                precipitation_mm=8.0,
                rainfall_mm=7.0,
                wind_speed_max_kmh=15.0,
            )
            for offset in range(
                forecast_days,
            )
        ]

        return WeatherProviderResult(
            provider="test_provider",
            observed_at=datetime.now(
                timezone.utc,
            ),
            current=(
                ProviderCurrentWeather(
                    temperature_c=25.0,
                    humidity_percent=90.0,
                    precipitation_mm=2.0,
                    rainfall_mm=7.0,
                    wind_speed_kmh=7.0,
                )
            ),
            forecast=forecast,
        )


def create_auth_headers(
    client,
) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email":
                "weather-owner@example.com",

            "full_name":
                "Weather Farmer",

            "password":
                "StrongPass123",
        },
    )

    assert response.status_code == 201

    return {
        "Authorization": (
            "Bearer "
            + response.json()[
                "access_token"
            ]
        ),
    }


def create_field(
    client,
    headers: dict[str, str],
    *,
    with_coordinates: bool = True,
) -> dict:
    farm_payload = {
        "name":
            "Weather Farm",

        "district":
            "Medchal",

        "state":
            "Telangana",

        "country":
            "India",
    }

    if with_coordinates:
        farm_payload.update(
            {
                "latitude":
                    17.5947,

                "longitude":
                    78.5747,
            }
        )

    farm_response = client.post(
        "/api/v1/farms",
        headers=headers,
        json=farm_payload,
    )

    assert (
        farm_response.status_code
        == 201
    )

    field_response = client.post(
        "/api/v1/fields",
        headers=headers,
        json={
            "farm_id":
                farm_response.json()[
                    "id"
                ],

            "name":
                "Tomato Field A",

            "crop_name":
                "Tomato",

            "variety":
                "Arka Rakshak",

            "area_acres":
                2.5,
        },
    )

    assert (
        field_response.status_code
        == 201
    )

    return field_response.json()


def test_weather_endpoint_returns_risk_and_uses_cache(
    client,
):
    headers = create_auth_headers(
        client,
    )

    field = create_field(
        client,
        headers,
    )

    stub = StubWeatherProvider()

    app.dependency_overrides[
        get_weather_provider
    ] = lambda: stub

    first = client.get(
        (
            "/api/v1/weather/fields/"
            + field["id"]
        ),
        headers=headers,
    )

    assert first.status_code == 200

    payload = first.json()

    assert (
        payload["provider"]
        == "test_provider"
    )

    assert (
        payload["current"][
            "humidity_percent"
        ]
        == 90.0
    )

    assert (
        payload["risk"][
            "level"
        ]
        in {
            "high",
            "critical",
        }
    )

    assert (
        len(
            payload[
                "forecast"
            ]
        )
        >= 3
    )

    assert (
        payload["cached"]
        is False
    )

    second = client.get(
        (
            "/api/v1/weather/fields/"
            + field["id"]
        ),
        headers=headers,
    )

    assert (
        second.status_code
        == 200
    )

    assert (
        second.json()[
            "cached"
        ]
        is True
    )

    assert stub.calls == 1


def test_weather_requires_farm_coordinates(
    client,
):
    headers = create_auth_headers(
        client,
    )

    field = create_field(
        client,
        headers,
        with_coordinates=False,
    )

    app.dependency_overrides[
        get_weather_provider
    ] = lambda: (
        StubWeatherProvider()
    )

    response = client.get(
        (
            "/api/v1/weather/fields/"
            + field["id"]
        ),
        headers=headers,
    )

    assert (
        response.status_code
        == 422
    )

    assert (
        "latitude and longitude"
        in response.json()[
            "detail"
        ]
    )