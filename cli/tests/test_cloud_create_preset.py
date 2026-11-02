"""`cloud ledger create --preset` sends the setup spec and a requestId (w3/m53/t004)."""

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
    "description": None,
    "httpUrl": "https://example.test/alice/new2",
    "sshUrl": "git@example.test:alice/new2.git",
    "private": True,
    "empty": True,
    "size": 0,
    "createdAt": "2026-10-03T00:00:00Z",
    "updatedAt": "2026-10-03T00:00:00Z",
}


@pytest.fixture(autouse=True)
def _cloud(logged_in: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BEA_API_URL", _API)


def test_create_with_preset_sends_setup_and_request_id(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_WIRE)
    result = CliRunner().invoke(
        app,
        [
            "--json",
            "cloud",
            "ledger",
            "create",
            "new2",
            "--preset",
            "personal@1",
            "--currency",
            "EUR",
            "--date",
            "2026-02-01",
        ],
    )
    assert result.exit_code == 0, result.output
    body = json.loads(httpx_mock.get_requests()[0].content)
    assert body["setup"]["preset"] == "personal@1"
    assert body["setup"]["operatingCurrency"] == "EUR"
    assert body["setup"]["historyStart"] == "2026-02-01"
    assert body["requestId"]


def test_create_without_preset_sends_request_id_only(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_WIRE)
    result = CliRunner().invoke(app, ["--json", "cloud", "ledger", "create", "new2"])
    assert result.exit_code == 0, result.output
    body = json.loads(httpx_mock.get_requests()[0].content)
    assert "setup" not in body or body["setup"] is None
    assert body["requestId"]


def test_create_rejects_unknown_preset_before_any_request(httpx_mock: HTTPXMock) -> None:
    result = CliRunner().invoke(app, ["--json", "cloud", "ledger", "create", "new2", "--preset", "nope@1"])
    assert result.exit_code != 0
    assert httpx_mock.get_requests() == []


def test_create_with_modules_sends_them_in_setup(httpx_mock: HTTPXMock) -> None:
    """`--module` and `--property-name` ride in `setup.modules` (w3/m59/t003)."""
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_WIRE)
    result = CliRunner().invoke(
        app,
        [
            "--json",
            "cloud",
            "ledger",
            "create",
            "new2",
            "--preset",
            "personal@1",
            "--module",
            "investments@1",
            "--module",
            "rental-property@1",
            "--property-name",
            "OakSt",
        ],
    )
    assert result.exit_code == 0, result.output
    body = json.loads(httpx_mock.get_requests()[0].content)
    assert body["setup"]["modules"] == [
        {"id": "investments@1"},
        {"id": "rental-property@1", "propertyName": "OakSt"},
    ]


def test_create_without_modules_sends_no_modules_key(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_WIRE)
    result = CliRunner().invoke(app, ["--json", "cloud", "ledger", "create", "new2", "--preset", "personal@1"])
    assert result.exit_code == 0, result.output
    assert "modules" not in json.loads(httpx_mock.get_requests()[0].content)["setup"]


@pytest.mark.parametrize(
    ("args", "reason"),
    [
        (["--module", "investments@1"], "add --preset personal@1"),
        (["--preset", "freelance@1", "--module", "investments@1"], "accepted only with --preset personal@1"),
        (["--preset", "personal@1", "--module", "crypto@1"], "Unknown module"),
        (["--preset", "personal@1", "--module", "investments@1", "--module", "investments@1"], "more than once"),
        (["--preset", "personal@1", "--property-name", "OakSt"], "add --module rental-property@1"),
    ],
)
def test_create_refuses_a_bad_module_selection_before_any_request(
    httpx_mock: HTTPXMock, args: list[str], reason: str
) -> None:
    result = CliRunner().invoke(app, ["--json", "cloud", "ledger", "create", "new2", *args])
    assert result.exit_code == 2, result.output
    # The reason, not merely exit 2: an unknown option exits 2 as well.
    assert reason in result.output
    assert httpx_mock.get_requests() == []
