from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.constants import CareCaseStatus
from app.models.care_case import CareCase, CareCaseUpdate
from app.models.farm import Farm
from app.models.field import Field


class CareCaseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _with_updates(statement):
        return statement.options(selectinload(CareCase.updates))

    def add(self, care_case: CareCase) -> CareCase:
        self.db.add(care_case)
        self.db.commit()
        self.db.refresh(care_case)
        return self.get(care_case.id) or care_case

    def save(self, care_case: CareCase) -> CareCase:
        self.db.add(care_case)
        self.db.commit()
        self.db.refresh(care_case)
        return self.get(care_case.id) or care_case

    def add_update(self, update: CareCaseUpdate) -> CareCaseUpdate:
        self.db.add(update)
        self.db.commit()
        self.db.refresh(update)
        return update

    def get(self, case_id: UUID) -> CareCase | None:
        return self.db.scalar(
            self._with_updates(
                select(CareCase).where(CareCase.id == case_id)
            )
        )

    def get_owned(self, case_id: UUID, farmer_id: UUID) -> CareCase | None:
        return self.db.scalar(
            self._with_updates(
                select(CareCase).where(
                    CareCase.id == case_id,
                    CareCase.farmer_id == farmer_id,
                )
            )
        )

    def active_for_field(self, field_id: UUID, farmer_id: UUID) -> CareCase | None:
        return self.db.scalar(
            self._with_updates(
                select(CareCase)
                .where(
                    CareCase.field_id == field_id,
                    CareCase.farmer_id == farmer_id,
                    CareCase.status != CareCaseStatus.RESOLVED,
                )
                .order_by(CareCase.created_at.desc())
                .limit(1)
            )
        )

    def list_for_farmer(self, farmer_id: UUID) -> list[CareCase]:
        return list(
            self.db.scalars(
                self._with_updates(
                    select(CareCase)
                    .where(CareCase.farmer_id == farmer_id)
                    .order_by(
                        CareCase.status == CareCaseStatus.RESOLVED,
                        CareCase.updated_at.desc(),
                    )
                )
            ).all()
        )

    def list_all(self) -> list[CareCase]:
        return list(
            self.db.scalars(
                self._with_updates(
                    select(CareCase).order_by(
                        CareCase.status == CareCaseStatus.RESOLVED,
                        CareCase.updated_at.desc(),
                    )
                )
            ).all()
        )

    def list_for_field_ids(self, field_ids: set[UUID]) -> list[CareCase]:
        if not field_ids:
            return []

        return list(
            self.db.scalars(
                self._with_updates(
                    select(CareCase)
                    .where(CareCase.field_id.in_(field_ids))
                    .order_by(
                        CareCase.status == CareCaseStatus.RESOLVED,
                        CareCase.updated_at.desc(),
                    )
                )
            ).all()
        )

    def get_context(self, care_case: CareCase) -> tuple[Field | None, Farm | None]:
        field = self.db.get(Field, care_case.field_id)
        if field is None:
            return None, None
        return field, self.db.get(Farm, field.farm_id)
