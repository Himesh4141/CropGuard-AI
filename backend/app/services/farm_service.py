from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.models.farm import Farm
from app.repositories.diagnosis_repository import DiagnosisRepository
from app.repositories.farm_repository import FarmRepository
from app.schemas.farm import FarmCreate, FarmUpdate
from app.storage.local import LocalStorageProvider


class FarmService:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.repository = FarmRepository(
            db,
        )

        self.diagnoses = DiagnosisRepository(
            db,
        )

        self.storage = LocalStorageProvider(
            settings.upload_dir
            / "diagnoses"
        )

    def list(
        self,
        owner_id: UUID,
    ) -> list[Farm]:
        return self.repository.list_for_owner(
            owner_id,
        )

    def create(
        self,
        owner_id: UUID,
        payload: FarmCreate,
    ) -> Farm:
        return self.repository.add(
            Farm(
                owner_id=owner_id,
                **payload.model_dump(),
            )
        )

    def update(
        self,
        *,
        owner_id: UUID,
        farm_id: UUID,
        payload: FarmUpdate,
    ) -> Farm:
        farm = self.repository.get_owned(
            farm_id,
            owner_id,
        )

        if farm is None:
            raise NotFoundError(
                "Farm not found"
            )

        values = payload.model_dump(
            exclude_unset=True,
        )

        for key, value in values.items():
            if (
                isinstance(value, str)
                and key
                in {
                    "name",
                    "village",
                    "district",
                    "state",
                    "country",
                }
            ):
                value = value.strip()

            setattr(
                farm,
                key,
                value,
            )

        return self.repository.save(
            farm,
        )

    def delete(
        self,
        *,
        owner_id: UUID,
        farm_id: UUID,
    ) -> None:
        farm = self.repository.get_owned(
            farm_id,
            owner_id,
        )

        if farm is None:
            raise NotFoundError(
                "Farm not found"
            )

        stored_paths = [
            diagnosis.image_path
            for diagnosis
            in self.diagnoses.list_for_farm(
                farm.id,
            )
        ]

        self.repository.delete(
            farm,
        )

        for stored_path in stored_paths:
            self.storage.delete(
                stored_path,
            )
