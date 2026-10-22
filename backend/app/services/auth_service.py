from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import UserRole
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories.token_repository import TokenRepository
from app.repositories.user_repository import UserRepository


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    expires_in: int


class AuthService:
    def __init__(self, db: Session) -> None:
        self.users = UserRepository(db)
        self.tokens = TokenRepository(db)

    def register(self, *, email: str, full_name: str, password: str) -> User:
        normalized_email = email.lower().strip()
        if self.users.get_by_email(normalized_email):
            raise ConflictError("An account with this email already exists")
        user = User(
            email=normalized_email,
            full_name=full_name.strip(),
            password_hash=hash_password(password),
            role=UserRole.FARMER,
            is_active=True,
        )
        return self.users.add(user)

    def authenticate(self, *, email: str, password: str) -> User:
        user = self.users.get_by_email(email.lower().strip())
        if user is None or not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        return user

    def issue_tokens(self, user: User) -> TokenPair:
        jti = token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)
        self.tokens.add(RefreshToken(user_id=user.id, jti=jti, expires_at=expires_at))
        access = create_access_token(user_id=user.id, role=user.role.value)
        refresh = create_refresh_token(user_id=user.id, role=user.role.value, jti=jti)
        return TokenPair(access_token=access, refresh_token=refresh, expires_in=settings.access_token_minutes * 60)

    def rotate_refresh(self, *, user_id: UUID, jti: str) -> tuple[User, TokenPair]:
        """Consume old jti and issue its replacement in ONE transaction.

        The conditional UPDATE permits only one successful consumer of an
        active jti. A failure to persist the replacement rolls back revocation.
        """
        user = self.users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("Account is unavailable")

        new_jti = token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)
        tokens = TokenPair(
            access_token=create_access_token(user_id=user.id, role=user.role.value),
            refresh_token=create_refresh_token(user_id=user.id, role=user.role.value, jti=new_jti),
            expires_in=settings.access_token_minutes * 60,
        )
        replacement = RefreshToken(user_id=user.id, jti=new_jti, expires_at=expires_at)

        try:
            if not self.tokens.revoke_if_active(user_id=user_id, jti=jti):
                raise AuthenticationError("Refresh token is invalid or has been revoked")
            self.tokens.add_pending(replacement)
            self.tokens.commit()
        except Exception:
            self.tokens.rollback()
            raise
        return user, tokens

    def revoke_refresh(self, jti: str) -> None:
        token_record = self.tokens.get_active(jti)
        if token_record is not None:
            self.tokens.revoke(token_record)
