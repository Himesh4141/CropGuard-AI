from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import AuthenticationError
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import PasswordChangeRequest, UserPublic, UserUpdate
from app.services.user_service import UserService


router = APIRouter()


@router.get(
    "/me",
    response_model=UserPublic,
)
def me(
    user: User = Depends(
        get_current_user,
    ),
) -> User:
    return user


@router.patch(
    "/me",
    response_model=UserPublic,
)
def update_me(
    payload: UserUpdate,
    user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(
        get_db,
    ),
) -> User:
    return UserService(
        db,
    ).update_profile(
        user=user,
        payload=payload,
    )


@router.post(
    "/me/password",
    status_code=status.HTTP_204_NO_CONTENT,
)
def change_password(
    payload: PasswordChangeRequest,
    user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(
        get_db,
    ),
) -> Response:
    try:
        UserService(
            db,
        ).change_password(
            user=user,
            payload=payload,
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )
