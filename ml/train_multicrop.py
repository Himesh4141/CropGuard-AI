from __future__ import annotations

import json
import math
import random
import time
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
)
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Subset, WeightedRandomSampler
from torchvision import datasets, models, transforms
from torchvision.models import MobileNet_V3_Small_Weights
from tqdm import tqdm


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data" / "PlantVillage-Dataset" / "raw" / "color"
ARTIFACT_DIR = ROOT / "artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

BEST_MODEL = ARTIFACT_DIR / "multicrop_best.pt"
ONNX_MODEL = ARTIFACT_DIR / "multicrop_disease_model.onnx"
METADATA_FILE = ARTIFACT_DIR / "multicrop_metadata.json"
REPORT_FILE = ARTIFACT_DIR / "multicrop_evaluation.json"

SEED = 4141
IMAGE_SIZE = 224
BATCH_SIZE = 96
MAX_EPOCHS = 20
EARLY_STOPPING_PATIENCE = 5
NUM_WORKERS = 4

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.cuda.manual_seed_all(SEED)

torch.backends.cudnn.benchmark = True

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

if DEVICE.type != "cuda":
    raise RuntimeError(
        "CUDA is not available. Training intentionally stopped."
    )


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

    return mapping.get(
        raw,
        raw.replace("_", " "),
    )


def split_class_name(name: str) -> tuple[str, str]:
    if "___" not in name:
        return canonical_crop(name), "Unknown"

    raw_crop, disease = name.split("___", 1)

    crop = canonical_crop(raw_crop)

    disease = (
        disease
        .replace("_", " ")
        .replace("  ", " ")
        .strip()
    )

    if disease.lower() == "healthy":
        disease = "Healthy"

    return crop, disease


def build_transforms():
    weights = MobileNet_V3_Small_Weights.DEFAULT

    normalize = transforms.Normalize(
        mean=weights.transforms().mean,
        std=weights.transforms().std,
    )

    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(
                IMAGE_SIZE,
                scale=(0.75, 1.0),
                ratio=(0.85, 1.15),
            ),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(p=0.15),
            transforms.RandomRotation(18),
            transforms.ColorJitter(
                brightness=0.20,
                contrast=0.20,
                saturation=0.20,
                hue=0.03,
            ),
            transforms.ToTensor(),
            normalize,
        ]
    )

    eval_transform = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            normalize,
        ]
    )

    return weights, train_transform, eval_transform


def create_datasets():
    weights, train_transform, eval_transform = build_transforms()

    base = datasets.ImageFolder(DATA_DIR)

    labels = np.asarray(base.targets)
    indices = np.arange(len(base))

    train_indices, temp_indices = train_test_split(
        indices,
        test_size=0.30,
        stratify=labels,
        random_state=SEED,
    )

    temp_labels = labels[temp_indices]

    val_indices, test_indices = train_test_split(
        temp_indices,
        test_size=0.50,
        stratify=temp_labels,
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

    train_ds = Subset(
        train_base,
        train_indices.tolist(),
    )

    val_ds = Subset(
        val_base,
        val_indices.tolist(),
    )

    test_ds = Subset(
        test_base,
        test_indices.tolist(),
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

    train_loader = DataLoader(
        train_ds,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=NUM_WORKERS,
        pin_memory=True,
        persistent_workers=True,
    )

    val_loader = DataLoader(
        val_ds,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=True,
        persistent_workers=True,
    )

    test_loader = DataLoader(
        test_ds,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=True,
        persistent_workers=True,
    )

    return (
        weights,
        base.classes,
        train_loader,
        val_loader,
        test_loader,
        train_indices,
        val_indices,
        test_indices,
    )


def build_model(num_classes: int):
    weights = MobileNet_V3_Small_Weights.DEFAULT

    model = models.mobilenet_v3_small(
        weights=weights,
    )

    in_features = model.classifier[-1].in_features

    model.classifier[-1] = nn.Linear(
        in_features,
        num_classes,
    )

    return model


def run_epoch(
    model,
    loader,
    criterion,
    optimizer=None,
):
    training = optimizer is not None

    model.train(training)

    total_loss = 0.0
    correct = 0
    total = 0

    scaler = run_epoch.scaler

    progress = tqdm(
        loader,
        leave=False,
        desc="train" if training else "valid",
    )

    for images, labels in progress:
        images = images.to(
            DEVICE,
            non_blocking=True,
        )

        labels = labels.to(
            DEVICE,
            non_blocking=True,
        )

        if training:
            optimizer.zero_grad(
                set_to_none=True,
            )

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

            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                max_norm=5.0,
            )

            scaler.step(optimizer)
            scaler.update()

        total_loss += (
            loss.item() * images.size(0)
        )

        predictions = logits.argmax(dim=1)

        correct += (
            predictions == labels
        ).sum().item()

        total += images.size(0)

        progress.set_postfix(
            loss=f"{loss.item():.4f}",
            acc=f"{correct / total:.4f}",
        )

    return (
        total_loss / total,
        correct / total,
    )


run_epoch.scaler = torch.amp.GradScaler(
    "cuda",
    enabled=True,
)


@torch.no_grad()
def collect_logits(model, loader):
    model.eval()

    logits_all = []
    labels_all = []

    for images, labels in tqdm(
        loader,
        leave=False,
        desc="collect",
    ):
        images = images.to(
            DEVICE,
            non_blocking=True,
        )

        logits = model(images)

        logits_all.append(
            logits.cpu()
        )

        labels_all.append(
            labels.cpu()
        )

    return (
        torch.cat(logits_all),
        torch.cat(labels_all),
    )


def fit_temperature(
    logits: torch.Tensor,
    labels: torch.Tensor,
) -> float:
    temperature = nn.Parameter(
        torch.ones(1)
    )

    criterion = nn.CrossEntropyLoss()

    optimizer = torch.optim.LBFGS(
        [temperature],
        lr=0.05,
        max_iter=60,
    )

    logits = logits.float()
    labels = labels.long()

    def closure():
        optimizer.zero_grad()

        temp = temperature.clamp(
            0.05,
            10.0,
        )

        loss = criterion(
            logits / temp,
            labels,
        )

        loss.backward()

        return loss

    optimizer.step(closure)

    return float(
        temperature.detach()
        .clamp(0.05, 10.0)
        .item()
    )


def choose_confidence_threshold(
    logits: torch.Tensor,
    labels: torch.Tensor,
    temperature: float,
):
    probabilities = torch.softmax(
        logits / temperature,
        dim=1,
    )

    confidence, prediction = (
        probabilities.max(dim=1)
    )

    correct = prediction.eq(labels)

    best_threshold = 0.70
    best_coverage = 0.0
    best_accuracy = 0.0

    for threshold in np.arange(
        0.50,
        0.96,
        0.01,
    ):
        accepted = confidence >= threshold

        coverage = accepted.float().mean().item()

        if accepted.sum() == 0:
            continue

        accuracy = (
            correct[accepted]
            .float()
            .mean()
            .item()
        )

        # Prefer >=97% accepted accuracy where possible.
        if (
            accuracy >= 0.97
            and coverage > best_coverage
        ):
            best_threshold = float(threshold)
            best_coverage = coverage
            best_accuracy = accuracy

    # Never allow an aggressively low threshold.
    best_threshold = max(
        0.65,
        best_threshold,
    )

    return {
        "threshold": round(
            best_threshold,
            4,
        ),
        "accepted_accuracy": round(
            best_accuracy,
            4,
        ),
        "coverage": round(
            best_coverage,
            4,
        ),
    }


def export_onnx(
    model,
    onnx_path: Path,
):
    model = model.cpu().eval()

    dummy = torch.randn(
        1,
        3,
        IMAGE_SIZE,
        IMAGE_SIZE,
    )

    torch.onnx.export(
        model,
        dummy,
        onnx_path,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={
            "image": {
                0: "batch",
            },
            "logits": {
                0: "batch",
            },
        },
        opset_version=18,
        do_constant_folding=True,
    )


def verify_onnx(
    onnx_path: Path,
    num_classes: int,
):
    import onnxruntime as ort

    session = ort.InferenceSession(
        str(onnx_path),
        providers=[
            "CPUExecutionProvider",
        ],
    )

    input_name = (
        session
        .get_inputs()[0]
        .name
    )

    output = session.run(
        None,
        {
            input_name:
                np.random.randn(
                    1,
                    3,
                    IMAGE_SIZE,
                    IMAGE_SIZE,
                ).astype(
                    np.float32
                )
        },
    )[0]

    expected = (
        1,
        num_classes,
    )

    if tuple(output.shape) != expected:
        raise RuntimeError(
            f"ONNX output shape "
            f"{output.shape} != {expected}"
        )


def main():
    start = time.time()

    print()
    print("=" * 72)
    print(" CROPguard MULTI-CROP TRAINING")
    print("=" * 72)
    print("Device:", DEVICE)
    print(
        "GPU:",
        torch.cuda.get_device_name(0),
    )
    print()

    (
        weights,
        classes,
        train_loader,
        val_loader,
        test_loader,
        train_indices,
        val_indices,
        test_indices,
    ) = create_datasets()

    print(
        f"Classes : {len(classes)}"
    )

    print(
        f"Train   : {len(train_indices)}"
    )

    print(
        f"Validate: {len(val_indices)}"
    )

    print(
        f"Test    : {len(test_indices)}"
    )

    print()

    model = build_model(
        len(classes)
    ).to(DEVICE)

    criterion = nn.CrossEntropyLoss(
        label_smoothing=0.05,
    )

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=2e-4,
        weight_decay=1e-4,
    )

    scheduler = (
        torch.optim.lr_scheduler
        .CosineAnnealingLR(
            optimizer,
            T_max=MAX_EPOCHS,
            eta_min=1e-6,
        )
    )

    best_val_accuracy = -math.inf
    best_epoch = 0
    no_improvement = 0
    history = []

    for epoch in range(
        1,
        MAX_EPOCHS + 1,
    ):
        print()
        print(
            f"Epoch {epoch}/{MAX_EPOCHS}"
        )

        train_loss, train_acc = run_epoch(
            model,
            train_loader,
            criterion,
            optimizer,
        )

        val_loss, val_acc = run_epoch(
            model,
            val_loader,
            criterion,
        )

        scheduler.step()

        record = {
            "epoch": epoch,
            "train_loss": train_loss,
            "train_accuracy": train_acc,
            "val_loss": val_loss,
            "val_accuracy": val_acc,
            "learning_rate":
                optimizer.param_groups[0]["lr"],
        }

        history.append(record)

        print(
            f"train_loss={train_loss:.4f} "
            f"train_acc={train_acc:.4f} "
            f"val_loss={val_loss:.4f} "
            f"val_acc={val_acc:.4f}"
        )

        if val_acc > best_val_accuracy:
            best_val_accuracy = val_acc
            best_epoch = epoch
            no_improvement = 0

            torch.save(
                {
                    "model_state":
                        model.state_dict(),
                    "classes":
                        classes,
                    "epoch":
                        epoch,
                    "val_accuracy":
                        val_acc,
                },
                BEST_MODEL,
            )

            print(
                "Saved new best checkpoint."
            )
        else:
            no_improvement += 1

        if (
            no_improvement
            >= EARLY_STOPPING_PATIENCE
        ):
            print()
            print(
                "Early stopping triggered."
            )
            break

    checkpoint = torch.load(
        BEST_MODEL,
        map_location=DEVICE,
        weights_only=False,
    )

    model.load_state_dict(
        checkpoint["model_state"]
    )

    print()
    print(
        f"Best epoch: {best_epoch}"
    )

    print(
        f"Best validation accuracy: "
        f"{best_val_accuracy:.4f}"
    )

    print()
    print(
        "Fitting confidence calibration..."
    )

    val_logits, val_labels = (
        collect_logits(
            model,
            val_loader,
        )
    )

    temperature = fit_temperature(
        val_logits,
        val_labels,
    )

    threshold_info = (
        choose_confidence_threshold(
            val_logits,
            val_labels,
            temperature,
        )
    )

    print(
        "Temperature:",
        temperature,
    )

    print(
        "Confidence threshold:",
        threshold_info,
    )

    print()
    print(
        "Evaluating untouched test set..."
    )

    test_logits, test_labels = (
        collect_logits(
            model,
            test_loader,
        )
    )

    probabilities = torch.softmax(
        test_logits / temperature,
        dim=1,
    )

    predictions = (
        probabilities.argmax(
            dim=1
        )
        .numpy()
    )

    truth = test_labels.numpy()

    test_accuracy = accuracy_score(
        truth,
        predictions,
    )

    macro_f1 = f1_score(
        truth,
        predictions,
        average="macro",
    )

    report = classification_report(
        truth,
        predictions,
        target_names=classes,
        output_dict=True,
        zero_division=0,
    )

    print()
    print(
        f"TEST ACCURACY: "
        f"{test_accuracy:.4%}"
    )

    print(
        f"MACRO F1: "
        f"{macro_f1:.4%}"
    )

    crop_to_indices = defaultdict(list)
    class_metadata = []

    for index, class_name in enumerate(
        classes
    ):
        crop, disease = (
            split_class_name(
                class_name
            )
        )

        crop_to_indices[crop].append(
            index
        )

        class_metadata.append(
            {
                "index": index,
                "raw_class":
                    class_name,
                "crop": crop,
                "disease":
                    disease,
                "healthy":
                    disease.lower()
                    == "healthy",
            }
        )

    metadata = {
        "model_name":
            "CropGuard Multi-Crop MobileNetV3",
        "model_version":
            "multicrop-v1",
        "architecture":
            "mobilenet_v3_small",
        "dataset":
            "PlantVillage color",
        "image_size":
            IMAGE_SIZE,
        "num_classes":
            len(classes),
        "num_crops":
            len(crop_to_indices),
        "classes":
            classes,
        "class_metadata":
            class_metadata,
        "crop_class_indices":
            dict(crop_to_indices),
        "temperature":
            temperature,
        "confidence_threshold":
            threshold_info[
                "threshold"
            ],
        "validation":
            {
                "best_epoch":
                    best_epoch,
                "best_accuracy":
                    best_val_accuracy,
                **threshold_info,
            },
        "test":
            {
                "accuracy":
                    test_accuracy,
                "macro_f1":
                    macro_f1,
            },
        "splits":
            {
                "train":
                    len(train_indices),
                "validation":
                    len(val_indices),
                "test":
                    len(test_indices),
            },
        "limitations": [
            "Trained primarily on PlantVillage controlled-background imagery.",
            "Not a substitute for laboratory or agronomist diagnosis.",
            "Confidence threshold is a rejection aid, not proof of correctness.",
            "Unknown crops and out-of-distribution field conditions require additional validation data.",
        ],
    }

    METADATA_FILE.write_text(
        json.dumps(
            metadata,
            indent=2,
        ),
        encoding="utf-8",
    )

    REPORT_FILE.write_text(
        json.dumps(
            {
                "test_accuracy":
                    test_accuracy,
                "macro_f1":
                    macro_f1,
                "classification_report":
                    report,
                "history":
                    history,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print(
        "Exporting ONNX model..."
    )

    export_onnx(
        model,
        ONNX_MODEL,
    )

    verify_onnx(
        ONNX_MODEL,
        len(classes),
    )

    elapsed = (
        time.time() - start
    )

    print()
    print("=" * 72)
    print(
        " CROPguard MULTI-CROP TRAINING COMPLETE"
    )
    print("=" * 72)
    print(
        "Model:",
        ONNX_MODEL,
    )
    print(
        "Metadata:",
        METADATA_FILE,
    )
    print(
        "Report:",
        REPORT_FILE,
    )
    print(
        "Test accuracy:",
        f"{test_accuracy:.4%}",
    )
    print(
        "Macro F1:",
        f"{macro_f1:.4%}",
    )
    print(
        "Training time:",
        f"{elapsed / 60:.1f} minutes",
    )


if __name__ == "__main__":
    main()