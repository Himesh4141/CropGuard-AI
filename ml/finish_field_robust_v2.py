from __future__ import annotations

import json
import os
from collections import defaultdict
from pathlib import Path

os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import torch

import train_field_robust_v2 as t


# Prevent Windows worker/RAM explosion during final evaluation.
t.NUM_WORKERS = 0
t.BATCH_SIZE = 16

torch.set_num_threads(1)

print()
print("=" * 72)
print(" CROPguard v2 SAFE EVALUATION RESUME")
print("=" * 72)

if not t.BEST_MODEL.exists():
    raise RuntimeError(
        f"Best trained checkpoint not found: {t.BEST_MODEL}"
    )

print("Checkpoint:", t.BEST_MODEL)
print("GPU:", torch.cuda.get_device_name(0))
print()

data = t.create_datasets()

model = t.build_v2_model(
    len(data.classes)
).to(t.DEVICE)

checkpoint = torch.load(
    t.BEST_MODEL,
    map_location=t.DEVICE,
    weights_only=False,
)

model.load_state_dict(
    checkpoint["model_state"]
)

best_epoch = int(
    checkpoint.get(
        "epoch",
        0,
    )
)

best_val_accuracy = float(
    checkpoint.get(
        "val_accuracy",
        0.0,
    )
)

print(
    "PASS: trained checkpoint loaded"
)

print()
print("[1/5] Rebuilding confidence calibration...")

val_logits, val_labels = t.collect_logits(
    model,
    data.val_loader,
    tta=True,
)

temperature = t.fit_temperature(
    val_logits,
    val_labels,
)

policy = t.derive_rejection_policy(
    val_logits,
    val_labels,
    temperature,
)

print(
    "Temperature:",
    round(
        temperature,
        4,
    ),
)

print(
    "Global threshold:",
    policy[
        "global_confidence_threshold"
    ],
)

print()
print("[2/5] Evaluating clean untouched test set...")

test_logits, test_labels = t.collect_logits(
    model,
    data.test_loader,
    tta=True,
)

clean = t.evaluate(
    test_logits,
    test_labels,
    temperature,
)

print(
    "Clean accuracy:",
    f"{clean['accuracy']:.4%}",
)

print(
    "Clean macro-F1:",
    f"{clean['macro_f1']:.4%}",
)

del test_logits
torch.cuda.empty_cache()


print()
print("[3/5] Evaluating low-memory phone/field stress test...")

stress_logits, stress_labels = t.collect_logits(
    model,
    data.stress_loader,
    tta=True,
)

stress = t.evaluate(
    stress_logits,
    stress_labels,
    temperature,
)

print(
    "Stress accuracy:",
    f"{stress['accuracy']:.4%}",
)

print(
    "Stress macro-F1:",
    f"{stress['macro_f1']:.4%}",
)

del stress_logits
torch.cuda.empty_cache()


print()
print("[4/5] Exporting final v2 ONNX model...")

t.export_onnx(
    model,
    t.ONNX_MODEL,
)

t.verify_onnx(
    t.ONNX_MODEL,
    len(data.classes),
)

print(
    "PASS: ONNX export verified"
)


# Free v2 GPU memory before optional v1 comparison.
model = model.cpu()
del model

torch.cuda.empty_cache()


print()
print("[5/5] Comparing v1 robustness...")

v1_stress = None

try:
    v1_stress = t.evaluate_v1_stress(
        data.classes,
        data.test_indices,
    )

    if v1_stress:
        print(
            "V1 stress accuracy:",
            f"{v1_stress['accuracy']:.4%}",
        )

        print(
            "V1 stress macro-F1:",
            f"{v1_stress['macro_f1']:.4%}",
        )

except Exception as exc:
    print(
        "INFO: v1 stress comparison skipped:",
        exc,
    )


v1_clean_accuracy = 0.0

if t.V1_METADATA.exists():
    try:
        v1_meta = json.loads(
            t.V1_METADATA.read_text(
                encoding="utf-8"
            )
        )

        v1_clean_accuracy = float(
            v1_meta.get(
                "test",
                {},
            ).get(
                "accuracy",
                0.0,
            )
        )
    except Exception:
        pass


crop_to_indices = defaultdict(list)
class_metadata = []

for index, class_name in enumerate(
    data.classes
):
    crop, disease = t.split_class_name(
        class_name
    )

    crop_to_indices[
        crop
    ].append(
        index
    )

    class_metadata.append(
        {
            "index": index,
            "raw_class": class_name,
            "crop": crop,
            "disease": disease,
            "healthy":
                disease.lower()
                == "healthy",
        }
    )


recommendation = "manual_review"

if v1_stress:

    clean_ok = (
        clean["accuracy"]
        >= v1_clean_accuracy - 0.003
    )

    stress_better = (
        stress["accuracy"]
        > v1_stress["accuracy"]
    )

    if clean_ok and stress_better:
        recommendation = "promote_v2"

    elif (
        clean["accuracy"]
        < v1_clean_accuracy - 0.008
        and stress["accuracy"]
        <= v1_stress["accuracy"]
    ):
        recommendation = "keep_v1"


metadata = {
    "model_name":
        "CropGuard Field-Robust MobileNetV3 Large",

    "model_version":
        "field-robust-v2",

    "architecture":
        "mobilenet_v3_large",

    "dataset":
        "PlantVillage color with field-robust augmentation",

    "image_size":
        t.IMAGE_SIZE,

    "num_classes":
        len(data.classes),

    "num_crops":
        len(crop_to_indices),

    "classes":
        data.classes,

    "class_metadata":
        class_metadata,

    "crop_class_indices":
        dict(crop_to_indices),

    "temperature":
        temperature,

    "rejection_policy":
        policy,

    "training": {
        "best_epoch":
            best_epoch,

        "best_validation_accuracy":
            best_val_accuracy,
    },

    "test": {
        "clean_accuracy":
            clean["accuracy"],

        "clean_macro_f1":
            clean["macro_f1"],

        "field_stress_proxy_accuracy":
            stress["accuracy"],

        "field_stress_proxy_macro_f1":
            stress["macro_f1"],
    },

    "v1_comparison": {
        "v1_clean_accuracy":
            v1_clean_accuracy,

        "v1_field_stress_proxy":
            v1_stress,

        "deploy_recommendation":
            recommendation,
    },

    "inference": {
        "tta_views": [
            "original",
            "horizontal_flip",
            "vertical_flip",
        ],

        "use_per_class_thresholds":
            True,

        "use_margin_rejection":
            True,

        "use_entropy_rejection":
            True,

        "safe_image_normalization":
            True,

        "generative_super_resolution":
            False,
    },

    "limitations": [
        (
            "PlantVillage controlled imagery does "
            "not establish equivalent field accuracy."
        ),
        (
            "The degraded-image stress benchmark "
            "is a robustness proxy, not independent "
            "real-farm validation."
        ),
        (
            "Mixed diseases require appropriately "
            "labelled multi-condition field data."
        ),
    ],
}


t.METADATA_FILE.write_text(
    json.dumps(
        metadata,
        indent=2,
    ),
    encoding="utf-8",
)

t.REPORT_FILE.write_text(
    json.dumps(
        {
            "clean_test":
                clean,

            "field_stress_proxy":
                stress,

            "v1_field_stress_proxy":
                v1_stress,

            "deploy_recommendation":
                recommendation,
        },
        indent=2,
    ),
    encoding="utf-8",
)


print()
print("=" * 72)
print(" CROPguard FIELD-ROBUST v2 FINALIZED")
print("=" * 72)

print(
    "Best validation accuracy:",
    f"{best_val_accuracy:.4%}",
)

print(
    "Clean test accuracy:",
    f"{clean['accuracy']:.4%}",
)

print(
    "Clean macro-F1:",
    f"{clean['macro_f1']:.4%}",
)

print(
    "Stress proxy accuracy:",
    f"{stress['accuracy']:.4%}",
)

print(
    "Stress proxy macro-F1:",
    f"{stress['macro_f1']:.4%}",
)

if v1_stress:
    print(
        "V1 stress proxy accuracy:",
        f"{v1_stress['accuracy']:.4%}",
    )

print(
    "Global accept threshold:",
    f"{policy['global_confidence_threshold']:.1%}",
)

print(
    "Accepted validation accuracy:",
    f"{policy['accepted_accuracy']:.4%}",
)

print(
    "Accepted coverage:",
    f"{policy['accepted_coverage']:.2%}",
)

print(
    "DEPLOY RECOMMENDATION:",
    recommendation,
)

print()
print(
    "Model:",
    t.ONNX_MODEL,
)