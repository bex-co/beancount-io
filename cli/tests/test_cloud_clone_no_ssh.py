"""A ledger with no `sshUrl` is refused with a reason, never cloned another way (w1/m46).

A self-hosted stack that serves no Git over SSH returns `sshUrl: null`. `bea`
clones only over SSH, so it must stop with a message naming that cause instead
of handing git someone else's host or falling back to HTTPS itself. The reader
is usually the stack's operator, on a platform (bex) that cannot serve SSH, so
the refusal also says how to clone over HTTPS with git: `bea cloud git setup`
first, so Git signs in through bea (w22/m12), and a personal access token for
a machine without bea. It shows the clone command only for an address that is
plain https.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.main import app
from tests.conftest import GitRemote

_API = "https://api.example"


@pytest.fixture(autouse=True)
def _cloud(logged_in: None, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    monkeypatch.setenv("BEA_API_URL", _API)
    workdir = tmp_path / "work"
    workdir.mkdir()
    monkeypatch.chdir(workdir)
    return workdir


_HTTP_URL = "https://git.example.test/alice/books.git"


def _ledger(ssh_url: str | None, http_url: str = _HTTP_URL) -> dict[str, object]:
    return {
        "id": "alice/books",
        "name": "books",
        "fullName": "alice/books",
        "httpUrl": http_url,
        "sshUrl": ssh_url,
        "private": True,
        "empty": True,
        "size": 0,
        "createdAt": "2026-11-14T00:00:00Z",
        "updatedAt": "2026-11-14T00:00:00Z",
    }


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_clone_refuses_a_ledger_without_an_ssh_address(httpx_mock: HTTPXMock, _cloud: Path, json_output: bool) -> None:
    httpx_mock.add_response(method="GET", url=f"{_API}/api-gateway/v1/ledgers/alice/books", json=_ledger(None))

    result = CliRunner().invoke(app, [*(["--json"] if json_output else []), "cloud", "ledger", "clone", "alice/books"])

    assert result.exit_code == 1, result.output
    assert list(_cloud.iterdir()) == []
    # One lookup and nothing else: no second host, no HTTPS attempt.
    assert len(httpx_mock.get_requests()) == 1
    if json_output:
        assert result.stdout == ""
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "validation"
        message = error["message"]
        guidance = "\n".join(error["details"])
    else:
        message = guidance = result.stderr
    assert "this self-hosted server serves no Git over SSH" in message
    # The helper comes first and the clone command follows it; the token is the fallback.
    assert f"run 'bea cloud git setup' once, then: git clone {_HTTP_URL}" in guidance
    assert guidance.index("bea cloud git setup") < guidance.index("personal access token")
    assert "On a machine without bea, give git a personal access token as the password" in guidance
    assert "made in the dashboard under Settings → Personal access tokens" in guidance
    assert "ledger.read to clone, ledger.write to push" in guidance
    assert "A bex deployment cannot: bex routes no SSH." in guidance


@pytest.mark.parametrize(
    "http_url",
    [
        "http://git.example.test/alice/books.git",
        "https://user:secret@git.example.test/alice/books.git",
        "https://-oProxyCommand=evil/alice/books.git",
        "https://git.example.test/alice/books.git; rm -rf ~",
        "ext::sh -c touch% /tmp/pwned",
        "https://git.example.test/alice/books.git\x1b[2K",
    ],
    ids=["plain-http", "credentials", "dash-host", "shell", "ext", "control"],
)
def test_the_refusal_shows_no_clone_command_for_an_unsafe_address(
    httpx_mock: HTTPXMock, _cloud: Path, http_url: str
) -> None:
    httpx_mock.add_response(
        method="GET", url=f"{_API}/api-gateway/v1/ledgers/alice/books", json=_ledger(None, http_url=http_url)
    )

    result = CliRunner().invoke(app, ["--json", "cloud", "ledger", "clone", "alice/books"])

    assert result.exit_code == 1, result.output
    details = json.loads(result.stderr)["error"]["details"]
    # No command to paste: the address appears nowhere, only the field to read it from.
    assert not any(http_url in line or "git clone h" in line for line in details)
    assert details[0].endswith("then git clone its httpUrl (bea --json cloud ledger show prints it).")
    assert "bea cloud git setup" in details[0]
    assert list(_cloud.iterdir()) == []


def test_create_with_clone_reports_the_created_ledger_without_an_ssh_address(
    httpx_mock: HTTPXMock, _cloud: Path
) -> None:
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_ledger(None))

    result = CliRunner().invoke(app, ["--json", "cloud", "ledger", "create", "books", "--clone"])

    assert result.exit_code == 1, result.output
    assert list(_cloud.iterdir()) == []
    error = json.loads(result.stderr)["error"]
    assert "was created but was not cloned" in error["message"]
    assert "serves no Git over SSH" in error["message"]
    assert f"run 'bea cloud git setup' once, then: git clone {_HTTP_URL}" in error["details"][0]
    assert error["result"]["ssh_url"] is None


def test_create_shows_that_no_ssh_address_exists(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_ledger(None))

    result = CliRunner().invoke(app, ["cloud", "ledger", "create", "books"])

    assert result.exit_code == 0, result.output
    assert "sshUrl:   none (this deployment serves no Git over SSH)" in result.stdout


def test_a_ledger_with_an_ssh_address_still_clones(httpx_mock: HTTPXMock, git_remote: GitRemote, _cloud: Path) -> None:
    httpx_mock.add_response(
        method="GET", url=f"{_API}/api-gateway/v1/ledgers/alice/books", json=_ledger(git_remote.url)
    )

    result = CliRunner().invoke(app, ["cloud", "ledger", "clone", "alice/books"])

    assert result.exit_code == 0, result.output
    assert (_cloud / "books" / ".git").is_dir()
