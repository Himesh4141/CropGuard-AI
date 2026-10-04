from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.models.field import Field
from app.repositories.diagnosis_repository import DiagnosisRepository
from app.repositories.farm_repository import FarmRepository
from app.repositories.field_repository import FieldRepository
from app.schemas.field import FieldCreate, FieldUpdate
from app.storage.local import LocalStorageProvider


class FieldService:
    def __init__(
        self,
        db: Session,
    ) -> None:
        self.farms = FarmRepository(
            db,
        )

        self.fields = FieldRepository(
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
        farm_id: UUID | None = None,
    ) -> list[Field]:
        return self.fields.list_for_owner(
            owner_id,
            farm_id,
        )

    def create(
        self,
        owner_id: UUID,
        payload: FieldCreate,
    ) -> Field:
        if (
            self.farms.get_owned(
                payload.farm_id,
                owner_id,
            )
            is None
        ):
            raise NotFoundError(
                "Farm not found"
            )

        return self.fields.add(
            Field(
                **payload.model_dump(),
            )
        )

    def update(
        self,
        *,
        owner_id: UUID,
        field_id: UUID,
        payload: FieldUpdate,
    ) -> Field:
        field = self.fields.get_owned(
            field_id,
            owner_id,
        )

        if field is None:
            raise NotFoundError(
                "Field not found"
            )

        values = payload.model_dump(
            exclude_unset=True,
        )

        requested_farm_id = values.get(
            "farm_id",
        )

        if (
            requested_farm_id is not None
            and self.farms.get_owned(
                requested_farm_id,
                owner_id,
            )
            is None
        ):
            raise NotFoundError(
                "Farm not found"
            )

        for key, value in values.items():
            if (
                isinstance(value, str)
                and key
                in {
                    "name",
                    "crop_name",
                    "variety",
                }
            ):
                value = value.strip()

            setattr(
                field,
                key,
                value,
            )

        return self.fields.save(
            field,
        )

    def delete(
        self,
        *,
        owner_id: UUID,
        field_id: UUID,
    ) -> None:
        field = self.fields.get_owned(
            field_id,
            owner_id,
        )

        if field is None:
            raise NotFoundError(
                "Field not found"
            )

        stored_paths = [
            diagnosis.image_path
            for diagnosis
            in self.diagnoses.list_for_field(
                field.id,
            )
        ]

        self.fields.delete(
            field,
        )

        for stored_path in stored_paths:
            self.storage.delete(
                stored_path,
            )
