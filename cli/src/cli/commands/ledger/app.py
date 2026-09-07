from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import TYPE_CHECKING, Annotated

import typer

from cli import context, output
from cli.errors import LedgerError, unknown_write_outcome

if TYPE_CHECKING:
    from cli.api.gql_client import Client

ledger_app = typer.Typer(help="Ledger management commands", no_args_is_help=True, rich_markup_mode=None)

DirOpt = Annotated[Path | None, typer.Option("--dir", help="Local directory for the git clone")]


def _client() -> Client:
    from cli.api.client import make_client
    from cli.auth.credentials import require_credentials

    return make_client(require_credentials().token)


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
    try:
        import httpx

        from . import manager

        client = _client()
        try:
            ledger = manager.create_ledger(client, name, description=description, private=private)
        except (httpx.TimeoutException, httpx.TransportError) as e:
            raise unknown_write_outcome(f"Creating ledger '{name}'", e) from e

        if clone:
            target = directory or Path.cwd() / ledger.name
            output.note(f"Cloning repository to '{target}'...")
            try:
                manager.clone_ledger(ledger.ssh_url, target, quiet=ctx.json_output)
            except manager.CloneError as e:
                # The ledger exists on the server. Saying "created" and exiting 0
                # here would hide a half-finished setup from a script.
                raise LedgerError(
                    f"Ledger '{ledger.full_name}' was created but could not be cloned. "
                    f"Clone it manually with: git clone {e.git_remote_url}"
                ) from e

        if ctx.json_output:
            output.emit(asdict(ledger), target=output.server_target())
            return

        typer.echo(f"name:     {ledger.name}")
        typer.echo(f"fullName: {ledger.full_name}")
        typer.echo(f"private:  {'yes' if ledger.private else 'no'}")
        typer.echo(f"httpUrl:  {ledger.http_url}")
        typer.echo(f"sshUrl:   {ledger.ssh_url}")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@ledger_app.command("delete")
def ledger_delete(
    full_name: Annotated[str, typer.Argument(help="Ledger full name (e.g. username/my-ledger)")],
) -> None:
    """Delete a ledger by its full name (asks first; use --yes to skip the prompt)."""
    try:
        import httpx

        from . import manager

        if not context.current().confirm(f"Permanently delete ledger '{full_name}'?"):
            output.success("Cancelled.")
            return

        client = _client()
        try:
            manager.delete_ledger(client, full_name)
        except (httpx.TimeoutException, httpx.TransportError) as e:
            raise unknown_write_outcome(f"Deleting ledger '{full_name}'", e) from e

        if context.current().json_output:
            output.emit({"deleted": full_name}, target=output.server_target())
        else:
            output.success(f"Ledger '{full_name}' deleted.")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@ledger_app.command("list")
def ledger_list(
    limit: Annotated[int, typer.Option("--limit", "-l", help="Max results")] = 50,
) -> None:
    """List all accessible ledgers."""
    ctx = context.current()
    try:
        from . import manager

        ledgers = manager.list_ledgers(_client(), limit=limit)

        if ctx.json_output:
            output.emit(
                [asdict(lg) for lg in ledgers],
                target=output.server_target(),
                truncated=len(ledgers) >= limit,
                limit=limit,
            )
            return

        if not ledgers:
            typer.echo("No ledgers found.")
            return
        rows = [[lg.name, lg.full_name, "yes" if lg.private else "no", lg.created_at[:10]] for lg in ledgers]
        output.table(["NAME", "FULLNAME", "PRIVATE", "CREATED"], rows)
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@ledger_app.command("clone")
def ledger_clone(
    full_name: Annotated[str, typer.Argument(help="Ledger full name (e.g. username/my-ledger)")],
    directory: DirOpt = None,
) -> None:
    """Clone an existing ledger to disk."""
    try:
        from . import manager

        ledger = manager.get_ledger(_client(), full_name)
        target = directory or Path.cwd() / ledger.name
        output.note(f"Cloning '{ledger.full_name}' to '{target}'...")
        try:
            manager.clone_ledger(ledger.ssh_url, target, quiet=context.current().json_output)
        except manager.CloneError as e:
            raise LedgerError(f"Clone failed for {e.git_remote_url}. Ensure you have SSH access.") from e
        output.success(f"Ledger '{ledger.full_name}' cloned to '{target}'.")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)
