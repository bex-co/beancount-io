"""`bea update <type>` — rewrite directives of a local ledger in place.

The locating and the rewriting happen in the engine (`bea-engine update`);
this module owns the option surface, the checks that need no Beancount (an id
was given, something changes), and the messages a person reads. Every form
previews a diff first and writes only with `--apply`, like `bea import`.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.amounts import json_float_default
from cli.completion import fixed_values
from cli.errors import UsageError
from cli.rows import parse_json, read_text
from cli.single_value import SingleValueCommand
from cli.utils import RawPath, inert_text

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
    # The shared JSON reader keeps a decimal as a typed marker; sent as `add`
    # sends it, so one malformed `1.25` cell is that row's refusal rather than
    # a serializer crash that loses the whole batch (w5/1028).
    data = launch.helper_json(argv, stdin=json.dumps(request, default=json_float_default), writes=apply)
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


_CSV_COLUMNS = ("id", "account", "flag")


def _rows_from_json(text: str, name: str) -> list[Any]:
    """The mapping's JSON array; a misshapen file is a usage error quoting the input."""
    loaded = parse_json(text, name)
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
    # A repeated column kept only its last cell, so a second `id` picked
    # another transaction and a second `account` another category (w5/1027),
    # where the same repeat in JSON is refused.
    repeated = [header for header in dict.fromkeys(headers) if headers.count(header) > 1]
    if repeated:
        raise UsageError(
            f"'{name}' (from --from) repeats column {', '.join(repr(h) for h in repeated)}; "
            "give each column once. Nothing was written."
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
    text, name = read_text(from_file, noun="Mappings", json_only=False)
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
