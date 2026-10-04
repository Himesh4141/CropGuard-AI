from io import BytesIO

from PIL import Image

from app.core.config import settings


def create_auth_headers(
    client,
    email: str,
) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Diagnosis Farmer",
            "password": "StrongPass123",
        },
    )

    assert response.status_code == 201

    return {
        "Authorization":
            f"Bearer {response.json()['access_token']}",
    }


def create_field(
    client,
    headers: dict[str, str],
) -> dict:
    farm_response = client.post(
        "/api/v1/farms",
        headers=headers,
        json={
            "name": "Diagnosis Test Farm",
            "country": "India",
        },
    )

    assert farm_response.status_code == 201

    field_response = client.post(
        "/api/v1/fields",
        headers=headers,
        json={
            "farm_id":
                farm_response.json()["id"],
            "name": "Tomato Field A",
            "crop_name": "Tomato",
            "variety": "Arka Rakshak",
            "area_acres": 2.5,
        },
    )

    assert field_response.status_code == 201

    return field_response.json()


def make_png_bytes() -> bytes:
    buffer = BytesIO()

    image = Image.new(
        "RGB",
        (96, 96),
        color=(62, 145, 78),
    )

    image.save(
        buffer,
        format="PNG",
    )

    return buffer.getvalue()


def test_upload_and_list_diagnosis(
    client,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setattr(
        settings,
        "upload_dir",
        tmp_path / "uploads",
    )

    headers = create_auth_headers(
        client,
        "diagnosis-owner@example.com",
    )

    field = create_field(
        client,
        headers,
    )

    response = client.post(
        "/api/v1/diagnoses",
        headers=headers,
        data={
            "field_id":
                field["id"],
        },
        files={
            "file": (
                "leaf.png",
                make_png_bytes(),
                "image/png",
            ),
        },
    )

    assert response.status_code == 201

    diagnosis = response.json()

    assert diagnosis["field_id"] == field["id"]
    assert diagnosis["status"] == "analyzed"
    assert diagnosis["predicted_label"]
    assert diagnosis["confidence"] is not None
    assert 0 <= diagnosis["confidence"] <= 1
    assert diagnosis["severity"]
    assert diagnosis["advisory"]
    assert diagnosis["inference_mode"] == "development_stub"
    assert diagnosis["model_display_name"] == "CropGuard Development Simulator"

    stored_files = list(
        (tmp_path / "uploads" / "diagnoses")
        .glob("*")
    )

    assert len(stored_files) == 1
    assert stored_files[0].suffix == ".png"

    list_response = client.get(
        "/api/v1/diagnoses",
        headers=headers,
    )

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


def test_rejects_non_image_upload(
    client,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setattr(
        settings,
        "upload_dir",
        tmp_path / "uploads",
    )

    headers = create_auth_headers(
        client,
        "invalid-image@example.com",
    )

    field = create_field(
        client,
        headers,
    )

    response = client.post(
        "/api/v1/diagnoses",
        headers=headers,
        data={
            "field_id":
                field["id"],
        },
        files={
            "file": (
                "not-image.txt",
                b"not an image",
                "text/plain",
            ),
        },
    )

    assert response.status_code == 400


def test_cannot_upload_to_another_users_field(
    client,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setattr(
        settings,
        "upload_dir",
        tmp_path / "uploads",
    )

    owner_headers = create_auth_headers(
        client,
        "field-owner-diagnosis@example.com",
    )

    field = create_field(
        client,
        owner_headers,
    )

    other_headers = create_auth_headers(
        client,
        "other-diagnosis-user@example.com",
    )

    response = client.post(
        "/api/v1/diagnoses",
        headers=other_headers,
        data={
            "field_id":
                field["id"],
        },
        files={
            "file": (
                "leaf.png",
                make_png_bytes(),
                "image/png",
            ),
        },
    )

    assert response.status_code == 404