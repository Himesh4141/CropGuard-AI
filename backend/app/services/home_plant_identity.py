"""Private, provider-backed plant identity; does not interact with farm/field data.

Provider: Pl@ntNet identification API. Scores are provider estimates, not
calibrated guarantees. Never assign a label if confidence is inadequate.
"""

from __future__ import annotations

import json
import math
import uuid
from urllib import error, parse, request
from app.services.flower_identity_enrichment import enrich_identity

from app.services.photo_enhancement import gentle_enhance_photo


class RecognitionUnavailable(Exception):
    pass


def candidate_kind(scientific: str, common: str) -> str:
    # Common names such as "money plant" refer to unrelated species.
    # Only a matching scientific taxon may select species-specific care.
    name = " ".join(scientific.lower().split()[:2])
    if name in {"ocimum tenuiflorum", "ocimum sanctum"}:
        return "tulsi"
    if name in {"epipremnum aureum", "epipremnum pinnatum"}:
        return "pothos"
    return "unknown"


def provider_score(result: dict) -> float:
    try:
        value = float(result.get("score", 0))
    except (ValueError, TypeError):
        return 0.0
    return value if math.isfinite(value) and 0 <= value <= 1 else 0.0


def parse_identity(payload: dict) -> dict:
    results = payload.get("results")
    if not isinstance(results, list) or not results:
        return {
            "status": "unknown",
            "plant": "unknown",
            "confidence": 0.0,
            "scientific_name": None,
            "common_name": None,
            "message": "No species could be identified from this image.",
        }
    if any(not isinstance(item, dict) for item in results):
        raise RecognitionUnavailable("Unexpected recognition response")
    results = sorted(results, key=provider_score, reverse=True)
    best = results[0]
    if not isinstance(best, dict):
        raise RecognitionUnavailable("Unexpected recognition response")
    species = best.get("species") if isinstance(best.get("species"), dict) else {}
    scientific = str(
        species.get("scientificNameWithoutAuthor")
        or species.get("scientificName")
        or ""
    ).strip()
    raw_names = species.get("commonNames") or []
    common = (
        next(
            (str(n).strip() for n in raw_names if isinstance(n, str) and n.strip()), ""
        )
        if isinstance(raw_names, list)
        else ""
    )
    score = provider_score(best)
    runner_up = provider_score(results[1]) if len(results) > 1 else 0.0
    # Scores are provider suggestions, not calibrated probabilities.
    credible = (
        bool(scientific) and score >= 0.70 and round(score - runner_up, 8) >= 0.10
    )
    if credible:
        message = "Plant identification is a strong provider suggestion, not a verified botanical determination."
    elif score >= 0.20 and scientific:
        message = "Possible match: similar species can share leaf patterns. This image can still support general care, but a second angle may help confirm the species."
    else:
        message = "Species could not be confirmed from this photo. CropGuard can still provide general care observations without a firm species label."
    return {
        "status": "identified"
        if credible
        else "uncertain"
        if scientific and score >= 0.20
        else "unknown",
        "plant": candidate_kind(scientific, common) if credible else "unknown",
        "confidence": round(score, 4),
        "scientific_name": scientific or None,
        "common_name": common or None,
        "message": message,
    }


def identify_with_plantnet(
    photo: bytes, mime: str, api_key: str, photo_prepared: bool = False
) -> dict:
    # A bounded exposure adjustment is applied only when useful. Only one
    # identification request is made; don't double free-plan API consumption.
    photo, mime, _adjusted = gentle_enhance_photo(
        photo, mime, enhance=not photo_prepared
    )
    boundary = "----cropguard-" + uuid.uuid4().hex
    extension = (
        "png" if mime == "image/png" else "webp" if mime == "image/webp" else "jpg"
    )
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="organs"\r\n\r\nauto\r\n'.encode(),
        f'--{boundary}\r\nContent-Disposition: form-data; name="images"; filename="photo.{extension}"\r\nContent-Type: {mime}\r\n\r\n'.encode(),
        photo,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    url = "https://my-api.plantnet.org/v2/identify/all?" + parse.urlencode(
        {"api-key": api_key, "lang": "en"}
    )
    req = request.Request(
        url,
        data=b"".join(parts),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
            "User-Agent": "CropGuard/1.0",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=16) as response:
            data = response.read(512_000)
        obj = json.loads(data)
        if not isinstance(obj, dict):
            raise RecognitionUnavailable("Unexpected identification response")
        return enrich_identity(obj, parse_identity(obj))
    except (error.HTTPError, error.URLError, TimeoutError, OSError, ValueError) as exc:
        # Never return the provider URL; it contains the private API key.
        raise RecognitionUnavailable(
            "The plant identification service is temporarily unavailable"
        ) from exc
