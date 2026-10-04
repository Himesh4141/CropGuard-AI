from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.user import User
from app.schemas.diagnosis import DiagnosisPublic
from app.services.diagnosis_service import (
    DiagnosisInferenceError,
    DiagnosisService,
)


router = APIRouter()


@router.get(
    "",
    response_model=list[DiagnosisPublic],
)
def list_diagnoses(
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
) -> list[DiagnosisPublic]:
    return DiagnosisService(
        db
    ).list(
        user.id
    )


@router.post(
    "",
    response_model=DiagnosisPublic,
    status_code=
        status.HTTP_201_CREATED,
)
async def upload_diagnosis(
    field_id: UUID = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
) -> DiagnosisPublic:
    try:
        return await DiagnosisService(
            db
        ).upload(
            owner_id=user.id,
            field_id=field_id,
            file=file,
        )

    except NotFoundError as exc:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except DiagnosisInferenceError as exc:
        raise HTTPException(
            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc