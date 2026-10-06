from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

from app.core.config import settings
from app.ml.base import DiseasePrediction


DEFAULT_CLASS_NAMES = [
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

CLASS_GUIDANCE: dict[str, tuple[str, str]] = {
    "Tomato___Bacterial_spot": (
        "moderate",
        "Inspect nearby tomato plants for similar lesions, avoid handling wet foliage, keep tools clean, and seek local agronomic confirmation before treatment.",
    ),
    "Tomato___Early_blight": (
        "moderate",
        "Inspect lower leaves for expanding concentric lesions, remove heavily affected debris where appropriate, reduce leaf wetness, and confirm locally before treatment.",
    ),
    "Tomato___Late_blight": (
        "high",
        "Inspect the field promptly for rapidly expanding water-soaked lesions, reduce prolonged leaf wetness where possible, isolate suspicious material, and seek urgent agronomic confirmation.",
    ),
    "Tomato___Leaf_Mold": (
        "moderate",
        "Check leaf undersides for mold growth, improve airflow and canopy ventilation, reduce prolonged humidity around foliage, and seek local agronomic confirmation.",
    ),
    "Tomato___Septoria_leaf_spot": (
        "moderate",
        "Inspect lower foliage for small spotted lesions, reduce splash and leaf wetness, remove heavily affected debris where appropriate, and seek local agronomic confirmation.",
    ),
    "Tomato___Spider_mites Two-spotted_spider_mite": (
        "moderate",
        "Inspect leaf undersides for mites and webbing, record pest pressure across nearby plants, and use local integrated pest-management guidance before intervention.",
    ),
    "Tomato___Target_Spot": (
        "moderate",
        "Inspect surrounding foliage for target-like lesions, improve airflow, limit unnecessary leaf wetness, and seek local agronomic confirmation before treatment.",
    ),
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": (
        "high",
        "Inspect plants for yellowing, curling and stunting, check for whitefly pressure, separate severely affected plants where locally recommended, and seek agronomic confirmation.",
    ),
    "Tomato___Tomato_mosaic_virus": (
        "high",
        "Inspect for mosaic patterns and distortion, avoid unnecessary plant handling, sanitize tools between plants, and seek local agronomic confirmation because viral symptoms can overlap.",
    ),
    "Tomato___healthy": (
        "low",
        "No disease class was selected by the prototype model. Continue routine scouting and re-check if visible symptoms develop.",
    ),
}

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


class OnnxTomatoDiseaseClassifier:
    engine_name = "CropGuard Tomato MobileNetV3 Prototype"
    inference_mode = "onnx_model"

    def __init__(self) -> None:
        project_root = Path(__file__).resolve().parents[3]

        model_path = settings.ml_model_path

        if not model_path.is_absolute():
            configured_model_path = (
                project_root / model_path
            ).resolve()

            repo_model_path = (
                project_root
                / "ml"
                / "artifacts"
                / model_path.name
            )

            model_path = (
                configured_model_path
                if configured_model_path.exists()
                else repo_model_path
            )

        metadata_path = settings.ml_metadata_path

        if not metadata_path.is_absolute():
            configured_metadata_path = (
                project_root / metadata_path
            ).resolve()

            repo_metadata_path = (
                project_root
                / "ml"
                / "artifacts"
                / metadata_path.name
            )

            metadata_path = (
                configured_metadata_path
                if configured_metadata_path.exists()
                else repo_metadata_path
            )

        if not model_path.exists():
            raise FileNotFoundError(
                f"CropGuard ML model was not found: {model_path}"
            )

        metadata: dict = {}

        if metadata_path.exists():
            metadata = json.loads(
                metadata_path.read_text(
                    encoding="utf-8",
                )
            )

        class_names = metadata.get(
            "classes",
            DEFAULT_CLASS_NAMES,
        )

        if (
            not isinstance(class_names, list)
            or not class_names
        ):
            raise RuntimeError(
                "Model metadata does not contain a valid class list"
            )

        self.class_names = [
            str(value)
            for value in class_names
        ]

        architecture = str(
            metadata.get(
                "architecture",
                "mobilenet_v3_small",
            )
        )

        self.engine_version = str(
            metadata.get(
                "model_version",
                f"{architecture}-prototype",
            )
        )

        self.session = ort.InferenceSession(
            str(model_path),
            providers=[
                "CPUExecutionProvider",
            ],
        )

        self.input_name = (
            self.session
            .get_inputs()[0]
            .name
        )

    def predict(
        self,
        *,
        image_bytes: bytes,
        crop_name: str,
    ) -> DiseasePrediction:
        if "tomato" not in crop_name.strip().lower():
            raise ValueError(
                "The current trained prototype model supports Tomato fields only"
            )

        input_tensor = self._prepare_image(
            image_bytes,
        )

        outputs = self.session.run(
            None,
            {
                self.input_name:
                    input_tensor,
            },
        )

        if not outputs:
            raise RuntimeError(
                "The ONNX model returned no outputs"
            )

        logits = np.asarray(
            outputs[0],
            dtype=np.float32,
        )

        if logits.ndim != 2 or logits.shape[0] != 1:
            raise RuntimeError(
                "Unexpected ONNX output shape"
            )

        if logits.shape[1] != len(self.class_names):
            raise RuntimeError(
                "Model output size does not match configured class names"
            )

        probabilities = self._softmax(
            logits[0],
        )

        index = int(
            np.argmax(
                probabilities,
            )
        )

        confidence = float(
            probabilities[
                index
            ]
        )

        label = self.class_names[
            index
        ]

        if confidence < settings.ml_min_confidence:
            return DiseasePrediction(
                label="uncertain_tomato_condition",
                confidence=confidence,
                severity="unknown",
                advisory=(
                    "The prototype model is not confident enough to assign a disease class. "
                    "Capture a clear, well-lit image of one affected tomato leaf and seek local agronomic confirmation."
                ),
                engine_name=self.engine_name,
                engine_version=self.engine_version,
            )

        severity, advisory = (
            CLASS_GUIDANCE.get(
                label,
                (
                    "moderate",
                    "Inspect the affected crop carefully and seek local agronomic confirmation before treatment.",
                ),
            )
        )

        return DiseasePrediction(
            label=label,
            confidence=confidence,
            severity=severity,
            advisory=advisory,
            engine_name=self.engine_name,
            engine_version=self.engine_version,
        )

    @staticmethod
    def _softmax(
        logits: np.ndarray,
    ) -> np.ndarray:
        shifted = (
            logits
            - np.max(
                logits,
            )
        )

        exponentials = np.exp(
            shifted,
        )

        return (
            exponentials
            / np.sum(
                exponentials,
            )
        )

    @staticmethod
    def _prepare_image(
        image_bytes: bytes,
    ) -> np.ndarray:
        with Image.open(
            BytesIO(
                image_bytes,
            )
        ) as image:
            image = image.convert(
                "RGB",
            )

            width, height = (
                image.size
            )

            if width <= height:
                resized_width = (
                    RESIZE_SHORT_SIDE
                )

                resized_height = round(
                    height
                    * RESIZE_SHORT_SIDE
                    / width
                )
            else:
                resized_height = (
                    RESIZE_SHORT_SIDE
                )

                resized_width = round(
                    width
                    * RESIZE_SHORT_SIDE
                    / height
                )

            image = image.resize(
                (
                    resized_width,
                    resized_height,
                ),
                Image.Resampling.BILINEAR,
            )

            left = (
                resized_width
                - IMAGE_SIZE
            ) // 2

            top = (
                resized_height
                - IMAGE_SIZE
            ) // 2

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
            )

        array = (
            array
            / 255.0
        )

        array = (
            array
            - IMAGENET_MEAN
        ) / IMAGENET_STD

        array = np.transpose(
            array,
            (
                2,
                0,
                1,
            ),
        )

        return np.expand_dims(
            array,
            axis=0,
        ).astype(
            np.float32,
            copy=False,
        )