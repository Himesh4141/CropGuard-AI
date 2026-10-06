from __future__ import annotations

from io import BytesIO
import json
import math
import re
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageEnhance, ImageOps

from app.core.config import settings
from app.ml.base import DiseasePrediction, PredictionAlternative


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

    exact = CROP_ALIASES.get(normalized)
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
    elif (
        "spot" in normalized
        or "scab" in normalized
        or "scorch" in normalized
    ):
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
                "Field-robust metadata does not contain a valid class list"
            )

        self.class_names = [str(value) for value in class_names]
        self.image_size = int(metadata.get("image_size", 288))
        self.temperature = max(
            0.05,
            float(metadata.get("temperature", 1.0)),
        )

        policy = metadata.get("rejection_policy") or {}

        self.global_threshold = float(
            policy.get(
                "global_confidence_threshold",
                metadata.get(
                    "confidence_threshold",
                    settings.ml_min_confidence,
                ),
            )
        )

        self.per_class_thresholds = {
            int(key): float(value)
            for key, value in (
                policy.get("per_class_thresholds") or {}
            ).items()
        }

        self.minimum_margin = float(
            policy.get("minimum_top1_top2_margin", 0.04)
        )

        self.maximum_entropy = float(
            policy.get("maximum_normalized_entropy", 0.70)
        )

        self.engine_name = str(
            metadata.get(
                "model_name",
                "CropGuard Field-Robust Vision",
            )
        )

        self.engine_version = str(
            metadata.get(
                "model_version",
                "field-robust-v2",
            )
        )

        self.crop_to_indices: dict[str, list[int]] = {}

        for index, raw_label in enumerate(self.class_names):
            crop, _ = split_class_name(raw_label)
            self.crop_to_indices.setdefault(crop, []).append(index)

        self.supported_crops = tuple(sorted(self.crop_to_indices))

        self.session = ort.InferenceSession(
            str(self.model_path),
            providers=["CPUExecutionProvider"],
        )

        self.input_name = self.session.get_inputs()[0].name

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

        return (
            project_root
            / "ml"
            / "artifacts"
            / configured_path.name
        ).resolve()

    def predict(
        self,
        *,
        image_bytes: bytes,
        crop_name: str,
    ) -> DiseasePrediction:
        selected_crop = canonical_crop(crop_name)

        if selected_crop not in self.crop_to_indices:
            return DiseasePrediction(
                label="unsupported_crop",
                confidence=0.0,
                severity="unknown",
                advisory=(
                    f"CropGuard Field-Robust v2 does not have trained disease "
                    f"classes for '{crop_name}'."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=None,
                confidence_level="unsupported",
                is_uncertain=True,
                rejection_reason=f"Unsupported crop: {crop_name}",
            )

        tensors, quality_note = self._prepare_views(image_bytes)

        if not tensors:
            return DiseasePrediction(
                label="image_quality_check_failed",
                confidence=0.0,
                severity="unknown",
                advisory=(
                    f"{quality_note or 'The image contains too little usable detail.'} "
                    "CropGuard already attempted safe internal normalization."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=selected_crop,
                confidence_level="unusable",
                is_uncertain=True,
                rejection_reason=quality_note,
            )

        logits = self._ensemble_logits(tensors)
        probabilities = self._softmax(logits / self.temperature)

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

        predicted_crop = max(crop_scores, key=crop_scores.get)
        predicted_crop_score = crop_scores[predicted_crop]
        selected_crop_score = crop_scores[selected_crop]

        global_top = np.argsort(probabilities)[::-1][:3]

        if (
            predicted_crop != selected_crop
            and predicted_crop_score >= 0.70
            and selected_crop_score < 0.25
            and predicted_crop_score - selected_crop_score >= 0.35
        ):
            return DiseasePrediction(
                label="crop_mismatch",
                confidence=predicted_crop_score,
                severity="unknown",
                advisory=(
                    f"The selected field is '{selected_crop}', while this image "
                    f"most strongly resembles '{predicted_crop}'. CropGuard did not "
                    "force a disease diagnosis."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=predicted_crop,
                confidence_level="low",
                top_predictions=self._alternatives(
                    probabilities,
                    global_top,
                ),
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
            return DiseasePrediction(
                label="limited_crop_coverage",
                confidence=float(probabilities[int(selected_indices[0])]),
                severity="unknown",
                advisory=(
                    f"The current dataset has insufficient disease-class coverage "
                    f"for {selected_crop}; CropGuard will not force a diagnosis."
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
            np.argsort(probabilities[selected_indices])[::-1]
        ][:3]

        top_predictions = self._alternatives(
            probabilities,
            selected_sorted,
        )

        primary_index = int(selected_sorted[0])
        confidence = float(probabilities[primary_index])
        raw_label = self.class_names[primary_index]
        _, disease = split_class_name(raw_label)

        threshold = max(
            self.global_threshold,
            self.per_class_thresholds.get(
                primary_index,
                self.global_threshold,
            ),
        )

        second_confidence = (
            float(probabilities[int(selected_sorted[1])])
            if len(selected_sorted) > 1
            else 0.0
        )

        margin = confidence - second_confidence
        entropy = self._normalized_entropy(probabilities)

        reasons: list[str] = []

        if confidence < threshold:
            reasons.append(
                f"confidence {confidence:.1%} is below the "
                f"{threshold:.0%} threshold"
            )

        if margin < self.minimum_margin:
            reasons.append(
                "the leading disease possibilities are too close"
            )

        if entropy > self.maximum_entropy:
            reasons.append(
                "the model distribution remains too uncertain"
            )

        if reasons:
            return DiseasePrediction(
                label="uncertain_condition",
                confidence=confidence,
                severity="unknown",
                advisory=(
                    f"CropGuard found possible {selected_crop} conditions but is "
                    "not confident enough to present one as reliable. The system "
                    "already evaluated multiple views and normalized the image when "
                    "needed. Continue monitoring or request officer review if the "
                    "crop is worsening."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                predicted_crop=selected_crop,
                confidence_level="low",
                top_predictions=top_predictions,
                is_uncertain=True,
                rejection_reason="; ".join(reasons),
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
            confidence_level=(
                "high"
                if confidence >= 0.90
                else "moderate"
            ),
            top_predictions=top_predictions,
            is_uncertain=False,
            rejection_reason=None,
        )

    def _ensemble_logits(
        self,
        tensors: list[np.ndarray],
    ) -> np.ndarray:
        outputs: list[np.ndarray] = []

        for tensor in tensors:
            for view in (
                tensor,
                np.flip(tensor, axis=3).copy(),
                np.flip(tensor, axis=2).copy(),
            ):
                result = self.session.run(
                    None,
                    {self.input_name: view},
                )

                if not result:
                    raise RuntimeError(
                        "The ONNX model returned no outputs"
                    )

                outputs.append(
                    np.asarray(result[0], dtype=np.float32)[0]
                )

        return np.mean(
            np.stack(outputs, axis=0),
            axis=0,
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
    def _normalized_entropy(
        probabilities: np.ndarray,
    ) -> float:
        clipped = np.clip(probabilities, 1e-12, 1.0)
        entropy = -float(
            np.sum(clipped * np.log(clipped))
        )
        return entropy / math.log(len(probabilities))

    def _prepare_views(
        self,
        image_bytes: bytes,
    ) -> tuple[list[np.ndarray], str | None]:
        with Image.open(BytesIO(image_bytes)) as image:
            image = image.convert("RGB")

            if min(image.size) < 64:
                return (
                    [],
                    "The captured crop region is too small to recover safely.",
                )

            sample = np.asarray(
                image.resize((128, 128)).convert("L"),
                dtype=np.float32,
            )

            brightness = float(sample.mean())
            contrast = float(sample.std())

            if brightness < 4 or brightness > 252 or contrast < 1.5:
                return (
                    [],
                    "The image contains almost no recoverable visual detail.",
                )

            base_images = [image]
            quality_note: str | None = None

            # Non-generative normalization only. Original pixels remain in the ensemble.
            if brightness < 48 or brightness > 210 or contrast < 20:
                normalized = ImageOps.autocontrast(image, cutoff=0.5)
                normalized = ImageEnhance.Contrast(
                    normalized
                ).enhance(1.08)

                base_images.append(normalized)
                quality_note = "normalized"

            return (
                [
                    self._preprocess(item)
                    for item in base_images
                ],
                quality_note,
            )

    def _preprocess(
        self,
        image: Image.Image,
    ) -> np.ndarray:
        resize_short_side = int(
            round(self.image_size * 320 / 288)
        )

        width, height = image.size

        if width <= height:
            resized_width = resize_short_side
            resized_height = round(
                height * resize_short_side / width
            )
        else:
            resized_height = resize_short_side
            resized_width = round(
                width * resize_short_side / height
            )

        image = image.resize(
            (resized_width, resized_height),
            Image.Resampling.BILINEAR,
        )

        left = max(
            0,
            (resized_width - self.image_size) // 2,
        )
        top = max(
            0,
            (resized_height - self.image_size) // 2,
        )

        image = image.crop(
            (
                left,
                top,
                left + self.image_size,
                top + self.image_size,
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

        return np.expand_dims(
            array,
            axis=0,
        ).astype(np.float32)


OnnxTomatoDiseaseClassifier = OnnxMultiCropDiseaseClassifier