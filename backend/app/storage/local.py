from pathlib import Path
from uuid import uuid4

from app.storage.base import StoredObject


ALLOWED_SUFFIXES = {".jpg", ".png", ".webp"}


class LocalStorageProvider:
    def __init__(
        self,
        root: Path,
    ) -> None:
        self.root = root

    def save(
        self,
        *,
        content: bytes,
        suffix: str,
    ) -> StoredObject:
        normalized_suffix = suffix.lower()

        if normalized_suffix not in ALLOWED_SUFFIXES:
            raise ValueError("Unsupported storage file extension")

        self.root.mkdir(
            parents=True,
            exist_ok=True,
        )

        final_path = (
            self.root
            / f"{uuid4().hex}{normalized_suffix}"
        )

        temporary_path = final_path.with_suffix(
            f"{final_path.suffix}.tmp"
        )

        temporary_path.write_bytes(
            content
        )

        temporary_path.replace(
            final_path
        )

        return StoredObject(
            path=final_path.as_posix(),
        )

    def delete(
        self,
        stored_path: str,
    ) -> None:
        root = self.root.resolve()
        candidate = Path(stored_path).resolve()

        if (
            candidate != root
            and root not in candidate.parents
        ):
            return

        candidate.unlink(
            missing_ok=True,
        )