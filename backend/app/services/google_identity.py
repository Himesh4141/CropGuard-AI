"""Verify Google OpenID Connect ID tokens. No schema changes, no client-side trust.

The Google public JWKS is fetched by PyJWT over TLS; the supplied token is
never sent to a custom verification service or written into logs.
"""
from secrets import token_urlsafe

import jwt
from jwt import InvalidTokenError, PyJWKClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import UserRole
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository

_JWKS = PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_jwk_set=True, lifespan=3600, timeout=5)


class GoogleIdentityError(Exception):
    pass


def verify_google_id_token(id_token: str) -> dict:
    allowed_audiences = tuple(filter(None, (settings.google_web_client_id, settings.google_android_client_id)))
    if not settings.google_sign_in_enabled or not allowed_audiences:
        raise GoogleIdentityError("Google sign-in is not configured")
    try:
        key = _JWKS.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            key.key,
            algorithms=["RS256"],
            audience=allowed_audiences,
            issuer=["accounts.google.com", "https://accounts.google.com"],
            options={"require": ["exp", "iat", "iss", "aud", "sub", "email", "email_verified"]},
            leeway=30,
        )
    except (InvalidTokenError, ValueError, RuntimeError, jwt.PyJWKClientError) as exc:
        raise GoogleIdentityError("Google identity verification failed") from exc
    except Exception as exc:  # DNS/TLS/Google JWKS availability: fail closed.
        raise GoogleIdentityError("Google verification is temporarily unavailable") from exc
    if claims.get("email_verified") is not True or not isinstance(claims.get("email"), str):
        raise GoogleIdentityError("A verified Google email is required")
    email = claims["email"].lower().strip()
    if not email or len(email) > 320 or "@" not in email or not claims.get("sub"):
        raise GoogleIdentityError("Google identity is incomplete")
    return claims


def authenticate_google(db: Session, id_token: str) -> User:
    claims = verify_google_id_token(id_token)
    email = claims["email"].lower().strip()
    users = UserRepository(db)
    user = users.get_by_email(email)
    if user is None:
        # No schema migration. Random unknown Argon2 hash makes password login
        # computationally valid but practically impossible for OAuth-only users.
        name = str(claims.get("name") or email.split("@")[0]).strip()[:120] or "Farmer"
        candidate = User(email=email, full_name=name, password_hash=hash_password(token_urlsafe(48)),
                         role=UserRole.FARMER, is_active=True)
        try:
            user = users.add(candidate)
        except IntegrityError:
            db.rollback()
            # Concurrent first sign-in: resolve the unique-email race and retain
            # any existing account role, never write an Officer/Admin assignment.
            user = users.get_by_email(email)
            if user is None:
                raise GoogleIdentityError("Account creation could not be completed")
    if not user.is_active:
        raise GoogleIdentityError("Account is disabled")
    return user
