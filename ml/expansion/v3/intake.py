"""Offline, conservative image intake for CropGuard AI's EXPERIMENTAL v3 research.

Stages readable, authentic input files from a local directory or ZIP to
ml/data/expansion_inbox/<batch_id>. Does NOT approve diseases/licenses,
create approved provenance, train models, edit v2, or contact any service.

Example (from project root):
  python ml/expansion/v3/intake.py --source C:/Downloads/tulsi.zip --plant tulsi --batch-id tulsi_001
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import stat
import sys
import tempfile
import zipfile
from collections import Counter, defaultdict
from pathlib import Path, PurePosixPath
from typing import BinaryIO, Iterator

ALLOWED_EXTS = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_PHOTO_BYTES = 40 * 1024 * 1024  # guard oversized input
MAX_TOTAL_BYTES = 3 * 1024 * 1024 * 1024
MAX_FILES = 40_000
SAFE_BATCH = re.compile(r'^[a-z][a-z0-9_-]{2,63}$')
HEADERS = ['source_path', 'staged_path', 'plant_slug', 'proposed_condition_from_folder',
           'sha256', 'width', 'height', 'exif_gps_present', 'duplicate_of',
           'near_duplicate_of', 'source_id', 'source_url', 'license',
           'farm_group', 'session_id', 'reviewed_condition_slug', 'verified_by',
           'review_status', 'notes']


def _root_from_script() -> Path:
    return Path(__file__).resolve().parents[3]


def _is_safe_relative_path(raw: str) -> bool:
    if '\\' in raw or raw.startswith('/') or not raw or '\x00' in raw:
        return False
    pieces = PurePosixPath(raw).parts
    return bool(pieces) and not any(x in ('.', '..') for x in pieces) and not (':' in pieces[0])


def _entries(source: Path) -> Iterator[tuple[str, int, object]]:
    """Yield filename/declared size and lazy open handle; source remains untouched."""
    if source.is_file() and source.suffix.lower() == '.zip':
        with zipfile.ZipFile(source) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                # Unix symlinks in ZIPs must never be staged as normal files.
                if stat.S_IFMT((info.external_attr >> 16) & 0xFFFF) == stat.S_IFLNK:
                    raise ValueError(f'ZIP symbolic link not supported: {info.filename}')
                if not _is_safe_relative_path(info.filename):
                    raise ValueError(f'Unsafe ZIP path: {info.filename!r}')
                yield info.filename, info.file_size, lambda item=info: archive.open(item)
    elif source.is_dir():
        base = source.resolve()
        for root, dirs, files in os.walk(source, followlinks=False):
            dirs[:] = sorted(d for d in dirs if not (Path(root) / d).is_symlink())
            for name in sorted(files):
                path = Path(root) / name
                if path.is_symlink():
                    raise ValueError(f'Symbolic link not supported: {path}')
                if not path.resolve().is_relative_to(base):
                    raise ValueError(f'Path escapes source: {path}')
                relative = path.relative_to(source).as_posix()
                if not _is_safe_relative_path(relative):
                    raise ValueError(f'Unsafe path: {relative}')
                yield relative, path.stat().st_size, lambda target=path: target.open('rb')
    else:
        raise ValueError('Source must be a local directory or a .zip file')


def _image_metadata(path: Path) -> tuple[int, int, bool, int]:
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS = 50_000_000
    with Image.open(path) as im:
        im.verify()
    with Image.open(path) as im:
        gps = bool(im.getexif().get_ifd(0x8825)) if 0x8825 in im.getexif() else False
        corrected = ImageOps.exif_transpose(im)
        width, height = corrected.size
        if min(width, height) < 128 or max(width, height) > 14000:
            raise ValueError(f'Image dimensions out of bounds: {width}x{height}')
        gray = corrected.convert('L').resize((9, 8), Image.Resampling.LANCZOS)
        pix = list(gray.get_flattened_data() if hasattr(gray, 'get_flattened_data') else gray.getdata())
        bits = 0
        for row in range(8):
            for col in range(8):
                bits = (bits << 1) | (pix[row * 9 + col] > pix[row * 9 + col + 1])
    return width, height, gps, bits


def _copy_with_hash(inp: BinaryIO, target: Path, maximum: int) -> str:
    digest = hashlib.sha256()
    count = 0
    with target.open('wb') as output:
        while True:
            piece = inp.read(1024 * 1024)
            if not piece:
                break
            count += len(piece)
            if count > maximum:
                raise ValueError('File exceeds maximum allowed bytes')
            output.write(piece)
            digest.update(piece)
    return digest.hexdigest()


def _safe_csv_cell(value: object) -> str:
    """Avoid interpreting untrusted source paths as formulas in spreadsheets."""
    string = str(value)
    return "'" + string if string.lstrip().startswith(('=', '+', '-', '@')) else string


def stage(source: Path, project_root: Path, plant: str, batch_id: str,
          source_id: str = '') -> dict:
    project_root = project_root.resolve()
    catalog = project_root / 'ml/expansion/candidate_plants.json'
    if not catalog.is_file():
        raise FileNotFoundError(f'CropGuard expansion catalog missing: {catalog}')
    known = {p['slug'] for p in json.loads(catalog.read_text(encoding='utf-8'))['plants']}
    if plant not in known:
        raise ValueError(f'Unknown candidate plant {plant!r}; choose from: {", ".join(sorted(known))}')
    if not SAFE_BATCH.fullmatch(batch_id):
        raise ValueError('batch-id must be 3–64 lowercase letters, digits, _ or -, starting with a letter')
    if len(source_id) > 120 or any(x in source_id for x in '\r\n'):
        raise ValueError('Invalid source identifier')
    source = source.expanduser().resolve()
    destination = project_root / 'ml/data/expansion_inbox' / batch_id
    if destination.exists():
        raise FileExistsError(f'Batch already exists. Nothing was overwritten: {destination}')
    inbox = destination.parent
    inbox.mkdir(parents=True, exist_ok=True)
    # Local inbox should never be committed accidentally.
    guard = inbox / '.gitignore'
    if not guard.exists():
        guard.write_text('*\n!.gitignore\n', encoding='utf-8')
    staging = Path(tempfile.mkdtemp(prefix='.incoming_', dir=inbox))
    counts = Counter()
    seen_digest: dict[str, str] = {}
    # Near-duplicate dHash <=3 bits: at least one 16-bit bucket must match.
    near_buckets: dict[tuple[int, int], list[tuple[int, str]]] = defaultdict(list)
    rows: list[dict[str, object]] = []
    alerts: list[str] = []
    bytes_seen = 0
    try:
        for index, (relative, size, opener) in enumerate(_entries(source)):
            if index >= MAX_FILES:
                raise ValueError(f'Input has more than {MAX_FILES} files')
            if PurePosixPath(relative).suffix.lower() not in ALLOWED_EXTS:
                counts['non_image_ignored'] += 1
                continue
            counts['candidate_files'] += 1
            if size == 0 or size > MAX_PHOTO_BYTES:
                counts['rejected_size'] += 1
                alerts.append(f'Invalid file size: {relative}')
                continue
            bytes_seen += size
            if bytes_seen > MAX_TOTAL_BYTES:
                raise ValueError('Total input image bytes exceed 3 GiB limit; split into batches')
            suffix = PurePosixPath(relative).suffix.lower()
            # Controlled names prevent paths, overwrites, and leaky filenames.
            filename = f'photo_{index:06d}{suffix}'
            path = staging / 'photos' / filename
            path.parent.mkdir(parents=True, exist_ok=True)
            try:
                with opener() as stream:
                    digest = _copy_with_hash(stream, path, MAX_PHOTO_BYTES)
                width, height, gps, fingerprint = _image_metadata(path)
            except Exception as exc:
                path.unlink(missing_ok=True)
                counts['rejected_unreadable'] += 1
                alerts.append(f'Unreadable image {relative}: {type(exc).__name__} {exc}')
                continue
            identical = seen_digest.get(digest, '')
            near = ''
            if not identical:
                candidates: dict[str, int] = {}
                for segment_index in range(4):
                    key = (segment_index, (fingerprint >> (segment_index * 16)) & 0xFFFF)
                    for old_hash, old in near_buckets[key]:
                        candidates[old] = old_hash
                for old, old_hash in candidates.items():
                    if (fingerprint ^ old_hash).bit_count() <= 3:
                        near = old
                        break
            if identical:
                counts['byte_duplicates'] += 1
                path.unlink()
                staged = ''
            else:
                seen_digest[digest] = filename
                for segment_index in range(4):
                    key = (segment_index, (fingerprint >> (segment_index * 16)) & 0xFFFF)
                    near_buckets[key].append((fingerprint, filename))
                staged = f'photos/{filename}'
                counts['photos_staged'] += 1
                if near:
                    counts['possible_near_duplicates'] += 1
            if gps:
                counts['photos_containing_gps_metadata'] += 1
            hint = PurePosixPath(relative).parent.name
            if hint in ('', '.', 'photos', 'images'):
                hint = ''
            rows.append({
                'source_path': relative, 'staged_path': staged, 'plant_slug': plant,
                'proposed_condition_from_folder': hint, 'sha256': digest,
                'width': width, 'height': height, 'exif_gps_present': 'yes' if gps else 'no',
                'duplicate_of': identical, 'near_duplicate_of': near, 'source_id': source_id,
                'source_url': '', 'license': '', 'farm_group': '', 'session_id': '',
                'reviewed_condition_slug': '', 'verified_by': '', 'review_status': 'pending',
                'notes': 'Not approved for training; human plant, diagnosis, rights and grouping review required.'
            })
        if not rows:
            raise ValueError('No valid images found; nothing was installed')
        with (staging / 'intake_manifest.csv').open('w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=HEADERS)
            writer.writeheader()
            for row in rows:
                writer.writerow({k: _safe_csv_cell(v) for k, v in row.items()})
        result = {
            'status': 'STAGED_PENDING_REVIEW_NOT_TRAINABLE',
            'plant': plant, 'batch_id': batch_id, 'source_id_unverified': source_id,
            'counts': dict(sorted(counts.items())),
            'warnings': alerts[:100], 'additional_warnings': max(0, len(alerts) - 100),
            'dataset_provenance_approved': False, 'plant_condition_labels_approved': False,
            'ready_for_training': False,
            'next': 'Review every label and image-source license; assign farm and photo session groups. Only then transfer approved images to expansion_labeled and register verified approvals for prepare.py.',
            'privacy': 'Staged original photos are LOCAL only and may contain GPS/EXIF; do not upload them publicly.'
        }
        (staging / 'intake_report.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
        staging.rename(destination)
        return result
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path, help='Local folder or ZIP holding RAW, unreviewed photographs')
    parser.add_argument('--plant', required=True, help='One of the 20 candidate plant slugs, e.g. tulsi or money_plant')
    parser.add_argument('--batch-id', required=True, help='Unique lowercase identifier e.g. tulsi_batch_01')
    parser.add_argument('--source-id', default='', help='Local reference, NOT a license approval')
    parser.add_argument('--root', default=_root_from_script(), type=Path, help='CropGuard project root')
    args = parser.parse_args()
    try:
        outcome = stage(args.source, args.root, args.plant, args.batch_id, args.source_id)
    except (OSError, ValueError, ImportError, RuntimeError, zipfile.BadZipFile) as exc:
        parser.exit(2, f'INTAKE FAILED safely: {exc}\n')
    print(json.dumps(outcome, indent=2))
    print(f'Local inbox: {args.root / "ml/data/expansion_inbox" / args.batch_id}')
    print('NO crops/diseases approved, NO model trained, NO production changes.')


if __name__ == '__main__':
    main()
