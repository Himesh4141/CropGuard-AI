from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class StoredObject:
    path: str


class StorageProvider(Protocol):
    def save(
        self,
        *,
        content: bytes,
        suffix: str,
    ) -> StoredObject:
        """Persist bytes and return the stored object metadata."""

    def delete(
        self,
        stored_path: str,
    ) -> None:
        """Delete a previously stored object if it exists."""