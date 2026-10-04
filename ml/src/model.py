"""MobileNetV3 model factory."""

from torch import nn
from torchvision.models import (
    MobileNet_V3_Small_Weights,
    mobilenet_v3_small,
)


def build_model(
    num_classes: int,
    pretrained: bool = True,
):
    weights = (
        MobileNet_V3_Small_Weights.DEFAULT
        if pretrained
        else None
    )

    model = mobilenet_v3_small(
        weights=weights,
    )

    input_features = (
        model.classifier[-1]
        .in_features
    )

    model.classifier[-1] = (
        nn.Linear(
            input_features,
            num_classes,
        )
    )

    return model


def freeze_backbone(
    model,
) -> None:
    for parameter in (
        model.features.parameters()
    ):
        parameter.requires_grad = False


def unfreeze_last_blocks(
    model,
    blocks: int = 3,
) -> None:
    total_blocks = len(
        model.features
    )

    start = max(
        0,
        total_blocks - blocks,
    )

    for block in (
        model.features[start:]
    ):
        for parameter in (
            block.parameters()
        ):
            parameter.requires_grad = True
