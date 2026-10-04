"""Train the CropGuard Tomato disease classifier."""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    f1_score,
)
from torch import nn
from torch.optim import AdamW
from torch.utils.data import DataLoader

from src.config import (
    ARTIFACTS_DIR,
    CHECKPOINT_PATH,
    DEFAULT_BATCH_SIZE,
    DEFAULT_EPOCHS,
    DEFAULT_LEARNING_RATE,
    IMAGE_SIZE,
    IMAGENET_MEAN,
    IMAGENET_STD,
    METADATA_PATH,
    RANDOM_SEED,
)
from src.dataset import (
    TomatoDataset,
    build_samples,
    get_transforms,
)
from src.model import (
    build_model,
    freeze_backbone,
    unfreeze_last_blocks,
)


def seed_everything() -> None:
    random.seed(
        RANDOM_SEED,
    )

    np.random.seed(
        RANDOM_SEED,
    )

    torch.manual_seed(
        RANDOM_SEED,
    )

    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(
            RANDOM_SEED,
        )


def evaluate(
    model,
    loader,
    criterion,
    device,
) -> tuple[
    float,
    float,
    float,
]:
    model.eval()

    losses: list[float] = []
    predictions: list[int] = []
    targets: list[int] = []

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(
                device,
            )

            labels = labels.to(
                device,
            )

            logits = model(
                images,
            )

            loss = criterion(
                logits,
                labels,
            )

            losses.append(
                loss.item(),
            )

            predictions.extend(
                logits.argmax(
                    dim=1,
                )
                .cpu()
                .tolist()
            )

            targets.extend(
                labels
                .cpu()
                .tolist()
            )

    return (
        float(
            np.mean(
                losses,
            )
        ),
        accuracy_score(
            targets,
            predictions,
        ),
        f1_score(
            targets,
            predictions,
            average="macro",
            zero_division=0,
        ),
    )


def train(
    epochs: int,
    batch_size: int,
    learning_rate: float,
    max_samples_per_class: int | None,
) -> None:
    seed_everything()

    ARTIFACTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    (
        train_samples,
        validation_samples,
        test_samples,
        class_names,
    ) = build_samples(
        max_samples_per_class=
            max_samples_per_class,
    )

    train_transform, eval_transform = (
        get_transforms()
    )

    train_dataset = TomatoDataset(
        train_samples,
        train_transform,
    )

    validation_dataset = TomatoDataset(
        validation_samples,
        eval_transform,
    )

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    print(
        f"Device: {device}"
    )

    print(
        f"Classes: {len(class_names)}"
    )

    print(
        f"Training images: {len(train_dataset)}"
    )

    print(
        f"Validation images: {len(validation_dataset)}"
    )

    print(
        f"Reserved test images: {len(test_samples)}"
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0,
        pin_memory=(
            device.type
            == "cuda"
        ),
    )

    validation_loader = DataLoader(
        validation_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=(
            device.type
            == "cuda"
        ),
    )

    model = build_model(
        len(class_names),
        pretrained=True,
    )

    freeze_backbone(
        model,
    )

    model = model.to(
        device,
    )

    criterion = nn.CrossEntropyLoss(
        label_smoothing=0.1,
    )

    optimizer = AdamW(
        filter(
            lambda parameter:
                parameter.requires_grad,
            model.parameters(),
        ),
        lr=learning_rate,
        weight_decay=1e-4,
    )

    best_f1 = -1.0

    patience = 3
    stale_epochs = 0

    for epoch in range(
        1,
        epochs + 1,
    ):
        if epoch == 3:
            print(
                "Unfreezing final MobileNet blocks..."
            )

            unfreeze_last_blocks(
                model,
                blocks=3,
            )

            optimizer = AdamW(
                filter(
                    lambda parameter:
                        parameter.requires_grad,
                    model.parameters(),
                ),
                lr=learning_rate / 10,
                weight_decay=1e-4,
            )

        model.train()

        running_loss = 0.0

        for batch_index, (
            images,
            labels,
        ) in enumerate(
            train_loader,
            start=1,
        ):
            images = images.to(
                device,
            )

            labels = labels.to(
                device,
            )

            optimizer.zero_grad(
                set_to_none=True,
            )

            logits = model(
                images,
            )

            loss = criterion(
                logits,
                labels,
            )

            loss.backward()

            optimizer.step()

            running_loss += (
                loss.item()
            )

            if (
                batch_index % 50
                == 0
            ):
                print(
                    f"Epoch {epoch}/{epochs} "
                    f"batch {batch_index}/{len(train_loader)} "
                    f"loss={loss.item():.4f}"
                )

        (
            validation_loss,
            validation_accuracy,
            validation_f1,
        ) = evaluate(
            model,
            validation_loader,
            criterion,
            device,
        )

        training_loss = (
            running_loss
            / max(
                len(train_loader),
                1,
            )
        )

        print(
            f"Epoch {epoch}/{epochs} | "
            f"train_loss={training_loss:.4f} | "
            f"val_loss={validation_loss:.4f} | "
            f"val_accuracy={validation_accuracy:.4f} | "
            f"val_macro_f1={validation_f1:.4f}"
        )

        if (
            validation_f1
            > best_f1
        ):
            best_f1 = (
                validation_f1
            )

            stale_epochs = 0

            torch.save(
                {
                    "model_state_dict":
                        model.state_dict(),

                    "class_names":
                        class_names,

                    "image_size":
                        IMAGE_SIZE,

                    "imagenet_mean":
                        IMAGENET_MEAN,

                    "imagenet_std":
                        IMAGENET_STD,

                    "architecture":
                        "mobilenet_v3_small",

                    "validation_f1":
                        validation_f1,

                    "validation_accuracy":
                        validation_accuracy,
                },
                CHECKPOINT_PATH,
            )

            print(
                f"Saved best model -> {CHECKPOINT_PATH}"
            )

        else:
            stale_epochs += 1

            if (
                stale_epochs
                >= patience
            ):
                print(
                    "Early stopping triggered."
                )

                break

    metadata = {
        "architecture":
            "mobilenet_v3_small",

        "classes":
            class_names,

        "image_size":
            IMAGE_SIZE,

        "normalization": {
            "mean":
                IMAGENET_MEAN,

            "std":
                IMAGENET_STD,
        },

        "best_validation_f1":
            best_f1,

        "training_images":
            len(train_samples),

        "validation_images":
            len(validation_samples),

        "test_images":
            len(test_samples),
    }

    METADATA_PATH.write_text(
        json.dumps(
            metadata,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "Training complete."
    )

    print(
        f"Checkpoint: {CHECKPOINT_PATH}"
    )


def parse_args():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--epochs",
        type=int,
        default=DEFAULT_EPOCHS,
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
    )

    parser.add_argument(
        "--learning-rate",
        type=float,
        default=DEFAULT_LEARNING_RATE,
    )

    parser.add_argument(
        "--max-samples-per-class",
        type=int,
        default=None,
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    train(
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        max_samples_per_class=
            args.max_samples_per_class,
    )
