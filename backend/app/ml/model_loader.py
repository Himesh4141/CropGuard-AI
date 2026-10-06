from functools import lru_cache

from app.core.config import settings
from app.ml.base import DiseaseClassifier
from app.ml.classifier import DevelopmentDiseaseClassifier
from app.ml.onnx_classifier import OnnxMultiCropDiseaseClassifier


@lru_cache
def get_classifier() -> DiseaseClassifier:
    """
    Return the configured inference engine.

    Automated tests use the deterministic development classifier so unit/API
    tests never depend on the external model artifact. Development and
    production environments use the trained ONNX multi-crop model.
    """
    if settings.environment == "test":
        return DevelopmentDiseaseClassifier()

    return OnnxMultiCropDiseaseClassifier()
