"""The `bea cloud` namespace: every command that talks to the hosted service.

Account commands (login/logout/status) sit directly on the app — the cloud
surface is too small for an `auth` sub-level — and hosted resources mount as
sub-apps (`cloud ledger`). Task verbs never live here: a local verb that gains
remote capability grows a target option, it does not move.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import typer

from cli import context, output
from cli.commands.cloud.git.app import git_app
from cli.commands.cloud.ledger.app import ledger_app

if TYPE_CHECKING:
    from cli.api.rest_client.client import AuthenticatedClient
    from cli.commands.cloud.git.helper import GitSignIn

cloud_app = typer.Typer(
    help="Hosted ledgers and AI proxy; see 'cloud login'.",
    no_args_is_help=True,
    rich_markup_mode=None,
)
cloud_app.add_typer(ledger_app, name="ledger")
cloud_app.add_typer(git_app, name="git")


@cloud_app.command("login")
def cloud_login() -> None:
    """Log in by device flow.

    credentials.json goes in $BEA_CONFIG_DIR, $XDG_CONFIG_HOME/bea or ~/.config/bea.
    """
    context.current().require_network("cloud login")
    import os

    from cli.errors import UsageError

    if os.environ.get("BEA_TOKEN"):
        # BEA_TOKEN wins over the stored file unconditionally, so a login here
        # printed success and every later command still sent the old token
        # (w5/516). Said before the flow starts, as logout says it.
        raise UsageError(
            "BEA_TOKEN is set in this shell and takes precedence over a login, so the new session would never be "
            "used. Unset BEA_TOKEN first, then run 'bea cloud login'."
        )
    ctx = context.current()
    if ctx.no_input:
        raise UsageError("Login needs a browser and a terminal. Set BEA_TOKEN for unattended use.")

    from cli.api.client import make_client
    from cli.auth.device_flow import run_device_flow
    from cli.config import settings

    run_device_flow(make_client(), settings().dashboard_url)
    output.success("Logged in successfully.")


@cloud_app.command("logout")
def cloud_logout() -> None:
    """Revoke the session and the Git token, and clear stored credentials."""
    context.current().require_network("cloud logout")
    import os

    if os.environ.get("BEA_TOKEN"):
        # Logout never sends this shared token, so even malformed values must
        # leave it and the stored credential alone, without reading either.
        output.success(
            "BEA_TOKEN is set in this shell; 'bea cloud logout' leaves it "
            "unchanged and does not revoke it. Unset BEA_TOKEN to stop using it."
        )
        return

    from cli.api.client import bearer_client, call, unwrap_or_none
    from cli.api.rest_client.api.ledger_v_1 import logout
    from cli.auth.credentials import UnusableCredentials, clear_credentials, load_credentials
    from cli.config import credentials_path
    from cli.errors import BeaError

    try:
        creds = load_credentials()
    except UnusableCredentials as exc:
        # Without a readable token nothing can be revoked, but the file still
        # holds whatever it holds: remove it, and do not call that a logout.
        try:
            clear_credentials()
        except OSError as error:
            # Not the unusable credential's own remedy, which names this command (w5/589).
            raise BeaError(
                f"The stored credential {exc.path} is unusable ({exc.reason}) and could not be removed: "
                f"{error.strerror}. Remove it yourself."
            ) from error
        raise BeaError(
            f"Removed the unusable credential file {exc.path}; it could not be revoked. "
            "If it held a live session, revoke it from the dashboard."
        ) from exc
    if creds is None:
        # No session is left to revoke a Git token with. A token still on this
        # disk leaves it unrevoked, and that is a failure.
        git = _git_sign_in()
        if git is not None and git.token and (git_left := _sign_git_out(None, git)) is not None:
            raise BeaError(f"Already logged out, but {git_left}")
        output.success("Already logged out.")
        if git is not None:
            # Only the id of a token this disk no longer holds: this logout
            # changes nothing, so failing would fail every run alike (w1/311).
            # The id stays for a signed-in logout or the next mint to revoke.
            output.note(
                f"The Git token {git.token_label} may still be valid: bea could not revoke it. Revoke it in the "
                "dashboard under Settings → Personal access tokens, or run 'bea cloud login' then "
                "'bea cloud logout', which revokes it."
            )
        return
    import httpx

    from cli.errors import ConflictError, GatewayTimeout, UnreadableSuccess, to_bea_error

    # Built before the request: a malformed BEA_API_URL is a usage error with
    # the credential kept, not a "failed revocation" after deleting it (w5/521).
    client = bearer_client(creds.token)
    # First, while the session can still revoke it: the token `cloud git setup`
    # minted for Git, which must not outlive the login (w22/m12).
    git = _git_sign_in()
    git_left = _sign_git_out(client, git) if git is not None else None
    also_git = f" Also, {git_left}" if git_left else ""
    # What went wrong with the revocation: the error class, the outcome as a
    # clause, and the server's request id. Worded only once the local removal
    # is known, so neither half claims what the other did (w5/589).
    failure: tuple[type[BeaError], str, str | None] | None = None
    try:
        response = call(logout.sync_detailed, client=client)
        # A 401 means the server no longer accepts this token: it is already
        # revoked (or expired), which is the outcome logout is after.
        if response.status_code != 401:
            unwrap_or_none(response)
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ProxyError) as exc:
        # Nothing reached the server: a plain failure, as for the other writes (w5/368, w5/519).
        reason = to_bea_error(exc)
        failure = (BeaError, f"server revocation failed: {str(reason).rstrip('.')}. {_STILL_VALID}", None)
    except httpx.TimeoutException as exc:
        failure = (
            ConflictError,
            f"server revocation timed out ({type(exc).__name__}); the outcome is unknown. {_STILL_VALID}",
            None,
        )
    except (httpx.TransportError, UnreadableSuccess, GatewayTimeout) as exc:
        # These failures cannot establish whether revocation took effect,
        # as for create and delete (w5/521, w5/690).
        failure = (
            ConflictError,
            f"the server's answer to the revocation was lost or unreadable ({_failure_name(exc)}); "
            f"the outcome is unknown. {_STILL_VALID}",
            getattr(exc, "request_id", None),
        )
    except ValueError:
        # `call` translates response-parsing ValueErrors after a response.
        # A remaining ValueError is request preparation, not an attempted
        # revocation: leave the stored credential available to retry.
        raise
    except Exception as exc:
        reason = to_bea_error(exc)
        # A 401 whose body lacks the `{ok, error}` envelope (a proxy's or a
        # framework's `{"message": "Unauthorized"}`) is still a 401: already
        # revoked, not a failure (w5/812).
        if reason.http_status != 401:
            failure = (
                BeaError,
                f"server revocation failed: {str(reason).rstrip('.')}. {_STILL_VALID}",
                reason.request_id,
            )
    # The local credential goes either way: a server that cannot be reached
    # must not leave a token sitting on this disk.
    try:
        clear_credentials()
    except OSError as error:
        # A read-only directory raised a bare `[Errno 13]` that said nothing of
        # the revocation, which had already reached the server (w5/589).
        kept = f"{credentials_path()} ({error.strerror})"
        if failure is None:
            raise BeaError(
                f"Revoked the session on the server, but could not remove the local credential {kept}. "
                f"The token there no longer works; delete the file yourself.{also_git}"
            ) from error
        kind, outcome, request_id = failure
        raise kind(
            f"Could not remove the local credential {kept}; delete it yourself. Also, {outcome}{also_git}",
            request_id=request_id,
        ) from error
    if failure is not None:
        kind, outcome, request_id = failure
        raise kind(f"Removed the local credential, but {outcome}{also_git}", request_id=request_id)
    if git_left:
        raise BeaError(f"Logged out, but {git_left}")
    output.success("Logged out.")


_STILL_VALID = "The session may still be valid: revoke it from the dashboard."


def _git_sign_in() -> GitSignIn | None:
    """Git's sign-in for this server, when `bea` minted it a token that may not be revoked yet."""
    from cli.commands.cloud.git import helper

    state = helper.load_state()
    if state is None or not state.key_id or not state.is_current_server():
        return None
    return state


def _sign_git_out(client: AuthenticatedClient | None, state: GitSignIn) -> str | None:
    """End Git's sign-in with the session: revoke the token `cloud git setup` minted and forget it.

    Returns None when the token is revoked, otherwise the clause that names
    the token left alive. The local copy goes either way, as the login's does.
    The Git config entry stays: with no token and no login the helper answers
    nothing, and Git prompts.
    """
    from cli.commands.cloud.git import helper

    named = f"the Git token {state.token_label}"
    unrevoked = helper.try_revoke(client, state)
    problem = f"{named} could not be revoked ({unrevoked}). {helper.REVOKE_REMEDY}" if unrevoked else None
    try:
        helper.forget_token(state, revoked=problem is None)
    except OSError as error:
        kept = f"{named} could not be removed from {helper.state_path()} ({error.strerror}); delete the file yourself."
        problem = f"{problem} Also, {kept}" if problem else kept
    return problem


def _failure_name(exc: BaseException) -> str:
    status = getattr(exc, "status", None)
    return f"HTTP {status}" if isinstance(status, int) else type(exc).__name__


@cloud_app.command("status")
def cloud_status() -> None:
    """Show the current login.

    Who is logged in, where the credential came from, and when it expires.
    """
    ctx = context.current()
    ctx.require_network("cloud status")
    from cli.api.client import bearer_client, call, unwrap_or_none
    from cli.api.rest_client.api.ledger_v_1 import get_user_profile
    from cli.api.rest_client.models import GetUserProfileResponse200Type0
    from cli.auth.credentials import require_credentials
    from cli.errors import error_from_status

    creds = require_credentials()
    response = call(get_user_profile.sync_detailed, client=bearer_client(creds.token))
    user = unwrap_or_none(response, model=GetUserProfileResponse200Type0)
    if user is None and response.status_code != 200:
        # Only a 200 with a null profile means an unrecognized bearer; a 204 or
        # another status the parser skips is not the credential's fault (w5/367).
        from cli.errors import UnreadableSuccess, request_id_from

        raise UnreadableSuccess(
            f"Unexpected server response (HTTP {response.status_code}).",
            status=response.status_code,
            request_id=request_id_from(response.headers),
        )
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

    from cli.utils import single_line

    # Email, username and tier are server text, and the expiry is read from a
    # file: escape them so none can drive the terminal or forge a line.
    typer.echo(f"Source:    {creds.source}")
    typer.echo(f"Expires:   {single_line(creds.expire_at) if creds.expire_at else '(unknown — supplied by BEA_TOKEN)'}")
    typer.echo(f"Email:     {single_line(user.email)}")
    typer.echo(f"Username:  {single_line(username) if username else '(not set)'}")
    typer.echo(f"Tier:      {single_line(user.tier)}")
