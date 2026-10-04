from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AlertPublic(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    field_id: UUID
    title: str
    message: str
    risk_level: str
    is_read: bool
    created_at: datetime