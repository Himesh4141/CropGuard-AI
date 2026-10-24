"""Enrich Pl@ntNet suggestions with conservatively mapped flower-care IDs.

No additional image service, keys, fields or ML dependencies. Does not touch
farmer crop ML, databases, or Home Planters' upload/authentication endpoint.
"""
from __future__ import annotations

import math
from typing import Any

from .flower_catalog_registry import resolve_flower_id


def _score(value: Any) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return 0.0
    return round(n, 4) if math.isfinite(n) and 0 <= n <= 1 else 0.0


def enrich_identity(payload: dict, initial: dict) -> dict:
    """Keep existing species verdict, add up to 5 inspectable alternatives.

    Only mark flower_match when the existing provider identification is strong.
    An uncertain candidate is not a diagnosis or confirmed botanical identity.
    """
    output = dict(initial)
    candidates = []
    results = payload.get("results") if isinstance(payload, dict) else None
    for result in (results if isinstance(results, list) else [])[:5]:
        if not isinstance(result, dict):
            continue
        species = result.get("species")
        if not isinstance(species, dict):
            continue
        scientific = str(species.get("scientificNameWithoutAuthor") or species.get("scientificName") or "").strip()[:180]
        if not scientific:
            continue
        names = species.get("commonNames")
        common = next((name.strip() for name in names if isinstance(name,str) and name.strip()), None) if isinstance(names,list) else None
        candidates.append({
            "scientific_name": scientific,
            "common_name": (common or "")[:120] or None,
            "confidence": _score(result.get("score")),
            "flower_id": resolve_flower_id(scientific),
        })
    # Prevent a provider downgrade from changing any original decision or scoring.
    output["candidates"] = candidates
    scientific = output.get("scientific_name")
    output["flower_match"] = resolve_flower_id(scientific) if output.get("status") == "identified" else None
    return output
