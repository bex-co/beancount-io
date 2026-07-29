from __future__ import annotations

import typer

from cli import output

auth_app = typer.Typer(help="Authentication commands", no_args_is_help=True, rich_markup_mode=None)


@auth_app.command("login")
def auth_login() -> None:
    """Login via browser device flow (stores session in ~/.beancount-cli/credentials.json)."""
    try:
        from cli.api.client import make_client
        from cli.auth.device_flow import run_device_flow
        from cli.config import settings

        client = make_client()
        _token, _expire_at = run_device_flow(client, settings.dashboard_url)
        output.success("Logged in successfully.")
    except Exception as e:
        output.error(str(e))


@auth_app.command("logout")
def auth_logout() -> None:
    """Revoke token and clear stored credentials."""
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import clear_credentials, load_credentials

        creds = load_credentials()
        if creds is None:
            output.success("Already logged out.")
            return
        client = make_client(creds.token)
        try:
            client.logout()
        except Exception:
            pass
        clear_credentials()
        output.success("Logged out.")
    except Exception as e:
        output.error(str(e))


@auth_app.command("whoami")
def auth_whoami() -> None:
    """Print current user info."""
    try:
        from cli.api.client import make_client
        from cli.auth.credentials import require_credentials

        creds = require_credentials()
        client = make_client(creds.token)
        result = client.get_current_user()
        if result.user_profile is None:
            raise RuntimeError("Not authenticated.")
        user = result.user_profile
        username = user.username if user.username else "(not set)"
        typer.echo(f"Email:    {user.email}")
        typer.echo(f"Username: {username}")
        typer.echo(f"Tier:     {user.tier}")
    except Exception as e:
        output.error(str(e))
