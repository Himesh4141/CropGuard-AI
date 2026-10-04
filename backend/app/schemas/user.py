from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.constants import UserRole


class UserPublic(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool


class UserUpdate(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=120,
    )


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(
        min_length=8,
        max_length=72,
    )

    new_password: str = Field(
        min_length=8,
        max_length=72,
    )
