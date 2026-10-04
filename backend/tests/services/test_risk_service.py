from app.schemas.risk import RiskRequest
from app.services.risk_service import (
    calculate_field_risk,
    calculate_risk,
)


def test_high_risk_conditions():
    result = calculate_risk(
        RiskRequest(
            temperature_c=24,
            humidity_percent=92,
            rainfall_mm=25,
            leaf_wetness_hours=10,
        )
    )

    assert result.score >= 80
    assert result.level == "critical"


def test_field_risk_combines_crop_and_weather():
    result = calculate_field_risk(
        crop_name="Tomato",
        temperature_c=25,
        humidity_percent=90,
        precipitation_mm=2.0,
        rainfall_mm=8.0,
        wind_speed_kmh=6.0,
        forecast_rainfall_mm=25.0,
    )

    assert result.score >= 80
    assert result.level == "critical"

    assert any(
        "Tomato"
        in factor
        for factor in (
            result.factors
        )
    )


def test_field_risk_is_low_in_dry_conditions():
    result = calculate_field_risk(
        crop_name="Tomato",
        temperature_c=36,
        humidity_percent=45,
        precipitation_mm=0.0,
        rainfall_mm=0.0,
        wind_speed_kmh=14.0,
        forecast_rainfall_mm=0.0,
    )

    assert result.score < 30
    assert result.level == "low"