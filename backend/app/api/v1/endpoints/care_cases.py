from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.constants import CareCaseTrend, UserRole
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.user import User
from app.schemas.care_case import CareCasePublic, FarmerCaseResolveRequest
from app.services.care_case_service import CareCaseService
from app.services.diagnosis_service import DiagnosisInferenceError, DiagnosisService


router = APIRouter()
FarmerAccess = Depends(require_roles(UserRole.FARMER))


@router.get("", response_model=list[CareCasePublic])
def list_care_cases(
    farmer: User = FarmerAccess,
    db: Session = Depends(get_db),
) -> list[CareCasePublic]:
    return CareCaseService(db).list_for_farmer(farmer.id)


@router.get("/{case_id}", response_model=CareCasePublic)
def get_care_case(
    case_id: UUID,
    farmer: User = FarmerAccess,
    db: Session = Depends(get_db),
) -> CareCasePublic:
    service = CareCaseService(db)
    try:
        return service.to_public(service.get_owned(case_id, farmer.id))
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/{case_id}/follow-up", response_model=CareCasePublic)
async def add_follow_up(
    case_id: UUID,
    trend: CareCaseTrend = Form(...),
    note: str | None = Form(default=None, max_length=1500),
    file: UploadFile | None = File(default=None),
    farmer: User = FarmerAccess,
    db: Session = Depends(get_db),
) -> CareCasePublic:
    service = CareCaseService(db)

    try:
        care_case = service.get_owned(case_id, farmer.id)

        diagnosis = None
        if file is not None and file.filename:
            diagnosis = await DiagnosisService(db).upload(
                owner_id=farmer.id,
                field_id=care_case.field_id,
                file=file,
                create_care_case=False,
            )

        return service.record_farmer_update(
            care_case=care_case,
            farmer=farmer,
            trend=trend,
            note=note,
            diagnosis=diagnosis,
        )

    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except DiagnosisInferenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.post("/{case_id}/resolve", response_model=CareCasePublic)
def resolve_care_case(
    case_id: UUID,
    payload: FarmerCaseResolveRequest,
    farmer: User = FarmerAccess,
    db: Session = Depends(get_db),
) -> CareCasePublic:
    service = CareCaseService(db)

    try:
        care_case = service.get_owned(case_id, farmer.id)
        return service.resolve(
            care_case=care_case,
            actor=farmer,
            note=payload.note,
        )
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
