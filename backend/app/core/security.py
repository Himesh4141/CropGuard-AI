from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from jwt import InvalidTokenError

from app.core.config import settings

ALGORITHM = "HS256"
_password_hasher = PasswordHasher()


class TokenDecodeError(ValueError):
    pass


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def _encode_token(*, user_id: UUID, role: str, token_type: str, expires_delta: timedelta, jti: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, object] = {
        "sub": str(user_id),
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    if jti is not None:
        payload["jti"] = jti
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(*, user_id: UUID, role: str) -> str:
    return _encode_token(
        user_id=user_id,
        role=role,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_minutes),
    )


def create_refresh_token(*, user_id: UUID, role: str, jti: str) -> str:
    return _encode_token(
        user_id=user_id,
        role=role,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_days),
        jti=jti,
    )


def decode_token(token: str, *, expected_type: str) -> dict[str, object]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except InvalidTokenError as exc:
        raise TokenDecodeError("Invalid or expired token") from exc
    if payload.get("type") != expected_type:
        raise TokenDecodeError("Invalid token type")
    if not payload.get("sub"):
        raise TokenDecodeError("Missing token subject")
    return payload
