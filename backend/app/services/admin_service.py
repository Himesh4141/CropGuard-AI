from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import UserRole
from app.models.alert import Alert
from app.models.diagnosis import Diagnosis
from app.models.farm import Farm
from app.models.field import Field
from app.models.user import User
from app.models.weather_record import WeatherRecord
from app.schemas.admin import AdminSummary, AdminUserItem


class AdminService:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    def summary(
        self,
    ) -> AdminSummary:
        total_users = self._count(
            User,
        )

        active_users = int(
            self.db.scalar(
                select(func.count())
                .select_from(User)
                .where(
                    User.is_active.is_(True),
                )
            )
            or 0
        )

        farmers = self._count_users_by_role(
            UserRole.FARMER,
        )

        extension_officers = (
            self._count_users_by_role(
                UserRole.EXTENSION_OFFICER,
            )
        )

        admins = self._count_users_by_role(
            UserRole.ADMIN,
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

        return AdminSummary(
            total_users=total_users,
            active_users=active_users,
            farmers=farmers,
            extension_officers=extension_officers,
            admins=admins,
            farms=self._count(Farm),
            fields=self._count(Field),
            diagnoses=self._count(Diagnosis),
            alerts=self._count(Alert),
            unread_alerts=unread_alerts,
            high_risk_fields=(
                self._high_risk_field_count()
            ),
        )

    def list_users(
        self,
    ) -> list[AdminUserItem]:
        users = list(
            self.db.scalars(
                select(User).order_by(
                    User.created_at.desc(),
                )
            ).all()
        )

        items: list[
            AdminUserItem
        ] = []

        for user in users:
            farm_count = int(
                self.db.scalar(
                    select(func.count())
                    .select_from(Farm)
                    .where(
                        Farm.owner_id
                        == user.id,
                    )
                )
                or 0
            )

            field_count = int(
                self.db.scalar(
                    select(func.count())
                    .select_from(Field)
                    .join(
                        Farm,
                        Field.farm_id
                        == Farm.id,
                    )
                    .where(
                        Farm.owner_id
                        == user.id,
                    )
                )
                or 0
            )

            diagnosis_count = int(
                self.db.scalar(
                    select(func.count())
                    .select_from(Diagnosis)
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
                    .where(
                        Farm.owner_id
                        == user.id,
                    )
                )
                or 0
            )

            items.append(
                AdminUserItem(
                    id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    role=user.role,
                    is_active=user.is_active,
                    farm_count=farm_count,
                    field_count=field_count,
                    diagnosis_count=(
                        diagnosis_count
                    ),
                    created_at=user.created_at,
                )
            )

        return items

    def set_user_active(
        self,
        *,
        user_id: UUID,
        is_active: bool,
        acting_user_id: UUID,
    ) -> AdminUserItem | None:
        user = self.db.get(
            User,
            user_id,
        )

        if user is None:
            return None

        if (
            user.id == acting_user_id
            and not is_active
        ):
            raise ValueError(
                "You cannot deactivate "
                "your own admin account."
            )

        user.is_active = is_active

        self.db.add(
            user,
        )

        self.db.commit()

        self.db.refresh(
            user,
        )

        return next(
            (
                item
                for item
                in self.list_users()
                if item.id
                == user.id
            ),
            None,
        )

    def _count(
        self,
        model,
    ) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(model)
            )
            or 0
        )

    def _count_users_by_role(
        self,
        role: UserRole,
    ) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(User)
                .where(
                    User.role == role,
                )
            )
            or 0
        )

    def _high_risk_field_count(
        self,
    ) -> int:
        records = list(
            self.db.scalars(
                select(WeatherRecord)
                .order_by(
                    WeatherRecord.observed_at.desc(),
                )
            ).all()
        )

        latest_by_field = {}

        for record in records:
            latest_by_field.setdefault(
                record.field_id,
                record,
            )

        return sum(
            1
            for record
            in latest_by_field.values()
            if record.risk_level.lower()
            in {
                "high",
                "critical",
            }
        )
