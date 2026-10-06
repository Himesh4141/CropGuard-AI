from uuid import UUID

from sqlalchemy import Boolean, Enum, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import DiagnosisStatus
from app.db.base import Base, UUIDTimestampMixin


class Diagnosis(UUIDTimestampMixin, Base):
    __tablename__ = "diagnoses"

    field_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "fields.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    image_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[DiagnosisStatus] = mapped_column(
        Enum(
            DiagnosisStatus,
            name="diagnosis_status",
        ),
        default=DiagnosisStatus.UPLOADED,
        nullable=False,
    )

    predicted_label: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float(),
        nullable=True,
    )

    severity: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    advisory: Mapped[str | None] = mapped_column(
        Text(),
        nullable=True,
    )

    inference_mode: Mapped[str] = mapped_column(
        String(32),
        default="development_stub",
        nullable=False,
    )

    model_display_name: Mapped[str] = mapped_column(
        String(120),
        default="CropGuard Development Simulator",
        nullable=False,
    )

    model_version: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )

    predicted_crop: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )

    confidence_level: Mapped[str | None] = mapped_column(
        String(24),
        nullable=True,
    )

    top_predictions: Mapped[list[dict] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    is_uncertain: Mapped[bool] = mapped_column(
        Boolean(),
        default=False,
        nullable=False,
    )

    rejection_reason: Mapped[str | None] = mapped_column(
        Text(),
        nullable=True,
    )

    field = relationship(
        "Field",
        back_populates="diagnoses",
    )
