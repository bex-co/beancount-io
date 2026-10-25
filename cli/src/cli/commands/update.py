"""`bea update <type>` — rewrite directives of a local ledger in place.

The locating and the rewriting happen in the engine (`bea-engine update`);
this module owns the option surface, the checks that need no Beancount (an id
was given, something changes), and the messages a person reads. Every form
previews a diff first and writes only with `--apply`, like `bea import`.
"""

from __future__ import annotations

import csv
import json
import os
import sys
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.completion import fixed_values
from cli.errors import UsageError
from cli.single_value import SingleValueCommand
from cli.utils import RawPath, decode_error_message, inert_text

update_app = typer.Typer(
    help="Rewrite directives of a local .bean file in place", no_args_is_help=True, rich_markup_mode=None
)


class _SingleValueCommand(SingleValueCommand):
    advice = "Pass it once; repeat the command for another entry."


_TRANSACTION_FLAGS = ("*", "!")


def _update(
    directive_type: str,
    request: dict[str, Any],
    *,
    apply: bool = False,
    allow_errors: bool = False,
) -> tuple[Path, dict[str, Any]]:
    """Hand one update request to the engine and return the ledger plus its answer.

    The request goes over stdin rather than in the argument list, as `add`
    sends its requests: a narration full of quotes needs no escaping on the
    way through a pipe.
    """
    from cli.engine import launch

    file = context.current().entry_file()
    argv = ["update", "--file", str(file), "--type", directive_type, "--request", "-"]
    if apply:
        argv.append("--apply")
    if allow_errors:
        argv.append("--allow-errors")
    data = launch.helper_json(argv, stdin=json.dumps(request), writes=apply)
    root = data.pop("root", None)
    return (Path(root) if root else file), data


def _rendered(data: dict[str, Any], *, file: Path, apply: bool) -> None:
    """Show one entry's diff or its applied write — the same way for every type."""
    target = data.pop("target")
    warnings = data.pop("warnings", [])
    dest = output.write_target(file, target)
    if context.current().json_output:
        if warnings:
            data["warnings"] = warnings
        output.emit(data, target=dest)
        return
    for warning in warnings:
        output.note(warning)
    # Ledger bytes reach the terminal only neutralized, as the import preview
    # does: an escape sequence in a narration would otherwise repaint the
    # screen that is asking for approval.
    diff = inert_text(str(data.get("diff") or ""))
    if diff:
        typer.echo(diff)
    if data.get("noop"):
        output.note(f"No changes to {dest['into']}:{data.get('lineno')}; the entry already matches.")
    elif apply:
        output.success(f"Updated 1 transaction in {dest['into']}.")
    else:
        typer.echo("Preview only. Review the diff, then repeat with --apply to write.")


@update_app.command("transaction", cls=_SingleValueCommand)
def update_transaction(
    entry_id: Annotated[str, typer.Option("--id", help="Entry to change: an import-id, a ref, or file:line")],
    account: Annotated[
        str | None,
        typer.Option("--account", "-a", help="Retarget postings: an account, or OLD=NEW to name the leg"),
    ] = None,
    flag: Annotated[
        str | None,
        typer.Option("--flag", help="Transaction flag", autocompletion=fixed_values(_TRANSACTION_FLAGS)),
    ] = None,
    tag: Annotated[list[str] | None, typer.Option("--tag", help="Tag to add (repeat for multiple)")] = None,
    narration: Annotated[str | None, typer.Option("--narration", "-n", help="Replacement narration")] = None,
    apply: Annotated[
        bool, typer.Option("--apply", help="Rewrite the entry; without it, preview the diff only")
    ] = False,
    allow_errors: Annotated[
        bool,
        typer.Option(
            "--allow-errors", help="Allow semantic ledger errors; syntax and pad account references must be valid"
        ),
    ] = False,
) -> None:
    """Recategorize or retouch one imported transaction.

    Clears the review queue `bea import` leaves behind: point --id at the
    row's import-id and pass the account it belongs to. The entry is located
    by its import-id, by a ref metadata value, or by file:line; an id shared
    by two entries is refused rather than guessed at. Only the entry's own
    lines change, so the diff stays reviewable:

      bea update transaction --id 9f2c --account Expenses:Groceries --flag '*'

    A bare --account retargets the queue's leg (the posting to
    Expenses:Uncategorized); OLD=NEW retargets another leg instead:

      bea update transaction --id 9f2c --account 'Expenses:Dining=Expenses:Coffee'

    Previews a diff by default and writes only with --apply. An ambiguous or
    unknown id exits 2 and changes nothing; a write the ledger would reject
    exits 1; a raced edit exits 4.
    """
    if account is None and flag is None and not tag and narration is None:
        raise UsageError(
            "Nothing to change: pass --account, --flag, --tag, or --narration alongside --id. Nothing was written."
        )
    request: dict[str, Any] = {"id": entry_id}
    if account is not None:
        request["account"] = account
    if flag is not None:
        request["flag"] = flag
    if tag:
        request["tags"] = list(tag)
    if narration is not None:
        request["narration"] = narration
    file, data = _update("transaction", request, apply=apply, allow_errors=allow_errors)
    _rendered(data, file=file, apply=apply)


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


def _unique_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    """A JSON object whose keys are distinct; a repeated key would silently keep only the last value."""
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"key {key!r} appears more than once in one object; keep one.")
        result[key] = value
    return result


def _alternating_nuls(data: bytes) -> bool:
    """Whether NULs sit on one byte parity densely, as BOM-less UTF-16 ASCII does."""
    even, odd = data[0::2].count(0), data[1::2].count(0)
    return min(even, odd) == 0 and max(even, odd) >= 2 and 4 * max(even, odd) >= len(data) // 2


_CSV_COLUMNS = ("id", "account", "flag")


def _read_mapping_text(from_file: str) -> tuple[str, str]:
    """The `--from` bytes as text; unreadable input is a usage error, phrased like `--file`'s.

    Stdin is read as bytes and decoded exactly like a file: the text stream
    would decode with the locale's codec, so the same bytes could pass on one
    machine and fail with a raw codec error on another.
    """
    stdin = from_file == "-"
    name = "stdin" if stdin else from_file
    unattended = "Mappings are required with --no-input. Pipe the rows on stdin or name a file with --from PATH."
    if stdin:
        context.refuse_terminal_stdin(unattended)
        buffer = getattr(sys.stdin, "buffer", None)
        data = buffer.read() if buffer is not None else sys.stdin.read().encode("utf-8")
    else:
        try:
            with Path(from_file).open("rb") as handle:
                # A named terminal (`--from /dev/stdin`) waits for a human
                # exactly like `-` does, so it is refused the same way when
                # unattended; pipes and regular files are read as before.
                if os.isatty(handle.fileno()) and context.current().no_input:
                    raise UsageError(unattended)
                data = handle.read()
        except FileNotFoundError as exc:
            raise UsageError(
                f"No mappings file at '{from_file}' (from --from). "
                "Name a JSON or CSV file with --from PATH, or pass --from - to read stdin."
            ) from exc
        except IsADirectoryError as exc:
            raise UsageError(f"Mappings path '{from_file}' (from --from) is a directory; expected a file.") from exc
        except OSError as exc:
            raise UsageError(f"Cannot read mappings file '{from_file}' (from --from): {exc.strerror}.") from exc
    utf16 = f"'{name}' (from --from) looks like UTF-16 text; re-save it as UTF-8 and retry."
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        message = decode_error_message(name, exc, data)
        if data.startswith((b"\xff\xfe", b"\xfe\xff")):
            message = f"{message} {utf16}"
        raise UsageError(message) from exc
    if "\x00" in text:
        if _alternating_nuls(data):
            raise UsageError(utf16)
        offset = data.index(b"\x00")
        raise UsageError(f"'{name}' (from --from) contains a NUL byte at byte {offset}; remove it and retry.")
    return text, name


def _rows_from_json(text: str, name: str) -> list[Any]:
    """The mapping's JSON array; shape problems are usage errors quoting the input."""
    too_deep = f"'{name}' (from --from) nests JSON too deeply; send a flat array of rows."
    try:
        loaded = json.loads(text, object_pairs_hook=_unique_keys)
    except json.JSONDecodeError as exc:
        raise UsageError(f"Invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}.") from exc
    except RecursionError as exc:
        raise UsageError(too_deep) from exc
    except ValueError as exc:
        raise UsageError(f"Invalid JSON in '{name}' (from --from): {exc}") from exc
    if _nesting_depth(loaded) > _MAX_JSON_DEPTH:
        raise UsageError(too_deep)
    if not isinstance(loaded, list):
        raise UsageError(f"'{name}' (from --from) must hold an array of rows, or CSV with an id column.")
    return loaded


def _rows_from_csv(text: str, name: str) -> list[dict[str, str]]:
    """The mapping's CSV rows: an `id` column plus `account` and `flag`.

    Empty cells mean "leave it": a row with only an id and a flag retargets
    nothing. Unknown columns are refused rather than ignored, so a misspelled
    header cannot silently drop a column of changes.
    """
    try:
        parsed = list(csv.reader(text.splitlines()))
    except csv.Error as exc:
        raise UsageError(f"Invalid CSV in '{name}' (from --from): {exc}") from exc
    rows = [row for row in parsed if row and any(cell.strip() for cell in row)]
    if not rows:
        raise UsageError(f"'{name}' (from --from) holds no rows.")
    headers = [cell.strip() for cell in rows[0]]
    unknown = [header for header in headers if header not in _CSV_COLUMNS]
    if unknown:
        raise UsageError(
            f"'{name}' (from --from) has unknown column {', '.join(repr(h) for h in unknown)}; "
            f"use {', '.join(_CSV_COLUMNS)}."
        )
    if "id" not in headers:
        raise UsageError(f"'{name}' (from --from) needs an 'id' column; use {', '.join(_CSV_COLUMNS)}.")
    mapped = []
    for number, row in enumerate(rows[1:], start=2):
        if len(row) > len(headers):
            raise UsageError(f"'{name}' (from --from) row {number} has more values than headers; fix it and retry.")
        padded = [*row, *[""] * (len(headers) - len(row))]
        entry = {header: cell.strip() for header, cell in zip(headers, padded, strict=True) if cell.strip()}
        mapped.append(entry)
    if not mapped:
        raise UsageError(f"'{name}' (from --from) holds no rows.")
    return mapped


def _load_mapping(from_file: str) -> list[Any]:
    """The `--from` rows as JSON-decoded values: a JSON array or a CSV mapping.

    Detected by content — a `[` opens the array, anything else is CSV — so
    stdin needs no format flag either.
    """
    text, name = _read_mapping_text(from_file)
    if not text.strip():
        raise UsageError(f"'{name}' (from --from) holds no rows.")
    if text.lstrip().startswith("["):
        return _rows_from_json(text, name)
    return _rows_from_csv(text, name)


def _rendered_batch(data: dict[str, Any], *, file: Path, apply: bool) -> None:
    """Show the batch's per-row results and its combined diff."""
    warnings = data.pop("warnings", [])
    total = len(data["rows"])
    if context.current().json_output:
        if warnings:
            data["warnings"] = warnings
        # Rows land across the include graph, so the envelope names the ledger,
        # and each row names its own file; a single `into` cannot hold them.
        output.emit(data, target=output.file_target(file))
        return
    for warning in warnings:
        output.note(warning)
    output.utf8_stdout()
    table_rows = []
    for row in data["rows"]:
        if row["status"] == "rejected":
            detail = ""
        elif row["status"] == "unchanged":
            detail = "unchanged"
        else:
            detail = "; ".join(str(change) for change in row.get("changes") or [])
        table_rows.append([str(row["row"]), row["status"], str(row.get("id") or ""), detail])
    output.table(["ROW", "STATUS", "ID", "DETAIL"], table_rows)
    for row in data["rows"]:
        if row["status"] == "rejected":
            typer.echo(f"\n{row['reason']}")
    diff = inert_text(str(data.get("diff") or ""))
    if diff:
        typer.echo(diff)
    rejected = int(data.get("rejected") or 0)
    written = int(data.get("written") or 0)
    unchanged = int(data.get("unchanged") or 0)
    if rejected:
        noun = "row" if rejected == 1 else "rows"
        typer.echo(f"Preview only. Fix the {rejected} rejected {noun}, then preview again.")
    elif not apply:
        if written == 0 and unchanged == total:
            output.note("No changes; every row is already up to date.")
        else:
            typer.echo("Preview only. Review the diff, then repeat with --apply to write.")
    elif written:
        message = f"Updated {written} of {total} transactions in {file}."
        if unchanged:
            message += f" {unchanged} already up to date."
        output.success(message)
    else:
        output.note("No changes; every row is already up to date.")


@update_app.command("transactions", cls=_SingleValueCommand)
def update_transactions(
    from_file: Annotated[
        str, typer.Option("--from", click_type=RawPath(), help="JSON or CSV file mapping ids to changes; - reads stdin")
    ],
    apply: Annotated[
        bool, typer.Option("--apply", help="Rewrite the entries; without it, preview the diff only")
    ] = False,
    allow_errors: Annotated[
        bool,
        typer.Option(
            "--allow-errors", help="Allow semantic ledger errors; syntax and pad account references must be valid"
        ),
    ] = False,
) -> None:
    """Recategorize a batch of transactions from a JSON or CSV mapping.

    Every valid row writes; a rejected row never aborts the valid ones, but
    the exit status is still 1 whenever any row was rejected, with
    `written_rows` and `rejected_rows` in the JSON result, as `bea add
    transactions --partial` reports. Each file's rows land in one atomic
    write. Previews by default and writes only with --apply.

    JSON rows use the single-row fields:

      [{"id": "9f2c", "account": "Expenses:Groceries", "flag": "*"}]

    CSV rows map an id to an account and a flag; empty cells leave the field:

      id,account,flag
      9f2c,Expenses:Groceries,*
      71ab,,*

    Pass --from - to read either form from stdin.
    """
    rows = _load_mapping(from_file)
    file, data = _update("transactions", {"rows": rows}, apply=apply, allow_errors=allow_errors)
    _rendered_batch(data, file=file, apply=apply)
