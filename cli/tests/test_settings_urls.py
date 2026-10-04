"""`BEA_API_URL` / `BEA_DASHBOARD_URL`: empty means the default, malformed is a usage error (w1/059).

Before, an empty or scheme-less value reached httpx as the base URL and was
reported as "Could not reach the server (UnsupportedProtocol)" — a network
outage — with exit 1 and no mention of the variable.
"""

from __future__ import annotations

import json

import pytest
from typer.testing import CliRunner

from cli.config import settings
from cli.errors import UsageError
from cli.main import app

_MALFORMED = pytest.mark.parametrize(
    "value",
    ["api.example.invalid", "ftp://api.example.invalid", "http://[::1", "http://api.example.invalid:port", "https://"],
    ids=["scheme-less", "ftp", "bad-ipv6", "bad-port", "no-host"],
)


@pytest.mark.parametrize("variable", ["BEA_API_URL", "BEA_DASHBOARD_URL"])
def test_empty_value_means_the_default(monkeypatch: pytest.MonkeyPatch, variable: str) -> None:
    monkeypatch.setenv(variable, "")

    assert settings().api_url == "https://api.v3.beancount.io"
    assert settings().dashboard_url == "https://beancount.io"


def test_valid_values_are_kept(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BEA_API_URL", "http://127.0.0.1:8080")
    monkeypatch.setenv("BEA_DASHBOARD_URL", "https://dash.example.invalid/")

    assert settings().api_url == "http://127.0.0.1:8080"
    assert settings().dashboard_url == "https://dash.example.invalid/"


@_MALFORMED
@pytest.mark.parametrize("variable", ["BEA_API_URL", "BEA_DASHBOARD_URL"])
def test_malformed_value_names_the_variable(monkeypatch: pytest.MonkeyPatch, variable: str, value: str) -> None:
    monkeypatch.setenv(variable, value)

    with pytest.raises(UsageError, match=f"^{variable} must be an http\\(s\\) URL"):
        settings()


@_MALFORMED
@pytest.mark.parametrize("command", [["cloud", "status"], ["cloud", "ledger", "list"]], ids=["status", "ledger-list"])
@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_commands_exit_with_a_usage_error(
    monkeypatch: pytest.MonkeyPatch, value: str, command: list[str], json_output: bool
) -> None:
    monkeypatch.setenv("BEA_TOKEN", "synthetic-token")
    monkeypatch.setenv("BEA_API_URL", value)

    result = CliRunner().invoke(app, [*(["--json"] if json_output else []), *command])

    assert result.exit_code == 2, result.output
    assert result.stdout == ""
    assert "BEA_API_URL must be an http(s) URL" in result.stderr
    assert "Could not reach the server" not in result.stderr
    if json_output:
        assert json.loads(result.stderr)["error"]["category"] == "usage"
