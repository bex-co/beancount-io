"""Git's sign-in on a self-hosted server: one personal access token `bea` mints for itself.

`bea cloud git setup` registers `bea cloud git credential` as Git's credential
helper for one server's Git address, and Git then asks `bea` for a password
whenever it talks to that address over HTTPS. What `bea` answers with is a
personal access token it minted for this machine (`ledger.read` and
`ledger.write`, 90 days), kept in `git-credential.json` beside the login. The
user sees it under Settings → Personal access tokens and can revoke it there;
`bea cloud logout` revokes it too.

The login itself is never handed to Git: it can do everything the account can,
and the Git proxy takes only tokens and passwords.
"""

from __future__ import annotations

import json
import re
import shlex
import shutil
import sys
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING
from urllib.parse import urlsplit

from cli.errors import BeaError, UsageError

if TYPE_CHECKING:
    from cli.api.rest_client.client import AuthenticatedClient

#: How long a minted token lasts. `credential get` mints the next one when it
#: lapses, for as long as the login is valid.
TOKEN_LIFETIME = timedelta(days=90)
#: A token this close to its expiry is replaced now, not partway through a push.
_EXPIRY_MARGIN = timedelta(minutes=5)
#: The arguments Git appends its `get`, `store` or `erase` to.
_HELPER_ARGUMENTS = "cloud git credential"
#: A helper value `setup` wrote, whatever path to `bea` it recorded.
_OURS = re.compile(rf" {re.escape(_HELPER_ARGUMENTS)}$")
#: The ports an address may leave out.
_DEFAULT_PORTS = {"http": 80, "https": 443}
#: Where a token `bea` could not revoke is revoked by hand.
REVOKE_REMEDY = "Revoke it in the dashboard under Settings → Personal access tokens."


@dataclass
class GitSignIn:
    """What `setup` registered, and the token Git is given for it."""

    api_url: str
    """The server the token was minted on; the helper answers only while `bea` still talks to it."""
    git_url: str
    """The Git address the helper is registered for: scheme, host and port, no path."""
    key_id: str | None = None
    """The newest token `bea` minted. Kept after the token is forgotten, so it can still be revoked."""
    key_name: str | None = None
    token: str | None = None
    expires_at: str | None = None

    def live_token(self) -> str | None:
        """The stored token, unless there is none or it is about to lapse."""
        from cli.auth.credentials import grant_expiry

        if not self.token:
            return None
        try:
            expiry = grant_expiry(self.expires_at)
        except ValueError:
            return None
        return None if expiry - _EXPIRY_MARGIN <= datetime.now(tz=UTC) else self.token

    def is_current_server(self) -> bool:
        """Whether `bea` is talking to the server this was set up for.

        A shell pointed at another server (`BEA_API_URL`) holds another login,
        which can neither mint nor revoke this registration's token.
        """
        from cli.config import settings

        return same_server(settings().api_url, self.api_url)

    @property
    def token_label(self) -> str:
        """The token as the dashboard lists it, safe to print."""
        from cli.utils import single_line

        return f"'{single_line(self.key_name or self.key_id or '')}'"


def state_path() -> Path:
    from cli.config import config_dir

    return config_dir() / "git-credential.json"


def load_state() -> GitSignIn | None:
    """What `setup` stored, or None when it never ran here or the file is not one it wrote."""
    from cli.auth.credentials import read_private
    from cli.errors import AuthError

    try:
        text = read_private(state_path())
        data = json.loads(text) if text is not None else None
    except (AuthError, ValueError, RecursionError):
        return None
    if not isinstance(data, dict):
        return None
    fields = {name: data.get(name) for name in GitSignIn.__dataclass_fields__}
    if not all(value is None or isinstance(value, str) for value in fields.values()):
        return None
    if not fields["api_url"] or not fields["git_url"]:
        return None
    return GitSignIn(**fields)  # type: ignore[arg-type]


def save_state(state: GitSignIn) -> None:
    from cli.auth.credentials import write_private

    write_private(state_path(), json.dumps(asdict(state), indent=2))


def clear_state() -> None:
    state_path().unlink(missing_ok=True)


def server_identity(url: str) -> str | None:
    """`url` reduced to the server it names, or None when it names none.

    Git matches `credential.<url>.helper` regardless of the host's case and an
    explicit default port, then sends the host as the URL spells it; a copied
    `BEA_API_URL` may carry a trailing `/` or capitals that httpx absorbs.
    Compared raw, each of those got Git no password and let `cloud logout`
    leave the Git token alive without a word (w1/294). So the scheme and host
    are lowercased, the scheme's default port dropped and the path's trailing
    `/` stripped; another host, port, path or user stays another server.
    """
    try:
        parts = urlsplit(url)
        hostname, port = parts.hostname, parts.port
    except ValueError:
        return None
    scheme = parts.scheme.lower()
    if scheme not in _DEFAULT_PORTS or not hostname:
        return None
    host = f"[{hostname}]" if ":" in hostname else hostname
    if port is not None and port != _DEFAULT_PORTS[scheme]:
        host += f":{port}"
    user, at, _ = parts.netloc.rpartition("@")
    return f"{scheme}://{user}{at}{host}{parts.path.rstrip('/')}"


def same_server(url: str, other: str) -> bool:
    """Whether two addresses name one server, however each is spelled."""
    identity = server_identity(url)
    return identity is not None and identity == server_identity(other)


def git_address(http_url: str) -> str:
    """The address Git's helper is registered for: a ledger's `httpUrl` without its path.

    The value comes from the server and goes into the user's Git config, so
    anything but a plain address is refused: no credentials in it, no option
    look-alike host, and HTTPS only, since the token is the request's password
    (a server on this machine may use plain HTTP).
    """
    from cli.commands.cloud.ledger.manager import plain_https_address

    parts = plain_https_address(http_url, loopback_http=True)
    address = None if parts is None else server_identity(f"{parts.scheme}://{parts.netloc}")
    if address is None:
        from cli.utils import single_line

        raise BeaError(
            f"Unexpected server response: the ledger's Git address {single_line(http_url)!r} is not a plain "
            "https:// address; refusing to register a credential helper for it. Nothing was changed."
        )
    return address


def helper_command() -> str:
    """The `credential.<url>.helper` value: this `bea`, by absolute path when it has one.

    Git runs a helper that starts with `!` through the shell, with its own
    `PATH`, which need not hold the directory a Homebrew or `uv tool` install
    put `bea` in. The path is the one `bea` was started by, not its resolved
    target: Homebrew's `bin/bea` survives an upgrade, the versioned directory
    behind it does not.
    """
    started = Path(sys.argv[0])
    if started.is_absolute() and started.stem == "bea" and started.is_file():
        program = str(started)
    else:
        program = shutil.which("bea") or "bea"
    return f"!{shlex.quote(program)} {_HELPER_ARGUMENTS}"


def _config_key(git_url: str) -> str:
    return f"credential.{git_url}.helper"


def _git_config(*arguments: str, accept: tuple[int, ...] = (0,)) -> str:
    """Run `git config --global`, raising for any exit status not in `accept`."""
    from cli.engine import launch

    try:
        # Stopping `bea` stops git too, rather than leave it holding the config's lock.
        result = launch.run_captured(["git", "config", "--global", *arguments], stdin_closed=True)
    except OSError as exc:
        raise BeaError(f"Could not run git to change its global configuration ({exc}).") from exc
    if result.returncode not in accept:
        from cli.utils import single_line

        raise BeaError(f"git could not change its global configuration: {single_line(result.stderr.strip())}")
    return result.stdout


def configured_helpers(git_url: str) -> list[str]:
    """Every helper the global Git config lists for this address, in order."""
    # Exit 1 is "no such key"; `--null` keeps an empty value apart from no value.
    listed = _git_config("--null", "--get-all", _config_key(git_url), accept=(0, 1))
    return listed.split("\0")[:-1]


def install_helper(git_url: str) -> bool:
    """Register `bea` as the helper for `git_url` alone. False when it already was.

    Two values are written. The empty one resets Git's helper list for this
    address, so a Keychain or Git Credential Manager entry configured for every
    host cannot answer first with something stale; the second is `bea`.
    """
    wanted = ["", helper_command()]
    configured = configured_helpers(git_url)
    if configured[-2:] == wanted:
        return False
    remove_helper(git_url, configured)
    for value in wanted:
        _git_config("--add", _config_key(git_url), value)
    return True


def remove_helper(git_url: str, configured: list[str] | None = None) -> bool:
    """Take out exactly what `install_helper` wrote for `git_url`. False when nothing was there."""
    if configured is None:
        configured = configured_helpers(git_url)
    if not any(_OURS.search(value) for value in configured):
        return False
    # Exit 5 is "nothing matched", which a hand-edited section can produce.
    _git_config("--unset-all", _config_key(git_url), _OURS.pattern, accept=(0, 5))
    _git_config("--unset-all", _config_key(git_url), "^$", accept=(0, 5))
    return True


def require_self_hosted(client: AuthenticatedClient) -> None:
    """Refuse on the managed service, where Git signs in with an SSH key."""
    from cli.api.client import call, unwrap
    from cli.api.rest_client.api.ledger_v_1 import get_api_gateway_v1_feature_flags as feature_flags
    from cli.config import settings
    from cli.errors import UnreadableSuccess
    from cli.utils import single_line

    server = single_line(settings().api_url)
    try:
        flags = unwrap(call(feature_flags.sync_detailed, client=client))
    except UnreadableSuccess as exc:
        raise BeaError(
            f"{server} does not say whether it is self-hosted, so it cannot be set up as Git's sign-in. "
            "A self-hosted server needs updating to a release that reports it; the managed service uses SSH keys. "
            "Nothing was changed.",
            request_id=exc.request_id,
        ) from exc
    if not flags.self_host:
        raise BeaError(
            f"'bea cloud git setup' is for self-hosted servers, and {server} is the managed service, where Git "
            "signs in with an SSH key. Nothing was changed.",
            details=[
                "Add your public SSH key in the dashboard under Settings → SSH keys.",
                "Then clone with: bea cloud ledger clone <owner>/<name>",
            ],
        )


def first_ledger_address(client: AuthenticatedClient) -> str:
    """The server's Git address, read from the first ledger the account can reach.

    Every ledger on one server is cloned from the same address, and it can
    differ from the API's (`GIT_PUBLIC_URL`, a custom domain), so it is read
    from a ledger rather than guessed from `BEA_API_URL`.
    """
    from cli.api.client import call, unwrap
    from cli.api.rest_client.api.ledger_v_1 import accessible_ledgers

    ledgers = unwrap(call(accessible_ledgers.sync_detailed, client=client, limit=1))
    if not ledgers:
        raise UsageError(
            "This account has no ledger yet, and a ledger's address is how bea learns where this server serves "
            "Git. Create one with 'bea cloud ledger create <name>', then run 'bea cloud git setup' again. "
            "Nothing was changed."
        )
    return git_address(ledgers[0].http_url)


def _device_name() -> str:
    import socket

    try:
        name = socket.gethostname()
    except OSError:
        name = ""
    # Shown in the dashboard's token list: printable, and well inside the 200-character limit.
    name = re.sub(r"[^\x20-\x7e]", "", name).strip()[:100]
    return f"bea git on {name or 'this machine'}"


def mint_token(client: AuthenticatedClient, state: GitSignIn) -> None:
    """Mint this machine's Git token and store it, then retire the token it replaces."""
    from cli.api.client import call, unwrap
    from cli.api.rest_client.api.ledger_v_1 import post_api_gateway_v1_api_keys as mint_api_key
    from cli.api.rest_client.models.create_api_key import CreateApiKey
    from cli.api.rest_client.models.create_api_key_scopes_item import CreateApiKeyScopesItem

    expires_at = datetime.now(tz=UTC) + TOKEN_LIFETIME
    body = CreateApiKey(
        name=_device_name(),
        scopes=[CreateApiKeyScopesItem.LEDGER_READ, CreateApiKeyScopesItem.LEDGER_WRITE],
        expires_at=expires_at,
    )
    minted = unwrap(call(mint_api_key.sync_detailed, client=client, body=body))
    replaced = state.key_id
    state.key_id, state.key_name = minted.key.id, minted.key.name
    state.token, state.expires_at = minted.plaintext, expires_at.isoformat()
    save_state(state)
    if replaced:
        # A token Git reported as refused may only have been revoked or lapsed,
        # but if it is somehow still good, it must not outlive its replacement.
        try:
            revoke_token(client, replaced)
        except Exception:  # noqa: BLE001 - the new token is stored; the old one is best effort
            pass


def revoke_token(client: AuthenticatedClient, key_id: str) -> None:
    """Revoke a token `bea` minted. One that is already gone counts as revoked."""
    from cli.api.client import call, unwrap
    from cli.api.rest_client.api.ledger_v_1 import delete_api_gateway_v1_api_keys_id as revoke_api_key

    try:
        response = call(revoke_api_key.sync_detailed, key_id, client=client)
    except BeaError as exc:
        # A 404 whose body is not the v1 envelope surfaces from `call` itself.
        if exc.http_status == 404:
            return
        raise
    if response.status_code != 404:
        unwrap(response)


def try_revoke(client: AuthenticatedClient | None, state: GitSignIn) -> str | None:
    """Revoke the stored token for `logout` and `setup --undo`, which go on either way.

    Returns None when it is revoked, or there was none, and otherwise why it
    may still be alive. `client` is None when there is no session to revoke with.
    """
    from cli.errors import to_bea_error

    if not state.key_id:
        return None
    if client is None:
        return "there is no session for its server"
    try:
        revoke_token(client, state.key_id)
    except Exception as exc:  # noqa: BLE001 - the caller reports it and carries on
        return str(to_bea_error(exc)).rstrip(".")
    return None


def forget_token(state: GitSignIn, *, revoked: bool) -> None:
    """Drop the stored token, keeping the registration so the next login signs Git in again."""
    state.token = state.expires_at = None
    if revoked:
        state.key_id = state.key_name = None
    save_state(state)
