"""Regression coverage for cloud transport and clone error handling."""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.api.client import DEFAULT_TIMEOUT, bearer_client, make_client
from cli.auth.credentials import ENVIRONMENT, FILE, save_credentials
from cli.commands.cloud.ledger.manager import CloneError, clone_ledger, ensure_git_available
from cli.errors import AuthError, UsageError, to_bea_error, unknown_write_outcome
from cli.main import app
from tests.conftest import GitRemote


@pytest.mark.parametrize("body", [b"{}", b"[]", b"null", b"<html>proxy response</html>"])
@pytest.mark.parametrize("json_output", [False, True])
def test_simulated_malformed_success_has_status_and_request_id(
    logged_in: None, httpx_mock: HTTPXMock, body: bytes, json_output: bool
) -> None:
    """Synthetic HTTP responses, not evidence of a live server defect."""
    httpx_mock.add_response(status_code=200, content=body, headers={"X-Request-Id": "simulated-malformed-200"})

    result = CliRunner().invoke(app, [*(["--json"] if json_output else []), "cloud", "ledger", "show", "alice/books"])

    assert result.exit_code == 1
    assert result.stdout == ""
    assert "Unexpected server response (HTTP 200)." in result.stderr
    if json_output:
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "validation"
        assert error["request_id"] == "simulated-malformed-200"
    assert "KeyError" not in result.stderr
    assert "proxy response" not in result.stderr


@pytest.mark.parametrize(
    ("body", "message"),
    [(b'{"message":"m"}', "m"), (b'{"error":"m"}', "m"), (b"[]", None), (b'"str"', "str")],
    ids=["message", "error-string", "array", "bare-string"],
)
@pytest.mark.parametrize(
    ("status", "category", "exit_code"),
    [
        (400, "usage", 2),
        (401, "auth", 3),
        (403, "auth", 3),
        (404, "validation", 1),
        (409, "conflict", 4),
        (429, "validation", 1),
        (500, "validation", 1),
    ],
)
def test_unenveloped_json_error_body_keeps_status_mapping(
    logged_in: None,
    httpx_mock: HTTPXMock,
    body: bytes,
    message: str | None,
    status: int,
    category: str,
    exit_code: int,
) -> None:
    """Synthetic gateway-style error bodies without the `{ok, error}` envelope (w1/055)."""
    httpx_mock.add_response(
        status_code=status,
        content=body,
        headers={"Content-Type": "application/json", "X-Request-Id": "synthetic-unenveloped"},
    )

    result = CliRunner().invoke(app, ["--json", "cloud", "ledger", "show", "alice/books"])

    assert result.exit_code == exit_code, result.stderr
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == category
    assert error["exit_code"] == exit_code
    assert error["request_id"] == "synthetic-unenveloped"
    assert (message or f"HTTP {status}") in error["message"]
    assert "'ok'" not in result.stderr


@pytest.mark.parametrize(
    ("argv", "status", "exit_code"),
    [
        (["cloud", "status"], 401, 3),
        (["cloud", "ledger", "create", "qa-synthetic"], 403, 3),
        (["-y", "cloud", "ledger", "delete", "alice/books"], 409, 4),
    ],
    ids=["status", "create", "delete"],
)
def test_unenveloped_json_error_body_human_mode(
    logged_in: None, httpx_mock: HTTPXMock, argv: list[str], status: int, exit_code: int
) -> None:
    httpx_mock.add_response(
        status_code=status,
        content=b'{"message":"upstream overloaded"}',
        headers={"Content-Type": "application/json", "X-Request-Id": "synthetic-unenveloped"},
    )

    result = CliRunner().invoke(app, argv)

    assert result.exit_code == exit_code, result.stderr
    assert "upstream overloaded" in result.stderr
    assert "'ok'" not in result.stderr


@pytest.mark.parametrize("credential_source", [FILE, ENVIRONMENT])
@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
@pytest.mark.parametrize(
    ("status", "code", "message", "exit_code", "category"),
    [(403, "FORBIDDEN", "Authorization denied", 3, "auth"), (404, "NOT_FOUND", "Ledger not found", 1, "validation")],
)
def test_ledger_access_errors_do_not_reject_a_valid_credential(
    monkeypatch: pytest.MonkeyPatch,
    httpx_mock: HTTPXMock,
    credential_source: str,
    json_output: bool,
    status: int,
    code: str,
    message: str,
    exit_code: int,
    category: str,
) -> None:
    monkeypatch.setenv("BEA_API_URL", "https://api.example")
    save_credentials("synthetic-stored-token", "2099-01-01T00:00:00Z")
    token = "synthetic-stored-token"
    if credential_source == ENVIRONMENT:
        token = "synthetic-environment-token"
        monkeypatch.setenv("BEA_TOKEN", token)
    httpx_mock.add_response(
        method="GET",
        url="https://api.example/api-gateway/v1/ledgers/alice/missing",
        status_code=status,
        json={"ok": False, "error": {"code": code, "message": message}},
        headers={"X-Request-Id": "synthetic-access-denial"},
    )
    httpx_mock.add_response(
        method="GET",
        url="https://api.example/api-gateway/v1/user-profile",
        json={
            "id": "u1",
            "email": "alice@example.com",
            "locale": "en",
            "username": "alice",
            "tier": "free",
            "limits": {"ledgersUsed": 0, "ledgersMax": 1, "collaboratorsPerLedgerMax": 1, "maxDirectives": 100},
            "hasEverSubscribed": False,
        },
    )

    runner = CliRunner()
    result = runner.invoke(app, [*(["--json"] if json_output else []), "cloud", "ledger", "show", "alice/missing"])
    profile = runner.invoke(app, ["--json", "cloud", "status"])

    assert result.exit_code == exit_code, result.stderr
    assert result.stdout == ""
    assert message in result.stderr
    assert "bea cloud login" not in result.stderr
    assert "BEA_TOKEN" not in result.stderr
    if status == 403:
        assert "permission" in result.stderr.lower()
    if json_output:
        error = json.loads(result.stderr)["error"]
        assert error["category"] == category
        assert error["request_id"] == "synthetic-access-denial"
    assert profile.exit_code == 0, profile.stderr
    data = json.loads(profile.stdout)["data"]
    assert data["authenticated"] is True
    assert data["source"] == credential_source
    assert data["username"] == "alice"
    assert [request.headers["Authorization"] for request in httpx_mock.get_requests()] == [f"Bearer {token}"] * 2


def test_clients_use_finite_timeout() -> None:
    anon = make_client().get_httpx_client()
    bearer = bearer_client("tok").get_httpx_client()
    assert anon.timeout == DEFAULT_TIMEOUT
    assert bearer.timeout == DEFAULT_TIMEOUT


def test_non_json_http_error_keeps_status_category(monkeypatch: pytest.MonkeyPatch) -> None:
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args: object) -> None:
            pass

        def do_GET(self) -> None:
            self.send_response(403)
            self.send_header("Content-Type", "text/html")
            self.send_header("X-Request-Id", "qa-synthetic-request")
            self.end_headers()
            self.wfile.write(b"<html>Temporarily unavailable</html>")

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        monkeypatch.setenv("BEA_API_URL", f"http://127.0.0.1:{server.server_port}")
        from cli.api.client import unwrap
        from cli.api.rest_client.api.ledger_v_1 import get_user_profile

        client = bearer_client("synthetic-invalid")
        with pytest.raises(AuthError) as caught:
            unwrap(get_user_profile.sync_detailed(client=client))
        assert caught.value.request_id == "qa-synthetic-request"
        assert "403" in str(caught.value) or "Not authorized" in str(caught.value)
    finally:
        server.shutdown()
        server.server_close()


def test_clone_retains_git_diagnostic(tmp_path: Path, git_remote: GitRemote) -> None:
    occupied = tmp_path / "occupied"
    occupied.mkdir()
    (occupied / "keep.txt").write_text("pristine\n")
    with pytest.raises(CloneError) as caught:
        clone_ledger(git_remote.url, occupied, quiet=True)
    assert caught.value.diagnostic
    assert "already exists" in caught.value.diagnostic.lower() or "not an empty" in caught.value.diagnostic.lower()


def test_ensure_git_available_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("cli.commands.cloud.ledger.manager.shutil.which", lambda _: None)
    with pytest.raises(UsageError, match="git executable not found"):
        ensure_git_available()


def test_token_bearing_transport_error_is_redacted(monkeypatch: pytest.MonkeyPatch) -> None:
    marker = "qa-synthetic-sensitive-value"
    monkeypatch.setenv("BEA_TOKEN", marker)
    err = to_bea_error(httpx.LocalProtocolError(f"Illegal header value b'Bearer {marker}\\n'"))
    assert marker not in str(err)
    assert "LocalProtocolError" in str(err)


def test_unknown_write_outcome_omits_exception_text() -> None:
    marker = "qa-synthetic-sensitive-value\n"
    err = unknown_write_outcome("Creating ledger", httpx.LocalProtocolError(f"Bearer {marker}"))
    assert marker.strip() not in str(err)
    assert "LocalProtocolError" in str(err)


class TestLogout:
    """`cloud logout` only revokes what it owns: a stored session, never `BEA_TOKEN`."""

    @staticmethod
    def _spy_logout(monkeypatch: pytest.MonkeyPatch) -> list[str]:
        from cli.api.rest_client.api.ledger_v_1 import logout

        revoked: list[str] = []

        def fake_sync_detailed(*, client: object) -> object:
            revoked.append(getattr(client, "token", "?"))
            return httpx.Response(200, json={}, request=httpx.Request("POST", "http://test/logout"))

        monkeypatch.setattr(logout, "sync_detailed", fake_sync_detailed)
        monkeypatch.setattr("cli.api.client.unwrap_or_none", lambda response: response)
        return revoked

    def test_environment_token_is_not_revoked(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from typer.testing import CliRunner

        from cli.main import app

        revoked = self._spy_logout(monkeypatch)
        monkeypatch.setenv("BEA_TOKEN", "shared-ci-token")

        result = CliRunner().invoke(app, ["cloud", "logout"])

        assert result.exit_code == 0, result.output
        assert revoked == []
        assert "BEA_TOKEN" in result.stdout
        assert "unchanged" in result.stdout

    def test_stored_session_is_revoked_and_cleared(self, monkeypatch: pytest.MonkeyPatch, bea_config_dir: Path) -> None:
        from typer.testing import CliRunner

        from cli.auth.credentials import save_credentials
        from cli.main import app

        revoked = self._spy_logout(monkeypatch)
        save_credentials("stored-token", "2099-01-01T00:00:00Z")

        result = CliRunner().invoke(app, ["cloud", "logout"])

        assert result.exit_code == 0, result.output
        assert revoked == ["stored-token"]
        assert not (bea_config_dir / "credentials.json").exists()


_LOGOUT_URL = "https://api.example/api-gateway/v1/logout"


class TestLogoutRevocationOutcome:
    """Exit 0 means the server revoked the session; anything else says so (w1/058)."""

    @pytest.fixture(autouse=True)
    def _stored_session(self, monkeypatch: pytest.MonkeyPatch, bea_config_dir: Path) -> None:
        monkeypatch.setenv("BEA_API_URL", "https://api.example")
        monkeypatch.delenv("BEA_TOKEN", raising=False)
        save_credentials("synthetic-stored-token", "2099-01-01T00:00:00Z")

    @pytest.mark.parametrize(
        ("status", "body"),
        [
            (200, {"success": True}),
            (401, {"ok": False, "error": {"code": "UNAUTHENTICATED", "message": "token revoked"}}),
        ],
        ids=["revoked", "already-revoked"],
    )
    def test_revoked_session_exits_zero(
        self, httpx_mock: HTTPXMock, bea_config_dir: Path, status: int, body: dict[str, object]
    ) -> None:
        httpx_mock.add_response(method="POST", url=_LOGOUT_URL, status_code=status, json=body)

        result = CliRunner().invoke(app, ["cloud", "logout"])

        assert result.exit_code == 0, result.output
        assert result.stdout == "Logged out.\n"
        assert not (bea_config_dir / "credentials.json").exists()

    @pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
    @pytest.mark.parametrize(
        ("failure", "exit_code", "category", "reason"),
        [
            (httpx.ConnectError("refused"), 1, "validation", "Could not reach the server (ConnectError)"),
            (500, 1, "validation", "Server error (boom)"),
            (httpx.ReadTimeout("slow"), 4, "conflict", "timed out (ReadTimeout)"),
        ],
        ids=["unreachable", "server-error", "timeout"],
    )
    def test_failed_revocation_removes_the_file_and_exits_nonzero(
        self,
        httpx_mock: HTTPXMock,
        bea_config_dir: Path,
        json_output: bool,
        failure: Exception | int,
        exit_code: int,
        category: str,
        reason: str,
    ) -> None:
        if isinstance(failure, int):
            httpx_mock.add_response(
                method="POST",
                url=_LOGOUT_URL,
                status_code=failure,
                json={"ok": False, "error": {"code": "INTERNAL", "message": "boom"}},
            )
        else:
            httpx_mock.add_exception(failure, method="POST", url=_LOGOUT_URL)

        result = CliRunner().invoke(app, [*(["--json"] if json_output else []), "cloud", "logout"])

        assert result.exit_code == exit_code, result.output
        assert result.stdout == ""
        assert "Logged out." not in result.output
        assert "Removed the local credential" in result.stderr
        assert reason in result.stderr
        assert "revoke it from the dashboard" in result.stderr
        assert "synthetic-stored-token" not in result.output
        assert not (bea_config_dir / "credentials.json").exists()
        if json_output:
            assert json.loads(result.stderr)["error"]["category"] == category
