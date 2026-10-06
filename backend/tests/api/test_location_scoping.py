from app.core.constants import UserRole
from app.core.security import hash_password
from app.models.user import User
from tests.conftest import TestingSessionLocal


def register_farmer(client, email: str, farm_payload: dict) -> None:
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": email.split("@")[0], "password": "StrongPass123"},
    )
    assert registered.status_code == 201
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    farm = client.post("/api/v1/farms", headers=headers, json=farm_payload)
    assert farm.status_code == 201
    field = client.post(
        "/api/v1/fields",
        headers=headers,
        json={
            "farm_id": farm.json()["id"],
            "name": "Tomato Field",
            "crop_name": "Tomato",
            "area_acres": 1.0,
        },
    )
    assert field.status_code == 201


def create_role_user(email: str, role: UserRole, **area) -> None:
    with TestingSessionLocal() as db:
        db.add(
            User(
                email=email,
                full_name="Role User",
                password_hash=hash_password("StrongPass123"),
                role=role,
                is_active=True,
                **area,
            )
        )
        db.commit()


def login(client, email: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def seed_two_locations(client) -> None:
    register_farmer(
        client,
        "hyderabad-farmer@example.com",
        {
            "name": "Hyderabad Farm",
            "district": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "latitude": 17.3850,
            "longitude": 78.4867,
        },
    )
    register_farmer(
        client,
        "warangal-farmer@example.com",
        {
            "name": "Warangal Farm",
            "district": "Warangal",
            "state": "Telangana",
            "country": "India",
            "latitude": 17.9689,
            "longitude": 79.5941,
        },
    )


def test_hyderabad_officer_only_sees_hyderabad_scope(client):
    seed_two_locations(client)
    create_role_user(
        "officer@example.com",
        UserRole.EXTENSION_OFFICER,
        service_state="Telangana",
        service_district="Hyderabad",
        service_latitude=17.3850,
        service_longitude=78.4867,
        coverage_radius_km=50.0,
    )

    response = client.get("/api/v1/officer/summary", headers=login(client, "officer@example.com"))
    assert response.status_code == 200
    body = response.json()
    assert body["farmers"] == 1
    assert body["farms"] == 1
    assert body["fields"] == 1
    assert body["service_area"]["district"] == "Hyderabad"


def test_unassigned_officer_has_secure_empty_scope(client):
    seed_two_locations(client)
    create_role_user("unassigned@example.com", UserRole.EXTENSION_OFFICER)
    response = client.get("/api/v1/officer/summary", headers=login(client, "unassigned@example.com"))
    assert response.status_code == 200
    assert response.json()["farms"] == 0


def test_admin_has_global_location_access(client):
    seed_two_locations(client)
    create_role_user("admin-location@example.com", UserRole.ADMIN)
    headers = login(client, "admin-location@example.com")

    officer_summary = client.get("/api/v1/officer/summary", headers=headers)
    assert officer_summary.status_code == 200
    assert officer_summary.json()["farms"] == 2
    assert officer_summary.json()["service_area"]["scope_mode"] == "global"

    locations = client.get("/api/v1/admin/locations", headers=headers)
    assert locations.status_code == 200
    districts = {item["district"] for item in locations.json()}
    assert {"Hyderabad", "Warangal"}.issubset(districts)
