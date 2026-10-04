from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDTimestampMixin


class WeatherRecord(UUIDTimestampMixin, Base):
    __tablename__ = "weather_records"

    field_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "fields.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False,
    )

    temperature_c: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    humidity_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    precipitation_mm: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    rainfall_mm: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    wind_speed_kmh: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    forecast_json: Mapped[list[dict]] = mapped_column(
        JSON,
        nullable=False,
    )

    risk_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    risk_factors: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
    )

    field = relationship(
        "Field",
        back_populates="weather_records",
    )