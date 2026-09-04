from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from cli import output

ledger_app = typer.Typer(help="Ledger management commands", no_args_is_help=True, rich_markup_mode=None)


@ledger_app.command("create")
def ledger_create(
    name: Annotated[str, typer.Argument(help="Ledger name (lowercase, hyphens ok)")],
    description: Annotated[str | None, typer.Option("--description", "-d", help="Ledger description")] = None,
    private: Annotated[bool, typer.Option("--private/--public", help="Make ledger private")] = False,
) -> None:
    """Create a new ledger and print its public info."""
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import require_credentials

        from . import manager

        creds = require_credentials()
        client = make_client(creds.token)

        ledger = manager.create_ledger(client, name, description=description, private=private)

        typer.echo(f"name:     {ledger.name}")
        typer.echo(f"fullName: {ledger.full_name}")
        typer.echo(f"private:  {'yes' if ledger.private else 'no'}")
        typer.echo(f"httpUrl:  {ledger.http_url}")
        typer.echo(f"sshUrl:   {ledger.ssh_url}")
    except Exception as e:
        output.error(str(e))


@ledger_app.command("delete")
def ledger_delete(
    full_name: Annotated[str, typer.Argument(help="Ledger full name (e.g. username/my-ledger)")],
) -> None:
    """Delete a ledger by its full name."""
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import require_credentials

        from . import manager

        creds = require_credentials()
        client = make_client(creds.token)

        manager.delete_ledger(client, full_name)
        output.success(f"Ledger '{full_name}' deleted.")
    except Exception as e:
        output.error(str(e))


@ledger_app.command("init")
def ledger_init(
    name: Annotated[str, typer.Argument(help="Ledger name (lowercase, hyphens ok)")],
    description: Annotated[str | None, typer.Option("--description", "-d", help="Ledger description")] = None,
    private: Annotated[bool, typer.Option("--private/--public", help="Make ledger private")] = False,
    directory: Annotated[Path | None, typer.Option("--dir", help="Local directory for git clone")] = None,
) -> None:
    """Create a new ledger and clone it locally if a git repository exists."""
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import require_credentials

        from . import manager

        creds = require_credentials()
        client = make_client(creds.token)

        typer.echo(f"Creating ledger '{name}'...")
        ledger = manager.create_ledger(client, name, description=description, private=private)

        git_remote_url = ledger.ssh_url

        if ledger.http_url:
            target = directory or Path.cwd() / ledger.name
            typer.echo(f"Cloning repository to '{target}'...")
            try:
                manager.clone_ledger(git_remote_url, target)
                output.success(f"Ledger '{ledger.name}' cloned to '{target}'.")
            except manager.CloneError as e:
                typer.echo("")
                typer.echo(f"Ledger '{ledger.name}' was created but could not be cloned automatically.")
                typer.echo("Clone it manually with:")
                typer.echo(f"  git clone {e.git_remote_url}")
                output.success(f"Ledger '{ledger.name}' created.")
        else:
            output.success(f"Ledger '{ledger.name}' created.")
    except Exception as e:
        output.error(str(e))


@ledger_app.command("list")
def ledger_list(
    limit: Annotated[int, typer.Option("--limit", "-l", help="Max results")] = 50,
) -> None:
    """List all accessible ledgers."""
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import require_credentials

        from . import manager

        creds = require_credentials()
        client = make_client(creds.token)
        ledgers = manager.list_ledgers(client, limit=limit)

        if not ledgers:
            typer.echo("No ledgers found.")
            return
        headers = ["NAME", "FULLNAME", "PRIVATE", "CREATED"]
        table_rows = []
        for lg in ledgers:
            private = "yes" if lg.private else "no"
            created = lg.created_at[:10] if len(lg.created_at) >= 10 else lg.created_at
            table_rows.append([lg.name, lg.full_name, private, created])
        output.table(headers, table_rows)
    except Exception as e:
        output.error(str(e))


@ledger_app.command("clone")
def ledger_clone(
    full_name: Annotated[str, typer.Argument(help="Ledger full name (e.g. username/my-ledger)")],
    directory: Annotated[Path | None, typer.Option("--dir", help="Local directory for git clone")] = None,
) -> None:
    """Clone an existing ledger to disk."""
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import require_credentials

        from . import manager

        creds = require_credentials()
        client = make_client(creds.token)

        ledger = manager.get_ledger(client, full_name)

        target = directory or Path.cwd() / ledger.name
        typer.echo(f"Cloning '{ledger.full_name}' to '{target}'...")
        manager.clone_ledger(ledger.ssh_url, target)
        output.success(f"Ledger '{ledger.full_name}' cloned to '{target}'.")
    except manager.CloneError as e:
        output.error(f"Clone failed for {e.git_remote_url}. Ensure you have SSH access.")
    except Exception as e:
        output.error(str(e))
