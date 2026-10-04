import hashlib

from app.ml.base import DiseasePrediction
from app.ml.labels import DEVELOPMENT_LABELS


class DevelopmentDiseaseClassifier:
    """
    Deterministic development-only classifier.

    This is intentionally NOT a trained ML model. It exists so the complete
    upload -> inference -> persistence -> UI workflow can be exercised safely
    before a validated crop-disease model is integrated.
    """

    engine_name = "CropGuard Development Simulator"
    engine_version = "dev-sim-1"
    inference_mode = "development_stub"

    def predict(
        self,
        *,
        image_bytes: bytes,
        crop_name: str,
    ) -> DiseasePrediction:
        digest = hashlib.sha256(
            crop_name.strip().lower().encode("utf-8") + b"|" + image_bytes
        ).digest()

        metadata = DEVELOPMENT_LABELS[digest[0] % len(DEVELOPMENT_LABELS)]

        simulated_confidence = round(
            0.72 + (digest[1] / 255.0) * 0.18,
            4,
        )

        return DiseasePrediction(
            label=metadata.label,
            confidence=simulated_confidence,
            severity=metadata.severity,
            advisory=metadata.advisory,
            engine_name=self.engine_name,
            engine_version=self.engine_version,
        )