from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import UserRole
from app.models.alert import Alert
from app.models.diagnosis import Diagnosis
from app.models.farm import Farm
from app.models.field import Field
from app.models.user import User
from app.models.weather_record import WeatherRecord
from app.schemas.officer import (
    OfficerCase,
    OfficerHighRiskField,
    OfficerSummary,
)


class OfficerService:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    def summary(
        self,
    ) -> OfficerSummary:
        farmers = int(
            self.db.scalar(
                select(func.count())
                .select_from(User)
                .where(
                    User.role
                    == UserRole.FARMER,
                )
            )
            or 0
        )

        farms = int(
            self.db.scalar(
                select(func.count())
                .select_from(Farm)
            )
            or 0
        )

        fields = int(
            self.db.scalar(
                select(func.count())
                .select_from(Field)
            )
            or 0
        )

        diagnoses = int(
            self.db.scalar(
                select(func.count())
                .select_from(Diagnosis)
            )
            or 0
        )

        unread_alerts = int(
            self.db.scalar(
                select(func.count())
                .select_from(Alert)
                .where(
                    Alert.is_read.is_(False),
                )
            )
            or 0
        )

        return OfficerSummary(
            farmers=farmers,
            farms=farms,
            fields=fields,
            diagnoses=diagnoses,
            unread_alerts=unread_alerts,
            high_risk_fields=len(
                self.high_risk_fields(
                    limit=500,
                )
            ),
        )

    def cases(
        self,
        *,
        limit: int = 100,
    ) -> list[OfficerCase]:
        rows = self.db.execute(
            select(
                Diagnosis,
                Field,
                Farm,
                User,
            )
            .join(
                Field,
                Diagnosis.field_id
                == Field.id,
            )
            .join(
                Farm,
                Field.farm_id
                == Farm.id,
            )
            .join(
                User,
                Farm.owner_id
                == User.id,
            )
            .where(
                User.role
                == UserRole.FARMER,
            )
            .order_by(
                Diagnosis.created_at.desc(),
            )
            .limit(
                limit,
            )
        ).all()

        latest_weather = (
            self._latest_weather_by_field()
        )

        result: list[
            OfficerCase
        ] = []

        for (
            diagnosis,
            field,
            farm,
            farmer,
        ) in rows:
            weather = latest_weather.get(
                field.id,
            )

            result.append(
                OfficerCase(
                    diagnosis_id=diagnosis.id,
                    field_id=field.id,
                    field_name=field.name,
                    farm_name=farm.name,
                    farmer_name=(
                        farmer.full_name
                    ),
                    farmer_email=(
                        farmer.email
                    ),
                    crop_name=field.crop_name,
                    predicted_label=(
                        diagnosis
                        .predicted_label
                    ),
                    confidence=(
                        diagnosis.confidence
                    ),
                    severity=(
                        diagnosis.severity
                    ),
                    created_at=(
                        diagnosis.created_at
                    ),
                    risk_score=(
                        weather.risk_score
                        if weather
                        else None
                    ),
                    risk_level=(
                        weather.risk_level
                        if weather
                        else None
                    ),
                )
            )

        return result

    def high_risk_fields(
        self,
        *,
        limit: int = 50,
    ) -> list[
        OfficerHighRiskField
    ]:
        latest_weather = (
            self._latest_weather_by_field()
        )

        records = sorted(
            (
                record
                for record
                in latest_weather.values()
                if record.risk_level.lower()
                in {
                    "high",
                    "critical",
                }
            ),
            key=lambda record:
                (
                    record.risk_score,
                    record.observed_at,
                ),
            reverse=True,
        )

        result: list[
            OfficerHighRiskField
        ] = []

        for record in records:
            field = self.db.get(
                Field,
                record.field_id,
            )

            if field is None:
                continue

            farm = self.db.get(
                Farm,
                field.farm_id,
            )

            if farm is None:
                continue

            farmer = self.db.get(
                User,
                farm.owner_id,
            )

            if (
                farmer is None
                or farmer.role
                != UserRole.FARMER
            ):
                continue

            result.append(
                OfficerHighRiskField(
                    field_id=field.id,
                    field_name=field.name,
                    farm_name=farm.name,
                    farmer_name=(
                        farmer.full_name
                    ),
                    crop_name=field.crop_name,
                    risk_score=(
                        record.risk_score
                    ),
                    risk_level=(
                        record.risk_level
                    ),
                    observed_at=(
                        record.observed_at
                    ),
                )
            )

            if len(result) >= limit:
                break

        return result

    def _latest_weather_by_field(
        self,
    ) -> dict:
        records = list(
            self.db.scalars(
                select(WeatherRecord)
                .order_by(
                    WeatherRecord.observed_at.desc(),
                )
            ).all()
        )

        latest = {}

        for record in records:
            latest.setdefault(
                record.field_id,
                record,
            )

        return latest
