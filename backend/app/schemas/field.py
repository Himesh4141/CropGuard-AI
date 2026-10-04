from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field as PydanticField


class FieldCreate(BaseModel):
    farm_id: UUID

    name: str = PydanticField(
        min_length=2,
        max_length=120,
    )

    crop_name: str = PydanticField(
        min_length=2,
        max_length=100,
    )

    variety: str | None = PydanticField(
        default=None,
        max_length=100,
    )

    area_acres: float = PydanticField(
        gt=0,
        le=100000,
    )

    sowing_date: date | None = None


class FieldUpdate(BaseModel):
    farm_id: UUID | None = None

    name: str | None = PydanticField(
        default=None,
        min_length=2,
        max_length=120,
    )

    crop_name: str | None = PydanticField(
        default=None,
        min_length=2,
        max_length=100,
    )

    variety: str | None = PydanticField(
        default=None,
        max_length=100,
    )

    area_acres: float | None = PydanticField(
        default=None,
        gt=0,
        le=100000,
    )

    sowing_date: date | None = None


class FieldPublic(FieldCreate):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
