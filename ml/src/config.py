"""CropGuard tomato disease model configuration."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_ROOT = (
    PROJECT_ROOT
    / "data"
    / "PlantVillage-Dataset"
    / "raw"
    / "color"
)

ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"

CHECKPOINT_PATH = ARTIFACTS_DIR / "tomato_disease_model.pt"
ONNX_PATH = ARTIFACTS_DIR / "tomato_disease_model.onnx"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
CONFUSION_MATRIX_PATH = ARTIFACTS_DIR / "confusion_matrix.png"

IMAGE_SIZE = 224

DEFAULT_BATCH_SIZE = 32
DEFAULT_EPOCHS = 8
DEFAULT_LEARNING_RATE = 1e-3

TRAIN_RATIO = 0.80
VALIDATION_RATIO = 0.10
TEST_RATIO = 0.10

RANDOM_SEED = 42

IMAGENET_MEAN = (
    0.485,
    0.456,
    0.406,
)

IMAGENET_STD = (
    0.229,
    0.224,
    0.225,
)

TOMATO_PREFIX = "Tomato___"
