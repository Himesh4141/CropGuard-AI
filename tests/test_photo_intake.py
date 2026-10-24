"""Purely synthetic test-image fixtures; NEVER actual training data."""

from __future__ import annotations

import csv
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
import uuid
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ml/expansion/v3"))
from intake import stage
from PIL import Image


def photo(seed: int) -> bytes:
    import random

    gen = random.Random(seed)
    raw = bytes(gen.randrange(256) for _ in range(144 * 144 * 3))
    image = Image.frombytes("RGB", (144, 144), raw)
    with io.BytesIO() as f:
        image.save(f, format="PNG")
        return f.getvalue()


class IntakeTests(unittest.TestCase):
    def setUp(self):
        # Inherit the approved scratch directory's Windows ACL. Python's
        # private TemporaryDirectory ACL excludes AppContainer test runners.
        scratch = Path(
            os.environ.get("CROPGUARD_TEST_SCRATCH", tempfile.gettempdir())
        ).resolve()
        self.root = scratch / ("cropguard-intake-" + uuid.uuid4().hex)
        self.root.mkdir()

        def cleanup():
            if self.root.resolve().parent != scratch or self.root.is_symlink():
                raise RuntimeError("Unsafe test cleanup path")
            shutil.rmtree(self.root)

        self.addCleanup(cleanup)
        base = self.root / "ml/expansion"
        base.mkdir(parents=True)
        (base / "candidate_plants.json").write_text(
            json.dumps({"plants": [{"slug": "tulsi"}, {"slug": "money_plant"}]}),
            encoding="utf-8",
        )

    def make_zip(self, name="raw.zip", entries=None):
        path = self.root / name
        with zipfile.ZipFile(path, "w") as z:
            for key, value in (entries or {}).items():
                z.writestr(key, value)
        return path

    def test_staged_files_are_pending_not_approved(self):
        z = self.make_zip(
            entries={
                "healthy/one.png": photo(1),
                "spots/two.png": photo(2),
                "notes.txt": b"foo",
            }
        )
        result = stage(z, self.root, "tulsi", "tulsi_001")
        self.assertEqual(result["counts"]["photos_staged"], 2)
        self.assertFalse(result["ready_for_training"])
        inbox = self.root / "ml/data/expansion_inbox/tulsi_001"
        with (inbox / "intake_manifest.csv").open(
            encoding="utf-8-sig", newline=""
        ) as f:
            rows = list(csv.DictReader(f))
        self.assertEqual(len(rows), 2)
        self.assertEqual({x["review_status"] for x in rows}, {"pending"})
        self.assertTrue(all(not x["reviewed_condition_slug"] for x in rows))
        self.assertFalse((self.root / "ml/data/expansion_labeled").exists())

    def test_byte_duplicates_skipped_and_annotated(self):
        content = photo(3)
        z = self.make_zip(entries={"healthy/a.png": content, "healthy/b.png": content})
        r = stage(z, self.root, "tulsi", "duplicate_001")
        self.assertEqual(r["counts"]["photos_staged"], 1)
        self.assertEqual(r["counts"]["byte_duplicates"], 1)
        self.assertEqual(
            len(
                list(
                    (self.root / "ml/data/expansion_inbox/duplicate_001/photos").glob(
                        "*.png"
                    )
                )
            ),
            1,
        )

    def test_zip_path_traversal_rejected(self):
        z = self.make_zip(entries={"../escape.png": photo(4)})
        with self.assertRaisesRegex(ValueError, "Unsafe ZIP path"):
            stage(z, self.root, "tulsi", "path_001")
        self.assertFalse((self.root / "ml/data/expansion_inbox/path_001").exists())

    def test_corrupted_images_not_staged(self):
        z = self.make_zip(entries={"bad.png": b"not a photo", "valid.png": photo(5)})
        result = stage(z, self.root, "money_plant", "invalid_001")
        self.assertEqual(result["counts"]["rejected_unreadable"], 1)
        self.assertEqual(result["counts"]["photos_staged"], 1)

    def test_folder_input_and_no_overwrite(self):
        folder = self.root / "camera"
        folder.mkdir()
        (folder / "leaf.png").write_bytes(photo(6))
        stage(folder, self.root, "tulsi", "field_001")
        with self.assertRaises(FileExistsError):
            stage(folder, self.root, "tulsi", "field_001")

    def test_unknown_plant_rejected(self):
        z = self.make_zip(entries={"a.png": photo(7)})
        with self.assertRaisesRegex(ValueError, "Unknown candidate"):
            stage(z, self.root, "rose", "unknown_001")

    def test_cleaned_if_no_valid_images(self):
        z = self.make_zip(entries={"bad.txt": b"hello"})
        with self.assertRaisesRegex(ValueError, "No valid images"):
            stage(z, self.root, "tulsi", "empty_001")
        self.assertFalse((self.root / "ml/data/expansion_inbox/empty_001").exists())


if __name__ == "__main__":
    unittest.main()
