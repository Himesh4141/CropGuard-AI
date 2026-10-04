from app.schemas.risk import (
    RiskRequest,
    RiskResponse,
)


def _risk_level(
    score: int,
) -> str:
    if score < 30:
        return "low"

    if score < 55:
        return "moderate"

    if score < 80:
        return "high"

    return "critical"


def calculate_risk(
    payload: RiskRequest,
) -> RiskResponse:
    score = 0

    factors: list[str] = []

    if (
        18
        <= payload.temperature_c
        <= 30
    ):
        score += 20

        factors.append(
            "Temperature is within a range favourable "
            "to several crop pathogens."
        )

    if (
        payload.humidity_percent
        >= 80
    ):
        score += 30

        factors.append(
            "High relative humidity increases fungal "
            "and bacterial disease pressure."
        )

    elif (
        payload.humidity_percent
        >= 70
    ):
        score += 15

    if (
        payload.rainfall_mm
        >= 20
    ):
        score += 25

        factors.append(
            "Heavy rainfall can extend leaf wetness "
            "and increase moisture-driven disease risk."
        )

    elif (
        payload.rainfall_mm
        >= 5
    ):
        score += 10

    if (
        payload.leaf_wetness_hours
        >= 8
    ):
        score += 25

        factors.append(
            "Extended leaf wetness favours infection "
            "for many foliar diseases."
        )

    elif (
        payload.leaf_wetness_hours
        >= 4
    ):
        score += 10

    score = min(
        score,
        100,
    )

    if not factors:
        factors.append(
            "No major weather-based disease triggers "
            "were detected from the supplied values."
        )

    return RiskResponse(
        score=score,
        level=_risk_level(
            score,
        ),
        factors=factors,
    )


def calculate_field_risk(
    *,
    crop_name: str,
    temperature_c: float,
    humidity_percent: float,
    precipitation_mm: float,
    rainfall_mm: float,
    wind_speed_kmh: float,
    forecast_rainfall_mm: float,
) -> RiskResponse:
    score = 0

    factors: list[str] = []

    if (
        18
        <= temperature_c
        <= 30
    ):
        score += 20

        factors.append(
            f"Temperature of {temperature_c:.1f}°C "
            "is favourable for several foliar pathogens."
        )

    elif (
        14
        <= temperature_c
        <= 34
    ):
        score += 8

    if (
        humidity_percent
        >= 85
    ):
        score += 25

        factors.append(
            f"Relative humidity is high at "
            f"{humidity_percent:.0f}%, which slows "
            "leaf drying and raises disease pressure."
        )

    elif (
        humidity_percent
        >= 75
    ):
        score += 15

        factors.append(
            f"Relative humidity of "
            f"{humidity_percent:.0f}% creates "
            "moderately favourable infection conditions."
        )

    elif (
        humidity_percent
        >= 65
    ):
        score += 5

    if (
        rainfall_mm
        >= 10
    ):
        score += 20

        factors.append(
            f"Today's rainfall is {rainfall_mm:.1f} mm; "
            "wet foliage can accelerate infection."
        )

    elif (
        rainfall_mm
        >= 2
    ):
        score += 10

    if (
        precipitation_mm
        >= 1
    ):
        score += 5

    if (
        forecast_rainfall_mm
        >= 20
    ):
        score += 15

        factors.append(
            f"The next three days contain about "
            f"{forecast_rainfall_mm:.1f} mm of forecast "
            "rain, so disease pressure may persist."
        )

    elif (
        forecast_rainfall_mm
        >= 5
    ):
        score += 8

        factors.append(
            "Rain is forecast during the next three days, "
            "so monitor leaves for new symptoms."
        )

    if (
        wind_speed_kmh
        <= 8
        and humidity_percent
        >= 75
    ):
        score += 8

        factors.append(
            "Low wind combined with high humidity can "
            "slow canopy drying."
        )

    elif (
        wind_speed_kmh
        >= 25
        and rainfall_mm
        > 0
    ):
        score += 5

        factors.append(
            "Wind-driven rain can help spread some "
            "leaf pathogens between plants."
        )

    normalized_crop = (
        crop_name
        .strip()
        .lower()
    )

    if (
        normalized_crop
        in {
            "tomato",
            "potato",
        }
        and humidity_percent
        >= 75
        and 18
        <= temperature_c
        <= 30
    ):
        score += 10

        factors.append(
            f"{crop_name.title()} is especially sensitive "
            "to foliar disease pressure under warm, "
            "humid conditions."
        )

    elif (
        normalized_crop
        in {
            "rice",
            "paddy",
        }
        and humidity_percent
        >= 80
    ):
        score += 8

        factors.append(
            "High humidity increases the weather-related "
            "disease pressure for rice."
        )

    score = min(
        score,
        100,
    )

    if not factors:
        factors.append(
            "Current weather does not show a strong "
            "disease-pressure trigger."
        )

    return RiskResponse(
        score=score,
        level=_risk_level(
            score,
        ),
        factors=factors,
    )