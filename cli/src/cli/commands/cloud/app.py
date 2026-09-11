"""The `bea cloud` namespace: every command that talks to the hosted service.

Account commands (login/logout/status) sit directly on the app — the cloud
surface is too small for an `auth` sub-level — and hosted resources mount as
sub-apps (`cloud ledger`). Task verbs never live here: a local verb that gains
remote capability grows a target option, it does not move.
"""

from __future__ import annotations

import typer

from cli import context, output
from cli.commands.cloud.ledger.app import ledger_app

cloud_app = typer.Typer(
    help="Hosted ledgers and AI proxy; see 'cloud login'.",
    no_args_is_help=True,
    rich_markup_mode=None,
)
cloud_app.add_typer(ledger_app, name="ledger")


@cloud_app.command("login")
def cloud_login() -> None:
    """Log in via the browser device flow (stores credentials.json under $BEA_CONFIG_DIR, default ~/.config/bea)."""
    ctx = context.current()
    if ctx.no_input:
        from cli.errors import UsageError

        raise UsageError("Login needs a browser and a terminal. Set BEA_TOKEN for unattended use.")

    from cli.api.client import make_client
    from cli.auth.device_flow import run_device_flow
    from cli.config import settings

    run_device_flow(make_client(), settings().dashboard_url)
    output.success("Logged in successfully.")


@cloud_app.command("logout")
def cloud_logout() -> None:
    """Revoke the token and clear stored credentials."""
    from cli.api.client import bearer_client, unwrap
    from cli.api.rest_client.api.ledger_v_1 import logout
    from cli.auth.credentials import ENVIRONMENT, clear_credentials, load_credentials

    creds = load_credentials()
    if creds is None:
        output.success("Already logged out.")
        return
    if creds.source == ENVIRONMENT:
        # `BEA_TOKEN` is the shared, unattended credential: a CI job or a
        # teammate may be using the same value right now. Revoking it from a
        # routine logout would silently kill every other consumer, and this
        # process cannot unset the caller's shell anyway.
        output.success(
            "BEA_TOKEN is set in this shell; 'bea cloud logout' leaves it "
            "unchanged and does not revoke it. Unset BEA_TOKEN to stop using it."
        )
        return
    try:
        unwrap(logout.sync_detailed(client=bearer_client(creds.token)))
    except Exception:
        # The local credential goes either way: a server that cannot be
        # reached must not leave a token sitting on this disk.
        pass
    clear_credentials()
    output.success("Logged out.")


@cloud_app.command("status")
def cloud_status() -> None:
    """Show who is logged in, where the credential came from, and when it expires."""
    ctx = context.current()
    from cli.api.client import bearer_client, unwrap_or_none
    from cli.api.rest_client.api.ledger_v_1 import get_user_profile
    from cli.auth.credentials import require_credentials
    from cli.errors import error_from_status

    creds = require_credentials()
    user = unwrap_or_none(get_user_profile.sync_detailed(client=bearer_client(creds.token)))
    if user is None:
        # A revoked or unknown bearer answers this endpoint with an empty
        # profile rather than a 401. Report it exactly the way every other
        # hosted command reports a rejected credential, so a script that
        # branches on the message sees one auth story.
        raise error_from_status(401, f"the server does not recognize this {creds.source} credential")
    # The generated model marks optional fields with `Unset`, which is neither
    # printable nor JSON-serializable; normalize once here.
    username = user.username if isinstance(user.username, str) else None

    if ctx.json_output:
        output.emit(
            {
                "authenticated": True,
                "source": creds.source,
                "expires_at": creds.expire_at,
                "email": user.email,
                "username": username,
                "tier": user.tier,
            },
            target=output.server_target(),
        )
        return

    typer.echo(f"Source:    {creds.source}")
    typer.echo(f"Expires:   {creds.expire_at or '(unknown — supplied by BEA_TOKEN)'}")
    typer.echo(f"Email:     {user.email}")
    typer.echo(f"Username:  {username if username else '(not set)'}")
    typer.echo(f"Tier:      {user.tier}")
