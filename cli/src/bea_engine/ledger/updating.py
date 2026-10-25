"""Locate one transaction for `bea-engine update`, by import-id, `ref`, or file:line.

An imported row is found by the identity its importer wrote: the `import-id`
metadata every bea import stamps, or the `ref` metadata bank importers use.
Either may repeat across entries — a re-imported statement, a transfer both of
whose legs carry the bank's reference — so a repeated value is refused rather
than guessed at, and `file:line` names the entry outright. Only entries written
in a ledger file resolve: a plugin-synthesized row has no source lines to
rewrite.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.ledger import reader


def parse_location(id_text: str) -> tuple[Path, int] | None:
    """A `file:line` reference, or None when the text is not one.

    The split is on the last colon, so a Windows drive letter survives it, and
    the path must name an existing file: an import-id such as `stmt:42` is
    metadata, not a location.
    """
    path_text, separator, line_text = id_text.rpartition(":")
    if not separator or not path_text or not line_text.isdigit():
        return None
    lineno = int(line_text)
    if lineno < 1:
        return None
    path = Path(path_text)
    if not path.is_file():
        return None
    return path, lineno


def _same_location(entry: Any, path: Path, lineno: int) -> bool:
    """Whether the entry is written at `path:lineno`.

    Compared by identity where the filesystem allows it, so a symlinked or
    case-variant spelling of the ledger still resolves; otherwise by
    normalized absolute path.
    """
    meta = entry.meta or {}
    if meta.get("lineno") != lineno:
        return False
    filename = meta.get("filename")
    if not isinstance(filename, str) or not filename:
        return False
    try:
        if os.path.samefile(path, filename):
            return True
    except OSError:
        pass
    return os.path.normcase(os.path.abspath(str(path))) == os.path.normcase(os.path.abspath(filename))


def _metadata_values(entry: Any, key: str) -> list[str]:
    """The entry's values for a metadata key, as the id forms compare them.

    A `ref` may be typed — a date, a decimal — where an import-id is always a
    string, so both compare as strings.
    """
    value = (entry.meta or {}).get(key)
    if value is None:
        return []
    return [value if isinstance(value, str) else str(value)]


def _where(entry: Any) -> str:
    """The entry's `file:line`, for an error that names each match."""
    meta = entry.meta or {}
    return f"{meta.get('filename', '?')}:{meta.get('lineno', '?')}"


def _ambiguous(id_text: str, key: str, matches: list[Any]) -> protocol.UsageError:
    places = ", ".join(_where(entry) for entry in matches)
    if key == "location":
        return protocol.UsageError(
            f"Location {id_text} holds {len(matches)} transactions ({places}); "
            "a plugin duplicated the entry, so it cannot be updated in place. Nothing was written."
        )
    return protocol.UsageError(
        f"{key} {id_text!r} matches {len(matches)} transactions ({places}); "
        "name one with file:line instead. Nothing was written."
    )


def locate_transaction(entries: list[Any], id_text: str) -> Any:
    """The one on-disk transaction `id_text` names.

    `file:line` resolves by location; anything else resolves by `import-id`
    first and `ref` second, so an import-id always wins when a `ref` elsewhere
    spells the same value. A repeated value is ambiguous and an absent one is
    not found; both are usage errors, because the caller named the wrong entry
    rather than the ledger failing to load.
    """
    from beancount.core.data import Transaction

    shared = reader.shared_locations(entries)
    on_disk = [
        entry
        for entry in entries
        if isinstance(entry, Transaction) and not reader.entry_generated(entry, "transaction", shared)
    ]
    location = parse_location(id_text)
    if location is not None:
        path, lineno = location
        matches = [entry for entry in on_disk if _same_location(entry, path, lineno)]
        if len(matches) > 1:
            raise _ambiguous(f"{path}:{lineno}", "location", matches)
        if matches:
            return matches[0]
        raise protocol.UsageError(
            f"No transaction at {path}:{lineno}; the line holds no transaction of this ledger. Nothing was written."
        )
    for key in ("import-id", "ref"):
        matches = [entry for entry in on_disk if id_text in _metadata_values(entry, key)]
        if len(matches) > 1:
            raise _ambiguous(id_text, key, matches)
        if matches:
            return matches[0]
    raise protocol.UsageError(f"No transaction with import-id or ref {id_text!r} in this ledger. Nothing was written.")
