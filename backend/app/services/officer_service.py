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
    OfficerServiceArea,
    OfficerSummary,
)
from app.services.location_access import farm_is_accessible


class OfficerService:
    def __init__(self, db: Session, actor: User) -> None:
        self.db = db
        self.actor = actor

    def _accessible_farms(self) -> list[Farm]:
        farms = list(self.db.scalars(select(Farm)).all())
        return [farm for farm in farms if farm_is_accessible(self.actor, farm)]

    def _scope(self) -> tuple[set, set, set]:
        farms = self._accessible_farms()
        farm_ids = {farm.id for farm in farms}
        farmer_ids = {farm.owner_id for farm in farms}

        if not farm_ids:
            return farm_ids, farmer_ids, set()

        field_ids = set(
            self.db.scalars(
                select(Field.id).where(Field.farm_id.in_(farm_ids))
            ).all()
        )
        return farm_ids, farmer_ids, field_ids

    def _service_area(self) -> OfficerServiceArea:
        if self.actor.role == UserRole.ADMIN:
            return OfficerServiceArea(
                scope_mode="global",
                state=None,
                district=None,
                latitude=None,
                longitude=None,
                coverage_radius_km=None,
            )

        return OfficerServiceArea(
            scope_mode="assigned",
            state=self.actor.service_state,
            district=self.actor.service_district,
            latitude=self.actor.service_latitude,
            longitude=self.actor.service_longitude,
            coverage_radius_km=self.actor.coverage_radius_km,
        )

    def summary(self) -> OfficerSummary:
        farm_ids, farmer_ids, field_ids = self._scope()

        if not farm_ids:
            return OfficerSummary(
                farmers=0,
                farms=0,
                fields=0,
                diagnoses=0,
                unread_alerts=0,
                high_risk_fields=0,
                service_area=self._service_area(),
            )

        diagnoses = int(
            self.db.scalar(
                select(func.count())
                .select_from(Diagnosis)
                .where(Diagnosis.field_id.in_(field_ids))
            )
            or 0
        ) if field_ids else 0

        unread_alerts = int(
            self.db.scalar(
                select(func.count())
                .select_from(Alert)
                .where(
                    Alert.field_id.in_(field_ids),
                    Alert.is_read.is_(False),
                )
            )
            or 0
        ) if field_ids else 0

        return OfficerSummary(
            farmers=len(farmer_ids),
            farms=len(farm_ids),
            fields=len(field_ids),
            diagnoses=diagnoses,
            unread_alerts=unread_alerts,
            high_risk_fields=len(self.high_risk_fields(limit=500)),
            service_area=self._service_area(),
        )

    def cases(self, *, limit: int = 100) -> list[OfficerCase]:
        farm_ids, _, field_ids = self._scope()
        if not farm_ids or not field_ids:
            return []

        rows = self.db.execute(
            select(Diagnosis, Field, Farm, User)
            .join(Field, Diagnosis.field_id == Field.id)
            .join(Farm, Field.farm_id == Farm.id)
            .join(User, Farm.owner_id == User.id)
            .where(
                User.role == UserRole.FARMER,
                Farm.id.in_(farm_ids),
            )
            .order_by(Diagnosis.created_at.desc())
            .limit(limit)
        ).all()

        latest_weather = self._latest_weather_by_field(field_ids)
        result: list[OfficerCase] = []

        for diagnosis, field, farm, farmer in rows:
            weather = latest_weather.get(field.id)
            result.append(
                OfficerCase(
                    diagnosis_id=diagnosis.id,
                    field_id=field.id,
                    field_name=field.name,
                    farm_name=farm.name,
                    farmer_name=farmer.full_name,
                    farmer_email=farmer.email,
                    crop_name=field.crop_name,
                    predicted_label=diagnosis.predicted_label,
                    confidence=diagnosis.confidence,
                    severity=diagnosis.severity,
                    created_at=diagnosis.created_at,
                    risk_score=weather.risk_score if weather else None,
                    risk_level=weather.risk_level if weather else None,
                    village=farm.village,
                    district=farm.district,
                    state=farm.state,
                )
            )
        return result

    def high_risk_fields(self, *, limit: int = 50) -> list[OfficerHighRiskField]:
        farm_ids, _, field_ids = self._scope()
        if not farm_ids or not field_ids:
            return []

        latest_weather = self._latest_weather_by_field(field_ids)
        records = sorted(
            (
                record
                for record in latest_weather.values()
                if record.risk_level.lower() in {"high", "critical"}
            ),
            key=lambda record: (record.risk_score, record.observed_at),
            reverse=True,
        )

        farms_by_id = {
            farm.id: farm
            for farm in self.db.scalars(select(Farm).where(Farm.id.in_(farm_ids))).all()
        }
        fields_by_id = {
            field.id: field
            for field in self.db.scalars(select(Field).where(Field.id.in_(field_ids))).all()
        }

        result: list[OfficerHighRiskField] = []
        for record in records:
            field = fields_by_id.get(record.field_id)
            if field is None:
                continue
            farm = farms_by_id.get(field.farm_id)
            if farm is None:
                continue
            farmer = self.db.get(User, farm.owner_id)
            if farmer is None or farmer.role != UserRole.FARMER:
                continue

            result.append(
                OfficerHighRiskField(
                    field_id=field.id,
                    field_name=field.name,
                    farm_name=farm.name,
                    farmer_name=farmer.full_name,
                    crop_name=field.crop_name,
                    risk_score=record.risk_score,
                    risk_level=record.risk_level,
                    observed_at=record.observed_at,
                    village=farm.village,
                    district=farm.district,
                    state=farm.state,
                )
            )
            if len(result) >= limit:
                break
        return result

    def _latest_weather_by_field(self, field_ids: set) -> dict:
        if not field_ids:
            return {}

        records = list(
            self.db.scalars(
                select(WeatherRecord)
                .where(WeatherRecord.field_id.in_(field_ids))
                .order_by(WeatherRecord.observed_at.desc())
            ).all()
        )

        latest = {}
        for record in records:
            latest.setdefault(record.field_id, record)
        return latest
