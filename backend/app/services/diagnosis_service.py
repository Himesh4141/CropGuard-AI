from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import DiagnosisStatus
from app.core.exceptions import NotFoundError
from app.ml.base import DiseaseClassifier
from app.ml.model_loader import get_classifier
from app.ml.preprocessing import validate_image_bytes
from app.models.diagnosis import Diagnosis
from app.repositories.diagnosis_repository import DiagnosisRepository
from app.repositories.field_repository import FieldRepository
from app.storage.base import StorageProvider
from app.storage.local import LocalStorageProvider


class DiagnosisInferenceError(RuntimeError):
    pass


class DiagnosisService:
    def __init__(
        self,
        db: Session,
        *,
        storage: StorageProvider | None = None,
        classifier: DiseaseClassifier | None = None,
    ) -> None:
        self.fields = FieldRepository(
            db
        )
        self.diagnoses = DiagnosisRepository(
            db
        )
        self.storage = (
            storage
            if storage is not None
            else LocalStorageProvider(
                settings.upload_dir
                / "diagnoses"
            )
        )
        # Load the ML engine only when an actual image inference is requested.
        # Listing diagnosis history must never depend on ONNX availability.
        self.classifier = classifier

    async def upload(
        self,
        *,
        owner_id: UUID,
        field_id: UUID,
        file: UploadFile,
    ) -> Diagnosis:
        field = self.fields.get_owned(
            field_id,
            owner_id,
        )

        if field is None:
            raise NotFoundError(
                "Field not found"
            )

        maximum_bytes = (
            settings.max_upload_mb
            * 1024
            * 1024
        )

        try:
            content = await file.read(
                maximum_bytes + 1
            )
        finally:
            await file.close()

        if len(content) > maximum_bytes:
            raise ValueError(
                f"Image must be smaller than {settings.max_upload_mb} MB"
            )

        validated_image = validate_image_bytes(
            content=content,
            declared_content_type=
                file.content_type,
        )

        stored = self.storage.save(
            content=content,
            suffix=
                validated_image.suffix,
        )

        diagnosis = Diagnosis(
            field_id=field_id,
            image_path=stored.path,
            original_filename=(
                file.filename
                or "crop-image"
            )[:255],
            status=
                DiagnosisStatus.UPLOADED,
        )

        try:
            diagnosis = self.diagnoses.add(
                diagnosis
            )
        except Exception:
            self.storage.delete(
                stored.path
            )
            raise

        try:
            classifier = (
                self.classifier
                if self.classifier is not None
                else get_classifier()
            )

            prediction = classifier.predict(
                image_bytes=content,
                crop_name=
                    field.crop_name,
            )
        except Exception as exc:
            diagnosis.status = (
                DiagnosisStatus.FAILED
            )

            self.diagnoses.save(
                diagnosis
            )

            raise DiagnosisInferenceError(
                "Crop-health screening could not be completed"
            ) from exc

        diagnosis.status = (
            DiagnosisStatus.ANALYZED
        )

        diagnosis.predicted_label = (
            prediction.label
        )

        diagnosis.confidence = (
            prediction.confidence
        )

        diagnosis.severity = (
            prediction.severity
        )

        diagnosis.advisory = (
            prediction.advisory
        )

        diagnosis.inference_mode = str(
            getattr(
                classifier,
                "inference_mode",
                "development_stub",
            )
        )

        diagnosis.model_display_name = (
            prediction.engine_name
        )

        diagnosis.model_version = (
            prediction.engine_version
        )

        return self.diagnoses.save(
            diagnosis
        )

    def list(
        self,
        owner_id: UUID,
    ) -> list[Diagnosis]:
        return (
            self.diagnoses
            .list_for_owner(
                owner_id
            )
        )