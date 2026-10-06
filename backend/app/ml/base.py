from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class PredictionAlternative:
    raw_label: str
    crop: str
    disease: str
    confidence: float


@dataclass(frozen=True, slots=True)
class DiseasePrediction:
    label: str
    confidence: float
    severity: str
    advisory: str
    engine_name: str
    engine_version: str
    predicted_crop: str | None = None
    confidence_level: str | None = None
    top_predictions: tuple[PredictionAlternative, ...] = ()
    is_uncertain: bool = False
    rejection_reason: str | None = None


class DiseaseClassifier:
    def predict(
        self,
        *,
        image_bytes: bytes,
        crop_name: str,
    ) -> DiseasePrediction:
        """Return a crop-health prediction for a validated image."""
        raise NotImplementedError
