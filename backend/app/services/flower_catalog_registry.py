"""Mapping 46 Flower Garden guide IDs to scientific names (NOT an ML model).

Names are catalog aliases only; avoid genus-only, substrings, synonyms without
botanical confirmation. Return None rather than risking an incorrect match.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from functools import lru_cache

_REGISTRY = Path(__file__).with_name("flower_catalog_registry.json")


def canonical_taxon(value: str | None) -> str:
    """Normalize minor punctuation/hybrid sign differences; never fuzzy-match taxa."""
    if not value or not isinstance(value, str):
        return ""
    norm = unicodedata.normalize("NFKC", value).casefold()
    norm = norm.replace("×", " x ").replace("-", "-")
    norm = re.sub(r"[^\w\s-]", " ", norm, flags=re.UNICODE)
    return " ".join(norm.split())


@lru_cache(maxsize=1)
def _aliases() -> dict[str, frozenset[str]]:
    items = json.loads(_REGISTRY.read_text(encoding="utf-8"))
    if len(items) != 46 or len({x["id"] for x in items}) != 46:
        raise ValueError("Flower registry is incomplete or inconsistent")
    result: dict[str, set[str]] = {}
    for entry in items:
        for taxon in entry["scientific_names"]:
            clean = canonical_taxon(taxon)
            # Never use a genus-only match to claim species-level identification.
            if len(clean.split()) < 2:
                continue
            result.setdefault(clean, set()).add(entry["id"])
    return {alias: frozenset(ids) for alias, ids in result.items()}


def resolve_flower_id(scientific_name: str | None) -> str | None:
    clean = canonical_taxon(scientific_name)
    if not clean or len(clean.split()) < 2:
        return None
    matches = set()
    for alias, ids in _aliases().items():
        if clean == alias or clean.startswith(alias + " "):
            matches.update(ids)
    return next(iter(matches)) if len(matches) == 1 else None
