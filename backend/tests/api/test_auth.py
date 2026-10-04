def test_register_and_me(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "farmer@example.com", "full_name": "Test Farmer", "password": "StrongPass123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "farmer@example.com"
    token = body["access_token"]
    me = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "Test Farmer"
