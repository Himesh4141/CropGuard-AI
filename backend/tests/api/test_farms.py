def create_auth_headers(client, email: str = "farm-owner@example.com") -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Farm Owner",
            "password": "StrongPass123",
        },
    )

    assert response.status_code == 201

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}",
    }


def test_create_and_list_farms(client):
    headers = create_auth_headers(client)

    create_response = client.post(
        "/api/v1/farms",
        headers=headers,
        json={
            "name": "Green Valley Farm",
            "village": "Shamirpet",
            "district": "Medchal",
            "state": "Telangana",
            "country": "India",
            "latitude": 17.5947,
            "longitude": 78.5747,
        },
    )

    assert create_response.status_code == 201

    farm = create_response.json()

    assert farm["name"] == "Green Valley Farm"
    assert farm["state"] == "Telangana"
    assert farm["country"] == "India"
    assert farm["id"]
    assert farm["owner_id"]

    list_response = client.get(
        "/api/v1/farms",
        headers=headers,
    )

    assert list_response.status_code == 200

    farms = list_response.json()

    assert len(farms) == 1
    assert farms[0]["id"] == farm["id"]


def test_farms_are_scoped_to_authenticated_owner(client):
    first_user_headers = create_auth_headers(
        client,
        "first-farmer@example.com",
    )

    create_response = client.post(
        "/api/v1/farms",
        headers=first_user_headers,
        json={
            "name": "Private Farm",
            "country": "India",
        },
    )

    assert create_response.status_code == 201

    second_user_headers = create_auth_headers(
        client,
        "second-farmer@example.com",
    )

    second_user_farms = client.get(
        "/api/v1/farms",
        headers=second_user_headers,
    )

    assert second_user_farms.status_code == 200
    assert second_user_farms.json() == []


def test_update_and_delete_farm(client):
    headers = create_auth_headers(
        client,
        "farm-crud@example.com",
    )

    created = client.post(
        "/api/v1/farms",
        headers=headers,
        json={
            "name":
                "Original Farm",
            "country":
                "India",
        },
    )

    assert created.status_code == 201

    farm_id = created.json()[
        "id"
    ]

    updated = client.patch(
        f"/api/v1/farms/{farm_id}",
        headers=headers,
        json={
            "name":
                "Updated Farm",
            "district":
                "Medchal",
        },
    )

    assert updated.status_code == 200
    assert (
        updated.json()[
            "name"
        ]
        == "Updated Farm"
    )
    assert (
        updated.json()[
            "district"
        ]
        == "Medchal"
    )

    deleted = client.delete(
        f"/api/v1/farms/{farm_id}",
        headers=headers,
    )

    assert deleted.status_code == 204

    listing = client.get(
        "/api/v1/farms",
        headers=headers,
    )

    assert listing.status_code == 200
    assert listing.json() == []


def test_cannot_modify_another_users_farm(client):
    owner_headers = create_auth_headers(
        client,
        "farm-owner-edit@example.com",
    )

    created = client.post(
        "/api/v1/farms",
        headers=owner_headers,
        json={
            "name":
                "Private Farm",
            "country":
                "India",
        },
    )

    farm_id = created.json()[
        "id"
    ]

    other_headers = create_auth_headers(
        client,
        "farm-other-edit@example.com",
    )

    update_response = client.patch(
        f"/api/v1/farms/{farm_id}",
        headers=other_headers,
        json={
            "name":
                "Unauthorized",
        },
    )

    assert update_response.status_code == 404

    delete_response = client.delete(
        f"/api/v1/farms/{farm_id}",
        headers=other_headers,
    )

    assert delete_response.status_code == 404
