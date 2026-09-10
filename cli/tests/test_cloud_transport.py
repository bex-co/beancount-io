"""Regression coverage for cloud transport and clone error handling."""

from __future__ import annotations

import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import pytest

from cli.api.client import DEFAULT_TIMEOUT, bearer_client, make_client
from cli.commands.cloud.ledger.manager import CloneError, clone_ledger, ensure_git_available
from cli.errors import AuthError, UsageError, to_bea_error, unknown_write_outcome


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


def test_clone_retains_git_diagnostic(tmp_path: Path) -> None:
    occupied = tmp_path / "occupied"
    occupied.mkdir()
    (occupied / "keep.txt").write_text("pristine\n")
    origin = tmp_path / "origin.git"
    import subprocess

    subprocess.run(["git", "init", "--bare", str(origin)], check=True, capture_output=True)
    with pytest.raises(CloneError) as caught:
        clone_ledger(str(origin), occupied, quiet=True)
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
