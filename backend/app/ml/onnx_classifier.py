from __future__ import annotations

from io import BytesIO
import json
import re
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

from app.core.config import settings
from app.ml.base import DiseasePrediction, PredictionAlternative


IMAGE_SIZE = 224
RESIZE_SHORT_SIDE = 256

IMAGENET_MEAN = np.asarray(
    [0.485, 0.456, 0.406],
    dtype=np.float32,
).reshape(1, 1, 3)

IMAGENET_STD = np.asarray(
    [0.229, 0.224, 0.225],
    dtype=np.float32,
).reshape(1, 1, 3)


CROP_ALIASES = {
    "apple": "Apple",
    "blueberry": "Blueberry",
    "cherry": "Cherry",
    "cherry including sour": "Cherry",
    "corn": "Corn",
    "maize": "Corn",
    "corn maize": "Corn",
    "grape": "Grape",
    "orange": "Orange",
    "peach": "Peach",
    "pepper": "Bell Pepper",
    "bell pepper": "Bell Pepper",
    "pepper bell": "Bell Pepper",
    "potato": "Potato",
    "raspberry": "Raspberry",
    "soybean": "Soybean",
    "squash": "Squash",
    "strawberry": "Strawberry",
    "tomato": "Tomato",
}


def _normalize_words(value: str) -> str:
    normalized = re.sub(
        r"[^a-z0-9]+",
        " ",
        value.strip().lower(),
    )
    return " ".join(normalized.split())


def canonical_crop(value: str) -> str:
    normalized = _normalize_words(value)

    exact = CROP_ALIASES.get(
        normalized
    )
    if exact is not None:
        return exact

    for alias in sorted(
        CROP_ALIASES,
        key=len,
        reverse=True,
    ):
        if alias in normalized:
            return CROP_ALIASES[alias]

    return value.replace("_", " ").strip().title()


def split_class_name(raw_label: str) -> tuple[str, str]:
    if "___" not in raw_label:
        return canonical_crop(raw_label), raw_label

    raw_crop, raw_disease = raw_label.split("___", 1)
    crop = canonical_crop(raw_crop)

    disease = (
        raw_disease
        .replace("_", " ")
        .replace("  ", " ")
        .strip()
    )

    if disease.lower() == "healthy":
        disease = "Healthy"

    return crop, disease


def severity_and_advisory(
    *,
    crop: str,
    disease: str,
) -> tuple[str, str]:
    normalized = disease.lower()

    if normalized == "healthy":
        return (
            "low",
            (
                f"No supported {crop} disease class was selected with sufficient "
                "confidence. Continue routine scouting and re-screen if symptoms "
                "develop or worsen."
            ),
        )

    high_risk_terms = (
        "late blight",
        "yellow leaf curl virus",
        "mosaic virus",
        "haunglongbing",
        "citrus greening",
        "esca",
    )

    severity = (
        "high"
        if any(term in normalized for term in high_risk_terms)
        else "moderate"
    )

    if "virus" in normalized:
        guidance = (
            "Avoid unnecessary plant handling, sanitize tools between plants, "
            "inspect nearby plants and likely insect vectors, and seek local "
            "agronomic confirmation because viral symptoms can overlap."
        )
    elif "blight" in normalized:
        guidance = (
            "Inspect nearby foliage for expanding lesions, reduce prolonged leaf "
            "wetness where practical, remove heavily affected debris when locally "
            "recommended, and confirm locally before treatment."
        )
    elif "bacterial" in normalized:
        guidance = (
            "Inspect nearby plants for similar lesions, avoid working wet foliage, "
            "keep tools clean, reduce splash where practical, and seek local "
            "agronomic confirmation before treatment."
        )
    elif "rust" in normalized:
        guidance = (
            "Inspect both leaf surfaces for additional rust lesions, improve canopy "
            "airflow where practical, monitor spread, and confirm locally before "
            "treatment."
        )
    elif "powdery mildew" in normalized:
        guidance = (
            "Inspect surrounding foliage for powdery growth, improve airflow, avoid "
            "excess canopy humidity where practical, and confirm locally before "
            "treatment."
        )
    elif "mite" in normalized:
        guidance = (
            "Inspect leaf undersides for mites, eggs and webbing, record pest pressure "
            "across nearby plants, and use local integrated pest-management guidance."
        )
    elif "spot" in normalized or "scab" in normalized or "scorch" in normalized:
        guidance = (
            "Inspect surrounding leaves for similar lesions, reduce unnecessary leaf "
            "wetness and splash, remove heavily affected debris where appropriate, "
            "and seek local agronomic confirmation."
        )
    elif "black rot" in normalized:
        guidance = (
            "Inspect nearby leaves and fruit for additional lesions, remove heavily "
            "affected debris where locally appropriate, reduce prolonged moisture, "
            "and seek local agronomic confirmation."
        )
    else:
        guidance = (
            "Inspect the affected crop carefully, compare symptoms across nearby "
            "plants, document progression, and seek local agronomic confirmation "
            "before treatment."
        )

    return severity, guidance


class OnnxMultiCropDiseaseClassifier:
    engine_name = "CropGuard Multi-Crop MobileNetV3"
    inference_mode = "onnx_model"

    def __init__(self) -> None:
        project_root = Path(__file__).resolve().parents[3]

        self.model_path = self._resolve_artifact(
            project_root,
            settings.ml_model_path,
        )
        self.metadata_path = self._resolve_artifact(
            project_root,
            settings.ml_metadata_path,
        )

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"CropGuard ML model was not found: {self.model_path}"
            )

        if not self.metadata_path.exists():
            raise FileNotFoundError(
                f"CropGuard ML metadata was not found: {self.metadata_path}"
            )

        metadata = json.loads(
            self.metadata_path.read_text(encoding="utf-8")
        )

        class_names = metadata.get("classes")

        if (
            not isinstance(class_names, list)
            or len(class_names) < 2
        ):
            raise RuntimeError(
                "Multi-crop metadata does not contain a valid class list"
            )

        self.class_names = [
            str(value)
            for value in class_names
        ]

        self.temperature = max(
            0.05,
            float(metadata.get("temperature", 1.0)),
        )

        self.confidence_threshold = float(
            metadata.get(
                "confidence_threshold",
                settings.ml_min_confidence,
            )
        )

        self.engine_version = str(
            metadata.get(
                "model_version",
                "multicrop-v1",
            )
        )

        self.crop_to_indices: dict[str, list[int]] = {}

        for index, raw_label in enumerate(self.class_names):
            crop, _ = split_class_name(raw_label)
            self.crop_to_indices.setdefault(
                crop,
                [],
            ).append(index)

        self.supported_crops = tuple(
            sorted(self.crop_to_indices)
        )

        self.session = ort.InferenceSession(
            str(self.model_path),
            providers=["CPUExecutionProvider"],
        )

        self.input_name = self.session.get_inputs()[0].name

        output_shape = self.session.get_outputs()[0].shape
        if (
            output_shape
            and isinstance(output_shape[-1], int)
            and output_shape[-1] != len(self.class_names)
        ):
            raise RuntimeError(
                "ONNX output size does not match metadata class count"
            )

    @staticmethod
    def _resolve_artifact(
        project_root: Path,
        configured_path: Path,
    ) -> Path:
        if configured_path.is_absolute():
            return configured_path

        direct = (project_root / configured_path).resolve()
        if direct.exists():
            return direct

        fallback = (
            project_root
            / "ml"
            / "artifacts"
            / configured_path.name
        ).resolve()

        return fallback

    def predict(
        self,
        *,
        image_bytes: bytes,
        crop_name: str,
    ) -> DiseasePrediction:
        selected_crop = canonical_crop(crop_name)

        if selected_crop not in self.crop_to_indices:
            supported = ", ".join(self.supported_crops)
            return DiseasePrediction(
                label="unsupported_crop",
                confidence=0.0,
                severity="unknown",
                advisory=(
                    f"CropGuard Multi-Crop v1 does not have validated training "
                    f"classes for '{crop_name}'. Supported dataset crops are: "
                    f"{supported}."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=None,
                confidence_level="unsupported",
                is_uncertain=True,
                rejection_reason=(
                    f"Unsupported crop: {crop_name}"
                ),
            )

        input_tensor, quality_issue = self._prepare_image(
            image_bytes
        )

        if quality_issue:
            return DiseasePrediction(
                label="image_quality_check_failed",
                confidence=0.0,
                severity="unknown",
                advisory=(
                    f"{quality_issue} Retake a clear, well-lit crop image with the "
                    "affected leaf or plant area filling most of the frame."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=selected_crop,
                confidence_level="unusable",
                is_uncertain=True,
                rejection_reason=quality_issue,
            )

        outputs = self.session.run(
            None,
            {self.input_name: input_tensor},
        )

        if not outputs:
            raise RuntimeError(
                "The ONNX model returned no outputs"
            )

        logits = np.asarray(
            outputs[0],
            dtype=np.float32,
        )

        if (
            logits.ndim != 2
            or logits.shape[0] != 1
            or logits.shape[1] != len(self.class_names)
        ):
            raise RuntimeError(
                "Unexpected ONNX output shape"
            )

        probabilities = self._softmax(
            logits[0] / self.temperature
        )

        crop_scores = {
            crop: float(
                np.sum(
                    probabilities[
                        np.asarray(indices, dtype=np.int64)
                    ]
                )
            )
            for crop, indices in self.crop_to_indices.items()
        }

        predicted_crop = max(
            crop_scores,
            key=crop_scores.get,
        )

        predicted_crop_score = crop_scores[predicted_crop]
        selected_crop_score = crop_scores[selected_crop]

        global_top_indices = np.argsort(
            probabilities
        )[::-1][:3]

        if (
            predicted_crop != selected_crop
            and predicted_crop_score >= 0.70
            and selected_crop_score < 0.25
            and (
                predicted_crop_score
                - selected_crop_score
            ) >= 0.35
        ):
            alternatives = self._alternatives(
                probabilities,
                global_top_indices,
            )

            return DiseasePrediction(
                label="crop_mismatch",
                confidence=predicted_crop_score,
                severity="unknown",
                advisory=(
                    f"The selected field is '{selected_crop}', but this image "
                    f"most strongly resembles '{predicted_crop}' in the current "
                    "model. Verify the field selection or upload the correct crop "
                    "image before screening."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=predicted_crop,
                confidence_level=self._confidence_level(
                    predicted_crop_score
                ),
                top_predictions=alternatives,
                is_uncertain=True,
                rejection_reason=(
                    f"Field crop '{selected_crop}' does not match model crop "
                    f"'{predicted_crop}'."
                ),
            )

        selected_indices = np.asarray(
            self.crop_to_indices[selected_crop],
            dtype=np.int64,
        )

        if len(selected_indices) < 2:
            only_index = int(selected_indices[0])
            only_label = self.class_names[only_index]
            _, only_disease = split_class_name(only_label)

            return DiseasePrediction(
                label="limited_crop_coverage",
                confidence=float(probabilities[only_index]),
                severity="unknown",
                advisory=(
                    f"The current PlantVillage training data contains only one "
                    f"screening class for {selected_crop} ({only_disease}). "
                    "CropGuard will not make a definitive diagnosis for this crop "
                    "until broader healthy/disease field data is added."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=selected_crop,
                confidence_level="limited",
                top_predictions=self._alternatives(
                    probabilities,
                    selected_indices,
                ),
                is_uncertain=True,
                rejection_reason=(
                    f"Insufficient class coverage for {selected_crop}."
                ),
            )

        selected_sorted = selected_indices[
            np.argsort(
                probabilities[selected_indices]
            )[::-1]
        ][:3]

        top_predictions = self._alternatives(
            probabilities,
            selected_sorted,
        )

        primary_index = int(selected_sorted[0])
        confidence = float(probabilities[primary_index])
        raw_label = self.class_names[primary_index]
        _, disease = split_class_name(raw_label)

        confidence_level = self._confidence_level(
            confidence
        )

        if confidence < self.confidence_threshold:
            return DiseasePrediction(
                label="uncertain_condition",
                confidence=confidence,
                severity="unknown",
                advisory=(
                    "The model is not confident enough to assign a supported "
                    f"{selected_crop} disease class. Retake a closer, well-lit "
                    "image of the affected area or request an extension-officer "
                    "review."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=selected_crop,
                confidence_level="low",
                top_predictions=top_predictions,
                is_uncertain=True,
                rejection_reason=(
                    f"Confidence {confidence:.1%} is below the calibrated "
                    f"{self.confidence_threshold:.0%} threshold."
                ),
            )

        severity, advisory = severity_and_advisory(
            crop=selected_crop,
            disease=disease,
        )

        return DiseasePrediction(
            label=raw_label,
            confidence=confidence,
            severity=severity,
            advisory=advisory,
            engine_name=self.engine_name,
            engine_version=self.engine_version,
            predicted_crop=selected_crop,
            confidence_level=confidence_level,
            top_predictions=top_predictions,
            is_uncertain=False,
            rejection_reason=None,
        )

    def _alternatives(
        self,
        probabilities: np.ndarray,
        indices: np.ndarray,
    ) -> tuple[PredictionAlternative, ...]:
        results: list[PredictionAlternative] = []

        for raw_index in indices[:3]:
            index = int(raw_index)
            raw_label = self.class_names[index]
            crop, disease = split_class_name(raw_label)

            results.append(
                PredictionAlternative(
                    raw_label=raw_label,
                    crop=crop,
                    disease=disease,
                    confidence=float(probabilities[index]),
                )
            )

        return tuple(results)

    def _confidence_level(
        self,
        confidence: float,
    ) -> str:
        if confidence >= 0.90:
            return "high"
        if confidence >= self.confidence_threshold:
            return "moderate"
        return "low"

    @staticmethod
    def _softmax(
        logits: np.ndarray,
    ) -> np.ndarray:
        shifted = logits - np.max(logits)
        exponentials = np.exp(shifted)
        denominator = np.sum(exponentials)

        if not np.isfinite(denominator) or denominator <= 0:
            raise RuntimeError(
                "Invalid probability distribution from model"
            )

        return exponentials / denominator

    @staticmethod
    def _prepare_image(
        image_bytes: bytes,
    ) -> tuple[np.ndarray, str | None]:
        with Image.open(BytesIO(image_bytes)) as image:
            image = image.convert("RGB")

            quality_sample = np.asarray(
                image.resize((128, 128)).convert("L"),
                dtype=np.float32,
            )

            brightness = float(quality_sample.mean())
            contrast = float(quality_sample.std())

            quality_issue: str | None = None

            if brightness < 18:
                quality_issue = "The image is too dark for reliable screening."
            elif brightness > 248:
                quality_issue = "The image is too bright for reliable screening."
            elif contrast < 6:
                quality_issue = (
                    "The image has too little visual contrast for reliable screening."
                )

            width, height = image.size

            if width <= height:
                resized_width = RESIZE_SHORT_SIDE
                resized_height = round(
                    height * RESIZE_SHORT_SIDE / width
                )
            else:
                resized_height = RESIZE_SHORT_SIDE
                resized_width = round(
                    width * RESIZE_SHORT_SIDE / height
                )

            image = image.resize(
                (resized_width, resized_height),
                Image.Resampling.BILINEAR,
            )

            left = max(
                0,
                (resized_width - IMAGE_SIZE) // 2,
            )
            top = max(
                0,
                (resized_height - IMAGE_SIZE) // 2,
            )

            image = image.crop(
                (
                    left,
                    top,
                    left + IMAGE_SIZE,
                    top + IMAGE_SIZE,
                )
            )

            array = np.asarray(
                image,
                dtype=np.float32,
            ) / 255.0

        array = (
            array - IMAGENET_MEAN
        ) / IMAGENET_STD

        array = np.transpose(
            array,
            (2, 0, 1),
        )

        return (
            np.expand_dims(
                array,
                axis=0,
            ).astype(np.float32),
            quality_issue,
        )


# Backward-compatible name for any existing imports.
OnnxTomatoDiseaseClassifier = OnnxMultiCropDiseaseClassifier
