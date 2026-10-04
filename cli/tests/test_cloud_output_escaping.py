"""Hand-written cloud output escapes server strings like `show`/`list` do (w1/090).

Server responses are simulated with pytest-httpx. A raw ESC in the output
could clear the screen or retitle the terminal, and a raw newline could forge
an output line; `single_line` turns both into visible, inert text.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.main import app
from tests.conftest import GitRemote

_API = "https://api.example"
_CLEAR = "\x1b[2J\x1b[H"
_TITLE = "\x1b]0;title\x07"


@pytest.fixture(autouse=True)
def _cloud(logged_in: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BEA_API_URL", _API)


def _assert_inert(text: str) -> None:
    assert "\x1b" not in text
    assert "\x07" not in text
    assert not any(line.startswith("INJECT") for line in text.splitlines())


def test_status_escapes_profile_fields(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        method="GET",
        url=f"{_API}/api-gateway/v1/user-profile",
        json={
            "id": "u1",
            "email": f"q@x.invalid{_CLEAR}",
            "locale": "en",
            "username": f"alice{_TITLE}",
            "tier": "pro\nINJECT",
            "limits": {"ledgersUsed": 0, "ledgersMax": 1, "collaboratorsPerLedgerMax": 1, "maxDirectives": 100},
            "hasEverSubscribed": False,
        },
    )

    result = CliRunner().invoke(app, ["cloud", "status"])

    assert result.exit_code == 0, result.output
    _assert_inert(result.output)
    assert "Email:     q@x.invalid\\x1b[2J\\x1b[H" in result.stdout
    assert "Username:  alice\\x1b]0;title\\x07" in result.stdout
    assert "Tier:      pro INJECT" in result.stdout


def _ledger(**overrides: object) -> dict[str, object]:
    return {
        "id": "ledger-1",
        "name": "n1",
        "fullName": f"alice/n1{_TITLE}",
        "httpUrl": f"https://example.test/alice/n1{_CLEAR}",
        "sshUrl": "git@example.test:alice/n1.git",
        "private": True,
        "empty": True,
        "size": 0,
        "createdAt": "2026-10-03T00:00:00Z",
        "updatedAt": "2026-10-03T00:00:00Z",
        **overrides,
    }


def test_create_escapes_ledger_fields(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_ledger())

    result = CliRunner().invoke(app, ["cloud", "ledger", "create", "n1"])

    assert result.exit_code == 0, result.output
    _assert_inert(result.output)
    assert "fullName: alice/n1\\x1b]0;title\\x07" in result.stdout
    assert "httpUrl:  https://example.test/alice/n1\\x1b[2J\\x1b[H" in result.stdout


def test_clone_escapes_the_full_name(
    httpx_mock: HTTPXMock, git_remote: GitRemote, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.chdir(tmp_path)
    httpx_mock.add_response(
        method="GET",
        url=f"{_API}/api-gateway/v1/ledgers/alice/n1",
        json=_ledger(name="books", sshUrl=git_remote.url, fullName="alice/n1\nINJECT" + _TITLE),
    )

    result = CliRunner().invoke(app, ["cloud", "ledger", "clone", "alice/n1"])

    assert result.exit_code == 0, result.output
    _assert_inert(result.output)
    assert "Ledger 'alice/n1 INJECT\\x1b]0;title\\x07' cloned to" in result.stdout


def test_create_clone_failure_escapes_the_full_name(
    httpx_mock: HTTPXMock, git_remote: GitRemote, tmp_path: Path
) -> None:
    occupied = tmp_path / "occupied"
    occupied.mkdir()
    (occupied / "keep.txt").write_text("x\n")
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_ledger(sshUrl=git_remote.url))

    result = CliRunner().invoke(app, ["cloud", "ledger", "create", "n1", "--clone", "--dir", str(occupied)])

    assert result.exit_code == 1, result.output
    _assert_inert(result.output)
    assert "Ledger 'alice/n1\\x1b]0;title\\x07' was created but could not be cloned" in result.stderr
