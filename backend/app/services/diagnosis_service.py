from uuid import UUID
import json
import logging
from threading import Lock
from time import perf_counter

from starlette.concurrency import run_in_threadpool
from app.ml.diagnosis_timing import capture_timings, measure_stage

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


_inference_lock = Lock()
logger = logging.getLogger(__name__)


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
        self.fields = FieldRepository(db)
        self.diagnoses = DiagnosisRepository(db)
        self.storage = (
            storage
            if storage is not None
            else LocalStorageProvider(
                settings.upload_dir / "diagnoses"
            )
        )

        # ML stays lazy so diagnosis history remains available even if
        # the inference engine cannot initialize.
        self.classifier = classifier

    async def upload(
        self,
        *,
        owner_id: UUID,
        field_id: UUID,
        file: UploadFile,
        create_care_case: bool = True,
    ) -> Diagnosis:
        # Keep this request's synchronous SQLAlchemy/file/model work together
        # in one worker. Otherwise an async route blocks all event-loop traffic.
        started = perf_counter()
        try:
            return await run_in_threadpool(
                self._timed_upload, owner_id=owner_id, field_id=field_id,
                file=file, create_care_case=create_care_case, queued_at=started,
            )
        finally:
            await file.close()

    def _timed_upload(self, *, queued_at: float, **kwargs) -> Diagnosis:
        with capture_timings() as timings:
            timings["worker_queue"] = (perf_counter() - queued_at) * 1000
            outcome = "failed"
            try:
                with measure_stage("service"):
                    result = self._upload_sync(**kwargs)
                outcome = "completed"
                return result
            finally:
                timings["postprocess"] = max(0.0, timings.get("prediction", 0.0)
                    - timings.get("preprocess", 0.0) - timings.get("inference", 0.0))
                # Timings only: no photos, filenames, tokens or user identifiers.
                logger.info("diagnosis_timing %s", json.dumps({
                    "outcome": outcome,
                    "stages_ms": {key: round(value, 3) for key, value in timings.items()},
                }))

    def _upload_sync(
        self, *, owner_id: UUID, field_id: UUID, file: UploadFile,
        create_care_case: bool = True,
    ) -> Diagnosis:
        with measure_stage("field_lookup"):
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

        with measure_stage("spooled_file_read"):
            content = file.file.read(maximum_bytes + 1)

        if len(content) > maximum_bytes:
            raise ValueError(
                f"Image must be smaller than {settings.max_upload_mb} MB"
            )

        with measure_stage("validation"):
            validated_image = validate_image_bytes(
                content=content,
                declared_content_type=file.content_type,
            )

        with measure_stage("storage"):
            stored = self.storage.save(
                content=content,
                suffix=validated_image.suffix,
            )

        diagnosis = Diagnosis(
            field_id=field_id,
            image_path=stored.path,
            original_filename=(
                file.filename
                or "crop-image"
            )[:255],
            status=DiagnosisStatus.UPLOADED,
        )

        try:
            with measure_stage("database_insert"):
                diagnosis = self.diagnoses.add(diagnosis)
        except Exception:
            self.storage.delete(
                stored.path
            )
            raise

        try:
            with measure_stage("inference_queue"):
                _inference_lock.acquire()
            try:
                with measure_stage("model_acquire"):
                    classifier = self.classifier if self.classifier is not None else get_classifier()
                prediction = classifier.predict(image_bytes=content, crop_name=field.crop_name)
            finally:
                _inference_lock.release()
        except Exception as exc:
            diagnosis.status = DiagnosisStatus.FAILED
            self.diagnoses.save(diagnosis)

            raise DiagnosisInferenceError(
                "Crop-health screening could not be completed"
            ) from exc

        diagnosis.status = DiagnosisStatus.ANALYZED
        diagnosis.predicted_label = prediction.label
        diagnosis.confidence = prediction.confidence
        diagnosis.severity = prediction.severity
        diagnosis.advisory = prediction.advisory
        diagnosis.inference_mode = str(
            getattr(
                classifier,
                "inference_mode",
                "development_stub",
            )
        )
        diagnosis.model_display_name = prediction.engine_name
        diagnosis.model_version = prediction.engine_version
        diagnosis.predicted_crop = prediction.predicted_crop
        diagnosis.confidence_level = prediction.confidence_level
        diagnosis.top_predictions = [
            {
                "raw_label": item.raw_label,
                "crop": item.crop,
                "disease": item.disease,
                "confidence": item.confidence,
            }
            for item in prediction.top_predictions
        ]
        diagnosis.is_uncertain = prediction.is_uncertain
        diagnosis.rejection_reason = prediction.rejection_reason

        with measure_stage("database_save"):
            diagnosis = self.diagnoses.save(diagnosis)

        if create_care_case:
            try:
                from app.services.care_case_service import CareCaseService

                with measure_stage("care_case"):
                    CareCaseService(self.diagnoses.db).create_or_update_from_diagnosis(
                        diagnosis=diagnosis, field=field, farmer_id=owner_id,
                    )
            except Exception:
                # A care-case workflow failure must never turn a successful
                # ML screening into an API failure. The diagnosis remains saved.
                pass

        return diagnosis

    def list(
        self,
        owner_id: UUID,
    ) -> list[Diagnosis]:
        return (
            self.diagnoses
            .list_for_owner(owner_id)
        )
