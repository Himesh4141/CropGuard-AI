from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken


class TokenRepository:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    def add(
        self,
        token: RefreshToken,
    ) -> RefreshToken:
        self.db.add(
            token,
        )

        self.db.commit()

        self.db.refresh(
            token,
        )

        return token

    def get_active(
        self,
        jti: str,
    ) -> RefreshToken | None:
        now = datetime.now(
            timezone.utc,
        )

        return self.db.scalar(
            select(
                RefreshToken,
            ).where(
                RefreshToken.jti == jti,
                RefreshToken.revoked_at.is_(
                    None,
                ),
                RefreshToken.expires_at > now,
            )
        )

    def revoke(
        self,
        token: RefreshToken,
    ) -> None:
        token.revoked_at = datetime.now(
            timezone.utc,
        )

        self.db.add(
            token,
        )

        self.db.commit()

    def revoke_all_for_user(
        self,
        user_id: UUID,
    ) -> None:
        now = datetime.now(
            timezone.utc,
        )

        self.db.execute(
            update(
                RefreshToken,
            )
            .where(
                RefreshToken.user_id
                == user_id,
                RefreshToken.revoked_at.is_(
                    None,
                ),
            )
            .values(
                revoked_at=now,
            )
        )

        self.db.commit()
