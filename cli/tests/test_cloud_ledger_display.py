"""Ledger inspection renders people-friendly fields without changing JSON data."""

from __future__ import annotations

import json

import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.main import app


@pytest.mark.parametrize("private", [False, True])
@pytest.mark.parametrize("as_json", [False, True])
def test_ledger_show_formats_human_values_and_preserves_json(
    logged_in: None, monkeypatch: pytest.MonkeyPatch, httpx_mock: HTTPXMock, private: bool, as_json: bool
) -> None:
    monkeypatch.setenv("BEA_API_URL", "https://api.example")
    body = {
        "id": "alice/books",
        "name": "books",
        "fullName": "alice/books",
        "httpUrl": "https://example.test/alice/books.git",
        "sshUrl": "git@example.test:alice/books.git",
        "private": private,
        "empty": not private,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-02T00:00:00Z",
        "size": 144,
        "description": "",
        "permissions": {"admin": False, "pull": True, "push": private},
    }
    httpx_mock.add_response(method="GET", url="https://api.example/api-gateway/v1/ledgers/alice/books", json=body)

    result = CliRunner().invoke(app, [*(["--json"] if as_json else []), "cloud", "ledger", "show", "alice/books"])

    assert result.exit_code == 0, result.stderr
    assert result.stderr == ""
    if as_json:
        names = {
            "fullName": "full_name",
            "httpUrl": "http_url",
            "sshUrl": "ssh_url",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        }
        assert json.loads(result.stdout)["data"] == {names.get(key, key): value for key, value in body.items()}
    else:
        assert f"private: {'yes' if private else 'no'}\n" in result.stdout
        assert f"empty: {'no' if private else 'yes'}\n" in result.stdout
        assert f"permissions:\n  admin: no\n  pull: yes\n  push: {'yes' if private else 'no'}\n" in result.stdout
        assert "size: 144\n" in result.stdout
        assert "description: \n" in result.stdout
        assert "http_url: https://example.test/alice/books.git\n" in result.stdout
        assert "created_at: 2026-01-01T00:00:00Z\n" in result.stdout
        assert all(marker not in result.stdout for marker in ("True", "False", "{'"))
    request = httpx_mock.get_request()
    assert request is not None
    assert request.headers["Authorization"] == "Bearer test-token"
