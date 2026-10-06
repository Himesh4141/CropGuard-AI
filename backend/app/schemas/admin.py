from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

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
    service_state: str | None = None
    service_district: str | None = None
    service_latitude: float | None = None
    service_longitude: float | None = None
    coverage_radius_km: float | None = None


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class OfficerServiceAreaUpdate(BaseModel):
    state: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    coverage_radius_km: float | None = Field(default=50.0, gt=0, le=300)

    @model_validator(mode="after")
    def validate_coordinates(self) -> "OfficerServiceAreaUpdate":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together")
        if not any((self.state, self.district, self.latitude is not None)):
            raise ValueError("At least a state, district or coordinate pair is required")
        return self


class AdminLocationItem(BaseModel):
    country: str
    state: str
    district: str
    farmers: int
    farms: int
    fields: int
    diagnoses: int
    high_risk_fields: int
    assigned_officers: int
