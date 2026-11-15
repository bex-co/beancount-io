"""A ledger with no `sshUrl` is refused with a reason, never cloned another way (w1/m46).

A self-hosted stack that serves no Git over SSH returns `sshUrl: null`. `bea`
clones only over SSH, so it must stop with a message naming that cause instead
of handing git someone else's host or falling back to HTTPS.
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


def _ledger(ssh_url: str | None) -> dict[str, object]:
    return {
        "id": "alice/books",
        "name": "books",
        "fullName": "alice/books",
        "httpUrl": "https://git.example.test/alice/books.git",
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
    else:
        message = result.stderr
    assert "serves no Git over SSH" in message
    assert "git.example.test" not in message


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
