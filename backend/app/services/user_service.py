from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.token_repository import TokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import PasswordChangeRequest, UserUpdate


class UserService:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.users = UserRepository(
            db,
        )

        self.tokens = TokenRepository(
            db,
        )

    def update_profile(
        self,
        *,
        user: User,
        payload: UserUpdate,
    ) -> User:
        user.full_name = (
            payload.full_name
            .strip()
        )

        return self.users.save(
            user,
        )

    def change_password(
        self,
        *,
        user: User,
        payload: PasswordChangeRequest,
    ) -> None:
        if not verify_password(
            payload.current_password,
            user.password_hash,
        ):
            raise AuthenticationError(
                "Current password is incorrect"
            )

        if verify_password(
            payload.new_password,
            user.password_hash,
        ):
            raise ValueError(
                "New password must be different from the current password"
            )

        user.password_hash = hash_password(
            payload.new_password,
        )

        self.users.save(
            user,
        )

        self.tokens.revoke_all_for_user(
            user.id,
        )
