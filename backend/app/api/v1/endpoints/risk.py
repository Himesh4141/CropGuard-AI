from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.risk import RiskRequest, RiskResponse
from app.services.risk_service import calculate_risk

router = APIRouter()


@router.post("/calculate", response_model=RiskResponse)
def calculate(payload: RiskRequest, _user: User = Depends(get_current_user)) -> RiskResponse:
    return calculate_risk(payload)
