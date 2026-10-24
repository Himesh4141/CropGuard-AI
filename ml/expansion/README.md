# CropGuard AI — expanded plant dataset gate (v3 preparation)

The production Vision v2 model still covers **14 crops / 38 trained classes**.
This folder contains **20 candidate additional plants**, not 20 trained crops.
No new crop/disease predictions are enabled by this folder.

## Extensible disease coverage

`candidate_plants.json` contains proposed conditions for each plant, **not**
a maximum of six diseases. Add new condition names only after label taxonomy
review with reliable plant pathology references and photos. Some categories
(e.g. nutrient stress, root rot, wilt, or similar-looking diseases) cannot be
reliably confirmed from one leaf photograph. Those require symptom-only output,
more photos, and/or expert follow-up rather than confident diagnosis.

To recognize more than one condition simultaneously, the training data must
contain **independent multi-label annotations**. The current folder-based
labels are single-condition candidates only; do not claim multi-label support.

## Input layout

Under the repository root:

`ml/data/expansion_labeled/<plant_slug>/<condition_slug>/<photo>.jpg`

Create `ml/data/expansion_labeled/provenance.csv` with the columns:

`relative_path,source,license,farm_group,verified_by`

Use POSIX paths in the CSV, for example:

`mint/mint_rust/example_001.jpg,source_identifier,license_identifier,farm_A,reviewer_ID`

Do not insert invented data or use synthetic diseased-leaf images as clinical
ground truth. Respect dataset licensing and privacy rights. Data should have
real plant identities, healthy controls, geographically diverse phone photos,
and a suitable unknown/non-plant test set.

Run from the repository root:

`python ml/expansion/audit_datasets.py`

The script reads local images, reports class counts, checks missing metadata,
looks for byte-identical images, and reports distinct farm groups. It **does not
validate the licenses, inspect image content, detect near-duplicates, split
train/test data, train models, or approve data for production**.

## Before v3 training

1. Review identities and each disease/symptom label with credible references.
2. Acquire documented, legally reusable plant photographs and healthy controls.
3. Check mislabeled photos, image quality, and near-duplicate leakage.
4. Split data by farm/plant/acquisition session; use independent real-field tests.
5. Calibrate crop and disease predictions, provide unknown/unsupported rejection,
   and evaluate *per-class* precision, recall, confusion, and false confidence.
6. Add multi-label heads only for classes that have reliable multi-label data.
7. Retain v2 as the production fallback until v3 exceeds its verified gates.

**This is a data preparation tool, not a ready-to-run 20-plant diagnosis model.**
