from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.constants import UserRole
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.user import User
from app.schemas.care_case import (
    CareCasePublic,
    OfficerCaseResolveRequest,
    OfficerGuidanceRequest,
)
from app.schemas.officer import OfficerCase, OfficerHighRiskField, OfficerSummary
from app.services.care_case_service import CareCaseService
from app.services.officer_service import OfficerService


router = APIRouter()
OfficerAccess = Depends(require_roles(UserRole.EXTENSION_OFFICER, UserRole.ADMIN))


@router.get("/summary", response_model=OfficerSummary)
def summary(
    actor: User = OfficerAccess,
    db: Session = Depends(get_db),
) -> OfficerSummary:
    return OfficerService(db, actor).summary()


@router.get("/cases", response_model=list[OfficerCase])
def cases(
    limit: int = Query(default=100, ge=1, le=500),
    actor: User = OfficerAccess,
    db: Session = Depends(get_db),
) -> list[OfficerCase]:
    return OfficerService(db, actor).cases(limit=limit)


@router.get("/high-risk-fields", response_model=list[OfficerHighRiskField])
def high_risk_fields(
    limit: int = Query(default=50, ge=1, le=500),
    actor: User = OfficerAccess,
    db: Session = Depends(get_db),
) -> list[OfficerHighRiskField]:
    return OfficerService(db, actor).high_risk_fields(limit=limit)


@router.get("/care-cases", response_model=list[CareCasePublic])
def care_cases(
    actor: User = OfficerAccess,
    db: Session = Depends(get_db),
) -> list[CareCasePublic]:
    return CareCaseService(db).list_for_actor(actor)


@router.post("/care-cases/{case_id}/guidance", response_model=CareCasePublic)
def add_case_guidance(
    case_id: UUID,
    payload: OfficerGuidanceRequest,
    actor: User = OfficerAccess,
    db: Session = Depends(get_db),
) -> CareCasePublic:
    try:
        service = CareCaseService(db)
        care_case = service.get_for_actor(case_id, actor)
        return service.add_officer_guidance(
            care_case=care_case,
            actor=actor,
            note=payload.note,
            follow_up_hours=payload.follow_up_hours,
            escalate=payload.escalate,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/care-cases/{case_id}/resolve", response_model=CareCasePublic)
def resolve_case(
    case_id: UUID,
    payload: OfficerCaseResolveRequest,
    actor: User = OfficerAccess,
    db: Session = Depends(get_db),
) -> CareCasePublic:
    try:
        service = CareCaseService(db)
        care_case = service.get_for_actor(case_id, actor)
        return service.resolve(
            care_case=care_case,
            actor=actor,
            note=payload.note,
        )
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
