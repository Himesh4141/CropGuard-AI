from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.farm import Farm
from app.models.field import Field


class FieldRepository:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    def list_for_owner(
        self,
        owner_id: UUID,
        farm_id: UUID | None = None,
    ) -> list[Field]:
        statement = (
            select(Field)
            .join(Farm)
            .where(
                Farm.owner_id
                == owner_id,
            )
        )

        if farm_id is not None:
            statement = statement.where(
                Field.farm_id
                == farm_id,
            )

        return list(
            self.db.scalars(
                statement.order_by(
                    Field.name,
                )
            ).all()
        )

    def get_owned(
        self,
        field_id: UUID,
        owner_id: UUID,
    ) -> Field | None:
        return self.db.scalar(
            select(Field)
            .join(Farm)
            .where(
                Field.id == field_id,
                Farm.owner_id
                == owner_id,
            )
        )

    def add(
        self,
        field: Field,
    ) -> Field:
        self.db.add(
            field,
        )

        self.db.commit()

        self.db.refresh(
            field,
        )

        return field

    def save(
        self,
        field: Field,
    ) -> Field:
        self.db.add(
            field,
        )

        self.db.commit()

        self.db.refresh(
            field,
        )

        return field

    def delete(
        self,
        field: Field,
    ) -> None:
        self.db.delete(
            field,
        )

        self.db.commit()
