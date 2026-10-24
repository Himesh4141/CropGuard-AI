# CropGuard research model card — TEMPLATE (not an approved model)

## Identity and intended use
- Model name/version: (fill from trained artifact)
- Species/disease classes actually evaluated: (list)
- Known unsupported crops, species, symptoms: (list)
- Existing production farmer v2: unchanged by research

## Provenance and licenses
Record source URL, image rights, labels and annotator, capture source/plant/group identifier, augmentation lineage. Do not automatically scrape iNaturalist or PlantNet without verifying terms and per-image rights. Data names (Oxford 102 Flowers, PlantDoc, Cassava, PlantVillage etc.) are *candidates*, not authorization to download/train.

## Splits and negative tests
Group by original plant/source/photographer to prevent leakage. Reserve held-out real phone images, low-light, glare, focus failures, mixed scenes, similar species and true unknowns. Do not calculate final accuracy on augmented duplicates.

## Metrics required for class activation
For each class: samples, precision, recall, false positive rate, confusion partners, macro F1, 95% confidence intervals, ECE/calibration, test-set provenance, OOD detection and abstention rate, performance by lighting and phone model. Pre-register the acceptance bar before evaluating. **Never enable a disease-specific label based solely on in-domain validation.** Human-reviewed field evidence must establish generalization. Classes below threshold stay symptom-based.

## Deployment controls
New models must be disabled by default and loaded only with an explicit feature flag. Fall back to the unchanged production farmer v2 upon loading, timeout, OOD, or confidence failures. Document rollback and checksum. No DB migration.
