# CropGuard further-training results — 30 October 2026

A new continuation passed the predeclared validation requirements. Selected continuation epoch: 6. The exported artifact is experimental and has not replaced the active model or been deployed.

## Results compared with the first field candidate

The previous 202-image field set has already been inspected. These are **reused regression-benchmark results**, not a new independent field test. Model selection used validation data, never these test scores.

| Benchmark | First-choice accuracy, previous → new | Correct crop supplied, previous → new | Correct / accepted, previous → new |
|---|---:|---:|---:|
| Field originals, 202 | 66.3% → 70.3% | 83.7% → 87.1% | 43/44 → 44/45 |
| Compressed field images, 202 | 53.0% → 53.5% | 75.2% → 76.2% | 27/28 → 29/31 |
| Controlled originals, 760 | 99.9% → 99.7% | 100.0% → 99.9% | 608/608 → 618/618 |
| Compressed controlled images, 760 | 99.1% → 99.3% | 99.2% → 99.5% | 562/563 → 582/583 |

Supplied-crop accuracy is the highest scored class inside the correct crop before abstention; it includes singleton crops. It is not diagnosis coverage. `test-results.json` also reports results excluding singleton crops under `multi_class_crop`. Compressed images are paired versions, not independent new samples. Dataset disease labels remain unverified by an agronomist.

## Fresh controlled-image check

Before evaluating this continuation, 729 additional controlled test images were reserved from the original v2 test partition. Exact and close perceptual matches to prior training, validation and audit images were excluded. All 38 classes are represented, with uneven counts where remaining images were scarce. This provides fresh controlled-image evidence, not fresh field evidence.

| Model | Original accuracy | Compressed accuracy | Incorrect accepted: original / compressed |
|---|---:|---:|---:|
| Released v2 | 99.9% (728/729) | 99.6% (726/729) | 0 / 0 |
| First field candidate | 99.9% (728/729) | 98.9% (721/729) | 0 / 0 |
| New candidate | 99.7% (727/729) | 98.8% (720/729) | 0 / 0 |

## What changed in the experiment

The earlier selector never evaluated degraded validation images. Selection now checks both original and fixed compressed versions of 386 field and 380 controlled validation images. The starting model remains eligible as epoch zero.

The continuation adds 0.25 × supervised loss for distinguishing diseases within the known crop, while retaining the full 38-class loss. It preserves architecture, class mapping, training data, augmentation, temperature and acceptance thresholds. The first continuation (replay weight 0.5) ran 3 epochs and was rejected by the declared requirements. A second bounded continuation used replay weight 1.0 to better preserve the original model's distinctions and ran 6 epochs.

The selection requirements were kept fixed: no increase in incorrect accepted validation diagnoses on any of the four cohorts; no field supplied-crop regression; at most one additional field global error versus the starting candidate; and at most one additional controlled-image error versus original v2. Eligible candidates are ranked by field supplied-crop accuracy and macro F1 across clean and compressed validation. No confidence thresholds were relaxed.

Validation-only review found bacterial spot → Septoria to be the largest residual confusion (8/19 cases). Corn common rust was already 18/21 correct on validation. Target spot had zero field training/validation examples; mites had only two field training and zero field validation examples. Accordingly, this work does not establish new real-field target-spot/mite reliability. A training-only check found the v2 teacher correct on 255/256 sampled augmented views, so copied teacher errors were not established as the main cause.

## Backend verification and remaining limits

The selected checkpoint was exported to ONNX and checked numerically. The real backend ran the same 489 cases used in the first field audit. All usable field predictions matched the PyTorch evaluation. Detailed scores and reasons are in `runtime-candidate.json`; accepted mismatches are in `error-review.json`.

On the supplied 85-image pack: clean first-choice correctness is 38/38; degraded correctness is 35/38; degraded accepted correctness is 22/23. Wrong-crop cases accepted: 0/6; unusable images accepted: 0/3.

This is a measured model experiment, not production certification. Repeated validation/model development and internet-source labels require a new independently reviewed field cohort before a production-readiness claim. The original supported crop coverage is unchanged, and arbitrary houseplant diseases remain outside it. A local inference test does not measure authenticated upload or free Render cold-start latency.

The original APK, active model, keys, sign-in and other recorded app sources remain preserved. No deployment or paid service was used. The earlier local photo-flow and backend fixes remain in place.

## Reproduce

Run from the output folder. The following command evaluates the frozen selected continuation; it does not alter deployment settings:

```powershell
& 'C:\Users\himes\Projects\CropGuard\ml\.venv\Scripts\python.exe' -B '.\evaluate_continuation.py' --manifest 'C:\Users\himes\Documents\Codex\2026-10-23\referenced-chatgpt-conversation-this-is-an\outputs\field-model-candidate\training-manifest.json' --fresh 'C:\Users\himes\Documents\Codex\2026-10-23\referenced-chatgpt-conversation-this-is-an\outputs\fresh-controlled-test.json' --metadata 'C:\Users\himes\Projects\CropGuard\ml\artifacts\field_robust_v2\cropguard_field_robust_v2_metadata.json' --original 'C:\Users\himes\Projects\CropGuard\ml\artifacts\field_robust_v2\cropguard_field_robust_v2_best.pt' --previous 'C:\Users\himes\Documents\Codex\2026-10-23\referenced-chatgpt-conversation-this-is-an\outputs\field-model-candidate\best.pt' --candidate 'C:\Users\himes\Documents\Codex\2026-10-23\referenced-chatgpt-conversation-this-is-an\outputs\field-model-candidate3\best.pt' --output 'C:\Users\himes\Documents\Codex\2026-10-23\referenced-chatgpt-conversation-this-is-an\outputs\continuation-evaluation-rerun'
```

The training script is `train_field_continuation.py`, with `--replay-weight 1.0 --patience 6 --epochs 6` for the selected experiment. `training.json` records each attempted epoch, selection failures and unchanged threshold policy; `fresh-controlled-test.json` freezes the additional test cohort. The model bundle includes ONNX, matching metadata, license, attribution and this report.
