"""Evaluate the trained CropGuard model on the held-out test split."""

from __future__ import annotations

import json

import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from torch.utils.data import DataLoader

from src.config import (
    CHECKPOINT_PATH,
    CONFUSION_MATRIX_PATH,
    METRICS_PATH,
)
from src.dataset import (
    TomatoDataset,
    build_samples,
    get_transforms,
)
from src.model import build_model


def main() -> None:
    if not CHECKPOINT_PATH.exists():
        raise FileNotFoundError(
            f"Model checkpoint not found: {CHECKPOINT_PATH}"
        )

    checkpoint = torch.load(
        CHECKPOINT_PATH,
        map_location="cpu",
        weights_only=False,
    )

    class_names = checkpoint[
        "class_names"
    ]

    (
        _,
        _,
        test_samples,
        discovered_classes,
    ) = build_samples()

    if (
        class_names
        != discovered_classes
    ):
        raise RuntimeError(
            "Checkpoint class order does not match dataset class order."
        )

    _, eval_transform = (
        get_transforms()
    )

    dataset = TomatoDataset(
        test_samples,
        eval_transform,
    )

    loader = DataLoader(
        dataset,
        batch_size=32,
        shuffle=False,
        num_workers=0,
    )

    model = build_model(
        len(class_names),
        pretrained=False,
    )

    model.load_state_dict(
        checkpoint[
            "model_state_dict"
        ]
    )

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    model = model.to(
        device,
    )

    model.eval()

    predictions: list[int] = []
    targets: list[int] = []

    with torch.no_grad():
        for images, labels in loader:
            logits = model(
                images.to(device)
            )

            predictions.extend(
                logits.argmax(
                    dim=1,
                )
                .cpu()
                .tolist()
            )

            targets.extend(
                labels.tolist()
            )

    metrics = {
        "accuracy":
            accuracy_score(
                targets,
                predictions,
            ),

        "precision_macro":
            precision_score(
                targets,
                predictions,
                average="macro",
                zero_division=0,
            ),

        "recall_macro":
            recall_score(
                targets,
                predictions,
                average="macro",
                zero_division=0,
            ),

        "f1_macro":
            f1_score(
                targets,
                predictions,
                average="macro",
                zero_division=0,
            ),

        "classification_report":
            classification_report(
                targets,
                predictions,
                target_names=
                    class_names,
                output_dict=True,
                zero_division=0,
            ),
    }

    METRICS_PATH.write_text(
        json.dumps(
            metrics,
            indent=2,
        ),
        encoding="utf-8",
    )

    matrix = confusion_matrix(
        targets,
        predictions,
    )

    figure = plt.figure(
        figsize=(12, 10),
    )

    axis = figure.add_subplot(
        111,
    )

    image = axis.imshow(
        matrix,
    )

    figure.colorbar(
        image,
        ax=axis,
    )

    axis.set_xlabel(
        "Predicted class"
    )

    axis.set_ylabel(
        "True class"
    )

    axis.set_title(
        "CropGuard Tomato Disease Confusion Matrix"
    )

    axis.set_xticks(
        np.arange(
            len(class_names),
        ),
    )

    axis.set_yticks(
        np.arange(
            len(class_names),
        ),
    )

    axis.set_xticklabels(
        [
            name.replace(
                "Tomato___",
                "",
            )
            for name in class_names
        ],
        rotation=90,
    )

    axis.set_yticklabels(
        [
            name.replace(
                "Tomato___",
                "",
            )
            for name in class_names
        ],
    )

    figure.tight_layout()

    figure.savefig(
        CONFUSION_MATRIX_PATH,
        dpi=160,
    )

    plt.close(
        figure,
    )

    print(
        json.dumps(
            {
                "accuracy":
                    metrics[
                        "accuracy"
                    ],

                "precision_macro":
                    metrics[
                        "precision_macro"
                    ],

                "recall_macro":
                    metrics[
                        "recall_macro"
                    ],

                "f1_macro":
                    metrics[
                        "f1_macro"
                    ],
            },
            indent=2,
        )
    )

    print(
        f"Metrics saved -> {METRICS_PATH}"
    )

    print(
        f"Confusion matrix -> {CONFUSION_MATRIX_PATH}"
    )


if __name__ == "__main__":
    main()
