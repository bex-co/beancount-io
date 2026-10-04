"""`cloud ledger create --json` returns the same fields `show --json` does (w1/091).

The create and get responses share one schema; create used to emit a fixed
subset and drop `description`, `size`, `permissions` and `is_starred`.
Server responses are simulated with pytest-httpx.
"""

from __future__ import annotations

import json

import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.main import app

_API = "https://api.example"
_WIRE = {
    "id": "ledger-2",
    "name": "new2",
    "fullName": "alice/new2",
    "description": "日本語 desc",
    "httpUrl": "https://example.test/alice/new2",
    "sshUrl": "git@example.test:alice/new2.git",
    "private": False,
    "empty": True,
    "size": 0,
    "permissions": {"admin": True, "pull": True, "push": True},
    "isStarred": False,
    "createdAt": "2026-10-03T00:00:00Z",
    "updatedAt": "2026-10-03T00:00:00Z",
}


@pytest.fixture(autouse=True)
def _cloud(logged_in: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BEA_API_URL", _API)


def test_create_and_show_emit_the_same_record(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_WIRE)
    httpx_mock.add_response(method="GET", url=f"{_API}/api-gateway/v1/ledgers/alice/new2", json=_WIRE)
    runner = CliRunner()

    created = runner.invoke(app, ["--json", "cloud", "ledger", "create", "new2", "--public", "-d", "日本語 desc"])
    shown = runner.invoke(app, ["--json", "cloud", "ledger", "show", "alice/new2"])

    assert created.exit_code == 0, created.output
    assert shown.exit_code == 0, shown.output
    created_data = json.loads(created.stdout)["data"]
    shown_data = json.loads(shown.stdout)["data"]
    assert created_data == shown_data
    assert len(created_data) == 13
    assert created_data["description"] == "日本語 desc"
    assert created_data["permissions"] == {"admin": True, "pull": True, "push": True}
    assert created_data["is_starred"] is False
    assert created_data["size"] == 0
