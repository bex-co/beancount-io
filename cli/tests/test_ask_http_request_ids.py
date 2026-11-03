"""Ask keeps the server's request ID on ordinary HTTP failures (w5/890).

The status arm translated the error without the response headers, so a 500 or
a 403 lost the correlation ID that `cloud` commands and Ask redirects print.
"""

from __future__ import annotations

import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from tests.test_into_glob_create import _env

QUOTA = {"error": {"code": "QUOTA_EXCEEDED", "message": "API usage quota exceeded"}}
SERVER = {"error": {"message": "Synthetic Ask failure"}}


def _ask(tmp_path: Path, status: int, body: dict[str, object], request_id: str | None) -> tuple[int, str, bytes]:
    ledger = tmp_path / "main.bean"
    ledger.write_bytes(b"2024-01-01 open Assets:Cash USD\n")
    payload = json.dumps(body).encode()

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:  # noqa: N802
            self.rfile.read(int(self.headers.get("Content-Length", "0")))
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            if request_id is not None:
                self.send_header("X-Request-ID", request_id)
            self.send_header("x-should-retry", "false")
            self.end_headers()
            self.wfile.write(payload)

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
            timeout=60,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    assert result.stdout == ""
    return result.returncode, " ".join(result.stderr.split()), ledger.read_bytes()


@pytest.mark.parametrize(
    ("status", "body", "exit_code", "sentence"),
    [
        (500, SERVER, 1, "Server error (Synthetic Ask failure)."),
        (403, SERVER, 3, "permission"),
        (402, QUOTA, 1, "hosted AI service is at capacity"),
    ],
    ids=["server-error", "forbidden", "quota"],
)
def test_the_request_id_survives_a_status_failure(
    tmp_path: Path, status: int, body: dict[str, object], exit_code: int, sentence: str
) -> None:
    code, stderr, ledger = _ask(tmp_path, status, body, "qa-ask-request-id")

    assert code == exit_code, stderr
    assert sentence in stderr
    assert "Request ID: qa-ask-request-id" in stderr
    assert ledger == b"2024-01-01 open Assets:Cash USD\n"


def test_no_header_means_no_request_id(tmp_path: Path) -> None:
    code, stderr, _ = _ask(tmp_path, 500, SERVER, None)

    assert code == 1, stderr
    assert "Request ID" not in stderr
