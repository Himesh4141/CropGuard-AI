"""CropGuard ML v3: strict, read-only validation of NEW plant images.

Writes only reports/manifests under ml/expansion/v3. Never changes v2,
production database, uploaded images or original provenance.csv.
This is an engineering preflight, NOT independent licensing/expert validation.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

EXTENSIONS = {'.jpeg', '.jpg', '.png', '.webp'}
REQUIRED_PROVENANCE = {'relative_path', 'source', 'license', 'farm_group', 'verified_by', 'session_id', 'annotation_status'}
REQUIRED_SOURCE = {'source_id', 'source_url', 'license', 'license_url', 'rights_status', 'reviewed_by'}
REQUIRED_LABEL = {'plant_slug', 'condition_slug', 'review_status', 'image_diagnosable', 'reviewed_by'}
RATIOS = {'train': 0.70, 'val': 0.15, 'test': 0.15}


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', value.strip().casefold()).strip('_')


def read_csv(path: Path, required: set[str], blockers: list[str]) -> list[dict[str, str]]:
    if not path.is_file():
        blockers.append(f'Missing file: {path.name}')
        return []
    with path.open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        missing = required - set(reader.fieldnames or [])
        if missing:
            blockers.append(f'{path.name}: missing columns {sorted(missing)}')
            return []
        return [{key: (value or '').strip() for key, value in row.items() if key}
                for row in reader]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def dhash(image) -> int:
    from PIL import Image
    small = image.convert('L').resize((9, 8), Image.Resampling.LANCZOS)
    pixels = list(small.get_flattened_data() if hasattr(small, "get_flattened_data") else small.getdata())
    value = 0
    for y in range(8):
        for x in range(8):
            value = (value << 1) | (pixels[y * 9 + x] > pixels[y * 9 + x + 1])
    return value


def inspect_image(path: Path) -> tuple[int, int, int]:
    from PIL import Image, ImageOps, UnidentifiedImageError
    Image.MAX_IMAGE_PIXELS = 65_000_000
    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            img = ImageOps.exif_transpose(img)
            width, height = img.size
            if min(width, height) < 128:
                raise ValueError('image is smaller than 128 px on one side')
            return width, height, dhash(img)
    except (OSError, ValueError, UnidentifiedImageError) as exc:
        raise ValueError(f'cannot decode acceptable image: {exc}') from exc


def assign_groups(records: list[dict], seed: int) -> tuple[dict[str, str], list[str]]:
    """Try deterministic, group-isolated 70/15/15 assignments; never split one farm."""
    per_group: dict[str, list[dict]] = defaultdict(list)
    for row in records:
        per_group[row['farm_group']].append(row)
    all_counts = Counter(row['class_id'] for row in records)
    groups = sorted(per_group)
    best_assignment = {}
    best_penalty = float('inf')
    best_missing = []
    for attempt in range(250):
        rng = random.Random(seed + attempt)
        shuffled = list(groups)
        rng.shuffle(shuffled)
        # Assign farm groups as a unit. The selected assignment minimizes
        # class imbalance and missing classes in validation/test.
        choices = rng.choices(list(RATIOS), weights=list(RATIOS.values()), k=len(groups))
        assignment = dict(zip(shuffled, choices))
        counts = {split: Counter() for split in RATIOS}
        for group, split in assignment.items():
            counts[split].update(row['class_id'] for row in per_group[group])
        missing = [f'{split}:{cls}' for split in RATIOS for cls in all_counts
                   if counts[split][cls] < 3]
        penalty = 1000 * len(missing)
        penalty += sum(abs(counts[split][cls] - RATIOS[split] * total) / max(1, total)
                       for split in RATIOS for cls, total in all_counts.items())
        if penalty < best_penalty:
            best_penalty, best_assignment, best_missing = penalty, assignment, missing
        if not missing and penalty < 0.25 * len(all_counts):
            break
    return best_assignment, best_missing


def run(root: Path, min_images: int = 30, min_groups: int = 5, seed: int = 26033) -> dict:
    root = root.resolve()
    base = root / 'ml' / 'expansion'
    here = base / 'v3'
    data = root / 'ml' / 'data' / 'expansion_labeled'
    reports = here / 'reports'
    reports.mkdir(parents=True, exist_ok=True)
    blockers: list[str] = []
    catalog_path = base / 'candidate_plants.json'
    if not catalog_path.is_file():
        raise FileNotFoundError(f'Cannot find original catalog: {catalog_path}')
    plants = json.loads(catalog_path.read_text(encoding='utf-8'))['plants']
    proposed = {(plant['slug'], slugify(label)) for plant in plants
                for label in plant['candidate_conditions']}
    known_plants = {plant['slug'] for plant in plants}

    label_rows = read_csv(here / 'label_reviews.csv', REQUIRED_LABEL, blockers)
    source_rows = read_csv(here / 'source_reviews.csv', REQUIRED_SOURCE, blockers)
    provenance_rows = read_csv(data / 'provenance.csv', REQUIRED_PROVENANCE, blockers)

    labels = {}
    for row in label_rows:
        key = (row['plant_slug'], row['condition_slug'])
        if key in labels:
            blockers.append(f'Duplicate label review: {key}')
        elif key not in proposed:
            # The original 120 labels are a starting list, NOT a disease cap.
            # Additional types require explicit expert approval and rationale.
            if (row['review_status'].casefold() == 'approved'
                    and row['image_diagnosable'].casefold() == 'yes'
                    and row['reviewed_by'] and row.get('notes')
                    and key[0] in known_plants and key[1] == slugify(key[1])):
                proposed.add(key)
                labels[key] = row
            else:
                blockers.append(f'New label needs expert evidence in label_reviews.csv: {key}')
        else:
            labels[key] = row

    sources = {}
    for row in source_rows:
        key = row['source_id']
        if not key or key in sources:
            blockers.append(f'Missing/duplicate source_id: {key}')
        else:
            sources[key] = row

    provenance = {}
    for row in provenance_rows:
        relative = row['relative_path'].replace('\\', '/')
        pieces = relative.split('/')
        if (len(pieces) != 3 or any(part in ('', '.', '..') for part in pieces)
                or relative.startswith('/') or not relative.lower().endswith(tuple(EXTENSIONS))):
            blockers.append(f'Invalid provenance path: {relative}')
            continue
        if relative in provenance:
            blockers.append(f'Duplicate provenance entry: {relative}')
            continue
        provenance[relative] = row

    images = {}
    if data.exists():
        for path in data.rglob('*'):
            if path.is_file() and path.suffix.lower() in EXTENSIONS:
                relative = path.relative_to(data).as_posix()
                images[relative] = path
    if not images:
        blockers.append('No new verified plant photos exist. Do not train v3 yet.')
    try:
        import PIL  # noqa: F401
    except ImportError:
        if images:
            blockers.append('Pillow missing: install Pillow to verify image contents and near-duplicates')

    samples = []
    hashes: dict[str, str] = {}
    # Four 16-bit chunks guarantee at least one shared chunk when <=3 bits
    # differ in a 64-bit dHash; avoids a quadratic all-pairs scan.
    near_hash_buckets: dict[tuple[int, int], list[tuple[int, str]]] = defaultdict(list)
    for relative, path in sorted(images.items()):
        parts = relative.split('/')
        if len(parts) != 3 or parts[0] not in known_plants:
            blockers.append(f'Unknown crop or incorrect folder: {relative}')
            continue
        class_key = (parts[0], parts[1])
        if class_key not in proposed:
            blockers.append(f'Unreviewed candidate label: {relative}')
            continue
        review = labels.get(class_key)
        if not review or review['review_status'].casefold() != 'approved' or review['image_diagnosable'].casefold() != 'yes' or not review['reviewed_by']:
            blockers.append(f'Expert label approval missing: {relative}')
            continue
        row = provenance.get(relative)
        if not row:
            blockers.append(f'No provenance row: {relative}')
            continue
        if any(not row.get(col) for col in REQUIRED_PROVENANCE):
            blockers.append(f'Incomplete provenance: {relative}')
            continue
        if row['annotation_status'].casefold() != 'approved':
            blockers.append(f'Image annotation not approved: {relative}')
            continue
        source = sources.get(row['source'])
        if not source or source['rights_status'].casefold() != 'approved' or not all(source.get(col) for col in REQUIRED_SOURCE):
            blockers.append(f'Dataset rights review missing for source {row["source"]}: {relative}')
            continue
        if row['license'].casefold() != source['license'].casefold():
            blockers.append(f'Source and photo licenses do not match: {relative}')
            continue
        if not row['farm_group'].strip() or not row['session_id'].strip():
            blockers.append(f'Farm/session grouping missing: {relative}')
            continue
        if not path.resolve().is_relative_to(data.resolve()):
            blockers.append(f'Photo escapes dataset folder: {relative}')
            continue
        try:
            width, height, fingerprint = inspect_image(path)
        except (ImportError, ValueError, OSError) as exc:
            blockers.append(f'{relative}: {exc}')
            continue
        digest = sha256(path)
        if digest in hashes:
            blockers.append(f'Identical photos: {relative} and {hashes[digest]}')
            continue
        hashes[digest] = relative
        nearby = set()
        for idx in range(4):
            segment = (fingerprint >> (16 * idx)) & 0xFFFF
            nearby.update(near_hash_buckets[(idx, segment)])
        collisions = [old_path for old_hash, old_path in nearby
                      if (fingerprint ^ old_hash).bit_count() <= 3]
        if collisions:
            blockers.append(f'Likely near-duplicate photo: {relative} and {collisions[0]}')
            continue
        for idx in range(4):
            segment = (fingerprint >> (16 * idx)) & 0xFFFF
            near_hash_buckets[(idx, segment)].append((fingerprint, relative))
        samples.append({'relative_path': relative,
                        'plant_slug': parts[0], 'condition_slug': parts[1],
                        'class_id': f'{parts[0]}::{parts[1]}',
                        'farm_group': row['farm_group'], 'session_id': row['session_id'],
                        'source_id': row['source'], 'sha256': digest,
                        'width': width, 'height': height})

    for relative in sorted(provenance.keys() - images.keys()):
        blockers.append(f'Provenance refers to missing photo: {relative}')

    counts = Counter(row['class_id'] for row in samples)
    per_class_groups = defaultdict(set)
    for row in samples:
        per_class_groups[row['class_id']].add(row['farm_group'])
    for key, count in sorted(counts.items()):
        if count < min_images:
            blockers.append(f'Not enough photos for {key}: {count} < {min_images}')
        if len(per_class_groups[key]) < min_groups:
            blockers.append(f'Not enough independent farms for {key}: {len(per_class_groups[key])} < {min_groups}')
    if not counts:
        blockers.append('No approved image classes; review the proposed labels and image sources.')
    elif len(counts) < 2:
        blockers.append('At least two distinct approved plant/condition classes are required for an experimental classifier.')
    session_farms: dict[str, set[str]] = defaultdict(set)
    for sample in samples:
        session_farms[sample['session_id']].add(sample['farm_group'])
    for session, farms in session_farms.items():
        if len(farms) > 1:
            blockers.append(f'Acquisition session shared across different farm groups: {session}')

    assignment, split_missing = assign_groups(samples, seed) if samples else ({}, [])
    if split_missing:
        blockers.append(f'No trustworthy farm-isolated train/val/test split; shortfalls: {split_missing[:12]}')
    for sample in samples:
        sample['split'] = assignment[sample['farm_group']]
    split_counts = {split: sum(sample['split'] == split for sample in samples)
                    for split in RATIOS}
    blockers = list(dict.fromkeys(blockers))

    result = {
        'schema_version': 1,
        'generated_at_utc': datetime.now(timezone.utc).isoformat(),
        'project': 'CropGuard AI',
        'stage': 'experimental_dataset_preparation_only',
        'candidate_plants': len(plants),
        'proposed_condition_labels': len(proposed),
        'images_seen': len(images),
        'approved_samples': len(samples),
        'classes_with_approved_images': dict(sorted(counts.items())),
        'split_counts': split_counts,
        'farm_groups': len(assignment),
        'min_images_per_class': min_images,
        'min_farm_groups_per_class': min_groups,
        'seed': seed,
        'ready_for_experimental_training': not blockers and bool(samples),
        'production_approved': False,
        'blockers': blockers[:300],
        'additional_blocker_count': max(0, len(blockers) - 300),
        'disclaimer': 'Review fields are human attestations, NOT independently verified rights or agronomic diagnosis. No production approval; field tests/OOD/rejection/calibration required.'
    }
    (reports / 'preflight.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    manifest = {k: result[k] for k in ('schema_version', 'seed',
                'ready_for_experimental_training', 'production_approved')}
    manifest['data_root'] = str(data.resolve())
    review_files = [catalog_path, here / 'label_reviews.csv', here / 'source_reviews.csv',
                    data / 'provenance.csv']
    manifest['review_file_hashes'] = {str(path.resolve()): sha256(path) for path in review_files
                                       if path.is_file()}
    manifest['samples'] = samples if result['ready_for_experimental_training'] else []
    manifest['blockers'] = blockers[:30]
    (reports / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument('--min-images', type=int, default=30)
    parser.add_argument('--min-farms', type=int, default=5)
    parser.add_argument('--seed', type=int, default=26033)
    args = parser.parse_args()
    if args.min_images < 9 or args.min_farms < 3:
        parser.error('Minimum images must be >=9 and farms >=3; these are only basic engineering floors.')
    result = run(args.root, args.min_images, args.min_farms, args.seed)
    print(f'Candidates: {result["candidate_plants"]} | proposed labels: {result["proposed_condition_labels"]}')
    print(f'Images found: {result["images_seen"]} | approved samples: {result["approved_samples"]}')
    print('Ready for EXPERIMENTAL training:', result['ready_for_experimental_training'])
    for blocker in result['blockers'][:12]:
        print('BLOCKED:', blocker)
    print('Report: ml/expansion/v3/reports/preflight.json')
    print('Production model field-robust-v2 is unchanged.')


if __name__ == '__main__':
    main()
