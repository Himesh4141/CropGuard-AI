"""Offline regression tests: no network and no real API key."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.home_plant_identity import (
    RecognitionUnavailable,
    identify_with_plantnet,
    parse_identity,
)


class PlantIdentityTests(unittest.TestCase):
    def test_tulsi(self):
        out = parse_identity(
            {
                "results": [
                    {
                        "score": 0.93,
                        "species": {
                            "scientificNameWithoutAuthor": "Ocimum tenuiflorum",
                            "commonNames": ["Holy Basil"],
                        },
                    }
                ]
            }
        )
        self.assertEqual((out["plant"], out["status"]), ("tulsi", "identified"))

    def test_pothos(self):
        out = parse_identity(
            {
                "results": [
                    {
                        "score": 0.89,
                        "species": {
                            "scientificNameWithoutAuthor": "Epipremnum aureum",
                            "commonNames": ["Golden Pothos"],
                        },
                    }
                ]
            }
        )
        self.assertEqual(out["plant"], "pothos")

    def test_low_confidence_is_not_labeled(self):
        out = parse_identity(
            {
                "results": [
                    {
                        "score": 0.21,
                        "species": {
                            "scientificNameWithoutAuthor": "Ocimum tenuiflorum"
                        },
                    }
                ]
            }
        )
        self.assertEqual(out["plant"], "unknown")
        self.assertEqual(out["status"], "uncertain")

    def test_unknown_species_does_not_get_tulsi_care(self):
        out = parse_identity(
            {
                "results": [
                    {
                        "score": 0.92,
                        "species": {"scientificNameWithoutAuthor": "Rosa chinensis"},
                    }
                ]
            }
        )
        self.assertEqual(out["plant"], "unknown")
        self.assertEqual(out["status"], "identified")

    def test_empty_results(self):
        self.assertEqual(parse_identity({"results": []})["status"], "unknown")

    def test_bad_scores(self):
        self.assertEqual(
            parse_identity(
                {
                    "results": [
                        {
                            "score": 100,
                            "species": {
                                "scientificNameWithoutAuthor": "Ocimum sanctum"
                            },
                        }
                    ]
                }
            )["plant"],
            "unknown",
        )

    def test_bad_provider_unavailable_no_key_exposure(self):
        from io import BytesIO
        from urllib.error import HTTPError

        from PIL import Image

        photo = BytesIO()
        Image.new("RGB", (120, 120), (40, 150, 40)).save(photo, "JPEG")
        with (
            patch(
                "app.services.home_plant_identity.request.urlopen",
                side_effect=HTTPError(
                    "https://fake/?api-key=secret", 429, "rate-limited", None, None
                ),
            ),
            self.assertRaises(RecognitionUnavailable) as ctx,
        ):
            identify_with_plantnet(photo.getvalue(), "image/jpeg", "secret")
        self.assertNotIn("secret", str(ctx.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
