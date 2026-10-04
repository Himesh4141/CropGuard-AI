from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.diagnosis import Diagnosis
from app.models.farm import Farm
from app.models.field import Field


class DiagnosisRepository:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    def add(
        self,
        diagnosis: Diagnosis,
    ) -> Diagnosis:
        self.db.add(
            diagnosis,
        )

        self.db.commit()

        self.db.refresh(
            diagnosis,
        )

        return diagnosis

    def save(
        self,
        diagnosis: Diagnosis,
    ) -> Diagnosis:
        self.db.add(
            diagnosis,
        )

        self.db.commit()

        self.db.refresh(
            diagnosis,
        )

        return diagnosis

    def list_for_owner(
        self,
        owner_id: UUID,
    ) -> list[Diagnosis]:
        statement = (
            select(Diagnosis)
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
                == owner_id,
            )
            .order_by(
                Diagnosis.created_at.desc(),
            )
        )

        return list(
            self.db.scalars(
                statement,
            ).all()
        )

    def list_for_field(
        self,
        field_id: UUID,
    ) -> list[Diagnosis]:
        return list(
            self.db.scalars(
                select(Diagnosis)
                .where(
                    Diagnosis.field_id
                    == field_id,
                )
                .order_by(
                    Diagnosis.created_at.desc(),
                )
            ).all()
        )

    def list_for_farm(
        self,
        farm_id: UUID,
    ) -> list[Diagnosis]:
        return list(
            self.db.scalars(
                select(Diagnosis)
                .join(
                    Field,
                    Diagnosis.field_id
                    == Field.id,
                )
                .where(
                    Field.farm_id
                    == farm_id,
                )
                .order_by(
                    Diagnosis.created_at.desc(),
                )
            ).all()
        )
