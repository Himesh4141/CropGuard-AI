"""Export the trained CropGuard model to ONNX."""

from __future__ import annotations

import numpy as np
import onnx
import onnxruntime as ort
import torch

from src.config import (
    CHECKPOINT_PATH,
    IMAGE_SIZE,
    ONNX_PATH,
)
from src.model import build_model


def main() -> None:
    if not CHECKPOINT_PATH.exists():
        raise FileNotFoundError(
            f"Checkpoint not found: {CHECKPOINT_PATH}"
        )

    checkpoint = torch.load(
        CHECKPOINT_PATH,
        map_location="cpu",
        weights_only=False,
    )

    class_names = checkpoint[
        "class_names"
    ]

    model = build_model(
        len(class_names),
        pretrained=False,
    )

    model.load_state_dict(
        checkpoint[
            "model_state_dict"
        ]
    )

    model.eval()

    dummy_input = torch.randn(
        1,
        3,
        IMAGE_SIZE,
        IMAGE_SIZE,
    )

    torch.onnx.export(
        model,
        dummy_input,
        ONNX_PATH,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=[
            "image",
        ],
        output_names=[
            "logits",
        ],
        dynamic_axes={
            "image": {
                0: "batch",
            },
            "logits": {
                0: "batch",
            },
        },
    )

    onnx_model = onnx.load(
        ONNX_PATH,
    )

    onnx.checker.check_model(
        onnx_model,
    )

    pytorch_output = (
        model(dummy_input)
        .detach()
        .numpy()
    )

    session = (
        ort.InferenceSession(
            str(ONNX_PATH),
            providers=[
                "CPUExecutionProvider",
            ],
        )
    )

    onnx_output = session.run(
        None,
        {
            "image":
                dummy_input.numpy(),
        },
    )[0]

    np.testing.assert_allclose(
        pytorch_output,
        onnx_output,
        rtol=1e-3,
        atol=1e-4,
    )

    print(
        f"ONNX export verified -> {ONNX_PATH}"
    )


if __name__ == "__main__":
    main()
