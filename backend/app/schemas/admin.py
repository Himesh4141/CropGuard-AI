from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.core.constants import UserRole


class AdminSummary(BaseModel):
    total_users: int
    active_users: int
    farmers: int
    extension_officers: int
    admins: int
    farms: int
    fields: int
    diagnoses: int
    alerts: int
    unread_alerts: int
    high_risk_fields: int


class AdminUserItem(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    farm_count: int
    field_count: int
    diagnosis_count: int
    created_at: datetime


class AdminUserStatusUpdate(BaseModel):
    is_active: bool
