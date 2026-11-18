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
import os
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.ledger import write as ledger_write
from bea_engine.ledger.text import new_account_format_problem, refuse_control_characters, without_root_name_errors
from bea_engine.query import format_error


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
    _refuse_self_rates(entries)
    _refuse_documents_outside(text, entries, file, into)
    snapshot = _snapshot_for(file, token)
    _refuse_invisible_new_accounts(entries, file, snapshot)
    target = ledger_write.destination(file, into)
    warnings = ledger_write.validate_append(
        file, [text], allow_errors=allow_errors, into=into, snapshot=snapshot, one_entry_each=False
    )
    if dry_run:
        seed = ledger_write.new_include_seed(snapshot, target)
        seeded = seed + snapshot.require_target(target, into=into)
        return {
            "count": len(entries),
            "target": str(target),
            "warnings": warnings,
            "token": _token(snapshot),
            # The aligned lines the commit appends, so a confirmation shows what
            # will be written rather than the proposal before alignment (w5/374).
            "text": ledger_write.appended_lines(seeded, [text]),
            # A new include's file: the lines it starts with, written ahead of
            # the text, and that it is created at all (w5/849).
            "seed": seed.decode("utf-8"),
            "created": not (target.exists() or target.is_symlink()),
        }
    ledger_write.append(file, [text], allow_errors=allow_errors, into=into, snapshot=snapshot, one_entry_each=False)
    return {"written": len(entries), "target": str(target), "warnings": warnings}


def _refuse_documents_outside(text: str, entries: list[Any], file: Path, into: Path | None) -> None:
    """Refuse a `document` naming a file outside the ledger's folder, before anything looks for it.

    Validation reports a missing document file, so the answer told the model
    whether any path on the machine exists — one bit per call, with nothing
    shown to the user (w5/848). Outside the folder is refused the same way
    whether or not the file is there.
    """
    from beancount.core.data import Document
    from beancount.parser import parser

    if not any(isinstance(entry, Document) for entry in entries):
        return
    folder = Path(file).resolve().parent
    # Parsed as the file it lands in, so a relative path resolves beside it
    # as the loader will resolve it, not against this process's directory.
    located, _, _ = parser.parse_string(text, report_filename=str(ledger_write.destination(file, into)))
    for entry in located:
        if not isinstance(entry, Document):
            continue
        named = Path(os.path.expanduser(str(entry.filename))).resolve()
        if not named.is_relative_to(folder):
            raise protocol.UsageError(
                "Write rejected: an AI-proposed document must name a file inside the ledger's folder; "
                "this one is outside it. Move the file into the ledger's folder first."
            )


def _refuse_self_rates(entries: list[Any]) -> None:
    """Refuse a posting held at a cost or priced in its own commodity, as `add` refuses it (w1/278)."""
    from bea_engine import managed_load

    for entry in entries:
        for posting in getattr(entry, "postings", None) or []:
            tail = managed_load.self_rate_tail(posting)
            if tail is not None:
                raise protocol.UsageError(f"Write rejected: {posting.account} {tail}")


def _parse_directives(text: str) -> list[Any]:
    """Dated ledger entries only — options, plugins and includes are refused here."""
    from beancount.parser import lexer, parser

    refuse_control_characters(text, what="the directive text")
    if any(kind in ledger_write.CONFIG_TOKENS for kind, *_ in lexer.lex_iter_string(text)):  # type: ignore[no-untyped-call]
        raise protocol.UsageError(
            "Write rejected: provide dated ledger directives only; configure options, plugins and includes separately."
        )
    entries, errors, _ = parser.parse_string(text)
    # Root names are ledger options; the validated append that follows checks them.
    errors = without_root_name_errors(errors)
    if errors or not entries:
        detail = "; ".join(format_error(error) for error in errors) or "No dated directives were supplied."
        raise protocol.LedgerError(f"Write rejected: {detail}")
    return list(entries)


def _refuse_invisible_new_accounts(entries: list[Any], file: Path, snapshot: ledger_write.LedgerSnapshot) -> None:
    """Refuse a format character in an account the text opens or posts to, unless the ledger already opens it.

    A zero-width space in `Assets:Ca\u200bsh` showed invisibly on the
    approval panel, and approving it split the balance across two
    identical-looking accounts (w5/847). `add` refuses such a new name already;
    an existing one (a ZWNJ a script needs) is still written to. The ledger is
    loaded only when a name carries such a character.
    """
    from beancount.core.data import Open
    from beancount.core.getters import get_entry_accounts

    from bea_engine import managed_load

    names = {name for entry in entries for name in get_entry_accounts(entry)}
    suspect = sorted(name for name in names if new_account_format_problem(name) is not None)
    if not suspect:
        return
    existing, _, _ = managed_load.load_file(file, snapshot=snapshot)
    opened = {entry.account for entry in existing if isinstance(entry, Open)}
    for name in suspect:
        if name not in opened:
            raise protocol.UsageError(f"Write rejected: {new_account_format_problem(name)}")


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
    """Digest existing files; a planned destination must still be absent at commit."""
    return {
        str(path): hashlib.sha256(content).hexdigest()
        for path, content in sorted(snapshot.contents.items(), key=lambda item: str(item[0]))
        if snapshot.stats[path] is not None
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
