from __future__ import annotations

from typing import Protocol


class FileSystem(Protocol):
    """Protocol for reading and writing ledger source files."""

    def read_file(self, owner: str, repo: str, path: str) -> tuple[str, str] | None:
        """Return (content, sha) for the file, or None if not found."""
        ...

    def write_file(self, owner: str, repo: str, path: str, content: str, sha: str, message: str) -> None:
        """Overwrite path with content; sha must match the current file version."""
        ...
