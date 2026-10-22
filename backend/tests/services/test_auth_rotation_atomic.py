"""Refresh rotation security regression tests; local SQLite only, no migrations."""
import pytest
from app.core.security import decode_token


def _register_and_login(client, email):
    assert client.post("/api/v1/auth/register", json={
        "email": email, "full_name": "Local Farmer", "password": "StrongPass123"
    }).status_code == 201
    response = client.post("/api/v1/auth/mobile/login", json={
        "email": email, "password": "StrongPass123"
    })
    assert response.status_code == 200
    return response.json()["refresh_token"]


def test_old_jti_can_be_used_only_once(client):
    old = _register_and_login(client, "oneuse@example.com")
    first = client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": old})
    assert first.status_code == 200
    new = first.json()["refresh_token"]
    assert new != old
    second = client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": old})
    assert second.status_code == 401
    assert client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": new}).status_code == 200


def test_failed_replacement_insert_rolls_back_old_token(client, monkeypatch):
    old = _register_and_login(client, "rollback@example.com")
    from app.repositories.token_repository import TokenRepository
    original = TokenRepository.add_pending

    def reject_insert(self, token):
        raise RuntimeError("simulated local database failure")

    monkeypatch.setattr(TokenRepository, "add_pending", reject_insert)
    with pytest.raises(RuntimeError, match="simulated"):
        client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": old})
    monkeypatch.setattr(TokenRepository, "add_pending", original)
    # The original token must remain valid after transaction rollback.
    resumed = client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": old})
    assert resumed.status_code == 200


def test_invalid_jti_does_not_consume_other_users_token(client):
    a = _register_and_login(client, "farmer-a@example.com")
    b = _register_and_login(client, "farmer-b@example.com")
    # Forging claims is not possible in production; exercise DB authorization guard directly.
    # TestClient uses its own session factory, so obtain B's UUID from the signed token.
    a_claims = decode_token(a, expected_type="refresh")
    b_claims = decode_token(b, expected_type="refresh")
    from uuid import UUID
    # Mismatched owner with A's jti must never revoke A's row.
    from app.repositories.token_repository import TokenRepository
    from tests.conftest import TestingSessionLocal
    with TestingSessionLocal() as db:
        assert TokenRepository(db).revoke_if_active(
            user_id=UUID(str(b_claims["sub"])), jti=str(a_claims["jti"])
        ) is False
        db.rollback()
    assert client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": a}).status_code == 200
    assert client.post("/api/v1/auth/mobile/refresh", json={"refresh_token": b}).status_code == 200
