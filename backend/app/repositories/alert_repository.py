from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.farm import Farm
from app.models.field import Field


class AlertRepository:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    def list_for_owner(
        self,
        owner_id: UUID,
    ) -> list[Alert]:
        statement = (
            select(Alert)
            .join(
                Field,
                Alert.field_id == Field.id,
            )
            .join(
                Farm,
                Field.farm_id == Farm.id,
            )
            .where(
                Farm.owner_id == owner_id,
            )
            .order_by(
                Alert.created_at.desc(),
            )
        )

        return list(
            self.db.scalars(
                statement,
            ).all()
        )

    def get_owned(
        self,
        alert_id: UUID,
        owner_id: UUID,
    ) -> Alert | None:
        statement = (
            select(Alert)
            .join(
                Field,
                Alert.field_id == Field.id,
            )
            .join(
                Farm,
                Field.farm_id == Farm.id,
            )
            .where(
                Alert.id == alert_id,
                Farm.owner_id == owner_id,
            )
        )

        return self.db.scalar(
            statement,
        )

    def latest_for_field_title(
        self,
        field_id: UUID,
        title: str,
    ) -> Alert | None:
        statement = (
            select(Alert)
            .where(
                Alert.field_id == field_id,
                Alert.title == title,
            )
            .order_by(
                Alert.created_at.desc(),
            )
            .limit(1)
        )

        return self.db.scalar(
            statement,
        )

    def add(
        self,
        alert: Alert,
    ) -> Alert:
        self.db.add(
            alert,
        )
        self.db.commit()
        self.db.refresh(
            alert,
        )

        return alert

    def save(
        self,
        alert: Alert,
    ) -> Alert:
        self.db.add(
            alert,
        )
        self.db.commit()
        self.db.refresh(
            alert,
        )

        return alert

    def mark_all_read(
        self,
        owner_id: UUID,
    ) -> None:
        alerts = self.list_for_owner(
            owner_id,
        )

        changed = False

        for alert in alerts:
            if not alert.is_read:
                alert.is_read = True
                self.db.add(
                    alert,
                )
                changed = True

        if changed:
            self.db.commit()