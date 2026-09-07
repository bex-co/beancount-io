from __future__ import annotations

import typer

from cli import context, output

auth_app = typer.Typer(help="Authentication commands", no_args_is_help=True, rich_markup_mode=None)


@auth_app.command("login")
def auth_login() -> None:
    """Log in via the browser device flow (stores a session in ~/.config/bea/credentials.json)."""
    ctx = context.current()
    try:
        if ctx.no_input:
            from cli.errors import UsageError

            raise UsageError("Login needs a browser and a terminal. Set BEA_TOKEN for unattended use.")

        from cli.api.client import make_client
        from cli.auth.device_flow import run_device_flow
        from cli.config import settings

        run_device_flow(make_client(), settings.dashboard_url)
        output.success("Logged in successfully.")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@auth_app.command("logout")
def auth_logout() -> None:
    """Revoke the token and clear stored credentials."""
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import clear_credentials, load_credentials

        creds = load_credentials()
        if creds is None:
            output.success("Already logged out.")
            return
        try:
            make_client(creds.token).logout()
        except Exception:
            # The local credential goes either way: a server that cannot be
            # reached must not leave a token sitting on this disk.
            pass
        clear_credentials()
        output.success("Logged out.")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@auth_app.command("status")
def auth_status() -> None:
    """Show who is logged in, where the credential came from, and when it expires."""
    ctx = context.current()
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import require_credentials
        from cli.errors import AuthError

        creds = require_credentials()
        result = make_client(creds.token).get_current_user()
        if result.user_profile is None:
            raise AuthError("Not authenticated. Run 'bea auth login'.")
        user = result.user_profile

        if ctx.json_output:
            output.emit(
                {
                    "authenticated": True,
                    "source": creds.source,
                    "expires_at": creds.expire_at,
                    "email": user.email,
                    "username": user.username,
                    "tier": user.tier,
                },
                target=output.server_target(),
            )
            return

        typer.echo(f"Source:    {creds.source}")
        typer.echo(f"Expires:   {creds.expire_at or '(unknown — supplied by BEA_TOKEN)'}")
        typer.echo(f"Email:     {user.email}")
        typer.echo(f"Username:  {user.username if user.username else '(not set)'}")
        typer.echo(f"Tier:      {user.tier}")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)
