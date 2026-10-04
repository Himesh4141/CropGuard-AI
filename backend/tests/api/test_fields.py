def create_auth_headers(client, email: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Crop Farmer",
            "password": "StrongPass123",
        },
    )

    assert response.status_code == 201

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}",
    }


def create_farm(client, headers: dict[str, str]) -> dict:
    response = client.post(
        "/api/v1/farms",
        headers=headers,
        json={
            "name": "CropGuard Test Farm",
            "district": "Medchal",
            "state": "Telangana",
            "country": "India",
        },
    )

    assert response.status_code == 201

    return response.json()


def test_create_and_list_fields(client):
    headers = create_auth_headers(
        client,
        "field-owner@example.com",
    )

    farm = create_farm(
        client,
        headers,
    )

    create_response = client.post(
        "/api/v1/fields",
        headers=headers,
        json={
            "farm_id": farm["id"],
            "name": "Tomato Field A",
            "crop_name": "Tomato",
            "variety": "Arka Rakshak",
            "area_acres": 2.5,
            "sowing_date": "2026-08-15",
        },
    )

    assert create_response.status_code == 201

    field = create_response.json()

    assert field["farm_id"] == farm["id"]
    assert field["crop_name"] == "Tomato"
    assert field["area_acres"] == 2.5

    list_response = client.get(
        "/api/v1/fields",
        headers=headers,
    )

    assert list_response.status_code == 200

    fields = list_response.json()

    assert len(fields) == 1
    assert fields[0]["id"] == field["id"]

    filtered_response = client.get(
        "/api/v1/fields",
        headers=headers,
        params={
            "farm_id": farm["id"],
        },
    )

    assert filtered_response.status_code == 200
    assert len(filtered_response.json()) == 1


def test_user_cannot_create_field_inside_another_users_farm(client):
    first_headers = create_auth_headers(
        client,
        "owner@example.com",
    )

    farm = create_farm(
        client,
        first_headers,
    )

    second_headers = create_auth_headers(
        client,
        "intruder@example.com",
    )

    response = client.post(
        "/api/v1/fields",
        headers=second_headers,
        json={
            "farm_id": farm["id"],
            "name": "Unauthorized Field",
            "crop_name": "Cotton",
            "area_acres": 1.0,
        },
    )

    assert response.status_code == 404


def test_update_and_delete_field(client):
    headers = create_auth_headers(
        client,
        "field-crud@example.com",
    )

    farm = create_farm(
        client,
        headers,
    )

    created = client.post(
        "/api/v1/fields",
        headers=headers,
        json={
            "farm_id":
                farm["id"],
            "name":
                "Original Field",
            "crop_name":
                "Tomato",
            "area_acres":
                1.5,
        },
    )

    assert created.status_code == 201

    field_id = created.json()[
        "id"
    ]

    updated = client.patch(
        f"/api/v1/fields/{field_id}",
        headers=headers,
        json={
            "name":
                "Updated Field",
            "variety":
                "Arka Rakshak",
            "area_acres":
                2.0,
        },
    )

    assert updated.status_code == 200
    assert (
        updated.json()[
            "name"
        ]
        == "Updated Field"
    )
    assert (
        updated.json()[
            "area_acres"
        ]
        == 2.0
    )

    deleted = client.delete(
        f"/api/v1/fields/{field_id}",
        headers=headers,
    )

    assert deleted.status_code == 204

    listing = client.get(
        "/api/v1/fields",
        headers=headers,
    )

    assert listing.status_code == 200
    assert listing.json() == []


def test_cannot_modify_another_users_field(client):
    owner_headers = create_auth_headers(
        client,
        "field-owner-edit@example.com",
    )

    farm = create_farm(
        client,
        owner_headers,
    )

    created = client.post(
        "/api/v1/fields",
        headers=owner_headers,
        json={
            "farm_id":
                farm["id"],
            "name":
                "Private Field",
            "crop_name":
                "Tomato",
            "area_acres":
                1.0,
        },
    )

    field_id = created.json()[
        "id"
    ]

    other_headers = create_auth_headers(
        client,
        "field-other-edit@example.com",
    )

    update_response = client.patch(
        f"/api/v1/fields/{field_id}",
        headers=other_headers,
        json={
            "name":
                "Unauthorized",
        },
    )

    assert update_response.status_code == 404

    delete_response = client.delete(
        f"/api/v1/fields/{field_id}",
        headers=other_headers,
    )

    assert delete_response.status_code == 404
