from dataclasses import dataclass

from google.auth.transport.requests import Request
from google.oauth2 import id_token

PROJECT_ID = "cropguard-ai-512310"
EXPECTED_ISSUER = f"https://securetoken.google.com/{PROJECT_ID}"
ALLOWED_PROVIDERS = {"google.com", "password"}


@dataclass(frozen=True)
class FirebaseIdentity:
    uid: str
    email: str
    provider: str


def verify_firebase_identity(token: str) -> FirebaseIdentity:
    if not isinstance(token, str) or not 20 <= len(token) <= 8192:
        raise ValueError("Invalid Firebase token")

    try:
        claims = id_token.verify_firebase_token(
            token, Request(), audience=PROJECT_ID
        )
    except Exception as exc:
        raise ValueError("Firebase token verification failed") from exc

    if not isinstance(claims, dict):
        raise ValueError("Invalid Firebase claims")

    uid = claims.get("sub")
    email = claims.get("email")
    firebase = claims.get("firebase")
    provider = firebase.get("sign_in_provider") if isinstance(firebase, dict) else None

    if claims.get("iss") != EXPECTED_ISSUER:
        raise ValueError("Invalid issuer")
    if claims.get("aud") != PROJECT_ID:
        raise ValueError("Invalid audience")
    if not isinstance(uid, str) or not 1 <= len(uid) <= 128:
        raise ValueError("Invalid user ID")
    if not isinstance(email, str) or not email.strip() or "@" not in email:
        raise ValueError("Missing email")
    if claims.get("email_verified") is not True:
        raise ValueError("Email not verified")
    if provider not in ALLOWED_PROVIDERS:
        raise ValueError("Unsupported provider")

    return FirebaseIdentity(
        uid=uid,
        email=email.strip().casefold(),
        provider=provider,
    )