from datetime import date
from uuid import UUID

from sqlalchemy import Date, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDTimestampMixin


class Field(UUIDTimestampMixin, Base):
    __tablename__ = "fields"

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "farms.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    crop_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    variety: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    area_acres: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    sowing_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    farm = relationship(
        "Farm",
        back_populates="fields",
    )

    diagnoses = relationship(
        "Diagnosis",
        back_populates="field",
        cascade="all, delete-orphan",
    )

    alerts = relationship(
        "Alert",
        back_populates="field",
        cascade="all, delete-orphan",
    )

    weather_records = relationship(
        "WeatherRecord",
        back_populates="field",
        cascade="all, delete-orphan",
    )