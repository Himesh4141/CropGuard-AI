def register(
    client,
) -> tuple[
    dict[str, str],
    str,
]:
    password = "StrongPass123"

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email":
                "profile@example.com",
            "full_name":
                "Initial Name",
            "password":
                password,
        },
    )

    assert response.status_code == 201

    return (
        {
            "Authorization":
                "Bearer "
                + response.json()[
                    "access_token"
                ],
        },
        password,
    )


def test_update_profile(
    client,
):
    headers, _ = register(
        client,
    )

    response = client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={
            "full_name":
                "Updated Farmer",
        },
    )

    assert response.status_code == 200
    assert (
        response.json()[
            "full_name"
        ]
        == "Updated Farmer"
    )


def test_change_password(
    client,
):
    headers, old_password = register(
        client,
    )

    response = client.post(
        "/api/v1/users/me/password",
        headers=headers,
        json={
            "current_password":
                old_password,
            "new_password":
                "NewStrongPass456",
        },
    )

    assert response.status_code == 204

    old_login = client.post(
        "/api/v1/auth/login",
        json={
            "email":
                "profile@example.com",
            "password":
                old_password,
        },
    )

    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={
            "email":
                "profile@example.com",
            "password":
                "NewStrongPass456",
        },
    )

    assert new_login.status_code == 200
