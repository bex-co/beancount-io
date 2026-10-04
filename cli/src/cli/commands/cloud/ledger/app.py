from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.commands.cloud.generated.ledger import register_ledger_commands
from cli.errors import LedgerError, unknown_write_outcome
from cli.utils import single_line

ledger_app = typer.Typer(help="Manage hosted ledgers on beancount.io", no_args_is_help=True, rich_markup_mode=None)

# Mechanical operations (list, show, delete) are generated from the spec's
# annotations; only multi-step flows (create-and-clone, clone) stay curated.
register_ledger_commands(ledger_app)

DirOpt = Annotated[Path | None, typer.Option("--dir", help="Local directory for the git clone")]


def _clone_failure_message(ledger_name: str | None, error: object) -> str:
    from . import manager

    assert isinstance(error, manager.CloneError)
    # Server-supplied text (names, URLs, and git's report of what the remote
    # said) is escaped like any untrusted table cell before it reaches stderr.
    detail = f" ({single_line(error.diagnostic)})" if error.diagnostic else ""
    remote = single_line(error.git_remote_url)
    if ledger_name:
        return (
            f"Ledger '{single_line(ledger_name)}' was created but could not be cloned{detail}. "
            f"Clone it manually with: git clone {remote or '<remote>'}"
        )
    if error.diagnostic:
        return f"Clone failed for {remote}{detail}."
    return f"Clone failed for {remote}. Ensure you have SSH access."


@ledger_app.command("create")
def ledger_create(
    name: Annotated[str, typer.Argument(help="Ledger name (lowercase, hyphens ok)")],
    description: Annotated[str | None, typer.Option("--description", "-d", help="Ledger description")] = None,
    private: Annotated[bool, typer.Option("--private/--public", help="Ledger visibility")] = True,
    clone: Annotated[bool, typer.Option("--clone", help="Clone the new ledger to disk after creating it")] = False,
    directory: DirOpt = None,
) -> None:
    """Create a new ledger, private by default, and optionally clone it.

    Publishing a book is a deliberate act: `--public` opts in, so a mistyped
    flag cannot put someone's finances on the open internet.
    """
    ctx = context.current()
    import httpx

    from cli.api.client import authenticated_client
    from cli.utils import ledger_name

    from . import manager

    # Before credentials, as in `clone` and `show`: a name the service would
    # refuse is the caller's mistake, and saying "not logged in" hides it.
    name = ledger_name(name)
    if clone:
        manager.ensure_git_available()

    client = authenticated_client()
    try:
        ledger = manager.create_ledger(client, name, description=description, private=private)
    except (httpx.TimeoutException, httpx.TransportError) as e:
        raise unknown_write_outcome(f"Creating ledger '{name}'", e) from e

    if not ctx.json_output:
        # Every value is server text: escape it so it cannot drive the terminal.
        typer.echo(f"name:     {single_line(ledger.name)}")
        typer.echo(f"fullName: {single_line(ledger.full_name)}")
        typer.echo(f"private:  {'yes' if ledger.private else 'no'}")
        typer.echo(f"httpUrl:  {single_line(ledger.http_url)}")
        typer.echo(f"sshUrl:   {single_line(ledger.ssh_url)}")

    if clone:
        try:
            manager.check_clone_url(ledger.ssh_url)
            target = directory or manager.default_clone_dir(ledger.name)
        except manager.UnsafeCloneSource as e:
            raise LedgerError(
                f"Ledger '{single_line(ledger.full_name)}' was created but was not cloned. {e}", result=ledger.record
            ) from e
        output.note(f"Cloning repository to '{single_line(str(target))}'...")
        try:
            manager.clone_ledger(
                ledger.ssh_url,
                target,
                quiet=ctx.json_output,
                unattended=ctx.no_input,
            )
        except manager.CloneError as e:
            # The ledger exists on the server. Saying "created" and exiting 0
            # here would hide a half-finished setup from a script.
            raise LedgerError(_clone_failure_message(ledger.full_name, e), result=ledger.record) from e

    if ctx.json_output:
        output.emit(ledger.record, target=output.server_target())


@ledger_app.command("clone")
def ledger_clone(
    full_name: Annotated[str, typer.Argument(help="Ledger full name (e.g. username/my-ledger)")],
    directory: DirOpt = None,
) -> None:
    """Clone an existing ledger to disk."""
    from cli.api.client import authenticated_client
    from cli.utils import owner_and_name

    from . import manager

    ctx = context.current()
    # Validate the argument before touching credentials: a malformed name is
    # a usage error on every `cloud ledger` command, signed in or not.
    owner_and_name(full_name)
    ledger = manager.get_ledger(authenticated_client(), full_name)
    manager.check_clone_url(ledger.ssh_url)
    target = directory or manager.default_clone_dir(ledger.name)
    shown_name, shown_target = single_line(ledger.full_name), single_line(str(target))
    output.note(f"Cloning '{shown_name}' to '{shown_target}'...")
    try:
        manager.clone_ledger(
            ledger.ssh_url,
            target,
            quiet=ctx.json_output,
            unattended=ctx.no_input,
        )
    except manager.CloneError as e:
        raise LedgerError(_clone_failure_message(None, e)) from e
    output.success(f"Ledger '{shown_name}' cloned to '{shown_target}'.")
