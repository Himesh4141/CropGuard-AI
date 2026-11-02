"""Release regressions; provider is mocked, no real photo or key leaves tests."""
import json
from io import BytesIO
from urllib.error import HTTPError
from unittest.mock import patch
import pytest
from PIL import Image
from app.services.home_plant_identity import identify_with_plantnet, parse_identity, InvalidPlantPhoto, RecognitionUnavailable

def photo(fmt="PNG"):
    out = BytesIO(); Image.new("RGB", (160, 160), (40, 150, 50)).save(out, fmt)
    return out.getvalue()

def candidate(score, name="Rosa chinensis"):
    return {"score": score, "species": {"scientificNameWithoutAuthor": name,
        "commonNames": ["China rose", "China rose", "Rose"], "genus": {"scientificNameWithoutAuthor": "Rosa"},
        "family": {"scientificNameWithoutAuthor": "Rosaceae"}}}

def test_prepared_webp_and_three_views_use_one_jpeg_png_request():
    payload = {"results": [candidate(.03, "Rosa gallica"), candidate(.92)]}
    with patch("app.services.home_plant_identity.request.urlopen") as opened:
        opened.return_value.__enter__.return_value.read.return_value = json.dumps(payload).encode()
        out = identify_with_plantnet(photo("WEBP"), "image/webp", "offline-key", True,
            [(photo(), "image/png"), (photo(), "image/png")])
    opened.assert_called_once()
    request = opened.call_args.args[0]
    assert request.data.count(b'name="images"') == 3
    assert request.data.count(b'name="organs"') == 3
    assert b"Content-Type: image/webp" not in request.data
    assert b"Content-Type: image/jpeg" in request.data
    assert "nb-results=5" in request.full_url
    assert out["genus"] == "Rosa" and out["family"] == "Rosaceae"
    assert out["common_names"] == ["China rose", "Rose"]
    assert out["candidates"][0]["scientific_name"] == out["scientific_name"]

def test_no_species_http404_is_unknown_not_outage():
    with patch("app.services.home_plant_identity.request.urlopen", side_effect=HTTPError("fake", 404, "none", None, None)):
        assert identify_with_plantnet(photo(), "image/png", "offline-key")["status"] == "unknown"

@pytest.mark.parametrize("score", [True, False, "0.99", float("nan"), float("inf")])
def test_invalid_provider_score_never_promotes_species(score):
    assert parse_identity({"results": [candidate(score)]})["status"] == "unknown"

def test_photo_count_and_payload_limits_prevent_provider_call():
    with patch("app.services.home_plant_identity.request.urlopen") as opened:
        with pytest.raises(InvalidPlantPhoto):
            identify_with_plantnet(photo(), "image/png", "offline-key", True, [(photo(), "image/png")] * 3)
        opened.assert_not_called()

@pytest.mark.parametrize("payload", [[], {"results": {}}, {"results": [None]}])
def test_malformed_provider_payload_is_rejected(payload):
    with pytest.raises(RecognitionUnavailable): parse_identity(payload)
