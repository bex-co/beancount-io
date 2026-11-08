from __future__ import annotations

from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.commands.cloud.generated.ledger import register_ledger_commands
from cli.errors import GatewayTimeout, LedgerError, UnreadableSuccess, UsageError, unknown_write_outcome
from cli.single_value import SingleValueCommand
from cli.utils import single_line

ledger_app = typer.Typer(help="Manage hosted ledgers on beancount.io", no_args_is_help=True, rich_markup_mode=None)

# Mechanical operations (list, show, delete) are generated from the spec's
# annotations; only multi-step flows (create-and-clone, clone) stay curated.
register_ledger_commands(ledger_app)

DirOpt = Annotated[Path | None, typer.Option("--dir", help="Local directory for the git clone")]


def _clone_failure_message(ledger_name: str | None, error: object, target: Path | None = None) -> str:
    import shlex

    from . import manager

    assert isinstance(error, manager.CloneError)
    # Server-supplied text (names, URLs, and git's report of what the remote
    # said) is escaped like any untrusted table cell before it reaches stderr.
    detail = f" ({single_line(error.diagnostic)})" if error.diagnostic else ""
    remote = single_line(error.git_remote_url)
    if ledger_name:
        return (
            f"Ledger '{single_line(ledger_name)}' was created but could not be cloned{detail}. "
            # The target the clone was aimed at: without it the printed command
            # cloned into `./<repo>`, not the `--dir` asked for (w5/371).
            f"Clone it manually with: git clone {remote or '<remote>'}"
            f"{f' {single_line(shlex.quote(str(target)))}' if target is not None else ''}"
        )
    if error.diagnostic:
        return f"Clone failed for {remote}{detail}."
    return f"Clone failed for {remote}. Ensure you have SSH access."


class _CreateCommand(SingleValueCommand):
    """`create` refuses two values for one option, the visibility pair included.

    `--private --public` created a public ledger (the last flag won) and
    `-d a -d b` kept `b`, with the request already sent (w5/623). A flag pair
    never reaches the single-value parser, so it is checked here, before
    credentials or any request.
    """

    def parse_args(self, ctx: Any, args: list[str]) -> list[str]:
        typed = set(args[: args.index("--")] if "--" in args else args)
        if {"--private", "--public"} <= typed:
            raise UsageError("Pass --private or --public, not both: a ledger has one visibility. Nothing was created.")
        return super().parse_args(ctx, args)


@ledger_app.command("create", cls=_CreateCommand)
def ledger_create(
    name: Annotated[str, typer.Argument(help="Ledger name (lowercase, hyphens ok)")],
    description: Annotated[str | None, typer.Option("--description", "-d", help="Ledger description")] = None,
    private: Annotated[bool, typer.Option("--private/--public", help="Ledger visibility")] = True,
    clone: Annotated[bool, typer.Option("--clone", help="Clone the new ledger to disk after creating it")] = False,
    directory: DirOpt = None,
    preset: Annotated[
        str | None, typer.Option("--preset", help="Setup-catalog preset id, e.g. personal@1 (ADR026)")
    ] = None,
    title: Annotated[str | None, typer.Option("--title", help="Ledger title; only with --preset")] = None,
    currency: Annotated[
        str | None, typer.Option("--currency", help="Operating currency for the preset, e.g. EUR")
    ] = None,
    date: Annotated[str | None, typer.Option("--date", help="History start YYYY-MM-DD for the preset")] = None,
    module: Annotated[
        list[str] | None,
        typer.Option(
            "--module",
            help="Also track investments@1, rental-property@1, or side-business@1 in a --preset personal@1 ledger; "
            "repeat for each",
        ),
    ] = None,
    property_name: Annotated[
        str | None,
        typer.Option("--property-name", help="Account name for the rental property, e.g. OakSt (default Property1)"),
    ] = None,
) -> None:
    """Create a new ledger, private by default, and optionally clone it.

    Publishing a book is a deliberate act: `--public` opts in, so a mistyped
    flag cannot put someone's finances on the open internet.
    """
    ctx = context.current()
    import httpx

    from cli.api.client import authenticated_client
    from cli.commands.init import module_accounts
    from cli.utils import ledger_name

    from . import manager

    # Before credentials, as in `clone` and `show`: a name the service would
    # refuse is the caller's mistake, and saying "not logged in" hides it.
    name = ledger_name(name)
    if directory is not None and not clone:
        # It was read only `if clone:`, so the ledger was created and nothing cloned, unsaid (w5/623).
        raise UsageError("--dir is where --clone puts the new ledger; add --clone, or drop --dir. Nothing was created.")
    if clone:
        manager.ensure_git_available()
        # A target git is certain to refuse is refused here, before the ledger
        # exists on the server and a retry conflicts on its name (w5/371).
        manager.refuse_occupied_clone_target(directory or Path(name))

    client = authenticated_client()
    try:
        if preset is None and (title is not None or currency is not None or date is not None):
            raise UsageError("--title, --currency, and --date are only meaningful with --preset. Nothing was created.")
        if preset is not None:
            from cli.api.rest_client.models.create_ledger_body_setup_type_0_preset import (
                CreateLedgerBodySetupType0Preset,
            )

            members = {str(member) for member in CreateLedgerBodySetupType0Preset}
            if preset not in members:
                known = ", ".join(sorted(members))
                raise UsageError(f"--preset {preset!r}: Unknown preset. Choose one of: {known}. Nothing was created.")
        selection = module_accounts(preset, module, property_name)
        ledger = manager.create_ledger(
            client,
            name,
            description=description,
            private=private,
            preset=preset,
            title=title,
            currency=currency,
            date=date,
            modules=module,
            property_name=property_name,
            property_module=selection.property_module,
        )
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ProxyError):
        # No request left the machine (refused, DNS failure), so nothing was
        # created: "could not reach the server", not an unknown outcome (w5/368).
        # A proxy that refused the tunnel never forwarded it either (w5/519).
        raise
    except (httpx.TimeoutException, httpx.TransportError, UnreadableSuccess, GatewayTimeout) as e:
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
            raise LedgerError(
                _clone_failure_message(ledger.full_name, e, directory or Path(ledger.name)), result=ledger.record
            ) from e

    if ctx.json_output:
        output.emit(ledger.record, target=output.server_target())


@ledger_app.command("clone", cls=SingleValueCommand)
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
    # As `create --clone` does: a missing git is a usage error found before
    # the server is asked anything, not an OSError after it (w5/372).
    manager.ensure_git_available("bea cloud ledger clone")
    # A target git is certain to refuse, as `create --clone` refuses it: a
    # `--dir` before credentials and the request, the default `./<name>`
    # once the lookup names it, never git's message after it (w5/520).
    if directory is not None:
        manager.refuse_occupied_clone_target(directory, nothing="cloned")
    ledger = manager.get_ledger(authenticated_client(), full_name)
    manager.check_clone_url(ledger.ssh_url)
    target = directory or manager.default_clone_dir(ledger.name)
    manager.refuse_occupied_clone_target(target, nothing="cloned")
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
