from io import BytesIO

from PIL import Image

from app.core.constants import UserRole
from app.core.security import hash_password
from app.models.user import User
from tests.conftest import TestingSessionLocal


def make_png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new(
        "RGB",
        (96, 96),
        color=(62, 145, 78),
    ).save(buffer, format="PNG")
    return buffer.getvalue()


def register_farmer(client, email: str) -> tuple[dict[str, str], dict]:
    registered = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Care Case Farmer",
            "password": "StrongPass123",
        },
    )
    assert registered.status_code == 201

    headers = {
        "Authorization": f"Bearer {registered.json()['access_token']}"
    }

    farm = client.post(
        "/api/v1/farms",
        headers=headers,
        json={
            "name": "Hyderabad Care Farm",
            "district": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "latitude": 17.3850,
            "longitude": 78.4867,
        },
    )
    assert farm.status_code == 201

    field = client.post(
        "/api/v1/fields",
        headers=headers,
        json={
            "farm_id": farm.json()["id"],
            "name": "Tomato Follow-up Field",
            "crop_name": "Tomato",
            "area_acres": 1.5,
        },
    )
    assert field.status_code == 201

    return headers, field.json()


def create_role_user(email: str, role: UserRole, **extra) -> None:
    with TestingSessionLocal() as db:
        db.add(
            User(
                email=email,
                full_name="Care Team User",
                password_hash=hash_password("StrongPass123"),
                role=role,
                is_active=True,
                **extra,
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


def create_diagnosis(client, headers: dict[str, str], field_id: str) -> dict:
    response = client.post(
        "/api/v1/diagnoses",
        headers=headers,
        data={"field_id": field_id},
        files={
            "file": (
                "leaf.png",
                make_png_bytes(),
                "image/png",
            )
        },
    )
    assert response.status_code == 201
    assert "healthy" not in (response.json()["predicted_label"] or "").lower()
    return response.json()


def test_disease_screening_creates_farmer_care_case(client, monkeypatch, tmp_path):
    from app.core.config import settings

    monkeypatch.setattr(settings, "upload_dir", tmp_path / "uploads")

    headers, field = register_farmer(client, "care-owner@example.com")
    diagnosis = create_diagnosis(client, headers, field["id"])

    response = client.get("/api/v1/care-cases", headers=headers)
    assert response.status_code == 200

    cases = response.json()
    assert len(cases) == 1

    care_case = cases[0]
    assert care_case["field_id"] == field["id"]
    assert care_case["latest_diagnosis_id"] == diagnosis["id"]
    assert care_case["status"] in {"open", "monitoring", "escalated"}
    assert care_case["priority"] in {"moderate", "high", "critical"}
    assert care_case["next_follow_up_at"] is not None
    assert care_case["action_plan"]["immediate_actions"]
    assert care_case["updates"][0]["event_type"] == "system"


def test_farmer_worsening_escalates_and_officer_scope_can_review(client, monkeypatch, tmp_path):
    from app.core.config import settings

    monkeypatch.setattr(settings, "upload_dir", tmp_path / "uploads")

    farmer_headers, field = register_farmer(client, "care-escalation@example.com")
    create_diagnosis(client, farmer_headers, field["id"])

    cases = client.get("/api/v1/care-cases", headers=farmer_headers).json()
    case_id = cases[0]["id"]

    follow_up = client.post(
        f"/api/v1/care-cases/{case_id}/follow-up",
        headers=farmer_headers,
        data={
            "trend": "worsening",
            "note": "More leaves are affected today.",
        },
    )
    assert follow_up.status_code == 200
    assert follow_up.json()["status"] == "escalated"
    assert follow_up.json()["trend"] == "worsening"
    assert follow_up.json()["priority"] in {"high", "critical"}

    create_role_user(
        "hyderabad-care-officer@example.com",
        UserRole.EXTENSION_OFFICER,
        service_state="Telangana",
        service_district="Hyderabad",
        service_latitude=17.3850,
        service_longitude=78.4867,
        coverage_radius_km=50.0,
    )
    officer_headers = login(client, "hyderabad-care-officer@example.com")

    officer_cases = client.get(
        "/api/v1/officer/care-cases",
        headers=officer_headers,
    )
    assert officer_cases.status_code == 200
    assert [item["id"] for item in officer_cases.json()] == [case_id]

    guidance = client.post(
        f"/api/v1/officer/care-cases/{case_id}/guidance",
        headers=officer_headers,
        json={
            "note": "Inspect neighboring plants and update again tomorrow.",
            "follow_up_hours": 24,
            "escalate": True,
        },
    )
    assert guidance.status_code == 200
    assert any(
        update["event_type"] == "officer_guidance"
        for update in guidance.json()["updates"]
    )


def test_admin_can_see_global_care_cases_and_farmer_can_resolve(client, monkeypatch, tmp_path):
    from app.core.config import settings

    monkeypatch.setattr(settings, "upload_dir", tmp_path / "uploads")

    farmer_headers, field = register_farmer(client, "care-resolve@example.com")
    create_diagnosis(client, farmer_headers, field["id"])
    case_id = client.get("/api/v1/care-cases", headers=farmer_headers).json()[0]["id"]

    create_role_user("care-admin@example.com", UserRole.ADMIN)
    admin_headers = login(client, "care-admin@example.com")

    admin_cases = client.get("/api/v1/admin/care-cases", headers=admin_headers)
    assert admin_cases.status_code == 200
    assert any(item["id"] == case_id for item in admin_cases.json())

    resolved = client.post(
        f"/api/v1/care-cases/{case_id}/resolve",
        headers=farmer_headers,
        json={"note": "Symptoms cleared after monitoring."},
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"
    assert resolved.json()["resolved_at"] is not None


def test_follow_up_photo_updates_existing_case_without_duplicate(client, monkeypatch, tmp_path):
    from app.core.config import settings

    monkeypatch.setattr(settings, "upload_dir", tmp_path / "uploads")

    headers, field = register_farmer(client, "care-photo@example.com")
    first = create_diagnosis(client, headers, field["id"])
    cases = client.get("/api/v1/care-cases", headers=headers).json()
    assert len(cases) == 1
    case_id = cases[0]["id"]

    follow_up = client.post(
        f"/api/v1/care-cases/{case_id}/follow-up",
        headers=headers,
        data={
            "trend": "improving",
            "note": "The affected area is smaller today.",
        },
        files={
            "file": (
                "follow-up.png",
                make_png_bytes(),
                "image/png",
            )
        },
    )

    assert follow_up.status_code == 200
    body = follow_up.json()
    assert body["id"] == case_id
    assert body["latest_diagnosis_id"] != first["id"]
    assert body["trend"] == "improving"

    refreshed = client.get("/api/v1/care-cases", headers=headers).json()
    assert len(refreshed) == 1
    assert len(refreshed[0]["updates"]) >= 2
