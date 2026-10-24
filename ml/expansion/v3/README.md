# CropGuard AI — ML v3 dataset readiness and experimental training

**Status: foundation only. No new species or diseases are trained or deployed.**
The live `field-robust-v2` stays untouched (14 crops, 38 PlantVillage classes).
The current `candidate_plants.json` contains **20 additional proposed plants and 120 proposed plant–condition labels**. Those are *research candidates*, not scientifically confirmed visually detectable diagnoses and not capabilities of the app.

## Starting workflow (do not skip human rights/label review)

1. Identify candidate image collections from agricultural researchers, trusted institutions and rights holders, including real phone photographs; obtain permission for model training and deployment as appropriate. Do not scrape websites or treat availability online as permission. For each distinct source, enter a record in `source_reviews.csv` with the real URL, source/license terms and human reviewer. Set `rights_status=approved` **only after verifying rights**; code cannot perform legal verification.
2. Review proposed plant/condition labels with a qualified plant pathologist/agronomist. In `label_reviews.csv`, change individual entries to `review_status=approved` and `image_diagnosable=yes` only when supported by an imaging protocol, then fill `reviewed_by`. In particular, root rot, wilt and nutrient-deficiency *causes* are generally not safely inferable from leaf-only photos. The initial 120 are NOT a cap: after expert review, append a new `label_reviews.csv` row with the existing `plant_slug`, a normalized `condition_slug`, `review_status=approved`, `image_diagnosable=yes`, a reviewer, and specific evidence in `notes`. The audit will then permit additional real-image classes without modifying the original candidate catalog. Never add conditions merely to reach a target count.
3. Put acquired images under `ml/data/expansion_labeled/<plant_slug>/<condition_slug>/<image>.jpg`. Exact proposed slugs are provided in `label_reviews.csv`. Preserve a provenance trail in **one shared** `ml/data/expansion_labeled/provenance.csv` with the columns below. Each photo must have one unambiguous approved condition label: this first baseline does NOT support multiple diseases per image.
4. Run the preflight: from project root execute `backend\.venv\Scripts\python.exe ml\expansion\v3\prepare.py` (Windows), or `python ml/expansion/v3/prepare.py` (generic). Requires Python 3.10+ and Pillow when images exist. Review `ml/expansion/v3/reports/preflight.json`.
5. Only after preflight says `ready_for_experimental_training=true` can `train.py` run. Train in an isolated Python environment with compatible CUDA PyTorch, torchvision and Pillow; `--imagenet` optionally downloads pretrained weights. Default training command: `python ml/expansion/v3/train.py --imagenet --batch-size 16 --epochs 20`. Experimental weights and reports go to `ml/expansion/v3/runs/experiment/`.

## Provenance template (CSV header)

`relative_path,source,license,farm_group,verified_by,session_id,annotation_status`

- `source` is the exact `source_id` from `source_reviews.csv`.
- `license` must match that approved source's license record.
- `farm_group` is a **globally unique farm / collection-site identifier**; every image from the same farm is assigned to only one split, even across sessions. For controlled collections, use a conservative common group for shared plants/batches if identity is unclear. For third-party data, group by original plant/site/photographer/acquisition batch as available; unknown groups are a leakage risk and should be excluded until documented.
- `session_id` identifies the photography session; multiple photos of the same leaf/plant should be deduplicated or share a grouping.
- `verified_by` identifies the qualified human annotator, and `annotation_status=approved` indicates human review.
- Avoid publishing real names, precise farm locations or personal images in a public repo; store raw data and CSV privately.

## Safety gates

- `prepare.py` checks path/label consistency, documented usage rights, human review attestations, image readability/resolution, byte and near-duplicate photos (dHash threshold 3), minimum 30 usable images per represented class, at least 5 separate farms/class and at least 3 images/class in each farm-isolated train/val/test split. **These are minimal engineering checks, not claims of statistical sufficiency.** Larger, field-representative datasets are required.
- It writes an explicitly blocked/empty manifest if there are any blockers, so old experimental manifests do not silently authorize training.
- `train.py` additionally rechecks file hashes and farm-group isolation. It trains a **single-label MobileNetV3-Large two-head research baseline**: species + plant/condition pair. No per-leaf multiple-condition recognition or deployment is claimed.
- Its held-out test set is evaluated only once after early stopping on validation macro-F1. Because the same source pool may not be an independent real-farm sample, the report does **not** claim actual field reliability.
- Image quality limits, class-specific rejection, unknown plants, overlapping symptoms, independent geography/device data, probability calibration, robustness and expert agronomic review are future required steps. Keep v2 in production until proven.

## Scope / keep repository clean

No script downloads copyrighted datasets, modifies the frontend/API, retrains v2, applies database migrations, or builds an APK. Keep `ml/data/` and `ml/expansion/v3/runs/` out of Git. Reports may contain file names; review before publishing.

This foundation is deliberately prepared **offline**: a credible source registry needs real rights/license verification before any new plant can be represented as supported.
