from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FarmCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
    )

    village: str | None = Field(
        default=None,
        max_length=120,
    )

    district: str | None = Field(
        default=None,
        max_length=120,
    )

    state: str | None = Field(
        default=None,
        max_length=120,
    )

    country: str = Field(
        default="India",
        min_length=2,
        max_length=120,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )


class FarmUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
    )

    village: str | None = Field(
        default=None,
        max_length=120,
    )

    district: str | None = Field(
        default=None,
        max_length=120,
    )

    state: str | None = Field(
        default=None,
        max_length=120,
    )

    country: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )


class FarmPublic(FarmCreate):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    owner_id: UUID
