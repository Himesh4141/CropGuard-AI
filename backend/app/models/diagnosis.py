from uuid import UUID

from sqlalchemy import Enum, Float, ForeignKey, String, Text
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

    field = relationship(
        "Field",
        back_populates="diagnoses",
    )