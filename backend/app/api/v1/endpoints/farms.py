from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.constants import UserRole
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.user import User
from app.schemas.farm import FarmCreate, FarmPublic, FarmUpdate
from app.services.farm_service import FarmService


router = APIRouter()


@router.get(
    "",
    response_model=list[FarmPublic],
)
def list_farms(
    user: User = Depends(
        require_roles(
            UserRole.FARMER,
        )
    ),
    db: Session = Depends(
        get_db,
    ),
):
    return FarmService(
        db,
    ).list(
        user.id,
    )


@router.post(
    "",
    response_model=FarmPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_farm(
    payload: FarmCreate,
    user: User = Depends(
        require_roles(
            UserRole.FARMER,
        )
    ),
    db: Session = Depends(
        get_db,
    ),
):
    return FarmService(
        db,
    ).create(
        user.id,
        payload,
    )


@router.patch(
    "/{farm_id}",
    response_model=FarmPublic,
)
def update_farm(
    farm_id: UUID,
    payload: FarmUpdate,
    user: User = Depends(
        require_roles(
            UserRole.FARMER,
        )
    ),
    db: Session = Depends(
        get_db,
    ),
):
    try:
        return FarmService(
            db,
        ).update(
            owner_id=user.id,
            farm_id=farm_id,
            payload=payload,
        )
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{farm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_farm(
    farm_id: UUID,
    user: User = Depends(
        require_roles(
            UserRole.FARMER,
        )
    ),
    db: Session = Depends(
        get_db,
    ),
) -> Response:
    try:
        FarmService(
            db,
        ).delete(
            owner_id=user.id,
            farm_id=farm_id,
        )
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )
