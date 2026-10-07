from collections import defaultdict
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import UserRole
from app.models.alert import Alert
from app.models.care_case import CareCase
from app.models.diagnosis import Diagnosis
from app.models.farm import Farm
from app.models.field import Field
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.weather_record import WeatherRecord
from app.schemas.admin import (
    AdminLocationItem,
    AdminSummary,
    AdminUserItem,
    OfficerServiceAreaUpdate,
)

from app.services.care_case_service import CareCaseService


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def summary(self) -> AdminSummary:
        total_users = self._count(User)
        active_users = int(
            self.db.scalar(
                select(func.count()).select_from(User).where(User.is_active.is_(True))
            )
            or 0
        )

        unread_alerts = int(
            self.db.scalar(
                select(func.count()).select_from(Alert).where(Alert.is_read.is_(False))
            )
            or 0
        )

        open_cases, escalated_cases = CareCaseService(self.db).global_counts()

        return AdminSummary(
            total_users=total_users,
            active_users=active_users,
            farmers=self._count_users_by_role(UserRole.FARMER),
            extension_officers=self._count_users_by_role(UserRole.EXTENSION_OFFICER),
            admins=self._count_users_by_role(UserRole.ADMIN),
            farms=self._count(Farm),
            fields=self._count(Field),
            diagnoses=self._count(Diagnosis),
            alerts=self._count(Alert),
            unread_alerts=unread_alerts,
            high_risk_fields=self._high_risk_field_count(),
            open_care_cases=open_cases,
            escalated_care_cases=escalated_cases,
        )

    def _user_item(self, user: User) -> AdminUserItem:
        farm_count = int(
            self.db.scalar(
                select(func.count()).select_from(Farm).where(Farm.owner_id == user.id)
            )
            or 0
        )
        field_count = int(
            self.db.scalar(
                select(func.count())
                .select_from(Field)
                .join(Farm, Field.farm_id == Farm.id)
                .where(Farm.owner_id == user.id)
            )
            or 0
        )
        diagnosis_count = int(
            self.db.scalar(
                select(func.count())
                .select_from(Diagnosis)
                .join(Field, Diagnosis.field_id == Field.id)
                .join(Farm, Field.farm_id == Farm.id)
                .where(Farm.owner_id == user.id)
            )
            or 0
        )

        return AdminUserItem(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            farm_count=farm_count,
            field_count=field_count,
            diagnosis_count=diagnosis_count,
            created_at=user.created_at,
            service_state=user.service_state,
            service_district=user.service_district,
            service_latitude=user.service_latitude,
            service_longitude=user.service_longitude,
            coverage_radius_km=user.coverage_radius_km,
        )

    def list_users(self) -> list[AdminUserItem]:
        users = list(self.db.scalars(select(User).order_by(User.created_at.desc())).all())
        return [self._user_item(user) for user in users]

    def set_user_active(
        self,
        *,
        user_id: UUID,
        is_active: bool,
        acting_user_id: UUID,
    ) -> AdminUserItem | None:
        user = self.db.get(User, user_id)
        if user is None:
            return None
        if user.id == acting_user_id and not is_active:
            raise ValueError("You cannot deactivate your own admin account.")

        user.is_active = is_active
        self.db.add(user)

        if not is_active:
            now = datetime.now(timezone.utc)
            tokens = list(
                self.db.scalars(
                    select(RefreshToken).where(
                        RefreshToken.user_id == user.id,
                        RefreshToken.revoked_at.is_(None),
                    )
                ).all()
            )
            for token in tokens:
                token.revoked_at = now
                self.db.add(token)

        self.db.commit()
        self.db.refresh(user)
        return self._user_item(user)

    def set_officer_service_area(
        self,
        *,
        user_id: UUID,
        payload: OfficerServiceAreaUpdate,
    ) -> AdminUserItem | None:
        user = self.db.get(User, user_id)
        if user is None:
            return None
        if user.role != UserRole.EXTENSION_OFFICER:
            raise ValueError("Service areas can only be assigned to extension officers.")

        user.service_state = payload.state.strip() if payload.state else None
        user.service_district = payload.district.strip() if payload.district else None
        user.service_latitude = payload.latitude
        user.service_longitude = payload.longitude
        user.coverage_radius_km = payload.coverage_radius_km
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self._user_item(user)

    def locations(self) -> list[AdminLocationItem]:
        farms = list(self.db.scalars(select(Farm)).all())
        fields = list(self.db.scalars(select(Field)).all())
        diagnoses = list(self.db.scalars(select(Diagnosis)).all())
        care_cases = list(self.db.scalars(select(CareCase)).all())
        weather = list(
            self.db.scalars(
                select(WeatherRecord).order_by(WeatherRecord.observed_at.desc())
            ).all()
        )
        officers = list(
            self.db.scalars(
                select(User).where(
                    User.role == UserRole.EXTENSION_OFFICER,
                    User.is_active.is_(True),
                )
            ).all()
        )

        fields_by_farm: dict = defaultdict(list)
        for field in fields:
            fields_by_farm[field.farm_id].append(field)

        diagnoses_by_field: dict = defaultdict(int)
        for diagnosis in diagnoses:
            diagnoses_by_field[diagnosis.field_id] += 1

        latest_weather: dict = {}
        for record in weather:
            latest_weather.setdefault(record.field_id, record)

        care_cases_by_field: dict = defaultdict(list)
        for care_case in care_cases:
            care_cases_by_field[care_case.field_id].append(care_case)

        groups: dict[tuple[str, str, str], dict] = {}
        for farm in farms:
            country = (farm.country or "Unknown").strip() or "Unknown"
            state = (farm.state or "Unspecified").strip() or "Unspecified"
            district = (farm.district or "Unspecified").strip() or "Unspecified"
            key = (country, state, district)

            if key not in groups:
                groups[key] = {
                    "farmer_ids": set(),
                    "farms": 0,
                    "fields": 0,
                    "diagnoses": 0,
                    "high_risk_fields": 0,
                    "open_care_cases": 0,
                    "escalated_care_cases": 0,
                }

            group = groups[key]
            group["farmer_ids"].add(farm.owner_id)
            group["farms"] += 1

            for field in fields_by_farm.get(farm.id, []):
                group["fields"] += 1
                group["diagnoses"] += diagnoses_by_field.get(field.id, 0)
                latest = latest_weather.get(field.id)
                if latest and latest.risk_level.lower() in {"high", "critical"}:
                    group["high_risk_fields"] += 1

                for care_case in care_cases_by_field.get(field.id, []):
                    if str(care_case.status.value) != "resolved":
                        group["open_care_cases"] += 1
                    if str(care_case.status.value) == "escalated":
                        group["escalated_care_cases"] += 1

        items: list[AdminLocationItem] = []
        for (country, state, district), group in sorted(groups.items()):
            assigned = sum(
                1
                for officer in officers
                if (officer.service_state or "").strip().lower() == state.lower()
                and (
                    not officer.service_district
                    or officer.service_district.strip().lower() == district.lower()
                )
            )
            items.append(
                AdminLocationItem(
                    country=country,
                    state=state,
                    district=district,
                    farmers=len(group["farmer_ids"]),
                    farms=group["farms"],
                    fields=group["fields"],
                    diagnoses=group["diagnoses"],
                    high_risk_fields=group["high_risk_fields"],
                    open_care_cases=group["open_care_cases"],
                    escalated_care_cases=group["escalated_care_cases"],
                    assigned_officers=assigned,
                )
            )
        return items

    def _count(self, model) -> int:
        return int(self.db.scalar(select(func.count()).select_from(model)) or 0)

    def _count_users_by_role(self, role: UserRole) -> int:
        return int(
            self.db.scalar(
                select(func.count()).select_from(User).where(User.role == role)
            )
            or 0
        )

    def _high_risk_field_count(self) -> int:
        records = list(
            self.db.scalars(
                select(WeatherRecord).order_by(WeatherRecord.observed_at.desc())
            ).all()
        )
        latest_by_field = {}
        for record in records:
            latest_by_field.setdefault(record.field_id, record)
        return sum(
            1
            for record in latest_by_field.values()
            if record.risk_level.lower() in {"high", "critical"}
        )
