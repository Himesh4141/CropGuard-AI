from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class OfficerSummary(BaseModel):
    farmers: int
    farms: int
    fields: int
    diagnoses: int
    unread_alerts: int
    high_risk_fields: int


class OfficerCase(BaseModel):
    diagnosis_id: UUID
    field_id: UUID
    field_name: str
    farm_name: str
    farmer_name: str
    farmer_email: str
    crop_name: str
    predicted_label: str | None
    confidence: float | None
    severity: str | None
    created_at: datetime
    risk_score: int | None
    risk_level: str | None


class OfficerHighRiskField(BaseModel):
    field_id: UUID
    field_name: str
    farm_name: str
    farmer_name: str
    crop_name: str
    risk_score: int
    risk_level: str
    observed_at: datetime
