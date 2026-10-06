from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

from app.core.constants import UserRole
from app.models.farm import Farm
from app.models.user import User


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.strip().lower().split())
    return normalized or None


def distance_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    """Haversine distance between two WGS84 points."""
    radius_km = 6371.0088
    lat1 = radians(latitude_a)
    lat2 = radians(latitude_b)
    dlat = radians(latitude_b - latitude_a)
    dlon = radians(longitude_b - longitude_a)

    value = (
        sin(dlat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    )
    return 2 * radius_km * asin(sqrt(value))


def officer_has_service_area(officer: User) -> bool:
    return bool(
        _clean(officer.service_state)
        or _clean(officer.service_district)
        or (
            officer.service_latitude is not None
            and officer.service_longitude is not None
            and officer.coverage_radius_km is not None
            and officer.coverage_radius_km > 0
        )
    )


def farm_is_accessible(user: User, farm: Farm) -> bool:
    """
    Admins are global. Extension officers are restricted to their assigned area.

    Coordinates are preferred for "nearby" matching. District/state matching is
    also accepted so farms without coordinates are still visible when they are
    explicitly registered in the officer's assigned administrative area.
    """
    if user.role == UserRole.ADMIN:
        return True

    if user.role != UserRole.EXTENSION_OFFICER:
        return False

    if not officer_has_service_area(user):
        # Secure default: an unassigned officer sees no farmer data.
        return False

    officer_state = _clean(user.service_state)
    officer_district = _clean(user.service_district)
    farm_state = _clean(farm.state)
    farm_district = _clean(farm.district)

    text_match = False
    if officer_district:
        text_match = (
            farm_district == officer_district
            and (not officer_state or farm_state == officer_state)
        )
    elif officer_state:
        text_match = farm_state == officer_state

    coordinate_match = False
    if (
        user.service_latitude is not None
        and user.service_longitude is not None
        and user.coverage_radius_km is not None
        and user.coverage_radius_km > 0
        and farm.latitude is not None
        and farm.longitude is not None
    ):
        coordinate_match = distance_km(
            user.service_latitude,
            user.service_longitude,
            farm.latitude,
            farm.longitude,
        ) <= user.coverage_radius_km

    return text_match or coordinate_match
