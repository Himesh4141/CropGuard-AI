from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import DiagnosisStatus


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