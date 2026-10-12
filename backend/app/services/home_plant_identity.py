"""Private, provider-backed plant identity; does not interact with farm/field data.

Provider: Pl@ntNet identification API. Scores are provider estimates, not
calibrated guarantees. Never assign a label if confidence is inadequate.
"""
from __future__ import annotations

import json
import math
import uuid
from urllib import error, parse, request


class RecognitionUnavailable(Exception):
    pass


def candidate_kind(scientific: str, common: str) -> str:
    name = f"{scientific} {common}".lower()
    if any(value in name for value in ("ocimum tenuiflorum", "ocimum sanctum", "holy basil", "tulsi")):
        return "tulsi"
    if any(value in name for value in ("epipremnum aureum", "epipremnum pinnatum", "devil's ivy", "golden pothos", "money plant", "pothos")):
        return "pothos"
    return "unknown"


def parse_identity(payload: dict) -> dict:
    results = payload.get("results")
    if not isinstance(results, list) or not results:
        return {"status": "unknown", "plant": "unknown", "confidence": 0.0,
                "scientific_name": None, "common_name": None,
                "message": "No species could be identified from this image."}
    best = results[0]
    if not isinstance(best, dict):
        raise RecognitionUnavailable("Unexpected recognition response")
    species = best.get("species") if isinstance(best.get("species"),dict) else {}
    scientific = str(species.get("scientificNameWithoutAuthor") or species.get("scientificName") or "").strip()
    raw_names = species.get("commonNames") or []
    common = next((str(n).strip() for n in raw_names if isinstance(n,str) and n.strip()), "") if isinstance(raw_names,list) else ""
    try:
        score = float(best.get("score", 0))
    except (ValueError, TypeError):
        score = 0.0
    if not math.isfinite(score) or not (0 <= score <= 1):
        score = 0.0

    # A provider score is not a calibrated probability of species correctness.
    # Require both a strong top match and separation from the runner-up.
    runner_up = 0.0
    if len(results) > 1 and isinstance(results[1], dict):
        try:
            runner_up = float(results[1].get("score", 0))
        except (ValueError, TypeError):
            runner_up = 0.0
        if not math.isfinite(runner_up) or runner_up < 0:
            runner_up = 0.0
    credible = bool(scientific) and score >= 0.70 and (score - runner_up) >= 0.10
    if credible:
        message = "Plant identification is a strong provider suggestion, not a verified botanical determination."
    elif score >= 0.20 and scientific:
        message = "Possible plant match only; confidence or separation is insufficient. Retake a clear photo showing several leaves."
    else:
        message = "Plant identification is inconclusive. Retake a clear photo showing several leaves."
    return {
        "status": "identified" if credible else "uncertain" if scientific and score >= 0.20 else "unknown",
        "plant": candidate_kind(scientific, common) if credible else "unknown",
        "confidence": round(score, 4),
        "scientific_name": scientific or None,
        "common_name": common or None,
        "message": message,
    }


def identify_with_plantnet(photo: bytes, mime: str, api_key: str) -> dict:
    boundary = "----cropguard-" + uuid.uuid4().hex
    extension = "png" if mime == "image/png" else "webp" if mime == "image/webp" else "jpg"
    parts = [
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"organs\"\r\n\r\nauto\r\n".encode(),
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"images\"; filename=\"photo.{extension}\"\r\nContent-Type: {mime}\r\n\r\n".encode(),
        photo, f"\r\n--{boundary}--\r\n".encode(),
    ]
    url = "https://my-api.plantnet.org/v2/identify/all?" + parse.urlencode({"api-key":api_key,"lang":"en"})
    req = request.Request(url, data=b"".join(parts), headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Accept": "application/json",
        "User-Agent": "CropGuard/1.0"
    }, method="POST")
    try:
        with request.urlopen(req, timeout=16) as response:
            data = response.read(512_000)
        obj = json.loads(data)
        if not isinstance(obj,dict): raise RecognitionUnavailable("Unexpected identification response")
        return parse_identity(obj)
    except (error.HTTPError, error.URLError,TimeoutError,OSError,ValueError) as exc:
        # Never return the provider URL; it contains the private API key.
        raise RecognitionUnavailable("The plant identification service is temporarily unavailable") from exc
