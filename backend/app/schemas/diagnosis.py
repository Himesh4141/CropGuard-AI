from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import DiagnosisStatus


class PredictionAlternativePublic(BaseModel):
    raw_label: str
    crop: str
    disease: str
    confidence: float


class DiagnosisPublic(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    field_id: UUID
    original_filename: str
    status: DiagnosisStatus
    predicted_label: str | None
    confidence: float | None
    severity: str | None
    advisory: str | None
    created_at: datetime

    inference_mode: str
    model_display_name: str
    model_version: str | None

    predicted_crop: str | None = None
    confidence_level: str | None = None
    top_predictions: list[PredictionAlternativePublic] = Field(
        default_factory=list
    )

    @field_validator(
        "top_predictions",
        mode="before",
    )
    @classmethod
    def normalize_top_predictions(
        cls,
        value,
    ):
        return [] if value is None else value

    is_uncertain: bool = False
    rejection_reason: str | None = None
