"""Offline cryptographic Google ID-token checks; does not connect to a database."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from app.services import google_identity

@pytest.fixture
def signer(monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    monkeypatch.setattr(google_identity, "_JWKS", SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=key.public_key())))
    monkeypatch.setattr(google_identity.settings, "google_sign_in_enabled", True)
    now = datetime.now(timezone.utc)
    def sign(**overrides):
        claims = {
            "iss": "https://accounts.google.com", "aud": google_identity.settings.google_web_client_id,
            "sub": "google-user-123", "email": "farmer@example.com", "email_verified": True,
            "iat": now, "exp": now + timedelta(minutes=5),
        }
        claims.update(overrides)
        return jwt.encode(claims, key, algorithm="RS256")
    return sign

def test_verified_token_accepted(signer):
    assert google_identity.verify_google_id_token(signer())["email"] == "farmer@example.com"

@pytest.mark.parametrize("overrides", [
    {"aud": "untrusted-client.apps.googleusercontent.com"},
    {"iss": "https://example.invalid"},
    {"email_verified": False},
    {"email_verified": "true"},
    {"exp": datetime(2001,1,1,tzinfo=timezone.utc)},
    {"sub": ""},
])
def test_unverified_claims_rejected(signer, overrides):
    with pytest.raises(google_identity.GoogleIdentityError):
        google_identity.verify_google_id_token(signer(**overrides))
