"""Read `--from` row files for the batch commands.

`add transactions` and `update transactions` share one implementation of the
file/stdin reading, the UTF-8/UTF-16/NUL guards, and the JSON shape guards;
each caller phrases the usage errors in its own nouns, so neither command's
wording changes by sharing.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from cli import context
from cli.amounts import JsonFloat
from cli.errors import UsageError
from cli.utils import decode_error_message

_MAX_JSON_DEPTH = 100


def _nesting_depth(value: Any) -> int:
    """How deep lists and objects nest in a parsed JSON value, without recursing."""
    deepest = 0
    pending: list[tuple[Any, int]] = [(value, 1)]
    while pending:
        item, depth = pending.pop()
        if isinstance(item, dict):
            children: Any = item.values()
        elif isinstance(item, list):
            children = item
        else:
            continue
        deepest = max(deepest, depth)
        pending.extend((child, depth + 1) for child in children)
    return deepest


def _alternating_nuls(data: bytes) -> bool:
    """Whether NULs sit on one byte parity densely, as BOM-less UTF-16 ASCII does.

    The parity half of import's UTF-16 rule (`csv_mapper._refuse_utf16`),
    with a floor: a lone stray NUL does not alternate, however short the
    file (w5/738).
    """
    even, odd = data[0::2].count(0), data[1::2].count(0)
    return min(even, odd) == 0 and max(even, odd) >= 2 and 4 * max(even, odd) >= len(data) // 2


def _unique_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    """A JSON object whose keys are distinct; a repeated key would silently keep only the last value."""
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"key {key!r} appears more than once in one object; keep one.")
        result[key] = value
    return result


def _json_value_problem(exc: ValueError) -> str:
    message = str(exc)
    if "integer string conversion" in message:
        return "a number has too many digits; send amounts as decimal strings such as '1538.25'."
    return message


def read_text(from_file: str, *, noun: str, json_only: bool) -> tuple[str, str]:
    """The `--from` bytes as text, with the input's display name.

    Unreadable input is a usage error, phrased like `--file`'s. `noun` names
    what the caller reads (`Transactions`, `Mappings`); `json_only` selects
    the JSON-only hints, since a CSV-reading caller accepts either form.

    Stdin is read as bytes and decoded exactly like a file: the text stream
    would decode with the locale's codec (and its error handler), so the same
    bytes could pass on one machine and fail with a raw codec error on another.
    """
    # Raw text, not a Path: Path("./-") normalizes to Path("-"), which would
    # read stdin instead of the file named `-` (w5/736).
    stdin = from_file == "-"
    name = "stdin" if stdin else from_file
    piped = "JSON array" if json_only else "rows"
    named = "JSON file" if json_only else "JSON or CSV file"
    wanted = "JSON file" if json_only else "file"
    unattended = f"{noun} are required with --no-input. Pipe the {piped} on stdin or name a file with --from PATH."
    if stdin:
        context.refuse_terminal_stdin(unattended)
        buffer = getattr(sys.stdin, "buffer", None)
        data = buffer.read() if buffer is not None else sys.stdin.read().encode("utf-8")
    else:
        try:
            with Path(from_file).open("rb") as handle:
                # A named terminal (`--from /dev/stdin`) waits for a human
                # exactly like `-` does, so it is refused the same way when
                # unattended; pipes and regular files are read as before
                # (w5/737).
                if os.isatty(handle.fileno()) and context.current().no_input:
                    raise UsageError(unattended)
                data = handle.read()
        except FileNotFoundError as exc:
            raise UsageError(
                f"No {noun.lower()} file at '{from_file}' (from --from). "
                f"Name a {named} with --from PATH, or pass --from - to read stdin."
            ) from exc
        except IsADirectoryError as exc:
            raise UsageError(f"{noun} path '{from_file}' (from --from) is a directory; expected a {wanted}.") from exc
        except OSError as exc:
            raise UsageError(f"Cannot read {noun.lower()} file '{from_file}' (from --from): {exc.strerror}.") from exc
    utf16 = f"'{name}' (from --from) looks like UTF-16 text; re-save it as UTF-8 and retry."
    try:
        # utf-8-sig matches CSV import: editors that emit a BOM stay valid.
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        message = decode_error_message(name, exc, data)
        if data.startswith((b"\xff\xfe", b"\xfe\xff")):
            message = f"{message} {utf16}"
        raise UsageError(message) from exc
    if "\x00" in text:
        # BOM-less UTF-16 decodes as UTF-8 with a NUL beside every ASCII byte;
        # JSON text can never hold a raw NUL.
        if _alternating_nuls(data):
            raise UsageError(utf16)
        offset = data.index(b"\x00")
        raise UsageError(f"'{name}' (from --from) contains a NUL byte at byte {offset}; remove it and retry.")
    return text, name


def parse_json(text: str, name: str) -> Any:
    """The text as JSON values; malformed input is a usage error quoting it.

    Keys are distinct, floats keep their exact decimal spelling for the
    engine's amount fields, and nesting is bounded: the C decoder takes far
    deeper input than the engine's recursive walks (2,000 levels parsed and
    died as a bare RecursionError, exit 1 — w5/336). A row nests a handful of
    levels; this is generous and finite.
    """
    too_deep = f"'{name}' (from --from) nests JSON too deeply; send a flat array of rows."
    try:
        loaded = json.loads(text, object_pairs_hook=_unique_keys, parse_float=JsonFloat)
    except json.JSONDecodeError as exc:
        raise UsageError(f"Invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}.") from exc
    except RecursionError as exc:
        raise UsageError(too_deep) from exc
    except ValueError as exc:
        # A duplicate key, or an integer longer than Python will convert.
        raise UsageError(f"Invalid JSON in '{name}' (from --from): {_json_value_problem(exc)}") from exc
    if _nesting_depth(loaded) > _MAX_JSON_DEPTH:
        raise UsageError(too_deep)
    return loaded
