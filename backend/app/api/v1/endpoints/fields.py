from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.constants import UserRole
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.user import User
from app.schemas.field import FieldCreate, FieldPublic, FieldUpdate
from app.services.field_service import FieldService


router = APIRouter()


@router.get(
    "",
    response_model=list[FieldPublic],
)
def list_fields(
    farm_id: UUID | None = None,
    user: User = Depends(
        require_roles(
            UserRole.FARMER,
        )
    ),
    db: Session = Depends(
        get_db,
    ),
):
    return FieldService(
        db,
    ).list(
        user.id,
        farm_id,
    )


@router.post(
    "",
    response_model=FieldPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_field(
    payload: FieldCreate,
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
        return FieldService(
            db,
        ).create(
            user.id,
            payload,
        )
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.patch(
    "/{field_id}",
    response_model=FieldPublic,
)
def update_field(
    field_id: UUID,
    payload: FieldUpdate,
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
        return FieldService(
            db,
        ).update(
            owner_id=user.id,
            field_id=field_id,
            payload=payload,
        )
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_field(
    field_id: UUID,
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
        FieldService(
            db,
        ).delete(
            owner_id=user.id,
            field_id=field_id,
        )
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )
