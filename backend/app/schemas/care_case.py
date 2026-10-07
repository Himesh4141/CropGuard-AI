from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.constants import (
    CareCaseEventType,
    CareCasePriority,
    CareCaseStatus,
    CareCaseTrend,
    UserRole,
)


class CareCaseActionPlan(BaseModel):
    immediate_actions: list[str] = Field(default_factory=list)
    monitor_for: list[str] = Field(default_factory=list)
    prevention: list[str] = Field(default_factory=list)
    escalation_triggers: list[str] = Field(default_factory=list)
    follow_up_hours: int


class CareCaseUpdatePublic(BaseModel):
    id: UUID
    event_type: CareCaseEventType
    actor_role: UserRole | None
    actor_name: str | None = None
    trend: CareCaseTrend | None
    note: str | None
    recommendation: str | None
    diagnosis_id: UUID | None
    created_at: datetime


class CareCasePublic(BaseModel):
    id: UUID
    field_id: UUID
    farmer_id: UUID
    initial_diagnosis_id: UUID | None
    latest_diagnosis_id: UUID | None
    status: CareCaseStatus
    priority: CareCasePriority
    trend: CareCaseTrend
    current_label: str | None
    current_confidence: float | None
    severity: str | None
    advisory: str | None
    action_plan: CareCaseActionPlan
    next_follow_up_at: datetime | None
    last_follow_up_at: datetime | None
    escalated_at: datetime | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    field_name: str
    crop_name: str
    farm_name: str
    village: str | None
    district: str | None
    state: str | None
    farmer_name: str
    farmer_email: str

    updates: list[CareCaseUpdatePublic] = Field(default_factory=list)


class FarmerCaseResolveRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1500)


class OfficerGuidanceRequest(BaseModel):
    note: str = Field(min_length=2, max_length=2500)
    follow_up_hours: int | None = Field(default=None, ge=6, le=336)
    escalate: bool = False


class OfficerCaseResolveRequest(BaseModel):
    note: str | None = Field(default=None, max_length=2500)
