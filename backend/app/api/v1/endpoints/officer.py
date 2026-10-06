from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.constants import UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.officer import OfficerCase, OfficerHighRiskField, OfficerSummary
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
