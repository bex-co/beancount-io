"""`bea ask` reports a rejected credential like every other command (w3/381).

`ask` without credentials exits 3 with "Not logged in…". `ask` with a
*rejected* credential — same meaning, same remedy — exited **1** with the AI
SDK's raw exception string, including the proxy's internal model name:

    Error: status_code: 401, model_name: gpt-4o, body: {'code': …}

So a script branching on exit 3 to re-login never fired. `ask` speaks the
OpenAI protocol through the AI SDK rather than through `cli.api.client`, so it
never met the 401/403 → `AuthError` mapping in `error_from_status` that the
exit table is written against.

**Simulation.** These raise `ModelHTTPError` at the SDK boundary instead of
calling the hosted service, so what they pin is bea's translation of a proxy
rejection, not the proxy's behavior. The live rejection this mirrors was
reproduced by hand against the real endpoint with `BEA_TOKEN=bogus-token-xyz`.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest
from pydantic_ai.exceptions import ModelHTTPError
from typer.testing import CliRunner

from cli.ask.agent import _server_message
from cli.main import app

runner = CliRunner()

UNAUTHENTICATED = {"code": "UNAUTHENTICATED", "message": "Authentication required"}


class _RejectingAgent:
    """An agent whose every run is refused by the proxy, as a revoked token is."""

    def __init__(self, status: int, body: object) -> None:
        self._status = status
        self._body = body

    def run_sync(self, *args: object, **kwargs: object) -> object:
        raise ModelHTTPError(status_code=self._status, model_name="gpt-4o", body=self._body)


def _ask(tmp_bean_file: Path, status: int, body: object) -> object:
    with patch("cli.ask.agent.make_agent", return_value=_RejectingAgent(status, body)):
        return runner.invoke(app, ["--file", str(tmp_bean_file), "ask", "hi", "--print"])


@pytest.mark.parametrize("status", [401, 403])
def test_rejected_credential_exits_3_with_a_remedy(tmp_bean_file: Path, logged_in: None, status: int) -> None:
    result = _ask(tmp_bean_file, status, UNAUTHENTICATED)

    assert result.exit_code == 3, result.output
    assert "Not authorized" in result.output
    assert "Authentication required" in result.output, "the server's own sentence is kept"


@pytest.mark.parametrize("status", [401, 403])
def test_sdk_internals_never_reach_the_user(tmp_bean_file: Path, logged_in: None, status: int) -> None:
    """`model_name` is the proxy's internal choice and is not the user's business."""
    result = _ask(tmp_bean_file, status, UNAUTHENTICATED)

    for leaked in ("model_name", "status_code", "gpt-4o", "UNAUTHENTICATED"):
        assert leaked not in result.output, f"{leaked!r} leaked from the SDK exception"


def test_rate_limit_and_server_errors_get_their_documented_sentences(tmp_bean_file: Path, logged_in: None) -> None:
    """Auth is the contract fix, but the same table covers the other obvious failures."""
    limited = _ask(tmp_bean_file, 429, {"message": "Too many requests"})
    assert limited.exit_code == 1
    assert "Rate limited" in limited.output and "Too many requests" in limited.output

    down = _ask(tmp_bean_file, 503, {"message": "upstream unavailable"})
    assert down.exit_code == 1
    assert "Server error" in down.output
    assert "model_name" not in down.output


def test_no_credentials_still_refuses_locally(tmp_bean_file: Path) -> None:
    """The working control the note names: no creds never reaches the SDK at all."""
    result = runner.invoke(app, ["--file", str(tmp_bean_file), "ask", "hi", "--print"])

    assert result.exit_code == 3
    assert "model_name" not in result.output


class TestServerMessage:
    """The server's sentence has to survive whichever shape the proxy sends it in."""

    def test_mapping_body(self) -> None:
        assert _server_message(UNAUTHENTICATED) == "Authentication required"

    def test_json_string_body(self) -> None:
        assert _server_message('{"message": "Authentication required"}') == "Authentication required"

    def test_plain_string_body(self) -> None:
        assert _server_message("Authentication required") == "Authentication required"

    @pytest.mark.parametrize("body", [None, {}, "", "   ", {"message": ""}, {"code": "X"}, 42])
    def test_unusable_bodies_fall_back_rather_than_inventing_words(self, body: object) -> None:
        assert _server_message(body) is None
