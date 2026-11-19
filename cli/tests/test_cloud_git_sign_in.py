"""`bea cloud git`: Git signs in to a self-hosted server through bea, with nothing to paste (w22/m12).

`setup` registers `bea cloud git credential` as Git's helper for the server's
Git address alone and mints the personal access token Git is given; the helper
answers Git's protocol for that address and nothing else; `cloud logout`
revokes the token. The Git side is real: every test reads or drives the `git`
binary against a throwaway global config.
"""

from __future__ import annotations

import base64
import json
import os
import stat
import subprocess
import sys
import threading
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.auth.credentials import save_credentials
from cli.commands.cloud.git import helper
from cli.main import app

ROOT = Path(__file__).resolve().parents[1]
_API = "https://api.example"
_GIT = "https://git.example.test"
_LEDGER_URL = f"{_GIT}/alice/books.git"
_KEY = "credential.https://git.example.test.helper"
_SEEDED_CONFIG = "[user]\n\tname = Alice\n[credential]\n\thelper = store\n"


@pytest.fixture(autouse=True)
def git_config(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A global Git config that already names a helper for every host, as a real machine's does."""
    path = tmp_path / "gitconfig"
    path.write_text(_SEEDED_CONFIG)
    monkeypatch.setenv("GIT_CONFIG_GLOBAL", str(path))
    monkeypatch.setenv("GIT_CONFIG_NOSYSTEM", "1")
    monkeypatch.setenv("BEA_API_URL", _API)
    return path


@pytest.fixture
def signed_in() -> None:
    save_credentials("session-token", "2099-01-01T00:00:00+00:00")


def _git(*arguments: str) -> str:
    return subprocess.run(["git", "config", "--global", *arguments], capture_output=True, text=True).stdout


def _helper_for(url: str) -> str:
    return _git("--get-urlmatch", "credential.helper", url).strip()


def _ledger(http_url: str = _LEDGER_URL) -> dict[str, object]:
    return {
        "id": "alice/books",
        "name": "books",
        "fullName": "alice/books",
        "httpUrl": http_url,
        "sshUrl": None,
        "private": True,
        "empty": True,
        "size": 0,
        "createdAt": "2026-11-14T00:00:00Z",
        "updatedAt": "2026-11-14T00:00:00Z",
    }


def _flags(httpx_mock: HTTPXMock, **flags: bool) -> None:
    httpx_mock.add_response(
        method="GET",
        url=f"{_API}/api-gateway/v1/feature-flags",
        json={"spendingReportSubscription": False, "emailDelivery": False, **flags},
    )


def _ledgers(httpx_mock: HTTPXMock, *ledgers: dict[str, object]) -> None:
    httpx_mock.add_response(method="GET", url=f"{_API}/api-gateway/v1/ledgers?limit=1", json=list(ledgers))


def _mint(httpx_mock: HTTPXMock, key_id: str = "key_1", plaintext: str = "bcio_minted") -> None:
    httpx_mock.add_response(
        method="POST",
        url=f"{_API}/api-gateway/v1/api-keys",
        json={
            "key": {
                "id": key_id,
                "name": "bea git on laptop",
                "keyPrefix": plaintext[:13],
                "scopes": ["ledger.read", "ledger.write"],
                "createdAt": "2026-11-18T00:00:00Z",
            },
            "plaintext": plaintext,
        },
    )


def _revoke(httpx_mock: HTTPXMock, key_id: str = "key_1") -> None:
    httpx_mock.add_response(
        method="DELETE",
        url=f"{_API}/api-gateway/v1/api-keys/{key_id}",
        json={
            "id": key_id,
            "name": "bea git on laptop",
            "keyPrefix": "bcio_minted",
            "scopes": ["ledger.read", "ledger.write"],
            "createdAt": "2026-11-18T00:00:00Z",
            "revokedAt": "2026-11-18T01:00:00Z",
        },
    )


def _self_hosted(httpx_mock: HTTPXMock) -> None:
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock, _ledger())
    _mint(httpx_mock)


def _setup(*arguments: str, json_output: bool = False) -> object:
    return CliRunner().invoke(app, [*(["--json"] if json_output else []), "cloud", "git", "setup", *arguments])


def _stored(**changes: str | None) -> helper.GitSignIn:
    """A registration as `setup` leaves it, with a token good for another month."""
    state = helper.GitSignIn(
        api_url=_API,
        git_url=_GIT,
        key_id="key_1",
        key_name="bea git on laptop",
        token="bcio_stored",
        expires_at=(datetime.now(tz=UTC) + timedelta(days=30)).isoformat(),
    )
    for name, value in changes.items():
        setattr(state, name, value)
    helper.save_state(state)
    return state


def _credential(operation: str, request: str) -> object:
    return CliRunner().invoke(app, ["cloud", "git", "credential", operation], input=request)


_REQUEST = "protocol=https\nhost=git.example.test\n\n"


# --- setup -----------------------------------------------------------------


def test_setup_registers_bea_for_the_servers_git_address_and_no_other(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path
) -> None:
    _self_hosted(httpx_mock)

    result = _setup()

    assert result.exit_code == 0, result.output
    assert _helper_for(_LEDGER_URL).endswith(" cloud git credential")
    # The helper list for this address starts over, so the machine-wide
    # `store` cannot answer first with a stale password; other hosts keep it.
    assert _git("--get-all", _KEY).splitlines()[0] == ""
    assert _helper_for("https://github.com/alice/books.git") == "store"
    assert git_config.read_text().startswith(_SEEDED_CONFIG)
    assert "bcio_minted" not in result.output


def test_setup_mints_a_ledger_only_token_with_an_expiry_and_keeps_it_private(
    httpx_mock: HTTPXMock, signed_in: None
) -> None:
    _self_hosted(httpx_mock)

    result = _setup(json_output=True)

    assert result.exit_code == 0, result.output
    (minted,) = [r for r in httpx_mock.get_requests() if r.method == "POST"]
    assert minted.headers["authorization"] == "Bearer session-token"
    body = json.loads(minted.content)
    assert body["scopes"] == ["ledger.read", "ledger.write"]
    assert body["name"].startswith("bea git on ")
    lifetime = datetime.fromisoformat(body["expiresAt"]) - datetime.now(tz=UTC)
    assert timedelta(days=89) < lifetime <= timedelta(days=90)
    assert stat.S_IMODE(helper.state_path().stat().st_mode) == 0o600
    state = helper.load_state()
    assert state is not None and (state.token, state.key_id, state.git_url) == ("bcio_minted", "key_1", _GIT)
    data = json.loads(result.stdout)["data"]
    assert data["git_url"] == _GIT and data["config_changed"] is True
    assert data["token"]["id"] == "key_1" and data["token"]["minted"] is True
    assert "bcio_minted" not in result.stdout


def test_setup_twice_changes_nothing_and_mints_nothing(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path
) -> None:
    _self_hosted(httpx_mock)
    assert _setup().exit_code == 0
    after_first = git_config.read_text()
    # The second run asks the server the same two questions and mints no token:
    # an unexpected POST would have no response registered and fail the run.
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock, _ledger())

    result = _setup()

    assert result.exit_code == 0, result.output
    assert "nothing changed" in result.stdout
    assert git_config.read_text() == after_first
    assert sum(r.method == "POST" for r in httpx_mock.get_requests()) == 1


def test_undo_removes_exactly_what_setup_wrote_and_revokes_the_token(httpx_mock: HTTPXMock, signed_in: None) -> None:
    before = _git("--list")
    _self_hosted(httpx_mock)
    assert _setup().exit_code == 0
    assert _git("--list") != before
    _revoke(httpx_mock)

    result = _setup("--undo")

    assert result.exit_code == 0, result.output
    assert _git("--list") == before
    assert not helper.state_path().exists()
    assert [r.method for r in httpx_mock.get_requests()][-1] == "DELETE"


def test_undo_signed_out_still_removes_the_local_setup_and_names_the_live_token(git_config: Path) -> None:
    helper.install_helper(_GIT)
    _stored()

    result = _setup("--undo")

    assert result.exit_code == 1, result.output
    assert "'bea git on laptop' could not be revoked" in result.stderr
    assert "Settings → Personal access tokens" in result.stderr
    assert git_config.read_text() == _SEEDED_CONFIG
    assert not helper.state_path().exists()


_USERS_OWN = ["", "store --file ~/.git-example-store"]
"""The user's own helpers for the address before `setup`: Git's documented reset, then their helper."""


def _values() -> list[str]:
    """Every helper value the global config lists for the address, in order; an empty one kept apart."""
    return _git("--null", "--get-all", _KEY).split("\0")[:-1]


def _seed(*values: str) -> None:
    for value in values:
        _git("--add", _KEY, value)


def test_undo_leaves_the_users_own_reset_and_helper_for_the_address(httpx_mock: HTTPXMock, signed_in: None) -> None:
    """w1/310: `--undo` used to delete every empty value, the user's reset included."""
    _seed(*_USERS_OWN)
    _self_hosted(httpx_mock)
    assert _setup().exit_code == 0
    assert _values()[:2] == _USERS_OWN and len(_values()) == 4
    _revoke(httpx_mock)

    result = _setup("--undo")

    assert result.exit_code == 0, result.output
    # The machine-wide `store` stays reset for this address, as the user had it.
    assert _values() == _USERS_OWN


def test_setup_from_another_bea_path_replaces_only_its_own_pair(monkeypatch: pytest.MonkeyPatch) -> None:
    _seed(*_USERS_OWN)
    monkeypatch.setattr(helper, "helper_command", lambda: "!/old/bin/bea cloud git credential")
    assert helper.install_helper(_GIT)
    monkeypatch.setattr(helper, "helper_command", lambda: "!/new/bin/bea cloud git credential")

    assert helper.install_helper(_GIT)

    assert _values() == [*_USERS_OWN, "", "!/new/bin/bea cloud git credential"]


_BEA_X = "!/x/bea cloud git credential"
_BEA_Y = "!/y/bea cloud git credential"


@pytest.mark.parametrize(
    ("configured", "kept"),
    [
        (["", "", _BEA_X], [""]),
        (["store", _BEA_X], ["store"]),
        (["", "store", "", _BEA_X, "", "osxkeychain"], ["", "store", "", "osxkeychain"]),
        (["", "", _BEA_X, "", _BEA_Y], [""]),
        (["", "", _BEA_X, _BEA_Y], [""]),
    ],
    ids=["user-reset-before-the-pair", "bea-without-its-reset", "user-values-after-the-pair", "two-pairs", "two-paths"],
)
def test_undo_takes_out_each_bea_value_and_the_reset_just_before_it(configured: list[str], kept: list[str]) -> None:
    _seed(*configured)

    assert helper.remove_helper(_GIT)

    assert _values() == kept


def test_undo_without_a_bea_value_changes_nothing(git_config: Path) -> None:
    _seed(*_USERS_OWN)
    before = git_config.read_text()

    assert not helper.remove_helper(_GIT)

    assert git_config.read_text() == before


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_setup_refuses_on_the_managed_service_and_points_at_ssh_keys(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path, json_output: bool
) -> None:
    _flags(httpx_mock, selfHost=False)

    result = _setup(json_output=json_output)

    assert result.exit_code == 1, result.output
    assert result.stdout == ""
    text = "\n".join(json.loads(result.stderr)["error"]["details"]) if json_output else result.stderr
    assert "Settings → SSH keys" in text
    assert "bea cloud ledger clone" in text
    assert "managed service" in result.stderr
    # One read, no token, and Git untouched.
    assert [r.method for r in httpx_mock.get_requests()] == ["GET"]
    assert git_config.read_text() == _SEEDED_CONFIG
    assert not helper.state_path().exists()


def test_setup_refuses_a_server_that_does_not_say_it_is_self_hosted(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path
) -> None:
    _flags(httpx_mock)  # a server from before the flag existed

    result = _setup()

    assert result.exit_code == 1, result.output
    assert "does not say whether it is self-hosted" in result.stderr
    assert git_config.read_text() == _SEEDED_CONFIG


def test_setup_signed_out_is_an_auth_error_that_changes_nothing(git_config: Path) -> None:
    result = _setup()

    assert result.exit_code == 3, result.output
    assert "bea cloud login" in result.stderr
    assert git_config.read_text() == _SEEDED_CONFIG


def test_setup_without_a_ledger_says_how_to_get_an_address(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path
) -> None:
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock)

    result = _setup()

    assert result.exit_code == 2, result.output
    assert "bea cloud ledger create" in result.stderr
    assert git_config.read_text() == _SEEDED_CONFIG


@pytest.mark.parametrize(
    "http_url",
    [
        "http://git.example.test/alice/books.git",
        "https://user:secret@git.example.test/alice/books.git",
        "https://-oProxyCommand=evil/alice/books.git",
        "ext::sh -c touch% /tmp/pwned",
        "https://git.example.test\x1b[2K/alice/books.git",
    ],
    ids=["plain-http", "credentials", "dash-host", "ext", "control"],
)
def test_setup_registers_nothing_for_an_address_that_is_not_plain_https(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path, http_url: str
) -> None:
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock, _ledger(http_url))

    result = _setup()

    assert result.exit_code == 1, result.output
    assert "refusing to register a credential helper" in result.stderr
    assert "\x1b" not in result.stderr
    assert git_config.read_text() == _SEEDED_CONFIG
    assert not helper.state_path().exists()


def test_setup_leaves_git_alone_when_the_server_refuses_the_token(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path
) -> None:
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock, _ledger())
    httpx_mock.add_response(
        method="POST",
        url=f"{_API}/api-gateway/v1/api-keys",
        status_code=403,
        json={"ok": False, "error": {"code": "FORBIDDEN", "message": "An API key cannot mint another API key."}},
    )

    result = _setup()

    assert result.exit_code == 3, result.output
    assert "An API key cannot mint another API key" in result.stderr
    assert git_config.read_text() == _SEEDED_CONFIG
    assert not helper.state_path().exists()


def test_setup_refuses_a_second_server_instead_of_orphaning_the_first(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path
) -> None:
    _stored(api_url="https://other-api.example", git_url="https://git.other.test")
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock, _ledger())

    result = _setup()

    assert result.exit_code == 2, result.output
    assert "https://git.other.test" in result.stderr and "--undo" in result.stderr
    assert git_config.read_text() == _SEEDED_CONFIG


def test_a_local_server_may_use_plain_http_and_keeps_its_port() -> None:
    assert helper.git_address("http://localhost:3000/alice/books.git") == "http://localhost:3000"
    assert helper.git_address("https://git.example.test:8443/alice/books.git") == "https://git.example.test:8443"


# --- credential ------------------------------------------------------------


def test_get_answers_gits_protocol_for_the_registered_address() -> None:
    _stored()

    result = _credential("get", _REQUEST)

    assert result.exit_code == 0
    assert result.stdout == "username=bea\npassword=bcio_stored\n"


def test_get_keeps_the_username_git_already_has() -> None:
    _stored()

    result = _credential("get", "protocol=https\nhost=git.example.test\nusername=alice\n\n")

    assert result.stdout == "username=alice\npassword=bcio_stored\n"


@pytest.mark.parametrize(
    "request_text",
    [
        "protocol=https\nhost=github.com\n\n",
        "protocol=http\nhost=git.example.test\n\n",
        "protocol=https\nhost=git.example.test:8443\n\n",
        "",
    ],
    ids=["other-host", "other-protocol", "other-port", "no-request"],
)
def test_get_says_nothing_for_any_other_address(request_text: str) -> None:
    _stored()

    result = _credential("get", request_text)

    assert (result.exit_code, result.stdout, result.stderr) == (0, "", "")


def test_get_says_nothing_when_setup_never_ran() -> None:
    result = _credential("get", _REQUEST)

    assert (result.exit_code, result.stdout) == (0, "")


def test_get_says_nothing_when_bea_points_at_another_server(monkeypatch: pytest.MonkeyPatch) -> None:
    _stored()
    monkeypatch.setenv("BEA_API_URL", "https://other-api.example")

    result = _credential("get", _REQUEST)

    assert (result.exit_code, result.stdout) == (0, "")


def test_get_mints_a_new_token_when_the_old_one_lapsed_and_retires_the_old_one(
    httpx_mock: HTTPXMock, signed_in: None
) -> None:
    _stored(expires_at=(datetime.now(tz=UTC) - timedelta(hours=1)).isoformat())
    _mint(httpx_mock, key_id="key_2", plaintext="bcio_second")
    _revoke(httpx_mock, key_id="key_1")

    result = _credential("get", _REQUEST)

    assert result.exit_code == 0, result.output
    assert result.stdout == "username=bea\npassword=bcio_second\n"
    state = helper.load_state()
    assert state is not None and (state.key_id, state.token) == ("key_2", "bcio_second")


def test_get_signed_out_gives_git_nothing_and_says_why_on_stderr() -> None:
    _stored(token=None, expires_at=None)

    result = _credential("get", _REQUEST)

    assert (result.exit_code, result.stdout) == (0, "")
    assert "bea cloud login" in result.stderr


def test_get_keeps_stdout_empty_when_the_server_cannot_mint(httpx_mock: HTTPXMock, signed_in: None) -> None:
    _stored(token=None, expires_at=None)
    httpx_mock.add_exception(httpx.ConnectError("refused"), method="POST")

    result = _credential("get", _REQUEST)

    # Exit 0 and one stderr line: Git goes on to its own prompt.
    assert (result.exit_code, result.stdout) == (0, "")
    assert result.stderr.startswith("bea: ") and result.stderr.count("\n") == 1


def test_erase_forgets_the_refused_token_but_keeps_its_id_to_revoke_later() -> None:
    _stored()

    result = _credential("erase", "protocol=https\nhost=git.example.test\nusername=bea\npassword=bcio_stored\n\n")

    assert (result.exit_code, result.stdout) == (0, "")
    state = helper.load_state()
    assert state is not None and (state.token, state.key_id) == (None, "key_1")


def test_erase_of_some_other_password_keeps_the_stored_token() -> None:
    _stored()

    _credential("erase", "protocol=https\nhost=git.example.test\nusername=bea\npassword=typed-by-hand\n\n")

    state = helper.load_state()
    assert state is not None and state.token == "bcio_stored"


def test_store_and_unknown_operations_do_nothing() -> None:
    before = _stored()

    for operation in ("store", "capability"):
        result = _credential(operation, "protocol=https\nhost=git.example.test\npassword=x\n\n")
        assert (result.exit_code, result.stdout) == (0, "")
    assert helper.load_state() == before


def test_the_credential_command_is_not_listed_for_people() -> None:
    listing = CliRunner().invoke(app, ["cloud", "git", "--help"]).stdout

    assert "setup" in listing and "credential" not in listing.split("Commands:")[1]


# --- logout ----------------------------------------------------------------


def test_logout_revokes_the_git_token_before_the_session_and_forgets_it(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path
) -> None:
    helper.install_helper(_GIT)
    configured = git_config.read_text()
    _stored()
    _revoke(httpx_mock)
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/logout", json={"success": True})

    result = CliRunner().invoke(app, ["cloud", "logout"])

    assert result.exit_code == 0, result.output
    # The session revokes the token, so the token goes first.
    assert [(r.method, r.url.path) for r in httpx_mock.get_requests()] == [
        ("DELETE", "/api-gateway/v1/api-keys/key_1"),
        ("POST", "/api-gateway/v1/logout"),
    ]
    state = helper.load_state()
    assert state is not None and (state.token, state.key_id) == (None, None)
    # The registration stays, so the helper answers nothing and Git prompts.
    assert git_config.read_text() == configured
    assert _credential("get", _REQUEST).stdout == ""


def test_logout_with_the_server_unreachable_clears_local_state_and_names_the_token(
    httpx_mock: HTTPXMock, signed_in: None
) -> None:
    from cli.config import credentials_path

    _stored()
    httpx_mock.add_exception(httpx.ConnectError("refused"), is_reusable=True)

    result = CliRunner().invoke(app, ["cloud", "logout"])

    assert result.exit_code == 1, result.output
    assert "Removed the local credential" in result.stderr
    assert "the Git token 'bea git on laptop' could not be revoked" in result.stderr
    assert "Settings → Personal access tokens" in result.stderr
    assert not credentials_path().exists()
    state = helper.load_state()
    # Gone from this disk, and its id kept so a later login can still retire it.
    assert state is not None and (state.token, state.key_id) == (None, "key_1")
    # Signed out now, and nothing left to remove: a second logout succeeds (w1/311).
    again = CliRunner().invoke(app, ["cloud", "logout"])
    assert (again.exit_code, again.stdout) == (0, "Already logged out.\n"), again.output
    assert helper.load_state() == state


def test_signed_out_logout_that_only_remembers_the_tokens_id_succeeds_and_says_how_to_retire_it() -> None:
    # What a logout that could not revoke the token leaves behind, or Git's erase (w1/311).
    before = _stored(token=None, expires_at=None)

    for _ in range(2):
        result = CliRunner().invoke(app, ["cloud", "logout"])

        assert (result.exit_code, result.stdout) == (0, "Already logged out.\n"), result.output
        assert result.stderr.count("\n") == 1
        assert "The Git token 'bea git on laptop' may still be valid" in result.stderr
        assert "Settings → Personal access tokens" in result.stderr
        assert "'bea cloud login' then 'bea cloud logout'" in result.stderr
        # The id stays, so a signed-in logout or the next mint still revokes it.
        assert helper.load_state() == before

    result = CliRunner().invoke(app, ["--json", "cloud", "logout"])

    assert (result.exit_code, result.stdout, result.stderr) == (0, "", "")
    assert helper.load_state() == before


def test_signed_out_logout_with_the_token_still_stored_removes_it_and_fails_once() -> None:
    _stored()

    result = CliRunner().invoke(app, ["cloud", "logout"])

    # A live secret left this disk unrevoked: that is a failure to report.
    assert result.exit_code == 1, result.output
    assert "Already logged out, but the Git token 'bea git on laptop' could not be revoked" in result.stderr
    state = helper.load_state()
    assert state is not None and (state.token, state.key_id) == (None, "key_1")
    # The next run has nothing left to remove.
    assert CliRunner().invoke(app, ["cloud", "logout"]).exit_code == 0


def test_logout_treats_a_token_the_server_no_longer_has_as_revoked(httpx_mock: HTTPXMock, signed_in: None) -> None:
    _stored()
    httpx_mock.add_response(
        method="DELETE",
        url=f"{_API}/api-gateway/v1/api-keys/key_1",
        status_code=404,
        json={"ok": False, "error": {"code": "NOT_FOUND", "message": "API key not found"}},
    )
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/logout", json={"success": True})

    result = CliRunner().invoke(app, ["cloud", "logout"])

    assert result.exit_code == 0, result.output
    assert "Logged out." in result.stdout


def test_logout_leaves_another_servers_git_token_alone(httpx_mock: HTTPXMock, signed_in: None) -> None:
    before = _stored(api_url="https://other-api.example")
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/logout", json={"success": True})

    result = CliRunner().invoke(app, ["cloud", "logout"])

    assert result.exit_code == 0, result.output
    assert helper.load_state() == before


# --- one server, however it is spelled (w1/294) ------------------------------


@pytest.mark.parametrize("host", ["Git.Example.TEST", "git.example.test:443"], ids=["capitals", "default-port"])
def test_get_answers_whatever_case_and_default_port_git_spells_the_host(host: str) -> None:
    # Git runs the helper for these, since its config match ignores both, then
    # sends the host exactly as the URL spells it.
    _stored()

    result = _credential("get", f"protocol=https\nhost={host}\n\n")

    assert (result.exit_code, result.stdout, result.stderr) == (0, "username=bea\npassword=bcio_stored\n", "")


_RESPELLED_API = [f"{_API}/", "https://API.example", "https://api.example:443/"]


@pytest.mark.parametrize("api_url", _RESPELLED_API, ids=["trailing-slash", "capitals", "default-port"])
def test_get_answers_when_bea_api_url_names_the_same_server_another_way(
    api_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    _stored()
    monkeypatch.setenv("BEA_API_URL", api_url)

    result = _credential("get", _REQUEST)

    assert (result.exit_code, result.stdout) == (0, "username=bea\npassword=bcio_stored\n")


@pytest.mark.parametrize("api_url", _RESPELLED_API, ids=["trailing-slash", "capitals", "default-port"])
def test_logout_signs_git_out_when_bea_api_url_names_the_same_server_another_way(
    api_url: str, httpx_mock: HTTPXMock, signed_in: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    _stored()
    monkeypatch.setenv("BEA_API_URL", api_url)
    _revoke(httpx_mock)
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/logout", json={"success": True})

    result = CliRunner().invoke(app, ["cloud", "logout"])

    assert result.exit_code == 0, result.output
    assert [(r.method, r.url.path) for r in httpx_mock.get_requests()] == [
        ("DELETE", "/api-gateway/v1/api-keys/key_1"),
        ("POST", "/api-gateway/v1/logout"),
    ]
    state = helper.load_state()
    assert state is not None and (state.token, state.key_id) == (None, None)


def test_undo_revokes_the_token_when_bea_api_url_gains_a_trailing_slash(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    helper.install_helper(_GIT)
    _stored()
    monkeypatch.setenv("BEA_API_URL", f"{_API}/")
    _revoke(httpx_mock)

    result = _setup("--undo")

    assert result.exit_code == 0, result.output
    assert "its token is revoked" in result.stdout
    assert git_config.read_text() == _SEEDED_CONFIG
    assert not helper.state_path().exists()


def test_get_mints_when_the_token_lapsed_and_bea_api_url_gains_a_trailing_slash(
    httpx_mock: HTTPXMock, signed_in: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    _stored(expires_at=(datetime.now(tz=UTC) - timedelta(hours=1)).isoformat())
    monkeypatch.setenv("BEA_API_URL", f"{_API}/")
    _mint(httpx_mock, key_id="key_2", plaintext="bcio_second")
    _revoke(httpx_mock, key_id="key_1")

    result = _credential("get", _REQUEST)

    assert (result.exit_code, result.stdout) == (0, "username=bea\npassword=bcio_second\n"), result.stderr


def test_setup_stores_the_server_once_however_bea_api_url_spells_it(
    httpx_mock: HTTPXMock, signed_in: None, git_config: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("BEA_API_URL", "https://API.example/")
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock, _ledger("https://Git.Example.test:443/alice/books.git"))
    _mint(httpx_mock)
    assert _setup().exit_code == 0
    state = helper.load_state()
    assert state is not None and (state.api_url, state.git_url) == (_API, _GIT)
    assert _helper_for(f"{_GIT}/alice/books.git").endswith(" cloud git credential")
    # Run again under the exact spelling: the same server, not "another server".
    after_first = git_config.read_text()
    monkeypatch.setenv("BEA_API_URL", _API)
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock, _ledger())

    result = _setup()

    assert result.exit_code == 0, result.output
    assert "nothing changed" in result.stdout
    assert git_config.read_text() == after_first


def test_setup_accepts_a_registration_stored_under_another_spelling(
    httpx_mock: HTTPXMock, signed_in: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    _stored(api_url=f"{_API}/")
    monkeypatch.setenv("BEA_API_URL", "https://API.example")
    _flags(httpx_mock, selfHost=True)
    _ledgers(httpx_mock, _ledger())

    result = _setup()

    assert result.exit_code == 0, result.output
    assert "another server" not in result.stderr


@pytest.mark.parametrize(
    ("url", "other"),
    [
        ("https://api.example", "https://other-api.example"),
        ("https://api.example", "https://api.example:8443"),
        ("https://api.example", "http://api.example"),
        ("https://api.example/v1", "https://api.example/v2"),
        ("https://api.example", "https://alice@api.example"),
        ("https://api.example", "not a url"),
        ("not a url", "not a url"),
    ],
)
def test_another_host_port_scheme_path_or_user_stays_another_server(url: str, other: str) -> None:
    assert not helper.same_server(url, other)


def test_a_ledgers_git_address_is_stored_lower_case_without_its_default_port() -> None:
    assert helper.git_address("https://Git.Example.test:443/alice/books.git") == _GIT
    assert helper.git_address("http://LOCALHOST:80/alice/books.git") == "http://localhost"
    assert helper.git_address("https://[::1]:8443/alice/books.git") == "https://[::1]:8443"


# --- Git itself ------------------------------------------------------------


@pytest.fixture
def basic_auth_server() -> Iterator[tuple[str, list[str | None]]]:
    """An HTTP server that wants Basic auth, as the Git proxy does, and records what it was sent."""
    seen: list[str | None] = []

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler's spelling
            authorization = self.headers.get("Authorization")
            seen.append(authorization)
            self.send_response(404 if authorization else 401)
            if not authorization:
                self.send_header("WWW-Authenticate", 'Basic realm="Git"')
            self.send_header("Content-Length", "0")
            self.end_headers()

        def log_message(self, *args: object) -> None:
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    worker = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
    worker.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}", seen
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=5)


def test_git_sends_the_token_bea_hands_it_without_prompting(
    basic_auth_server: tuple[str, list[str | None]], git_config: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The whole path with nothing stubbed on Git's side: its config, its helper call, its request."""
    git_url, seen = basic_auth_server
    monkeypatch.setattr(helper, "helper_command", lambda: f"!{sys.executable} -m cli.main cloud git credential")
    helper.install_helper(git_url)
    _stored(git_url=git_url)
    env = {key: value for key, value in os.environ.items() if not key.lower().endswith("_proxy")}
    env.update(PYTHONPATH=str(ROOT / "src"), GIT_TERMINAL_PROMPT="0", NO_PROXY="*", BEA_NO_UPDATE_NOTIFIER="1")

    done = subprocess.run(
        ["git", "ls-remote", f"{git_url}/alice/books.git"],
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )

    # The stub is no Git server, so the listing fails; what matters is that Git
    # came back with the token instead of stopping at a prompt it may not show.
    assert "terminal prompts disabled" not in done.stderr, done.stderr
    assert seen[0] is None
    assert seen[1] == "Basic " + base64.b64encode(b"bea:bcio_stored").decode()


@pytest.mark.parametrize(
    "url",
    [
        f"{_GIT}/alice/books.git",
        "https://Git.Example.TEST/alice/books.git",
        "https://git.example.test:443/alice/books.git",
    ],
    ids=["as-registered", "capitals", "default-port"],
)
def test_git_gets_the_token_however_the_clone_url_spells_the_registered_host(
    url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Git's own config match and request for each spelling, with nothing stubbed on Git's side (w1/294)."""
    monkeypatch.setattr(helper, "helper_command", lambda: f"!{sys.executable} -m cli.main cloud git credential")
    helper.install_helper(_GIT)
    _stored()
    env = {**os.environ, "PYTHONPATH": str(ROOT / "src"), "GIT_TERMINAL_PROMPT": "0", "BEA_NO_UPDATE_NOTIFIER": "1"}

    done = subprocess.run(
        ["git", "credential", "fill"],
        input=f"url={url}\n\n",
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )

    assert done.returncode == 0, done.stderr
    assert "password=bcio_stored\n" in done.stdout
