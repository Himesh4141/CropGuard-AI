# CropGuard AI — First real-image intake: Tulsi and Money Plant

This is a **local intake utility**, not an image downloader or disease recognizer. It improves how we bring actual photographs into ML v3 research. The existing model `field-robust-v2` and deployed app are untouched.

## 1. Acquire an image collection with verifiable permission

Find a source you are permitted to use for **ML training and redistribution/deployment of derived models**. Check the exact dataset-specific terms, not merely the host site's general terms. For personal field photos, document the photographer's permission and avoid sharing private images, faces or precise GPS coordinates. Do **not** misrepresent general plant photographs as expertly confirmed disease labels.

Scientific and common-name search strings for source discovery:

- `Ocimum tenuiflorum` / `Ocimum sanctum` / **Tulsi** / **holy basil**, leaf spot / powdery mildew / downy mildew (each condition must be reviewed)
- `Epipremnum aureum` / **Pothos** / **money plant**, leaf spot / bacterial leaf symptoms / sun scorch (root rot cannot generally be confirmed from a leaf alone)

Search relevant university repositories, research publications' supplementary data, and dataset repositories. No specific external dataset is claimed verified or licensed in this offline package.

## 2. Stage one local batch with one command

From `C:\Users\himes\Projects\CropGuard`:

```powershell
.\backend\.venv\Scripts\python.exe ml\expansion\v3\intake.py --source "$env:USERPROFILE\Downloads\YOUR_TULSI_DATASET.zip" --plant tulsi --batch-id tulsi_batch_01
```

For Money Plant, replace `--plant tulsi --batch-id tulsi_batch_01` with `--plant money_plant --batch-id pothos_batch_01` and change the source path. `--source` also accepts a folder of phone photographs. This tool works offline.

A batch stages into `ml/data/expansion_inbox/<batch-id>/`, with `photos/`, `intake_manifest.csv`, and `intake_report.json`. It does not write to approved `ml/data/expansion_labeled/`. It does not change `source_reviews.csv`, `label_reviews.csv`, or `provenance.csv`.

## 3. Review and train only after approval

Review the intake report and manifest. Flagged duplicates or damaged images should be removed from a reviewed collection; check suspected duplicates manually. Confirm plant identity, field symptoms, appropriate disease evidence, per-image labeling, source license, annotator, photo session, and plant/farm grouping with qualified reviewers. Record **real** source/label approvals in v3's existing review sheets. Do not mark pending images as approved automatically.

Following review, copy only approved images into `ml/data/expansion_labeled/<plant_slug>/<condition_slug>/` and prepare the existing `provenance.csv` using the exact required columns in `ml/expansion/v3/README.md`. Run:

```powershell
.\backend\.venv\Scripts\python.exe ml\expansion\v3\prepare.py
```

If the report remains BLOCKED, **do not run train.py**. The preflight's 30 images/class and 5 farms/class are **bare technical minimums**, not scientifically adequate dataset targets or production quality guarantees.

## Safety and privacy

- There are **zero new real images included**. No disease classes have been added to the deployed model.
- Batch imports are immutable: use a new batch ID if you need to retry; no accidental overwrite.
- Suspicious ZIP traversal paths and symlinks are refused; oversized and unreadable images are rejected; exact duplicates aren't stored twice; visually similar pairs are flagged.
- Original accepted photos are preserved in a **private** local inbox and might include EXIF/GPS. Do not commit, share publicly, or upload raw photos without reviewing personal information and permissions.
- Check licensing and metadata yourself or with the appropriate qualified reviewer; the script can't verify legal usage rights or diagnose plant conditions.
