"""`bea cloud git`: sign Git in to a self-hosted server, with nothing to paste."""

from __future__ import annotations

import sys
from typing import TYPE_CHECKING, Annotated

import typer

from cli import context, output

if TYPE_CHECKING:
    from cli.api.rest_client.client import AuthenticatedClient

    from .helper import GitSignIn

git_app = typer.Typer(
    help="Git sign-in on a self-hosted server.",
    no_args_is_help=True,
    rich_markup_mode=None,
)


@git_app.command("setup")
def git_setup(
    undo: Annotated[
        bool,
        typer.Option("--undo", help="Remove what setup wrote to the Git config and revoke the token it minted"),
    ] = False,
) -> None:
    """Make Git sign in to this self-hosted server through bea.

    Registers bea as Git's credential helper for the server's Git address alone
    (in the global Git config), so git clone, pull and push over HTTPS ask for
    no password. The managed service uses SSH keys instead.
    """
    ctx = context.current()
    ctx.require_network("cloud git setup")
    from cli.commands.cloud.ledger.manager import ensure_git_available

    from . import helper

    ensure_git_available("bea cloud git setup")
    if undo:
        _undo()
        return

    from cli.api.client import authenticated_client
    from cli.config import settings
    from cli.utils import single_line

    client = authenticated_client()
    helper.require_self_hosted(client)
    git_url = helper.first_ledger_address(client)
    # Settings already refused a value that names no server.
    api_url = helper.server_identity(settings().api_url) or settings().api_url

    state = helper.load_state()
    if state is not None and not (
        helper.same_server(state.api_url, api_url) and helper.same_server(state.git_url, git_url)
    ):
        # One registration at a time: the token and the Git config entry of the
        # server set up before would otherwise be orphaned without a word.
        from cli.errors import UsageError

        raise UsageError(
            f"Git is already set up for another server, {single_line(state.git_url)}. Run 'bea cloud git setup "
            "--undo' while signed in to that server (or with it unreachable, to remove the local setup only), "
            "then run setup again. Nothing was changed."
        )
    if state is None:
        state = helper.GitSignIn(api_url=api_url, git_url=git_url)
    minted = state.live_token() is None
    if minted:
        # Before the Git config changes: a server that refuses the token leaves
        # Git exactly as it was.
        helper.mint_token(client, state)
    changed = helper.install_helper(git_url)

    if ctx.json_output:
        output.emit(
            {
                "git_url": git_url,
                "helper": helper.helper_command(),
                "config_changed": changed,
                "token": {
                    "id": state.key_id,
                    "name": state.key_name,
                    "expires_at": state.expires_at,
                    "minted": minted,
                },
            },
            target=output.server_target(),
        )
        return
    shown = single_line(git_url)
    if not changed and not minted:
        output.success(f"Git already signs in to {shown} through bea; nothing changed.")
        return
    output.success(f"Git now signs in to {shown} through bea: git clone, pull and push ask for no password.")
    output.note(
        f"The token Git uses is {state.token_label}, listed in the dashboard under Settings → Personal access "
        "tokens. 'bea cloud logout' revokes it."
    )


def _undo() -> None:
    from cli.errors import BeaError
    from cli.utils import single_line

    from . import helper

    ctx = context.current()
    state = helper.load_state()
    if state is None:
        if ctx.json_output:
            output.emit({"git_url": None, "config_changed": False, "token_revoked": False})
            return
        output.success("Git was not set up through bea here; nothing changed.")
        return
    changed = helper.remove_helper(state.git_url)
    # The token is revoked with the login when there is one for the same
    # server; without it the local copy still goes, and the message says the
    # token may live on.
    unrevoked = helper.try_revoke(_session_client(state) if state.key_id else None, state)
    helper.clear_state()
    shown = single_line(state.git_url)
    if unrevoked is not None:
        raise BeaError(
            f"Removed bea from Git's sign-in for {shown}, but the token {state.token_label} could not be revoked "
            f"({unrevoked}). {helper.REVOKE_REMEDY}"
        )
    if ctx.json_output:
        output.emit(
            {"git_url": state.git_url, "config_changed": changed, "token_revoked": state.key_id is not None},
            target=output.server_target(),
        )
        return
    output.success(f"Git no longer signs in to {shown} through bea, and its token is revoked.")


def _session_client(state: GitSignIn) -> AuthenticatedClient | None:
    """A client for the server `state` was set up on, or None without a usable login for it."""
    from cli.auth.credentials import load_credentials
    from cli.errors import AuthError

    try:
        creds = load_credentials()
    except AuthError:  # an unusable credential file is no login
        return None
    if creds is None or creds.is_expired() or not state.is_current_server():
        return None
    from cli.api.client import bearer_client

    return bearer_client(creds.token)


@git_app.command("credential", hidden=True)
def git_credential(
    operation: Annotated[str, typer.Argument(help="get, store or erase, as Git passes it")],
) -> None:
    """Answer Git's credential protocol. Git runs this; people do not."""
    # Stdout belongs to the protocol and the exit status to Git, which treats a
    # failing helper as noise: every problem is one line on stderr, and Git
    # goes on to its prompt. Nor does a release notice belong in a git command.
    from cli import update

    update.suppress()
    try:
        request = _read_request()
        if operation == "get":
            answer = _get(request)
            if answer is not None:
                sys.stdout.write(f"username={request.get('username') or 'bea'}\npassword={answer}\n")
        elif operation == "erase":
            _erase(request)
    except Exception as exc:  # noqa: BLE001 - see above: never a traceback into a git command
        from cli.errors import to_bea_error
        from cli.utils import single_line

        print(f"bea: {single_line(str(to_bea_error(exc)))}", file=sys.stderr)


def _read_request() -> dict[str, str]:
    """Git's `key=value` lines, up to the blank line or the end of input."""
    request: dict[str, str] = {}
    for line in sys.stdin:
        line = line.rstrip("\n")
        if not line:
            break
        key, separator, value = line.partition("=")
        if separator:
            request[key] = value
    return request


def _registered(request: dict[str, str]) -> GitSignIn | None:
    """The stored registration when Git is asking about its address, else None."""
    from . import helper

    protocol, host = request.get("protocol"), request.get("host")
    if not protocol or not host:
        return None
    state = helper.load_state()
    # Git sends the host as the URL spells it: `Git.Example.com`, `git.example.com:443`.
    if state is None or not helper.same_server(f"{protocol}://{host}", state.git_url):
        return None
    return state if state.is_current_server() else None


def _get(request: dict[str, str]) -> str | None:
    state = _registered(request)
    if state is None:
        return None
    # The usual case ends here, having loaded no HTTP client: Git asks on every fetch and push.
    if (token := state.live_token()) is not None:
        return token
    from cli.errors import AuthError

    from . import helper

    client = _session_client(state)
    if client is None:
        raise AuthError("Not signed in, so Git gets no password from bea. Run 'bea cloud login' and try again.")
    helper.mint_token(client, state)
    return state.token


def _erase(request: dict[str, str]) -> None:
    """Git says the server refused this password: forget it, so the next `get` mints another."""
    from . import helper

    state = _registered(request)
    if state is not None and state.token and request.get("password") == state.token:
        helper.forget_token(state, revoked=False)
