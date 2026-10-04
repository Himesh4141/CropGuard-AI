from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.weather_record import WeatherRecord


class WeatherRepository:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    def latest_for_field(
        self,
        field_id: UUID,
    ) -> WeatherRecord | None:
        statement = (
            select(
                WeatherRecord,
            )
            .where(
                WeatherRecord.field_id
                == field_id,
            )
            .order_by(
                WeatherRecord.observed_at.desc(),
            )
            .limit(1)
        )

        return self.db.scalar(
            statement,
        )

    def add(
        self,
        record: WeatherRecord,
    ) -> WeatherRecord:
        self.db.add(
            record,
        )

        self.db.commit()

        self.db.refresh(
            record,
        )

        return record