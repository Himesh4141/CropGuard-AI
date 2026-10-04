from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.constants import UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminSummary,
    AdminUserItem,
    AdminUserStatusUpdate,
)
from app.services.admin_service import (
    AdminService,
)


router = APIRouter()


@router.get(
    "/summary",
    response_model=AdminSummary,
)
def summary(
    _: User = Depends(
        require_roles(
            UserRole.ADMIN,
        )
    ),
    db: Session = Depends(
        get_db,
    ),
) -> AdminSummary:
    return AdminService(
        db,
    ).summary()


@router.get(
    "/users",
    response_model=list[
        AdminUserItem
    ],
)
def list_users(
    _: User = Depends(
        require_roles(
            UserRole.ADMIN,
        )
    ),
    db: Session = Depends(
        get_db,
    ),
) -> list[AdminUserItem]:
    return AdminService(
        db,
    ).list_users()


@router.patch(
    "/users/{user_id}/active",
    response_model=AdminUserItem,
)
def update_user_status(
    user_id: UUID,
    payload: AdminUserStatusUpdate,
    admin: User = Depends(
        require_roles(
            UserRole.ADMIN,
        )
    ),
    db: Session = Depends(
        get_db,
    ),
) -> AdminUserItem:
    try:
        user = AdminService(
            db,
        ).set_user_active(
            user_id=user_id,
            is_active=payload.is_active,
            acting_user_id=admin.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if user is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user
