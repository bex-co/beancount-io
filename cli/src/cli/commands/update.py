"""`bea update <type>` — rewrite directives of a local ledger in place.

The locating and the rewriting happen in the engine (`bea-engine update`);
this module owns the option surface, the checks that need no Beancount (an id
was given, something changes), and the messages a person reads. Every form
previews a diff first and writes only with `--apply`, like `bea import`.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.completion import fixed_values
from cli.errors import UsageError
from cli.single_value import SingleValueCommand
from cli.utils import inert_text

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
