"""Dataset preparation for CropGuard tomato disease classification."""

from __future__ import annotations

import random
from collections import defaultdict
from pathlib import Path
from typing import Callable

from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms

from src.config import (
    DATASET_ROOT,
    IMAGE_SIZE,
    IMAGENET_MEAN,
    IMAGENET_STD,
    RANDOM_SEED,
    TEST_RATIO,
    TOMATO_PREFIX,
    TRAIN_RATIO,
    VALIDATION_RATIO,
)


SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
}


class TomatoDataset(Dataset):
    def __init__(
        self,
        samples: list[tuple[Path, int]],
        transform: Callable | None = None,
    ) -> None:
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int):
        path, label = self.samples[index]

        with Image.open(path) as image:
            image = image.convert("RGB")

            if self.transform is not None:
                image = self.transform(image)

        return image, label


def get_transforms():
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(
                IMAGE_SIZE,
                scale=(0.80, 1.0),
            ),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(
                brightness=0.15,
                contrast=0.15,
                saturation=0.15,
                hue=0.03,
            ),
            transforms.ToTensor(),
            transforms.Normalize(
                IMAGENET_MEAN,
                IMAGENET_STD,
            ),
        ]
    )

    evaluation_transform = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(
                IMAGENET_MEAN,
                IMAGENET_STD,
            ),
        ]
    )

    return train_transform, evaluation_transform


def discover_classes(
    dataset_root: Path = DATASET_ROOT,
) -> list[str]:
    if not dataset_root.exists():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {dataset_root}"
        )

    classes = sorted(
        directory.name
        for directory in dataset_root.iterdir()
        if directory.is_dir()
        and directory.name.startswith(TOMATO_PREFIX)
    )

    if not classes:
        raise RuntimeError(
            f"No Tomato classes found under {dataset_root}"
        )

    return classes


def build_samples(
    max_samples_per_class: int | None = None,
    dataset_root: Path = DATASET_ROOT,
) -> tuple[
    list[tuple[Path, int]],
    list[tuple[Path, int]],
    list[tuple[Path, int]],
    list[str],
]:
    class_names = discover_classes(
        dataset_root,
    )

    class_to_index = {
        class_name: index
        for index, class_name
        in enumerate(class_names)
    }

    grouped_samples: dict[
        int,
        list[tuple[Path, int]],
    ] = defaultdict(list)

    for class_name in class_names:
        class_index = class_to_index[
            class_name
        ]

        class_directory = (
            dataset_root
            / class_name
        )

        paths = sorted(
            path
            for path in class_directory.iterdir()
            if path.is_file()
            and path.suffix.lower()
            in SUPPORTED_EXTENSIONS
        )

        if not paths:
            raise RuntimeError(
                f"No images found in {class_directory}"
            )

        rng = random.Random(
            RANDOM_SEED
            + class_index
        )

        rng.shuffle(paths)

        if (
            max_samples_per_class
            is not None
        ):
            paths = paths[
                :max_samples_per_class
            ]

        grouped_samples[
            class_index
        ].extend(
            (
                path,
                class_index,
            )
            for path in paths
        )

    train_samples: list[
        tuple[Path, int]
    ] = []

    validation_samples: list[
        tuple[Path, int]
    ] = []

    test_samples: list[
        tuple[Path, int]
    ] = []

    for class_index in sorted(
        grouped_samples
    ):
        samples = grouped_samples[
            class_index
        ]

        count = len(samples)

        train_end = int(
            count
            * TRAIN_RATIO
        )

        validation_end = (
            train_end
            + int(
                count
                * VALIDATION_RATIO
            )
        )

        train_samples.extend(
            samples[:train_end]
        )

        validation_samples.extend(
            samples[
                train_end:
                validation_end
            ]
        )

        test_samples.extend(
            samples[
                validation_end:
            ]
        )

    rng = random.Random(
        RANDOM_SEED,
    )

    rng.shuffle(
        train_samples,
    )

    rng.shuffle(
        validation_samples,
    )

    rng.shuffle(
        test_samples,
    )

    return (
        train_samples,
        validation_samples,
        test_samples,
        class_names,
    )
