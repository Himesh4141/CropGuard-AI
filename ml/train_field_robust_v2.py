from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from io import BytesIO
import json
import math
import random
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Subset, WeightedRandomSampler
from torchvision import datasets, models, transforms
from torchvision.models import MobileNet_V3_Large_Weights, MobileNet_V3_Small_Weights
from tqdm import tqdm


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data" / "PlantVillage-Dataset" / "raw" / "color"
ARTIFACT_DIR = ROOT / "artifacts" / "field_robust_v2"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

BEST_MODEL = ARTIFACT_DIR / "cropguard_field_robust_v2_best.pt"
ONNX_MODEL = ARTIFACT_DIR / "cropguard_field_robust_v2.onnx"
METADATA_FILE = ARTIFACT_DIR / "cropguard_field_robust_v2_metadata.json"
REPORT_FILE = ARTIFACT_DIR / "cropguard_field_robust_v2_evaluation.json"

V1_CHECKPOINT = ROOT / "artifacts" / "multicrop_best.pt"
V1_METADATA = ROOT / "artifacts" / "multicrop_metadata.json"

SEED = 4141
IMAGE_SIZE = 288
V1_IMAGE_SIZE = 224
BATCH_SIZE = 48
HEAD_EPOCHS = 3
FINETUNE_EPOCHS = 15
EARLY_STOPPING_PATIENCE = 5
NUM_WORKERS = 4
TARGET_ACCEPTED_ACCURACY = 0.995
MIN_CLASS_ACCEPTED = 20

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.cuda.manual_seed_all(SEED)
torch.backends.cudnn.benchmark = True

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
if DEVICE.type != "cuda":
    raise RuntimeError("CUDA is required for this training run.")


def canonical_crop(raw: str) -> str:
    mapping = {
        "Apple": "Apple",
        "Blueberry": "Blueberry",
        "Cherry_(including_sour)": "Cherry",
        "Corn_(maize)": "Corn",
        "Grape": "Grape",
        "Orange": "Orange",
        "Peach": "Peach",
        "Pepper,_bell": "Bell Pepper",
        "Potato": "Potato",
        "Raspberry": "Raspberry",
        "Soybean": "Soybean",
        "Squash": "Squash",
        "Strawberry": "Strawberry",
        "Tomato": "Tomato",
    }
    return mapping.get(raw, raw.replace("_", " "))


def split_class_name(name: str) -> tuple[str, str]:
    if "___" not in name:
        return canonical_crop(name), "Unknown"
    raw_crop, disease = name.split("___", 1)
    disease = disease.replace("_", " ").replace("  ", " ").strip()
    if disease.lower() == "healthy":
        disease = "Healthy"
    return canonical_crop(raw_crop), disease


class PhoneCameraDegradation:
    """
    Simulates common low-cost phone capture conditions without generating
    synthetic lesion texture. This changes exposure/compression/resolution,
    but never invents disease structures.
    """

    def __init__(self, p: float = 0.40) -> None:
        self.p = p

    def __call__(self, image: Image.Image) -> Image.Image:
        if random.random() > self.p:
            return image

        image = ImageEnhance.Brightness(image).enhance(
            random.uniform(0.55, 1.35)
        )
        image = ImageEnhance.Contrast(image).enhance(
            random.uniform(0.72, 1.25)
        )
        image = ImageEnhance.Color(image).enhance(
            random.uniform(0.75, 1.20)
        )

        if random.random() < 0.45:
            image = ImageEnhance.Sharpness(image).enhance(
                random.uniform(0.55, 1.30)
            )

        if random.random() < 0.35:
            image = image.filter(
                ImageFilter.GaussianBlur(
                    radius=random.uniform(0.25, 1.25)
                )
            )

        if random.random() < 0.55:
            width, height = image.size
            scale = random.uniform(0.55, 0.90)
            small = image.resize(
                (
                    max(32, int(width * scale)),
                    max(32, int(height * scale)),
                ),
                Image.Resampling.BILINEAR,
            )
            image = small.resize(
                (width, height),
                Image.Resampling.BILINEAR,
            )

        if random.random() < 0.65:
            buffer = BytesIO()
            image.save(
                buffer,
                format="JPEG",
                quality=random.randint(35, 82),
                optimize=False,
            )
            buffer.seek(0)
            with Image.open(buffer) as compressed:
                image = compressed.convert("RGB")

        return image


class DeterministicFieldStress:
    """
    Reproducible synthetic stress test. It is only a robustness proxy,
    not a substitute for an independent real-field benchmark.
    """

    def __init__(self, image_size: int) -> None:
        self.image_size = image_size

    def __call__(self, image: Image.Image) -> torch.Tensor:
        image = image.convert("RGB")
        image = ImageEnhance.Brightness(image).enhance(0.63)
        image = ImageEnhance.Contrast(image).enhance(0.82)
        image = ImageEnhance.Color(image).enhance(0.82)
        image = image.filter(ImageFilter.GaussianBlur(radius=0.85))

        width, height = image.size
        small = image.resize(
            (
                max(48, int(width * 0.58)),
                max(48, int(height * 0.58)),
            ),
            Image.Resampling.BILINEAR,
        )
        image = small.resize(
            (width, height),
            Image.Resampling.BILINEAR,
        )

        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=42)
        buffer.seek(0)
        with Image.open(buffer) as compressed:
            image = compressed.convert("RGB")

        resize_to = int(round(self.image_size * 1.14))
        image = transforms.functional.resize(
            image,
            resize_to,
            interpolation=transforms.InterpolationMode.BILINEAR,
        )
        image = transforms.functional.center_crop(
            image,
            [self.image_size, self.image_size],
        )
        tensor = transforms.functional.to_tensor(image)
        tensor = transforms.functional.normalize(
            tensor,
            IMAGENET_MEAN,
            IMAGENET_STD,
        )
        return tensor


def build_transforms() -> tuple[transforms.Compose, transforms.Compose]:
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(
                IMAGE_SIZE,
                scale=(0.50, 1.00),
                ratio=(0.72, 1.38),
                interpolation=transforms.InterpolationMode.BILINEAR,
            ),
            transforms.RandomHorizontalFlip(p=0.50),
            transforms.RandomVerticalFlip(p=0.15),
            transforms.RandomRotation(
                24,
                interpolation=transforms.InterpolationMode.BILINEAR,
            ),
            transforms.RandomPerspective(
                distortion_scale=0.16,
                p=0.22,
                interpolation=transforms.InterpolationMode.BILINEAR,
            ),
            transforms.RandomApply(
                [
                    transforms.ColorJitter(
                        brightness=0.30,
                        contrast=0.28,
                        saturation=0.25,
                        hue=0.045,
                    )
                ],
                p=0.82,
            ),
            transforms.RandomAutocontrast(p=0.18),
            transforms.RandomApply(
                [transforms.GaussianBlur(5, sigma=(0.10, 1.45))],
                p=0.22,
            ),
            PhoneCameraDegradation(p=0.42),
            transforms.ToTensor(),
            transforms.RandomErasing(
                p=0.18,
                scale=(0.015, 0.10),
                ratio=(0.35, 2.8),
                value="random",
            ),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )

    eval_transform = transforms.Compose(
        [
            transforms.Resize(
                320,
                interpolation=transforms.InterpolationMode.BILINEAR,
            ),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )

    return train_transform, eval_transform


@dataclass
class DataBundle:
    classes: list[str]
    train_loader: DataLoader
    val_loader: DataLoader
    test_loader: DataLoader
    stress_loader: DataLoader
    train_indices: np.ndarray
    val_indices: np.ndarray
    test_indices: np.ndarray


def create_datasets() -> DataBundle:
    train_transform, eval_transform = build_transforms()

    base = datasets.ImageFolder(DATA_DIR)
    labels = np.asarray(base.targets)
    indices = np.arange(len(base))

    train_indices, temp_indices = train_test_split(
        indices,
        test_size=0.30,
        stratify=labels,
        random_state=SEED,
    )

    val_indices, test_indices = train_test_split(
        temp_indices,
        test_size=0.50,
        stratify=labels[temp_indices],
        random_state=SEED,
    )

    train_base = datasets.ImageFolder(
        DATA_DIR,
        transform=train_transform,
    )
    val_base = datasets.ImageFolder(
        DATA_DIR,
        transform=eval_transform,
    )
    test_base = datasets.ImageFolder(
        DATA_DIR,
        transform=eval_transform,
    )
    stress_base = datasets.ImageFolder(
        DATA_DIR,
        transform=DeterministicFieldStress(IMAGE_SIZE),
    )

    train_labels = labels[train_indices]
    counts = Counter(train_labels.tolist())
    sample_weights = [
        1.0 / counts[int(label)]
        for label in train_labels
    ]

    sampler = WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True,
    )

    common = dict(
        num_workers=NUM_WORKERS,
        pin_memory=True,
        persistent_workers=(NUM_WORKERS > 0),
    )

    return DataBundle(
        classes=base.classes,
        train_loader=DataLoader(
            Subset(train_base, train_indices.tolist()),
            batch_size=BATCH_SIZE,
            sampler=sampler,
            **common,
        ),
        val_loader=DataLoader(
            Subset(val_base, val_indices.tolist()),
            batch_size=BATCH_SIZE,
            shuffle=False,
            **common,
        ),
        test_loader=DataLoader(
            Subset(test_base, test_indices.tolist()),
            batch_size=BATCH_SIZE,
            shuffle=False,
            **common,
        ),
        stress_loader=DataLoader(
            Subset(stress_base, test_indices.tolist()),
            batch_size=BATCH_SIZE,
            shuffle=False,
            **common,
        ),
        train_indices=train_indices,
        val_indices=val_indices,
        test_indices=test_indices,
    )


def build_v2_model(num_classes: int) -> nn.Module:
    model = models.mobilenet_v3_large(
        weights=MobileNet_V3_Large_Weights.DEFAULT,
    )
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, num_classes)
    return model


def build_v1_model(num_classes: int) -> nn.Module:
    model = models.mobilenet_v3_small(weights=None)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, num_classes)
    return model


def set_backbone_trainable(model: nn.Module, trainable: bool) -> None:
    for parameter in model.features.parameters():
        parameter.requires_grad = trainable
    for parameter in model.classifier.parameters():
        parameter.requires_grad = True


def make_optimizer(
    model: nn.Module,
    lr: float,
    weight_decay: float = 1e-4,
) -> torch.optim.Optimizer:
    return torch.optim.AdamW(
        [p for p in model.parameters() if p.requires_grad],
        lr=lr,
        weight_decay=weight_decay,
    )


def run_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer | None,
    scaler: torch.amp.GradScaler,
) -> tuple[float, float]:
    training = optimizer is not None
    model.train(training)

    total_loss = 0.0
    correct = 0
    total = 0

    progress = tqdm(
        loader,
        leave=False,
        desc="train" if training else "valid",
    )

    for images, labels in progress:
        images = images.to(DEVICE, non_blocking=True)
        labels = labels.to(DEVICE, non_blocking=True)

        if training:
            optimizer.zero_grad(set_to_none=True)

        with torch.autocast(
            device_type="cuda",
            dtype=torch.float16,
            enabled=True,
        ):
            logits = model(images)
            loss = criterion(logits, labels)

        if training:
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            scaler.step(optimizer)
            scaler.update()

        total_loss += loss.item() * images.size(0)
        predictions = logits.argmax(dim=1)
        correct += (predictions == labels).sum().item()
        total += images.size(0)

        progress.set_postfix(
            loss=f"{loss.item():.4f}",
            acc=f"{correct / total:.4f}",
        )

    return total_loss / total, correct / total


@torch.no_grad()
def collect_logits(
    model: nn.Module,
    loader: DataLoader,
    *,
    tta: bool,
) -> tuple[torch.Tensor, torch.Tensor]:
    model.eval()

    logits_all: list[torch.Tensor] = []
    labels_all: list[torch.Tensor] = []

    for images, labels in tqdm(loader, leave=False, desc="evaluate"):
        images = images.to(DEVICE, non_blocking=True)

        logits = model(images)

        if tta:
            logits_h = model(torch.flip(images, dims=[3]))
            logits_v = model(torch.flip(images, dims=[2]))
            logits = (logits + logits_h + logits_v) / 3.0

        logits_all.append(logits.cpu())
        labels_all.append(labels.cpu())

    return torch.cat(logits_all), torch.cat(labels_all)


def fit_temperature(
    logits: torch.Tensor,
    labels: torch.Tensor,
) -> float:
    temperature = nn.Parameter(torch.ones(1))
    criterion = nn.CrossEntropyLoss()

    optimizer = torch.optim.LBFGS(
        [temperature],
        lr=0.04,
        max_iter=80,
        line_search_fn="strong_wolfe",
    )

    logits = logits.float()
    labels = labels.long()

    def closure():
        optimizer.zero_grad()
        temp = temperature.clamp(0.05, 10.0)
        loss = criterion(logits / temp, labels)
        loss.backward()
        return loss

    optimizer.step(closure)

    return float(
        temperature.detach().clamp(0.05, 10.0).item()
    )


def normalized_entropy(probabilities: torch.Tensor) -> torch.Tensor:
    eps = 1e-12
    entropy = -torch.sum(
        probabilities * torch.log(probabilities.clamp_min(eps)),
        dim=1,
    )
    return entropy / math.log(probabilities.shape[1])


def derive_rejection_policy(
    logits: torch.Tensor,
    labels: torch.Tensor,
    temperature: float,
) -> dict:
    probabilities = torch.softmax(logits / temperature, dim=1)
    confidence, prediction = probabilities.max(dim=1)

    top2 = torch.topk(probabilities, k=2, dim=1).values
    margin = top2[:, 0] - top2[:, 1]
    entropy = normalized_entropy(probabilities)
    correct = prediction.eq(labels)

    best = {
        "threshold": 0.75,
        "accepted_accuracy": 0.0,
        "coverage": 0.0,
    }

    for threshold in np.arange(0.55, 0.991, 0.005):
        accepted = confidence >= threshold
        if accepted.sum().item() < 100:
            continue

        accepted_accuracy = (
            correct[accepted].float().mean().item()
        )
        coverage = accepted.float().mean().item()

        if (
            accepted_accuracy >= TARGET_ACCEPTED_ACCURACY
            and coverage > best["coverage"]
        ):
            best = {
                "threshold": float(threshold),
                "accepted_accuracy": accepted_accuracy,
                "coverage": coverage,
            }

    if best["coverage"] == 0.0:
        # Fall back to the highest-precision threshold that still has useful coverage.
        best_precision = -1.0
        for threshold in np.arange(0.60, 0.991, 0.005):
            accepted = confidence >= threshold
            if accepted.sum().item() < 100:
                continue

            accepted_accuracy = (
                correct[accepted].float().mean().item()
            )
            coverage = accepted.float().mean().item()

            if (
                accepted_accuracy > best_precision
                or (
                    math.isclose(accepted_accuracy, best_precision)
                    and coverage > best["coverage"]
                )
            ):
                best_precision = accepted_accuracy
                best = {
                    "threshold": float(threshold),
                    "accepted_accuracy": accepted_accuracy,
                    "coverage": coverage,
                }

    correct_margin = margin[correct]
    correct_entropy = entropy[correct]

    margin_floor = (
        float(torch.quantile(correct_margin, 0.03).item())
        if len(correct_margin) > 0
        else 0.05
    )
    entropy_ceiling = (
        float(torch.quantile(correct_entropy, 0.97).item())
        if len(correct_entropy) > 0
        else 0.55
    )

    per_class_thresholds: dict[str, float] = {}

    for class_index in range(probabilities.shape[1]):
        predicted_as_class = prediction.eq(class_index)

        best_threshold = max(0.60, best["threshold"])
        best_coverage_count = -1

        for threshold in np.arange(0.55, 0.991, 0.005):
            accepted = predicted_as_class & (confidence >= threshold)
            count = accepted.sum().item()

            if count < MIN_CLASS_ACCEPTED:
                continue

            precision = labels[accepted].eq(class_index).float().mean().item()

            if (
                precision >= 0.99
                and count > best_coverage_count
            ):
                best_threshold = float(threshold)
                best_coverage_count = count

        per_class_thresholds[str(class_index)] = round(
            best_threshold,
            4,
        )

    return {
        "global_confidence_threshold": round(max(0.60, best["threshold"]), 4),
        "accepted_accuracy": round(best["accepted_accuracy"], 6),
        "accepted_coverage": round(best["coverage"], 6),
        "minimum_top1_top2_margin": round(max(0.04, margin_floor), 4),
        "maximum_normalized_entropy": round(min(0.70, entropy_ceiling), 4),
        "per_class_thresholds": per_class_thresholds,
    }


def evaluate(
    logits: torch.Tensor,
    labels: torch.Tensor,
    temperature: float,
) -> dict:
    probabilities = torch.softmax(logits / temperature, dim=1)
    predictions = probabilities.argmax(dim=1).numpy()
    truth = labels.numpy()

    return {
        "accuracy": float(accuracy_score(truth, predictions)),
        "macro_f1": float(
            f1_score(
                truth,
                predictions,
                average="macro",
                zero_division=0,
            )
        ),
        "classification_report": classification_report(
            truth,
            predictions,
            output_dict=True,
            zero_division=0,
        ),
    }


def export_onnx(model: nn.Module, path: Path) -> None:
    model = model.cpu().eval()
    dummy = torch.randn(1, 3, IMAGE_SIZE, IMAGE_SIZE)

    torch.onnx.export(
        model,
        dummy,
        path,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={
            "image": {0: "batch"},
            "logits": {0: "batch"},
        },
        opset_version=18,
        do_constant_folding=True,
    )


def verify_onnx(path: Path, num_classes: int) -> None:
    import onnxruntime as ort

    session = ort.InferenceSession(
        str(path),
        providers=["CPUExecutionProvider"],
    )

    input_name = session.get_inputs()[0].name
    output = session.run(
        None,
        {
            input_name: np.random.randn(
                1,
                3,
                IMAGE_SIZE,
                IMAGE_SIZE,
            ).astype(np.float32)
        },
    )[0]

    if tuple(output.shape) != (1, num_classes):
        raise RuntimeError(
            f"ONNX output shape {output.shape} != (1, {num_classes})"
        )


def evaluate_v1_stress(
    classes: list[str],
    test_indices: np.ndarray,
) -> dict | None:
    if not V1_CHECKPOINT.exists():
        return None

    checkpoint = torch.load(
        V1_CHECKPOINT,
        map_location="cpu",
        weights_only=False,
    )

    checkpoint_classes = checkpoint.get("classes")
    if checkpoint_classes and list(checkpoint_classes) != list(classes):
        print("Skipping v1 stress comparison because class order differs.")
        return None

    model = build_v1_model(len(classes))
    model.load_state_dict(checkpoint["model_state"])
    model = model.to(DEVICE)

    stress_base = datasets.ImageFolder(
        DATA_DIR,
        transform=DeterministicFieldStress(V1_IMAGE_SIZE),
    )

    loader = DataLoader(
        Subset(stress_base, test_indices.tolist()),
        batch_size=64,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=True,
        persistent_workers=(NUM_WORKERS > 0),
    )

    logits, labels = collect_logits(
        model,
        loader,
        tta=True,
    )

    probabilities = torch.softmax(logits, dim=1)
    predictions = probabilities.argmax(dim=1).numpy()
    truth = labels.numpy()

    return {
        "accuracy": float(accuracy_score(truth, predictions)),
        "macro_f1": float(
            f1_score(
                truth,
                predictions,
                average="macro",
                zero_division=0,
            )
        ),
    }


def main() -> None:
    start = time.time()

    print()
    print("=" * 78)
    print(" CROPguard FIELD-ROBUST VISION v2 TRAINING")
    print("=" * 78)
    print("Device:", DEVICE)
    print("GPU:", torch.cuda.get_device_name(0))
    print("VRAM GB:", round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2))
    print()

    data = create_datasets()

    print(f"Classes:    {len(data.classes)}")
    print(f"Train:      {len(data.train_indices)}")
    print(f"Validation: {len(data.val_indices)}")
    print(f"Test:       {len(data.test_indices)}")
    print()

    model = build_v2_model(len(data.classes)).to(DEVICE)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.08)
    scaler = torch.amp.GradScaler("cuda", enabled=True)

    best_val_accuracy = -math.inf
    best_epoch = 0
    no_improvement = 0
    history: list[dict] = []
    epoch_number = 0

    # Stage 1: train only the classification head.
    set_backbone_trainable(model, False)
    optimizer = make_optimizer(model, lr=8e-4)

    for _ in range(HEAD_EPOCHS):
        epoch_number += 1
        print(f"\nStage 1 / head training — epoch {epoch_number}/{HEAD_EPOCHS + FINETUNE_EPOCHS}")

        train_loss, train_acc = run_epoch(
            model,
            data.train_loader,
            criterion,
            optimizer,
            scaler,
        )
        val_loss, val_acc = run_epoch(
            model,
            data.val_loader,
            criterion,
            None,
            scaler,
        )

        history.append(
            {
                "epoch": epoch_number,
                "stage": "head",
                "train_loss": train_loss,
                "train_accuracy": train_acc,
                "val_loss": val_loss,
                "val_accuracy": val_acc,
            }
        )

        print(
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )

        if val_acc > best_val_accuracy:
            best_val_accuracy = val_acc
            best_epoch = epoch_number
            torch.save(
                {
                    "model_state": model.state_dict(),
                    "classes": data.classes,
                    "epoch": epoch_number,
                    "val_accuracy": val_acc,
                    "architecture": "mobilenet_v3_large",
                    "image_size": IMAGE_SIZE,
                },
                BEST_MODEL,
            )

    # Stage 2: fine-tune the entire network with a lower LR.
    set_backbone_trainable(model, True)
    optimizer = make_optimizer(model, lr=1.4e-4, weight_decay=1.5e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=FINETUNE_EPOCHS,
        eta_min=1e-6,
    )

    for _ in range(FINETUNE_EPOCHS):
        epoch_number += 1
        print(f"\nStage 2 / full fine-tune — epoch {epoch_number}/{HEAD_EPOCHS + FINETUNE_EPOCHS}")

        train_loss, train_acc = run_epoch(
            model,
            data.train_loader,
            criterion,
            optimizer,
            scaler,
        )
        val_loss, val_acc = run_epoch(
            model,
            data.val_loader,
            criterion,
            None,
            scaler,
        )
        scheduler.step()

        history.append(
            {
                "epoch": epoch_number,
                "stage": "fine_tune",
                "train_loss": train_loss,
                "train_accuracy": train_acc,
                "val_loss": val_loss,
                "val_accuracy": val_acc,
                "learning_rate": optimizer.param_groups[0]["lr"],
            }
        )

        print(
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )

        if val_acc > best_val_accuracy:
            best_val_accuracy = val_acc
            best_epoch = epoch_number
            no_improvement = 0

            torch.save(
                {
                    "model_state": model.state_dict(),
                    "classes": data.classes,
                    "epoch": epoch_number,
                    "val_accuracy": val_acc,
                    "architecture": "mobilenet_v3_large",
                    "image_size": IMAGE_SIZE,
                },
                BEST_MODEL,
            )
            print("Saved new best v2 checkpoint.")
        else:
            no_improvement += 1

        if no_improvement >= EARLY_STOPPING_PATIENCE:
            print("\nEarly stopping triggered.")
            break

    checkpoint = torch.load(
        BEST_MODEL,
        map_location=DEVICE,
        weights_only=False,
    )
    model.load_state_dict(checkpoint["model_state"])

    print("\nCalibrating on validation set with 3-view TTA...")
    val_logits, val_labels = collect_logits(
        model,
        data.val_loader,
        tta=True,
    )

    temperature = fit_temperature(val_logits, val_labels)
    rejection_policy = derive_rejection_policy(
        val_logits,
        val_labels,
        temperature,
    )

    print("Temperature:", round(temperature, 4))
    print("Rejection policy:", json.dumps(rejection_policy, indent=2))

    print("\nEvaluating untouched clean test set...")
    test_logits, test_labels = collect_logits(
        model,
        data.test_loader,
        tta=True,
    )
    clean_metrics = evaluate(
        test_logits,
        test_labels,
        temperature,
    )

    print("\nEvaluating deterministic phone/field stress proxy...")
    stress_logits, stress_labels = collect_logits(
        model,
        data.stress_loader,
        tta=True,
    )
    stress_metrics = evaluate(
        stress_logits,
        stress_labels,
        temperature,
    )

    print("\nComparing v1 on the same stress proxy...")
    v1_stress = evaluate_v1_stress(
        data.classes,
        data.test_indices,
    )

    crop_to_indices: dict[str, list[int]] = defaultdict(list)
    class_metadata: list[dict] = []

    for index, class_name in enumerate(data.classes):
        crop, disease = split_class_name(class_name)
        crop_to_indices[crop].append(index)
        class_metadata.append(
            {
                "index": index,
                "raw_class": class_name,
                "crop": crop,
                "disease": disease,
                "healthy": disease.lower() == "healthy",
            }
        )

    v1_meta = None
    if V1_METADATA.exists():
        v1_meta = json.loads(V1_METADATA.read_text(encoding="utf-8"))

    deploy_recommendation = "manual_review"

    v1_clean_accuracy = (
        float(v1_meta.get("test", {}).get("accuracy", 0.0))
        if isinstance(v1_meta, dict)
        else 0.0
    )

    if (
        clean_metrics["accuracy"] >= v1_clean_accuracy - 0.002
        and (
            v1_stress is None
            or stress_metrics["accuracy"] >= v1_stress["accuracy"] + 0.02
        )
    ):
        deploy_recommendation = "promote_v2"
    elif (
        clean_metrics["accuracy"] < v1_clean_accuracy - 0.005
        and v1_stress is not None
        and stress_metrics["accuracy"] <= v1_stress["accuracy"]
    ):
        deploy_recommendation = "keep_v1"

    metadata = {
        "model_name": "CropGuard Field-Robust MobileNetV3 Large",
        "model_version": "field-robust-v2",
        "architecture": "mobilenet_v3_large",
        "dataset": "PlantVillage color with field-robust augmentation",
        "image_size": IMAGE_SIZE,
        "num_classes": len(data.classes),
        "num_crops": len(crop_to_indices),
        "classes": data.classes,
        "class_metadata": class_metadata,
        "crop_class_indices": dict(crop_to_indices),
        "temperature": temperature,
        "rejection_policy": rejection_policy,
        "training": {
            "best_epoch": best_epoch,
            "best_validation_accuracy": best_val_accuracy,
            "head_epochs": HEAD_EPOCHS,
            "finetune_epochs_requested": FINETUNE_EPOCHS,
        },
        "test": {
            "clean_accuracy": clean_metrics["accuracy"],
            "clean_macro_f1": clean_metrics["macro_f1"],
            "field_stress_proxy_accuracy": stress_metrics["accuracy"],
            "field_stress_proxy_macro_f1": stress_metrics["macro_f1"],
        },
        "v1_comparison": {
            "v1_clean_accuracy": v1_clean_accuracy,
            "v1_field_stress_proxy": v1_stress,
            "deploy_recommendation": deploy_recommendation,
        },
        "inference_recommendation": {
            "tta_views": ["original", "horizontal_flip", "vertical_flip"],
            "use_per_class_thresholds": True,
            "use_margin_rejection": True,
            "use_entropy_rejection": True,
            "preserve_original_image": True,
            "allow_non_generative_normalization": True,
        },
        "limitations": [
            "PlantVillage is dominated by controlled-background imagery.",
            "The deterministic stress benchmark is a robustness proxy, not a real-field validation set.",
            "The model must not claim 99.99% real-world accuracy without independent field validation.",
            "Mixed diseases require multi-label training data and are not solved by single-label PlantVillage classes.",
            "Generative super-resolution must not be used to invent lesion detail for diagnosis.",
        ],
    }

    REPORT_FILE.write_text(
        json.dumps(
            {
                "history": history,
                "clean_test": clean_metrics,
                "field_stress_proxy": stress_metrics,
                "v1_field_stress_proxy": v1_stress,
                "deploy_recommendation": deploy_recommendation,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    METADATA_FILE.write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    print("\nExporting v2 ONNX...")
    export_onnx(model, ONNX_MODEL)
    verify_onnx(ONNX_MODEL, len(data.classes))

    elapsed_minutes = (time.time() - start) / 60.0

    print()
    print("=" * 78)
    print(" CROPguard FIELD-ROBUST VISION v2 TRAINING COMPLETE")
    print("=" * 78)
    print(f"Best validation accuracy: {best_val_accuracy:.4%}")
    print(f"Clean test accuracy:       {clean_metrics['accuracy']:.4%}")
    print(f"Clean macro-F1:            {clean_metrics['macro_f1']:.4%}")
    print(f"Stress proxy accuracy:     {stress_metrics['accuracy']:.4%}")
    print(f"Stress proxy macro-F1:     {stress_metrics['macro_f1']:.4%}")

    if v1_stress is not None:
        print(f"V1 stress proxy accuracy:  {v1_stress['accuracy']:.4%}")
        print(f"V1 stress proxy macro-F1:  {v1_stress['macro_f1']:.4%}")

    print(f"Global accept threshold:   {rejection_policy['global_confidence_threshold']:.1%}")
    print(f"Accepted val accuracy:     {rejection_policy['accepted_accuracy']:.4%}")
    print(f"Accepted coverage:         {rejection_policy['accepted_coverage']:.2%}")
    print(f"Deploy recommendation:     {deploy_recommendation}")
    print(f"Training time:             {elapsed_minutes:.1f} minutes")
    print()
    print("Model:", ONNX_MODEL)
    print("Metadata:", METADATA_FILE)
    print("Evaluation:", REPORT_FILE)


if __name__ == "__main__":
    main()