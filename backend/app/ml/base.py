from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class DiseasePrediction:
    label: str
    confidence: float
    severity: str
    advisory: str
    engine_name: str
    engine_version: str


class DiseaseClassifier(Protocol):
    def predict(
        self,
        *,
        image_bytes: bytes,
        crop_name: str,
    ) -> DiseasePrediction:
        """Return a crop-health prediction for a validated image."""