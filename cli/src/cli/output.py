"""Everything the CLI prints, in exactly two shapes: a table for people, an envelope for machines.

In JSON mode data goes to stdout and nothing else does, so a caller can pipe
stdout straight into `jq`; failures go to stderr as one error object with the
category and exit code from `cli.errors`.
"""

from __future__ import annotations

import dataclasses
import datetime
import glob
import json
import re
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any, NoReturn

import typer

from cli import context
from cli.config import package_version
from cli.errors import LedgerError, UsageError, to_bea_error
from cli.utils import atomic_write, single_line


def _json_mode() -> bool:
    return context.current().json_output


# Loader warnings a tolerant JSON read has not printed yet. In JSON mode stderr
# must stay one parseable object, so they wait: a later failure folds them into
# its error object, and a clean exit prints them after the envelope.
_pending_warnings: list[str] = []


def flush_warnings() -> None:
    """Print deferred loader warnings; called on the way out of a successful command."""
    for line in _pending_warnings:
        print(line, file=sys.stderr)
    _pending_warnings.clear()


def success(message: str | None = None) -> None:
    """Print a human-readable confirmation. Silent in JSON mode — the envelope says it."""
    if message and not _json_mode():
        print(message)


def note(message: str) -> None:
    """Progress and advice, on stderr so it never contaminates piped stdout."""
    if not _json_mode():
        print(message, file=sys.stderr)


def error(exc: BaseException | str) -> NoReturn:
    """Fail with a documented category and exit code, rendered for the active mode."""
    err = to_bea_error(exc)
    exit_code = err.exit_code
    trace = None
    if context.current().debug:
        if err.traceback:
            trace = err.traceback
        elif isinstance(exc, BaseException):
            import traceback

            trace = "".join(traceback.format_exception(exc))

    if _json_mode():
        payload: dict[str, Any] = {
            "category": err.category,
            "message": str(err),
            "exit_code": exit_code,
        }
        if err.request_id:
            payload["request_id"] = err.request_id
        if err.details:
            payload["details"] = err.details
        if err.result is not None:
            payload["result"] = jsonable(err.result)
        if _pending_warnings:
            payload["ledger_warnings"] = list(_pending_warnings)
            _pending_warnings.clear()
        if trace:
            payload["traceback"] = trace
        print(json.dumps({"error": payload}), file=sys.stderr)
    else:
        print(f"Error: {err}", file=sys.stderr)
        for detail in err.details:
            print(f"  {detail}", file=sys.stderr)
        if trace:
            print(trace, file=sys.stderr, end="")

    raise typer.Exit(exit_code)


def table(headers: list[str], rows: list[list[str]]) -> None:
    """Render a table for a person. Silent in JSON mode, where stdout is the envelope alone."""
    if _json_mode():
        return
    headers = [single_line(header) for header in headers]
    rows = [[single_line(cell) for cell in row] for row in rows]
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    sep = "  "
    typer.echo(sep.join(h.ljust(widths[i]) for i, h in enumerate(headers)))
    typer.echo(sep.join("-" * widths[i] for i in range(len(headers))))
    for row in rows:
        typer.echo(sep.join(cell.ljust(widths[i]) for i, cell in enumerate(row)))


def file_target(path: Path) -> dict[str, Any]:
    return {"file": str(path.resolve())}


_INCLUDE_DIRECTIVE = re.compile(r'^\s*include\s+"([^"]+)"', re.MULTILINE)


@dataclasses.dataclass(frozen=True)
class MissingInclude:
    """An `include` string that matched no file, and the file that names it."""

    include: str
    source: Path


def _include_matches(source: Path, raw: str) -> list[Path]:
    """The files one `include` string resolves to, beancount's way.

    Every include is a glob, matched first against the including file's
    directory — the base the loader uses — then against the working directory.
    Only files count: a match that is not a regular file resolves nothing.
    """
    if Path(raw).is_absolute():
        return _glob_files(raw)
    for base in (source.parent, Path.cwd()):
        matches = _glob_files(str(base / raw))
        if matches:
            return matches
    return []


def _glob_files(pattern: str) -> list[Path]:
    """The regular files one glob pattern matches, sorted."""
    return [path for path in sorted(Path(p) for p in glob.glob(pattern, recursive=True)) if path.is_file()]


def _walk_closure(root: Path) -> tuple[list[Path], list[MissingInclude]]:
    """The root plus every reachable file, with the includes that resolve nowhere.

    Read textually on purpose: this runs before the ledger is loaded (it is
    what keeps a `-o` from truncating the file the load is about to read, and
    what tells `format` which files a root stands for), so it cannot ask the
    loader what the closure is.
    """
    members: list[Path] = []
    missing: list[MissingInclude] = []
    seen: set[Path] = set()
    stack = [root]
    while stack:
        current = stack.pop()
        try:
            key = current.resolve()
        except OSError:
            continue
        if key in seen:
            continue
        seen.add(key)
        members.append(current)
        try:
            text = current.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for match in _INCLUDE_DIRECTIVE.finditer(text):
            raw = match.group(1)
            matches = _include_matches(current, raw)
            if matches:
                stack.extend(matches)
            else:
                missing.append(MissingInclude(include=raw, source=current))
    return members, missing


def ledger_closure(root: Path) -> list[Path]:
    """The root ledger plus every file its `include` chain can reach."""
    members, _ = _walk_closure(root)
    return members


def missing_includes(root: Path) -> list[MissingInclude]:
    """The `include` strings in the root's reachable graph that match no file."""
    _, missing = _walk_closure(root)
    return missing


def _same_file(left: Path, right: Path) -> bool:
    """True when two paths name one file, through symlinks and hard links alike."""
    try:
        first, second = left.stat(), right.stat()
        return (first.st_ino, first.st_dev) == (second.st_ino, second.st_dev)
    except OSError:
        pass
    try:
        return left.resolve() == right.resolve()
    except OSError:
        return False


def refuse_ledger_alias(destination: Path, ledger: Path) -> None:
    """Refuse an output destination that is the ledger under read, or one of its includes.

    A result redirected onto the file it was read from truncates the books
    (human mode) or replaces them with a JSON envelope — and the exit status
    still says success. Call this before any temp file is created or any
    stream is opened, so a refusal leaves the destination byte-identical.
    """
    for member in ledger_closure(ledger):
        if _same_file(destination, member):
            raise UsageError(
                f"--output {destination} would overwrite the ledger it reads ({member}); "
                "choose a different destination."
            )


def server_target() -> dict[str, Any]:
    from cli.config import settings

    return {"server": settings().api_url}


def emit(
    data: Any,
    *,
    target: dict[str, Any] | None = None,
    truncated: bool = False,
    limit: int | None = None,
    page: int | None = None,
    destination: Path | None = None,
) -> None:
    """Write the documented JSON envelope to stdout or a file."""
    envelope: dict[str, Any] = {
        "bea": package_version(),
        "target": target,
        "data": jsonable(data),
        "truncated": truncated,
    }
    if limit is not None:
        envelope["limit"] = limit
    if page is not None:
        # Paged lists echo the page they served so a script can build the next
        # request from the payload alone.
        envelope["page"] = page
    serialized = json.dumps(envelope) + "\n"
    if destination is None:
        print(serialized, end="")
    else:
        atomic_write(destination, serialized)


def jsonable(value: Any) -> Any:
    """Convert accounting values to JSON without losing precision.

    Decimals become strings: a float would silently round an amount, and every
    consumer of this envelope is doing money arithmetic.
    """
    if value is None or isinstance(value, str | bool | int):
        return value
    # Exact dict/list first: a payload that is already JSON (a `model_dump`, an
    # `asdict`) is most of what passes through here, and skipping the attribute
    # probing below makes that walk about three times faster on a large ledger.
    if type(value) is dict:
        return {str(k): jsonable(v) for k, v in value.items()}
    if type(value) is list:
        return [jsonable(v) for v in value]
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, float):
        return str(Decimal(repr(value)))
    if isinstance(value, datetime.date | datetime.datetime):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, type) and value.__module__ == "beancount.core.number" and value.__name__ == "MISSING":
        return None
    # Named shapes before structural ones: beancount's Amount and Position are
    # tuples, and rendering them as bare arrays would drop the field names a
    # consumer needs.
    number = getattr(value, "number", None)
    currency = getattr(value, "currency", None)
    if number is None and currency is not None:
        # Beancount CostSpec uses number_per / number_total, not number.
        number = getattr(value, "number_per", None)
        if number is None:
            number = getattr(value, "number_total", None)
    if number is not None and currency is not None:
        amount = {"number": jsonable(number), "currency": currency}
        if hasattr(value, "date") and hasattr(value, "label"):
            # A Cost is an Amount plus the lot's acquisition date and label —
            # the two fields that tell one lot from another. Dropping them
            # would make two distinct lots read as duplicates.
            amount["date"] = jsonable(value.date)
            amount["label"] = value.label
        return amount

    for attr in ("model_dump", "_asdict"):
        method = getattr(value, attr, None)
        if callable(method):
            return jsonable(method())

    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        # Without this a dataclass would fall through to `str(value)` and ship
        # a repr into the envelope — a silent corruption, not a crash.
        return {f.name: jsonable(getattr(value, f.name)) for f in dataclasses.fields(value)}

    if isinstance(value, dict):
        # A beancount Inventory is a dict keyed by (currency, cost); its own
        # iteration yields positions, which is what a caller wants to read.
        # Checked by module name so that `--help` never imports beancount.
        if type(value).__module__ == "beancount.core.inventory":
            return [jsonable(position) for position in value]
        return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, list | tuple | set | frozenset):
        return [jsonable(v) for v in value]

    return str(value)


def render_ledger_errors(
    errors: list[Any], *, allow: bool, message: str | None = None, always_strict: bool = False
) -> None:
    """Report loader errors instead of quietly analysing a ledger that does not load.

    A total computed from a ledger with parse errors looks authoritative and
    is not, so strict reads refuse; `--allow-errors` opts strict mode into
    partial data. A person at a terminal gets the data with the errors as a
    banner on stderr instead. `bea check` passes `always_strict` and always
    refuses, since reporting the errors is its whole job.
    """
    if not errors:
        return
    formatted = [format_ledger_error(err) for err in errors]
    if not allow and (always_strict or context.current().strict_reads()):
        raise LedgerError(
            message or f"Ledger has {len(formatted)} error(s). Pass --allow-errors to report anyway.",
            details=formatted,
        )
    if _json_mode():
        _pending_warnings.extend(formatted)
        return
    for line in formatted:
        print(line, file=sys.stderr)


def format_ledger_error(err: Any) -> str:
    # A string is an error the engine already formatted: it crossed the process
    # boundary as `file:line: message`, because formatting a Beancount error
    # object requires Beancount and this side has none.
    if isinstance(err, str):
        return err
    source = getattr(err, "source", None) or {}
    filename = source.get("filename", "<ledger>")
    lineno = source.get("lineno", 0)
    return f"{filename}:{lineno}: {getattr(err, 'message', err)}"
