"""Offline regression tests for image handling and uncertain recognition."""

from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

import pytest
from PIL import Image, ImageStat

from app.api.deps import get_current_user
from app.core.config import settings
from app.main import app
from app.services.home_plant_identity import (
    RecognitionUnavailable,
    candidate_kind,
    identify_with_plantnet,
    parse_identity,
)
from app.services.photo_enhancement import InvalidPlantPhoto, gentle_enhance_photo


def photo(color=(18, 30, 15), size=(120, 120), mode="RGB"):
    output = BytesIO()
    Image.new(mode, size, color).save(output, "PNG")
    return output.getvalue()


def result(score, name="Ocimum tenuiflorum", common="Holy basil"):
    return {
        "score": score,
        "species": {"scientificNameWithoutAuthor": name, "commonNames": [common]},
    }


@pytest.mark.parametrize(
    "name,common",
    [
        ("Pilea peperomioides", "Money plant"),
        ("Crassula ovata", "Money plant"),
        ("Ocimum basilicum", "Basil"),
        ("Ocimum tenuiflorumFake", "Tulsi"),
    ],
)
def test_common_names_do_not_override_taxonomy(name, common):
    assert candidate_kind(name, common) == "unknown"


@pytest.mark.parametrize(
    "scores,status",
    [
        ([0.75, 0.70], "uncertain"),
        ([0.8, 0.7], "identified"),
        ([0.69, 0.1], "uncertain"),
        ([0.19, 0.1], "unknown"),
    ],
)
def test_confidence_and_margin(scores, status):
    output = parse_identity({"results": [result(x) for x in scores]})
    assert output["status"] == status
    if status != "identified":
        assert output["plant"] == "unknown"


def test_unsorted_provider_candidates():
    output = parse_identity(
        {"results": [result(0.1), result(0.9, "Epipremnum aureum", "Pothos")]}
    )
    assert output["plant"] == "pothos"


@pytest.mark.parametrize("score", [float("nan"), float("inf"), -1, 4, None, "wrong"])
def test_invalid_scores_never_assign_species(score):
    assert parse_identity({"results": [result(score)]})["plant"] == "unknown"


def test_dark_photo_bounded_enhancement():
    source = photo()
    enhanced, mime, adjusted = gentle_enhance_photo(source, "image/png")
    assert adjusted and mime == "image/jpeg"
    before = ImageStat.Stat(Image.open(BytesIO(source))).mean
    after = ImageStat.Stat(Image.open(BytesIO(enhanced))).mean
    assert before[1] < after[1] < before[1] * 1.6


def test_prepared_photo_not_enhanced_twice_but_still_validated():
    source = photo()
    assert gentle_enhance_photo(source, "image/png", enhance=False) == (
        source,
        "image/png",
        False,
    )
    with pytest.raises(InvalidPlantPhoto):
        gentle_enhance_photo(b"bad", "image/png", enhance=False)


@pytest.mark.parametrize(
    "source,mime",
    [
        (b"bad", "image/png"),
        (photo(size=(30, 30)), "image/png"),
        (photo(), "image/jpeg"),
    ],
)
def test_bad_photos_rejected(source, mime):
    with pytest.raises(InvalidPlantPhoto):
        gentle_enhance_photo(source, mime)


def test_transparency_is_composited_on_white():
    encoded, _, _ = gentle_enhance_photo(photo((0, 0, 0, 0), mode="RGBA"), "image/png")
    assert ImageStat.Stat(Image.open(BytesIO(encoded)).convert("RGB")).mean[0] > 190


def test_provider_error_hides_key_and_makes_one_request():
    with (
        patch(
            "app.services.home_plant_identity.request.urlopen",
            side_effect=HTTPError(
                "https://fake/?api-key=secret", 429, "limit", None, None
            ),
        ) as request,
        pytest.raises(RecognitionUnavailable) as caught,
    ):
        identify_with_plantnet(photo(), "image/png", "secret")
    assert "secret" not in str(caught.value)
    assert request.call_count == 1


@pytest.fixture
def authenticated(client, monkeypatch):
    monkeypatch.setattr(settings, "plantnet_api_key", "offline-test-key")
    app.dependency_overrides[get_current_user] = lambda: object()
    yield client
    app.dependency_overrides.pop(get_current_user, None)


def test_identification_requires_authentication(client):
    assert (
        client.post(
            "/api/v1/home-planters/identify",
            files={"image": ("leaf.png", photo(), "image/png")},
        ).status_code
        == 401
    )


def test_prepared_flag_reaches_service(authenticated):
    expected = parse_identity({"results": [result(0.92)]})
    with patch(
        "app.api.v1.endpoints.home_planters.identify_with_plantnet",
        return_value=expected,
    ) as identify:
        response = authenticated.post(
            "/api/v1/home-planters/identify",
            data={"photo_prepared": "true"},
            files={"image": ("leaf.png", photo(), "image/png")},
        )
    assert response.status_code == 200
    assert identify.call_args.args[-1] is True


@pytest.mark.parametrize(
    "data,mime,status",
    [
        (b"bad", "image/png", 415),
        (photo(), "text/plain", 415),
        (b"\x89PNG\r\n\x1a\n" + b"x" * (8 * 1024 * 1024), "image/png", 413),
    ],
    ids=["invalid-magic", "unsupported-type", "oversized"],
)
def test_endpoint_rejects_bad_uploads(authenticated, data, mime, status):
    assert (
        authenticated.post(
            "/api/v1/home-planters/identify", files={"image": ("leaf", data, mime)}
        ).status_code
        == status
    )


def test_endpoint_provider_outage_is_safe(authenticated):
    with patch(
        "app.api.v1.endpoints.home_planters.identify_with_plantnet",
        side_effect=RecognitionUnavailable("Recognition unavailable"),
    ):
        response = authenticated.post(
            "/api/v1/home-planters/identify",
            files={"image": ("leaf.png", photo(), "image/png")},
        )
    assert response.status_code == 503
    assert "offline-test-key" not in response.text
