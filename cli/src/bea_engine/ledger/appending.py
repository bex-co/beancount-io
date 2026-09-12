"""What `bea-engine append` answers: raw Beancount directive text, validated then written.

`bea ask` hands the model free-form ledger text rather than a typed `add`
request. Parsing, rejecting configuration directives, and the atomic append all
belong here so the AI process never loads Beancount (ADR014 t022).

A dry-run answers with a snapshot `token` the caller must pass back on the
commit call. That is how confirmation in the frontend still detects an edit
made while the user was deciding: the token freezes the include graph at
validate time, and the commit refuses if anything changed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.ledger import write as ledger_write
from bea_engine.query import format_error

_CONFIG_KINDS = frozenset({"INCLUDE", "PLUGIN", "OPTION", "PUSHTAG", "POPTAG", "PUSHMETA", "POPMETA"})


def answer(
    file: Path,
    text: str,
    *,
    into: Path | None = None,
    allow_errors: bool = False,
    dry_run: bool = False,
    token: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Validate (and optionally append) raw directive text against a ledger."""
    entries = _parse_directives(text)
    snapshot = _snapshot_for(file, token)
    target = ledger_write.destination(file, into)
    warnings = ledger_write.validate_append(file, [text], allow_errors=allow_errors, into=into, snapshot=snapshot)
    if dry_run:
        return {
            "count": len(entries),
            "target": str(target),
            "warnings": warnings,
            "token": _token(snapshot),
        }
    ledger_write.append(file, [text], allow_errors=allow_errors, into=into, snapshot=snapshot)
    return {"written": len(entries), "target": str(target), "warnings": warnings}


def _parse_directives(text: str) -> list[Any]:
    """Dated ledger entries only — options, plugins and includes are refused here."""
    from beancount.parser import lexer, parser

    if any(kind in _CONFIG_KINDS for kind, *_ in lexer.lex_iter_string(text)):  # type: ignore[no-untyped-call]
        raise protocol.UsageError(
            "Write rejected: provide dated ledger directives only; configure options, plugins and includes separately."
        )
    entries, errors, _ = parser.parse_string(text)
    if errors or not entries:
        detail = "; ".join(format_error(error) for error in errors) or "No dated directives were supplied."
        raise protocol.LedgerError(f"Write rejected: {detail}")
    return list(entries)


def _snapshot_for(file: Path, token: dict[str, str] | None) -> ledger_write.LedgerSnapshot:
    """Capture now, or refuse when a prior dry-run's token no longer matches."""
    snapshot = ledger_write.LedgerSnapshot.capture(file)
    if token is None:
        return snapshot
    current = _token(snapshot)
    if current != token:
        raise protocol.ConflictError(
            "The ledger changed while the operation was running; nothing was written. Retry the command."
        )
    return snapshot


def _token(snapshot: ledger_write.LedgerSnapshot) -> dict[str, str]:
    """Per-path content digests: enough to detect any edit to the include graph."""
    return {
        str(path): hashlib.sha256(content).hexdigest()
        for path, content in sorted(snapshot.contents.items(), key=lambda item: str(item[0]))
    }


def parse_token(value: str) -> dict[str, str]:
    """The `--token` JSON object from a prior dry-run, or a usage failure."""
    try:
        raw = json.loads(value)
    except ValueError as exc:
        raise protocol.UsageError(f"--token is not valid JSON: {exc}.") from None
    if not isinstance(raw, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in raw.items()):
        raise protocol.UsageError("--token must be a JSON object of path → digest strings.")
    return raw
