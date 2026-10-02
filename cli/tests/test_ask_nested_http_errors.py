"""The real Ask HTTP path reports proxy sentences without nested JSON or SDK details."""

from __future__ import annotations

import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from tests.test_into_glob_create import _env

RATE_LIMIT = "Too many requests; retry in 60s"


def _proxy_wrapper(code: str, message: str) -> dict[str, object]:
    return {
        "ok": False,
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": json.dumps({"success": False, "error": {"code": code, "message": message}}),
        },
    }


@pytest.mark.parametrize(
    ("status", "body", "expected"),
    [
        (429, {"message": RATE_LIMIT}, f"Rate limited ({RATE_LIMIT}). Wait a moment and retry."),
        (429, {"error": {"message": RATE_LIMIT}}, f"Rate limited ({RATE_LIMIT}). Wait a moment and retry."),
        (
            429,
            _proxy_wrapper("RATE_LIMITED", RATE_LIMIT),
            f"Rate limited ({RATE_LIMIT}). Wait a moment and retry.",
        ),
        (
            402,
            _proxy_wrapper("QUOTA_EXCEEDED", "API usage quota exceeded"),
            "This account's hosted AI quota is used up, so the question was refused; "
            "nothing was written to your ledger. Run the query yourself with 'bea query' in the meantime.",
        ),
    ],
    ids=["flat-message", "error-message", "stringified-proxy-error", "stringified-quota-control"],
)
def test_ask_print_unwraps_actual_http_errors(
    tmp_path: Path, status: int, body: dict[str, object], expected: str
) -> None:
    ledger = tmp_path / "main.bean"
    original = b'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n'
    ledger.write_bytes(original)
    response = json.dumps(body).encode()
    requests: list[tuple[str, str | None]] = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:  # noqa: N802
            self.rfile.read(int(self.headers.get("Content-Length", "0")))
            requests.append((self.path, self.headers.get("Authorization")))
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.send_header("x-should-retry", "false")
            self.end_headers()
            self.wfile.write(response)

        def log_message(self, *args: object) -> None:
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
    thread.start()
    env = _env(tmp_path)
    env.update(
        BEA_TOKEN="synthetic-ask-error-token",
        BEA_API_URL=f"http://127.0.0.1:{server.server_port}",
        NO_PROXY="127.0.0.1,localhost",
    )
    try:
        result = subprocess.run(
            [sys.executable, "-m", "cli.main", "--file", str(ledger), "ask", "--print", "What is my balance?"],
            env=env,
            cwd=tmp_path,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=30,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert requests == [("/api-gateway/ai/openai/chat/completions", "Bearer synthetic-ask-error-token")]
    assert result.returncode == 1, result.stderr
    assert result.stdout == ""
    assert expected in " ".join(result.stderr.split())
    for leaked in ("{", "}", "model_name", "status_code", "gpt-4o", "INTERNAL_SERVER_ERROR", "QUOTA_EXCEEDED"):
        assert leaked not in result.stderr
    assert ledger.read_bytes() == original
