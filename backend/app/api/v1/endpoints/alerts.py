from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.user import User
from app.schemas.alert import AlertPublic
from app.services.alert_service import AlertService


router = APIRouter()


@router.get(
    "",
    response_model=list[AlertPublic],
)
def list_alerts(
    user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(
        get_db,
    ),
) -> list[AlertPublic]:
    return AlertService(
        db,
    ).list(
        user.id,
    )


@router.patch(
    "/read-all",
    response_model=list[AlertPublic],
)
def mark_all_alerts_read(
    user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(
        get_db,
    ),
) -> list[AlertPublic]:
    return AlertService(
        db,
    ).mark_all_read(
        user.id,
    )


@router.patch(
    "/{alert_id}/read",
    response_model=AlertPublic,
)
def mark_alert_read(
    alert_id: UUID,
    user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(
        get_db,
    ),
) -> AlertPublic:
    try:
        return AlertService(
            db,
        ).mark_read(
            owner_id=user.id,
            alert_id=alert_id,
        )

    except NotFoundError as exc:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc