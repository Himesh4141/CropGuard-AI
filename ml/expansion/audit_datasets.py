"""Read-only provenance and label audit for CropGuard's proposed plant expansion.

Dataset layout (inside the real repository):
  ml/data/expansion_labeled/<plant_slug>/<condition_slug>/<photo>.jpg

Requires provenance.csv with:
  relative_path,source,license,farm_group,verified_by

This tool does NOT download photographs, verify licenses, train, or claim
real-farm accuracy. New condition names need explicit catalog review.
"""
from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPANSION = Path(__file__).resolve().parent
DATA = ROOT / "ml" / "data" / "expansion_labeled"
CATALOG = EXPANSION / "candidate_plants.json"
PROVENANCE = DATA / "provenance.csv"
REPORT = EXPANSION / "dataset_audit_report.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
REQUIRED_FIELDS = {"relative_path", "source", "license", "farm_group", "verified_by"}


def normalize_path(value: str) -> str:
    """Normalize a CSV path only; never use this as an absolute file locator."""
    return value.replace("\\", "/").strip().removeprefix("./")


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def collect_provenance(blockers: list[str]) -> dict[str, dict[str, str]]:
    entries: dict[str, dict[str, str]] = {}
    if not PROVENANCE.is_file():
        blockers.append("Missing ml/data/expansion_labeled/provenance.csv")
        return entries

    with PROVENANCE.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if not REQUIRED_FIELDS.issubset(set(reader.fieldnames or [])):
            raise ValueError(
                "provenance.csv missing columns: "
                + ", ".join(sorted(REQUIRED_FIELDS - set(reader.fieldnames or [])))
            )
        for line_number, row in enumerate(reader, start=2):
            relative = normalize_path(row.get("relative_path") or "")
            parts = relative.split("/")
            if len(parts) != 3 or any(part in ("", ".", "..") for part in parts):
                blockers.append(f"Invalid relative_path at CSV line {line_number}: {relative}")
                continue
            if relative in entries:
                blockers.append(f"Duplicate provenance row: {relative}")
                continue
            entries[relative] = row
    return entries


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    plants = {item["slug"]: item for item in catalog["plants"]}
    blockers: list[str] = []
    provenance = collect_provenance(blockers)

    images = {
        path.relative_to(DATA).as_posix(): path
        for path in DATA.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    } if DATA.is_dir() else {}

    if not images:
        blockers.append("No new plant images found; the 20 candidates are not trained classes.")

    class_counts: Counter[str] = Counter()
    documented_counts: Counter[str] = Counter()
    farm_groups: dict[str, set[str]] = {}
    exact_duplicates: list[str] = []
    hashes: dict[str, str] = {}

    for relative, path in sorted(images.items()):
        parts = relative.split("/")
        if len(parts) != 3 or parts[0] not in plants:
            blockers.append(f"Unknown plant or invalid image path: {relative}")
            continue

        condition = parts[1].replace("_", " ").casefold()
        proposals = {
            item.casefold() for item in plants[parts[0]]["candidate_conditions"]
        }
        if condition not in proposals:
            blockers.append(
                f"Unreviewed condition '{condition}' in {relative}; "
                "review its label and add it to candidate_plants.json first."
            )
            continue

        if path.stat().st_size == 0:
            blockers.append(f"Empty image: {relative}")
            continue

        key = f"{parts[0]}::{condition}"
        class_counts[key] += 1

        # Hashes only catch byte-identical photos, not perceptual duplicates.
        fingerprint = digest_file(path)
        if fingerprint in hashes:
            exact_duplicates.append(f"{relative} == {hashes[fingerprint]}")
            blockers.append(f"Byte-identical duplicate images: {relative}")
        else:
            hashes[fingerprint] = relative

        row = provenance.get(relative)
        if row and all((row.get(field) or "").strip() for field in REQUIRED_FIELDS):
            documented_counts[key] += 1
            farm_groups.setdefault(key, set()).add(row["farm_group"].strip())
        else:
            blockers.append(f"Missing or incomplete provenance: {relative}")

    for relative in sorted(provenance.keys() - images.keys()):
        blockers.append(f"Provenance points to missing image: {relative}")

    # Baseline reporting only. This does not make PlantVillage a field-photo test.
    baseline = ROOT / "ml/data/PlantVillage-Dataset/raw/color"
    baseline_counts = {
        folder.name: sum(
            path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
            for path in folder.iterdir()
        )
        for folder in sorted(baseline.iterdir())
        if folder.is_dir()
    } if baseline.is_dir() else {}

    report = {
        "existing_plantvillage_baseline": {
            "found": baseline.is_dir(),
            "class_count": len(baseline_counts),
            "image_count": sum(baseline_counts.values()),
            "class_image_counts": baseline_counts,
            "field_validation": False,
        },
        "candidate_plant_count": len(plants),
        "images_found": len(images),
        "images_with_required_provenance": sum(documented_counts.values()),
        "proposed_classes_with_images": dict(class_counts),
        "documented_image_counts": dict(documented_counts),
        "distinct_farm_groups_per_class": {
            key: len(groups) for key, groups in sorted(farm_groups.items())
        },
        "exact_duplicate_image_pairs": exact_duplicates[:100],
        "blockers_count": len(blockers),
        "blocker_examples": blockers[:100],
        "ready_for_training": False,
        "explanation": (
            "CSV fields are not independent proof of provenance or medical/plant "
            "pathology verification. Review usage rights, identities, labels, "
            "near duplicates, independent farm/session splits, and test metrics. "
            "This auditor does not mark any class as production-ready."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Candidate plants: {len(plants)}")
    print(f"Images: {len(images)}; provenance fields filled: {sum(documented_counts.values())}")
    print(f"Blockers: {len(blockers)}; ready for training: False")
    print(f"Report: {REPORT}")


if __name__ == "__main__":
    main()
