from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.farm import Farm


class FarmRepository:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.db = db

    def list_for_owner(
        self,
        owner_id: UUID,
    ) -> list[Farm]:
        return list(
            self.db.scalars(
                select(Farm)
                .where(
                    Farm.owner_id
                    == owner_id,
                )
                .order_by(
                    Farm.name,
                )
            ).all()
        )

    def get_owned(
        self,
        farm_id: UUID,
        owner_id: UUID,
    ) -> Farm | None:
        return self.db.scalar(
            select(Farm).where(
                Farm.id == farm_id,
                Farm.owner_id
                == owner_id,
            )
        )

    def add(
        self,
        farm: Farm,
    ) -> Farm:
        self.db.add(
            farm,
        )

        self.db.commit()

        self.db.refresh(
            farm,
        )

        return farm

    def save(
        self,
        farm: Farm,
    ) -> Farm:
        self.db.add(
            farm,
        )

        self.db.commit()

        self.db.refresh(
            farm,
        )

        return farm

    def delete(
        self,
        farm: Farm,
    ) -> None:
        self.db.delete(
            farm,
        )

        self.db.commit()
