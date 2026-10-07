from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import (
    CareCaseEventType,
    CareCasePriority,
    CareCaseStatus,
    CareCaseTrend,
    UserRole,
)
from app.db.base import Base, UUIDTimestampMixin


class CareCase(UUIDTimestampMixin, Base):
    __tablename__ = "care_cases"

    field_id: Mapped[UUID] = mapped_column(
        ForeignKey("fields.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    farmer_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    initial_diagnosis_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("diagnoses.id", ondelete="SET NULL"),
        nullable=True,
    )
    latest_diagnosis_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("diagnoses.id", ondelete="SET NULL"),
        nullable=True,
    )

    status: Mapped[CareCaseStatus] = mapped_column(
        Enum(CareCaseStatus, name="care_case_status"),
        default=CareCaseStatus.OPEN,
        nullable=False,
        index=True,
    )
    priority: Mapped[CareCasePriority] = mapped_column(
        Enum(CareCasePriority, name="care_case_priority"),
        default=CareCasePriority.MODERATE,
        nullable=False,
        index=True,
    )
    trend: Mapped[CareCaseTrend] = mapped_column(
        Enum(CareCaseTrend, name="care_case_trend"),
        default=CareCaseTrend.NEW,
        nullable=False,
    )

    current_label: Mapped[str | None] = mapped_column(String(180), nullable=True)
    current_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    advisory: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    next_follow_up_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    last_follow_up_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    escalated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    field = relationship("Field")
    farmer = relationship("User", foreign_keys=[farmer_id])
    initial_diagnosis = relationship("Diagnosis", foreign_keys=[initial_diagnosis_id])
    latest_diagnosis = relationship("Diagnosis", foreign_keys=[latest_diagnosis_id])
    updates = relationship(
        "CareCaseUpdate",
        back_populates="care_case",
        cascade="all, delete-orphan",
        order_by="CareCaseUpdate.created_at.asc()",
    )


class CareCaseUpdate(UUIDTimestampMixin, Base):
    __tablename__ = "care_case_updates"

    care_case_id: Mapped[UUID] = mapped_column(
        ForeignKey("care_cases.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    actor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_role: Mapped[UserRole | None] = mapped_column(
        Enum(UserRole, name="care_case_actor_role"),
        nullable=True,
    )
    event_type: Mapped[CareCaseEventType] = mapped_column(
        Enum(CareCaseEventType, name="care_case_event_type"),
        nullable=False,
    )
    trend: Mapped[CareCaseTrend | None] = mapped_column(
        Enum(CareCaseTrend, name="care_case_update_trend"),
        nullable=True,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("diagnoses.id", ondelete="SET NULL"),
        nullable=True,
    )

    care_case = relationship("CareCase", back_populates="updates")
    actor = relationship("User")
    diagnosis = relationship("Diagnosis")
