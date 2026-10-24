"""Optional, gated EXPERIMENTAL training for CropGuard's new-plant model.

Not a production deployment script. Requires reviewed images, a successful
prepare.py preflight, Pillow, PyTorch and torchvision. Never modifies v2.
The joint plant+condition class is SINGLE LABEL (no unsupported multi-label claims).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def verify_manifest(manifest_path: Path) -> tuple[dict, Path]:
    if not manifest_path.exists():
        raise RuntimeError('Missing gated manifest. Run prepare.py after collecting and reviewing real images.')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if not manifest.get('ready_for_experimental_training') or manifest.get('production_approved'):
        raise RuntimeError('Training is blocked: dataset preflight not approved for an EXPERIMENT.')
    data_root = Path(manifest['data_root']).resolve()
    for source_file, expected in manifest.get('review_file_hashes', {}).items():
        path = Path(source_file)
        if not path.is_file():
            raise RuntimeError('Dataset approval/rights document missing; rerun prepare.py.')
        doc_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        if doc_hash != expected:
            raise RuntimeError('Dataset label/rights document changed; rerun prepare.py.')
    rows = manifest['samples']
    if not rows or not manifest.get('review_file_hashes') or {row['split'] for row in rows} != {'train', 'val', 'test'}:
        raise RuntimeError('Missing sample/split coverage in manifest.')
    farms = {}
    for row in rows:
        farm = row['farm_group']
        if farm in farms and farms[farm] != row['split']:
            raise RuntimeError('Farm group leakage detected; refuse to train.')
        farms[farm] = row['split']
        rel = Path(row['relative_path'])
        if rel.is_absolute() or '..' in rel.parts or len(rel.parts) != 3:
            raise RuntimeError(f'Invalid photo path: {rel}')
        photo = (data_root / rel).resolve()
        if not photo.is_relative_to(data_root) or not photo.is_file():
            raise RuntimeError(f'Photo not found safely: {rel}')
        # Detect photos modified after preflight, not just path matching.
        h = hashlib.sha256()
        with photo.open('rb') as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                h.update(block)
        if h.hexdigest() != row['sha256']:
            raise RuntimeError(f'Photo changed since preflight: {rel}')
    return manifest, data_root


def train(manifest_path: Path, output_dir: Path, epochs: int, batch_size: int,
          learning_rate: float, imagenet: bool, seed: int) -> None:
    manifest, data_root = verify_manifest(manifest_path)
    try:
        import torch
        import torch.nn as nn
        from PIL import Image, ImageOps
        from torch.utils.data import Dataset, DataLoader
        from torchvision import models, transforms
    except ImportError as exc:
        raise RuntimeError('Install torch, torchvision and Pillow in a separate ML environment.') from exc

    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    rows = manifest['samples']
    plants = sorted({row['plant_slug'] for row in rows})
    classes = sorted({row['class_id'] for row in rows})
    plant_index = {v: k for k, v in enumerate(plants)}
    class_index = {v: k for k, v in enumerate(classes)}
    preprocess_train = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.65, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    preprocess_eval = transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224), transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    class PlantDataset(Dataset):
        def __init__(self, split: str):
            self.rows = [row for row in rows if row['split'] == split]
            self.transform = preprocess_train if split == 'train' else preprocess_eval

        def __len__(self):
            return len(self.rows)

        def __getitem__(self, index: int):
            row = self.rows[index]
            with Image.open(data_root / row['relative_path']) as image:
                photo = ImageOps.exif_transpose(image).convert('RGB')
                tensor = self.transform(photo)
            return tensor, plant_index[row['plant_slug']], class_index[row['class_id']]

    datasets = {split: PlantDataset(split) for split in ('train', 'val', 'test')}
    loaders = {split: DataLoader(data, batch_size=batch_size,
                               shuffle=(split == 'train'), num_workers=0,
                               pin_memory=device.type == 'cuda')
               for split, data in datasets.items()}

    backbone = models.mobilenet_v3_large(
        weights=(models.MobileNet_V3_Large_Weights.DEFAULT if imagenet else None)
    )
    feature_count = backbone.classifier[0].in_features

    class JointModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.features = backbone.features
            self.avgpool = backbone.avgpool
            self.dropout = nn.Dropout(0.2)
            self.plant_head = nn.Linear(feature_count, len(plants))
            self.condition_head = nn.Linear(feature_count, len(classes))

        def forward(self, x):
            features = self.dropout(self.avgpool(self.features(x)).flatten(1))
            return self.plant_head(features), self.condition_head(features)

    model = JointModel().to(device)
    train_counts = Counter(row['class_id'] for row in datasets['train'].rows)
    weights = torch.tensor(
        [1.0 / math.sqrt(train_counts[label]) for label in classes],
        dtype=torch.float32, device=device
    )
    weights = weights / weights.mean()
    disease_loss = nn.CrossEntropyLoss(weight=weights)
    plant_loss = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)

    def evaluate(split: str) -> dict:
        model.eval()
        correct_plant = 0
        confusion = [[0] * len(classes) for _ in classes]
        total = 0
        with torch.no_grad():
            for images, plants_target, class_target in loaders[split]:
                images = images.to(device)
                logits_plant, logits_class = model(images)
                pred_plant = logits_plant.argmax(dim=1).cpu().tolist()
                pred_class = logits_class.argmax(dim=1).cpu().tolist()
                correct_plant += sum(a == b for a, b in zip(pred_plant, plants_target.tolist()))
                for true, pred in zip(class_target.tolist(), pred_class):
                    confusion[true][pred] += 1
                total += len(pred_class)
        per_class = {}
        f1s = []
        for idx, label in enumerate(classes):
            tp = confusion[idx][idx]
            support = sum(confusion[idx])
            predicted = sum(line[idx] for line in confusion)
            precision = tp / predicted if predicted else 0.0
            recall = tp / support if support else 0.0
            f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
            per_class[label] = {'precision': round(precision, 4),
                                'recall': round(recall, 4), 'f1': round(f1, 4),
                                'support': support}
            f1s.append(f1)
        return {'count': total, 'plant_accuracy': round(correct_plant / max(1, total), 4),
                'condition_accuracy': round(sum(confusion[i][i] for i in range(len(classes))) / max(1, total), 4),
                'macro_f1': round(sum(f1s) / max(1, len(f1s)), 4),
                'per_class': per_class}

    output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint = output_dir / 'best_state.pt'
    best_f1, bad_epochs = -1.0, 0
    logs = []
    for epoch in range(1, epochs + 1):
        model.train()
        loss_sum, n = 0.0, 0
        for images, plants_target, class_target in loaders['train']:
            images = images.to(device)
            plants_target = plants_target.to(device)
            class_target = class_target.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits_plant, logits_class = model(images)
            loss = disease_loss(logits_class, class_target) + 0.35 * plant_loss(logits_plant, plants_target)
            loss.backward()
            optimizer.step()
            loss_sum += float(loss.item()) * len(images)
            n += len(images)
        val = evaluate('val')
        logs.append({'epoch': epoch, 'train_loss': round(loss_sum / max(1, n), 5),
                     'val_macro_f1': val['macro_f1']})
        print(f'Epoch {epoch}/{epochs} loss={logs[-1]["train_loss"]} val_macro_f1={val["macro_f1"]}')
        if val['macro_f1'] > best_f1:
            best_f1, bad_epochs = val['macro_f1'], 0
            torch.save(model.state_dict(), checkpoint)
        else:
            bad_epochs += 1
            if bad_epochs >= 5:
                print('Early stopping on validation macro-F1')
                break
    # Only the state dict created during this run is loaded; never load untrusted files.
    model.load_state_dict(torch.load(checkpoint, map_location=device, weights_only=True))
    test_results = evaluate('test')  # Untouched held-out test evaluated ONCE.
    report = {
        'status': 'experimental_not_deployed',
        'timestamp_utc': datetime.now(timezone.utc).isoformat(),
        'model': 'MobileNetV3-Large, shared backbone, plant + single condition head',
        'device': str(device), 'imagenet_pretrained': imagenet,
        'seed': seed, 'epochs_run': len(logs), 'batch_size': batch_size,
        'labels': classes, 'plants': plants, 'epoch_history': logs,
        'best_validation_macro_f1': best_f1,
        'held_out_test': test_results,
        'real_farm_accuracy_claimed': False,
        'production_approved': False,
        'blocked_from_deploy_until': [
            'Independent real-farm/device/geography test set',
            'Crop consistency and unknown / unsupported-disease rejection',
            'Confidence calibration and unsafe-misdiagnosis evaluation',
            'Qualified agronomy review of condition taxonomy and advice',
            'ONNX/export/runtime compatibility with existing FastAPI deployment',
        ],
    }
    (output_dir / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Experimental checkpoint:', checkpoint)
    print('Report:', output_dir / 'report.json')
    print('CropGuard v2 production remains unchanged.')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    here = Path(__file__).resolve().parent
    parser.add_argument('--manifest', type=Path, default=here / 'reports/manifest.json')
    parser.add_argument('--out', type=Path, default=here / 'runs/experiment')
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--batch-size', type=int, default=16)
    parser.add_argument('--lr', type=float, default=0.0002)
    parser.add_argument('--imagenet', action='store_true', help='Download pretrained weights if needed')
    parser.add_argument('--seed', type=int, default=26033)
    args = parser.parse_args()
    if not (1 <= args.epochs <= 100 and 1 <= args.batch_size <= 128 and 0 < args.lr <= 0.1):
        parser.error('Invalid training hyperparameters')
    train(args.manifest, args.out, args.epochs, args.batch_size,
          args.lr, args.imagenet, args.seed)


if __name__ == '__main__':
    main()
