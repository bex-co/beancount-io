"""Everything the CLI prints: readable values for people, envelopes for machines.

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
import unicodedata
from collections.abc import Mapping, Sequence
from decimal import Decimal
from pathlib import Path
from typing import Any, NoReturn

import typer

from cli import context
from cli.config import package_version
from cli.errors import BeaError, LedgerError, UsageError, to_bea_error
from cli.utils import atomic_write, inert_text, single_line


def _json_mode() -> bool:
    return context.current().json_output


# Loader warnings a tolerant JSON read has not printed yet. In JSON mode stderr
# must stay one parseable object, so they wait: a later failure folds them into
# its error object, and a clean exit prints them after the envelope.
_pending_warnings: list[str] = []


def flush_warnings() -> None:
    """Print deferred loader warnings; called on the way out of a successful command."""
    for line in _pending_warnings:
        print(inert_text(line), file=sys.stderr)
    _pending_warnings.clear()


def success(message: str | None = None) -> None:
    """Print a human-readable confirmation. Silent in JSON mode — the envelope says it."""
    if message and not _json_mode():
        print(message)


def note(message: str) -> None:
    """Progress and advice, on stderr so it never contaminates piped stdout."""
    if not _json_mode():
        print(inert_text(message), file=sys.stderr)


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
        _print_failure(err, trace)

    raise typer.Exit(exit_code)


def failure(exc: BaseException | str) -> None:
    """Report a failure that costs one step, not the run — `ask`'s per-turn errors.

    An interactive session has to outlive a failed turn: the same words `error`
    would have printed, on the same stream, without the `typer.Exit` that would
    take the conversation with it. Text only, because the surfaces that recover
    this way have no JSON mode.
    """
    err = to_bea_error(exc)
    trace = None
    if context.current().debug and isinstance(exc, BaseException):
        import traceback

        trace = err.traceback or "".join(traceback.format_exception(exc))
    _print_failure(err, trace)


def _print_failure(err: BeaError, trace: str | None) -> None:
    """The one text rendering of an error, shared by the fatal and recoverable paths.

    Messages quote ledger-controlled text — a document name, an include path —
    so they are made inert before they reach the terminal (w1/134); JSON keeps
    the exact values.
    """
    print(f"Error: {inert_text(str(err))}", file=sys.stderr)
    for detail in err.details:
        print(f"  {inert_text(detail)}", file=sys.stderr)
    if trace:
        print(inert_text(trace), file=sys.stderr, end="")


def display_width(text: str) -> int:
    """How many terminal columns this text occupies.

    `len()` counts code points, which is not what a terminal lays out: an East
    Asian Wide or Fullwidth character takes two columns, and a combining mark
    takes none because it renders onto the character before it. Padding a
    Japanese payee by character count left every column to its right shifted —
    worst in the import preview, where the amount slid out from under its own
    header while the user was deciding whether to commit the write.

    Precomposed accented Latin (`Ünïcödé`) is one column per character and was
    always fine, which is what makes the rule precise: the issue is display
    width, not "non-ASCII".
    """
    return sum(0 if unicodedata.combining(c) else 2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in text)


def pad(text: str, width: int) -> str:
    """`str.ljust` measured in columns rather than code points."""
    return text + " " * max(0, width - display_width(text))


def truncate(text: str, width: int) -> str:
    """`text` cut to at most `width` columns, ending in `...` when it was cut."""
    if display_width(text) <= width:
        return text
    kept = ""
    for char in text:
        if display_width(kept + char) > width - 3:
            break
        kept += char
    return f"{kept}..."


def table(headers: list[str], rows: list[list[str]]) -> None:
    """Render a table for a person. Silent in JSON mode, where stdout is the envelope alone."""
    if _json_mode():
        return
    headers = [single_line(header) for header in headers]
    rows = [[single_line(cell) for cell in row] for row in rows]
    widths = [display_width(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], display_width(cell))
    sep = "  "
    typer.echo(sep.join(pad(h, widths[i]) for i, h in enumerate(headers)))
    typer.echo(sep.join("-" * widths[i] for i in range(len(headers))))
    for row in rows:
        typer.echo(sep.join(pad(cell, widths[i]) for i, cell in enumerate(row)))


def fields(values: Mapping[str, object], *, indent: int = 0) -> None:
    """Render object fields with yes/no booleans and indented nested objects."""
    if _json_mode():
        return
    for key, value in values.items():
        label = f"{' ' * indent}{single_line(key)}:"
        if isinstance(value, Mapping):
            typer.echo(label)
            fields(value, indent=indent + 2)
            continue
        if isinstance(value, bool):
            text = "yes" if value else "no"
        elif value is None:
            text = ""
        elif isinstance(value, list):
            text = json.dumps(value, ensure_ascii=False)
        else:
            text = single_line(str(value))
        typer.echo(f"{label} {text}")


def file_target(path: Path) -> dict[str, Any]:
    return {"file": str(path.resolve())}


# Spelled the way Beancount's lexer reads it: the keyword may touch its string
# (`include"x"`), and the string may carry backslash escapes (w1/159).
_INCLUDE_DIRECTIVE = re.compile(r'^\s*include\s*"((?:[^"\\]|\\.)+)"', re.MULTILINE | re.DOTALL)
_STRING_ESCAPE = re.compile(r"\\(.)", re.DOTALL)
_ESCAPED = {"n": "\n", "t": "\t", "r": "\r", "f": "\f", "b": "\b"}


def _unescape(raw: str) -> str:
    """A quoted string's value, as the lexer unescapes it.

    `\\n`, `\\t`, `\\r`, `\\f` and `\\b` are control characters; a backslash
    before anything else yields that character, so `"d\\ata.bean"` and
    `"data\\.bean"` both name `data.bean`.
    """
    return _STRING_ESCAPE.sub(lambda match: _ESCAPED.get(match.group(1), match.group(1)), raw)


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


def walk_closure(*roots: Path) -> tuple[list[Path], list[MissingInclude]]:
    """The roots plus every reachable file, with the includes that resolve nowhere.

    Several roots share one walk, so a file reachable from many of them is
    read once: walking each root separately is quadratic on a long include
    chain (w1/087).

    Read textually on purpose: this runs before the ledger is loaded (it is
    what keeps a `-o` from truncating the file the load is about to read, and
    what tells `format` which files a root stands for), so it cannot ask the
    loader what the closure is.
    """
    members: list[Path] = []
    missing: list[MissingInclude] = []
    seen: set[Path] = set()
    stack = list(reversed(roots))
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
            text = current.read_text(encoding="utf-8", errors="replace").removeprefix("\ufeff")
        except OSError:
            continue
        for match in _INCLUDE_DIRECTIVE.finditer(text):
            raw = match.group(1)
            matches = _include_matches(current, _unescape(raw))
            if matches:
                stack.extend(matches)
            else:
                missing.append(MissingInclude(include=raw, source=current))
    return members, missing


def ledger_closure(root: Path) -> list[Path]:
    """The root ledger plus every file its `include` chain can reach."""
    members, _ = walk_closure(root)
    return members


def missing_includes(root: Path) -> list[MissingInclude]:
    """The `include` strings in the root's reachable graph that match no file."""
    _, missing = walk_closure(root)
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


def refuse_input_alias(destination: Path, source: Path) -> None:
    """Refuse an output destination that is a single input file under read.

    `refuse_ledger_alias` for inputs without includes, such as a CSV table.
    """
    if _same_file(destination, source):
        raise UsageError(
            f"--output {destination} would overwrite the file it reads ({source}); choose a different destination."
        )


_LEDGER_SUFFIXES = (".bean", ".beancount")


def forwarded_option(args: Sequence[str], short: str, long: str, *, flags: str = "") -> str | None:
    """The value a forwarded option carries, in every spelling its parser accepts.

    A native command takes its arguments as one passthrough list, so an option
    `bea` must inspect before forwarding has to be found the way the downstream
    parser finds it: `-o X`, `-oX`, `--output X`, `--output=X`. Assuming one
    shape is how an aliasing `-omain.bean` slips past a guard. Anything after
    `--` is a positional argument, not an option. The last spelling wins, which
    is what the parser downstream does too.

    `flags` names the downstream's boolean short flags, which its parser lets
    cluster in front of a value option: with `flags="q"`, `-qo X` and `-qoX`
    carry the destination exactly as `-o X` does (w1/141).
    """
    value: str | None = None
    index = 0
    while index < len(args):
        arg = args[index]
        if arg == "--":
            break
        if arg in (short, long):
            if index + 1 < len(args):
                value = args[index + 1]
                index += 2
                continue
        elif arg.startswith(f"{long}="):
            value = arg.split("=", 1)[1]
        elif arg.startswith("-") and not arg.startswith("--") and len(arg) > 1:
            cluster = arg[1:]
            start = 0
            while start < len(cluster) and cluster[start] in flags:
                start += 1
            if cluster[start : start + 1] == short[1:]:
                if start + 1 < len(cluster):
                    value = cluster[start + 1 :]
                elif index + 1 < len(args):
                    value = args[index + 1]
                    index += 2
                    continue
        index += 1
    return value or None


def guard_forwarded_output(
    args: Sequence[str],
    ledgers: Sequence[Path],
    *,
    refuse_existing_ledger_file: bool = False,
    force: bool = False,
    flags: str = "",
) -> None:
    """Apply the output-destination rule to a `-o/--output` that is about to be forwarded.

    One rule for every command that writes where it was told: a destination
    that is a ledger under read — root or any include, through symlinks and
    hard links — is refused, and a command that names a ledger file it was
    never given refuses to replace it without `--force`. Called before the
    native writer is launched, so a refusal leaves the destination
    byte-identical.
    """
    value = forwarded_option(args, "-o", "--output", flags=flags)
    if value is None:
        return
    guard_output_destination(
        Path(value).expanduser(), ledgers, refuse_existing_ledger_file=refuse_existing_ledger_file, force=force
    )


def guard_output_destination(
    destination: Path,
    ledgers: Sequence[Path],
    *,
    refuse_existing_ledger_file: bool = False,
    force: bool = False,
) -> None:
    """`guard_forwarded_output` for a destination the caller already parsed."""
    for ledger in ledgers:
        refuse_ledger_alias(destination, ledger)
    if (
        refuse_existing_ledger_file
        and not force
        and destination.suffix.lower() in _LEDGER_SUFFIXES
        and (destination.exists() or destination.is_symlink())
    ):
        raise UsageError(
            f"Already exists: {destination}. Pass --force to overwrite it; "
            "without it, an existing ledger file is never replaced."
        )


def check_output_destination(destination: Path, flag: str = "--output") -> None:
    """Refuse an output destination that cannot become a fresh file.

    A directory and a missing parent are usage errors naming the flag and the
    path the caller supplied — never a downstream errno or temp-file rename.
    Call this before any temp file is created or any stream is opened.
    """
    if destination.exists() and destination.is_dir():
        raise UsageError(f"{flag} must be a file path, not a directory ({destination}).")
    if not destination.parent.exists():
        raise UsageError(
            f"{flag} parent directory does not exist ({destination.parent}); create it or choose another path."
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
        atomic_write(destination, serialized, export=True)


def _cost_spec_jsonable(cost: Any) -> dict[str, Any]:
    """A parsed cost constraint, reported field by field.

    A CostSpec is not an Amount: it carries a per-unit number, a total number,
    and a `MISSING` sentinel — a class, which `json.dumps` cannot encode — in
    any field the caller left open. Encoding it by the Amount shape crashed on
    `{}`/`{EUR}` (the sentinel currency reached the encoder) and reported
    `number: 0` for a total-only cost `{{250 USD}}`, which no longer describes
    the same lot when it is fed back in. Every field is reported explicitly:
    unspecified parts are null, and the total keeps its own key.

    The engine's `bea_engine.protocol._jsonable` holds the same walk; the two
    must agree, or `bea add --json` would change shape depending on which side
    built the envelope.
    """
    total = cost.number_total if isinstance(cost.number_total, Decimal) else None
    per = cost.number_per if isinstance(cost.number_per, Decimal) else None
    if total is not None and per is not None and not per:
        per = None
    return {
        "number": jsonable(per),
        "number_total": jsonable(total),
        "currency": cost.currency if isinstance(cost.currency, str) else None,
        "date": jsonable(cost.date),
        "label": cost.label if isinstance(cost.label, str) else None,
    }


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
    # Fixed-point, never exponent notation: `str(Decimal("0.00000001"))` is
    # `1E-8`, which bea's own amount inputs refuse, so the output could not be
    # fed back in.
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, float):
        return format(Decimal(repr(value)), "f")
    if isinstance(value, datetime.date | datetime.datetime):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, type) and value.__module__ == "beancount.core.number" and value.__name__ == "MISSING":
        return None
    # Named shapes before structural ones: beancount's Amount and Position are
    # tuples, and rendering them as bare arrays would drop the field names a
    # consumer needs.
    if hasattr(value, "number_per") and hasattr(value, "number_total"):
        return _cost_spec_jsonable(value)
    number = getattr(value, "number", None)
    currency = getattr(value, "currency", None)
    if number is not None and currency is not None:
        amount = {"number": jsonable(number), "currency": jsonable(currency)}
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
        print(inert_text(line), file=sys.stderr)


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
