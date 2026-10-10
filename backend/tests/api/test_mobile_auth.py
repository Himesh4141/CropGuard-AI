def test_native_login_persists_with_refresh_rotation(client):
    email = "native@example.com"
    client.post("/api/v1/auth/register", json={
        "email": email, "full_name": "Native Farmer", "password": "StrongPass123",
    })
    login = client.post("/api/v1/auth/mobile/login", json={
        "email": email, "password": "StrongPass123",
    })
    assert login.status_code == 200
    token = login.json()["refresh_token"]
    assert not login.cookies.get("cropguard_refresh")
    assert login.json()["user"]["role"] == "farmer"
    rotated = client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": token})
    assert rotated.status_code == 200
    new_token = rotated.json()["refresh_token"]
    assert new_token != token
    assert client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": token}).status_code == 401
    assert client.get("/api/v1/users/me", headers={
        "Authorization": f"Bearer {rotated.json()['access_token']}"
    }).status_code == 200
    assert client.post("/api/v1/auth/mobile/logout", json={"refresh_token": new_token}).status_code == 200
    assert client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": new_token}).status_code == 401


def test_native_registration_and_invalid_refresh(client):
    response = client.post("/api/v1/auth/mobile/register", json={
        "email": "newnative@example.com", "full_name": "New Native",
        "password": "StrongPass123",
    })
    assert response.status_code == 201
    assert response.json()["refresh_token"]
    assert client.post("/api/v1/auth/mobile/refresh", json={
        "refresh_token": "bogus" * 20,
    }).status_code == 401
    assert client.post("/api/v1/auth/mobile/login", json={
        "email": "newnative@example.com", "password": "badpassword",
    }).status_code == 401


def test_browser_auth_does_not_expose_refresh_token(client):
    result = client.post("/api/v1/auth/register", json={
        "email": "browser@example.com", "full_name": "Browser User",
        "password": "StrongPass123",
    })
    assert result.status_code == 201
    assert "refresh_token" not in result.json()
