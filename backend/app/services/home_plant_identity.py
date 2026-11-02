"""Private, provider-backed plant identity; does not interact with farm/field data.

Provider: Pl@ntNet identification API. Scores are provider estimates, not
calibrated guarantees. Never assign a label if confidence is inadequate.
"""

from __future__ import annotations

import json
import math
import uuid
from io import BytesIO
from urllib import error, parse, request
from app.services.flower_identity_enrichment import enrich_identity

from app.services.photo_enhancement import InvalidPlantPhoto, gentle_enhance_photo


MAX_IDENTIFICATION_PHOTOS = 3
MAX_IDENTIFICATION_BYTES = 8 * 1024 * 1024


class PlantPhotoTooLarge(InvalidPlantPhoto):
    pass


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
    value = result.get("score", 0)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0.0
    return float(value) if math.isfinite(value) and 0 <= value <= 1 else 0.0


def _text(value: object, limit: int) -> str:
    return value.strip()[:limit] if isinstance(value, str) else ""


def _taxon(value: object) -> str | None:
    if not isinstance(value, dict):
        return None
    return (_text(value.get("scientificNameWithoutAuthor"), 120)
            or _text(value.get("scientificName"), 120) or None)


def parse_identity(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise RecognitionUnavailable("Unexpected recognition response")
    results = payload.get("results")
    if results is not None and not isinstance(results, list):
        raise RecognitionUnavailable("Unexpected recognition response")
    if not results:
        return {
            "status": "unknown",
            "plant": "unknown",
            "confidence": 0.0,
            "scientific_name": None,
            "common_name": None,
            "common_names": [],
            "genus": None,
            "family": None,
            "message": "No species could be identified from this image.",
        }
    if any(not isinstance(item, dict) for item in results):
        raise RecognitionUnavailable("Unexpected recognition response")
    results = sorted(results, key=provider_score, reverse=True)
    best = results[0]
    if not isinstance(best, dict):
        raise RecognitionUnavailable("Unexpected recognition response")
    species = best.get("species") if isinstance(best.get("species"), dict) else {}
    scientific = (_text(species.get("scientificNameWithoutAuthor"), 180)
                  or _text(species.get("scientificName"), 180))
    raw_names = species.get("commonNames") or []
    common_names: list[str] = []
    if isinstance(raw_names, list):
        for value in raw_names:
            name = _text(value, 120)
            if name and name.casefold() not in {n.casefold() for n in common_names}:
                common_names.append(name)
                if len(common_names) == 5:
                    break
    common = common_names[0] if common_names else ""
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
        "common_names": common_names,
        "genus": _taxon(species.get("genus")),
        "family": _taxon(species.get("family")),
        "message": message,
    }


def _provider_photo(photo: bytes, mime: str, photo_prepared: bool) -> tuple[bytes, str]:
    photo, mime, _adjusted = gentle_enhance_photo(photo, mime, enhance=not photo_prepared)
    # Pl@ntNet accepts JPEG/PNG. A prepared WebP still needs format conversion.
    if mime == "image/webp":
        from PIL import Image, ImageOps
        with Image.open(BytesIO(photo)) as source:
            rgba = ImageOps.exif_transpose(source).convert("RGBA")
            rgb = Image.alpha_composite(Image.new("RGBA", rgba.size, "white"), rgba).convert("RGB")
            rgb.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
            encoded = BytesIO()
            rgb.save(encoded, "JPEG", quality=92, optimize=True)
            photo, mime = encoded.getvalue(), "image/jpeg"
    if mime not in {"image/jpeg", "image/png"}:
        raise InvalidPlantPhoto("Unsupported plant photograph format")
    return photo, mime


def identify_with_plantnet(
    photo: bytes, mime: str, api_key: str, photo_prepared: bool = False,
    additional_photos: list[tuple[bytes, str]] | None = None,
) -> dict:
    # All photos must show the same plant. Multiple angles share one provider
    # request, so this does not multiply free-plan request consumption.
    photos = [(photo, mime), *(additional_photos or [])]
    if len(photos) > MAX_IDENTIFICATION_PHOTOS:
        raise InvalidPlantPhoto("Use up to 3 photos of the same plant")
    if sum(len(content) for content, _ in photos) > MAX_IDENTIFICATION_BYTES:
        raise PlantPhotoTooLarge("Combined plant photographs must be at most 8 MB")
    prepared = [_provider_photo(content, kind, photo_prepared) for content, kind in photos]
    if sum(len(content) for content, _ in prepared) > MAX_IDENTIFICATION_BYTES:
        raise PlantPhotoTooLarge("Prepared photographs are too large; use smaller images")
    boundary = "----cropguard-" + uuid.uuid4().hex
    parts: list[bytes] = []
    for index, (content, kind) in enumerate(prepared, 1):
        extension = "png" if kind == "image/png" else "jpg"
        parts.extend([
            f'--{boundary}\r\nContent-Disposition: form-data; name="organs"\r\n\r\nauto\r\n'.encode(),
            f'--{boundary}\r\nContent-Disposition: form-data; name="images"; filename="photo-{index}.{extension}"\r\nContent-Type: {kind}\r\n\r\n'.encode(),
            content, b"\r\n",
        ])
    parts.append(f"--{boundary}--\r\n".encode())
    url = "https://my-api.plantnet.org/v2/identify/all?" + parse.urlencode(
        {"api-key": api_key, "lang": "en", "nb-results": 5}
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
            data = response.read(512_001)
        if len(data) > 512_000:
            raise RecognitionUnavailable("Unexpected identification response")
        obj = json.loads(data)
        if not isinstance(obj, dict):
            raise RecognitionUnavailable("Unexpected identification response")
        identity = parse_identity(obj)
        # Keep alternatives aligned with the same sorted ranking as the winner.
        ranked = {**obj, "results": sorted(obj.get("results") or [], key=provider_score, reverse=True)}
        return enrich_identity(ranked, identity)
    except error.HTTPError as exc:
        if exc.code == 404:
            # The documented no-species-match response is a valid unknown result.
            empty = {"results": []}
            return enrich_identity(empty, parse_identity(empty))
        raise RecognitionUnavailable("The plant identification service is temporarily unavailable") from exc
    except (error.URLError, TimeoutError, OSError, ValueError) as exc:
        # Never return the provider URL; it contains the private API key.
        raise RecognitionUnavailable(
            "The plant identification service is temporarily unavailable"
        ) from exc
