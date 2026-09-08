import asyncio
import json
import threading
import time
from collections.abc import Iterator
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from cli import context


@pytest.fixture(autouse=True)
def event_loop() -> Iterator[None]:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield
    loop.close()
    asyncio.set_event_loop(None)


@pytest.fixture(autouse=True)
def bea_config_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Give every test its own `~/.config/bea` and a clean `BEA_*` environment.

    Autouse, because a test that read the developer's real credentials or wrote
    to their config directory would be both flaky and rude.
    """
    directory = tmp_path / "bea-config"
    monkeypatch.setenv("BEA_CONFIG_DIR", str(directory))
    for name in ("BEA_FILE", "BEA_TOKEN", "CI"):
        monkeypatch.delenv(name, raising=False)
    # No test may reach the real index. The notifier is off by default and its
    # endpoint points at a closed port, so a check that slips past the gate
    # fails instantly instead of asking PyPI about a release.
    monkeypatch.setenv("BEA_NO_UPDATE_NOTIFIER", "1")
    monkeypatch.setenv("BEA_UPDATE_API_URL", "http://127.0.0.1:9")
    monkeypatch.setenv("BEA_TAP_FORMULA_URL", "http://127.0.0.1:9/bea.rb")
    context.configure()
    return directory


@dataclass
class FakeIndex:
    """A stand-in for PyPI's JSON API: what it answers, how slowly, and who asked."""

    version: str | None = "9.9.9"
    delay: float = 0.0
    requests: list[str] = field(default_factory=list)


class _IndexHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler's spelling
        index: FakeIndex = self.server.index  # type: ignore[attr-defined]
        index.requests.append(self.path)
        time.sleep(index.delay)
        if index.version is None:
            self.send_error(500)
            return
        body = (
            f'version "{index.version}"\n'
            if self.path == "/bea.rb"
            else json.dumps({"info": {"version": index.version}})
        ).encode()
        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            # The timeout test hangs up mid-answer on purpose. That is the
            # behavior under test, not a failure, and the default handler would
            # print a socketserver traceback into the suite's output for it.
            pass

    def log_message(self, *args: object) -> None:
        """Silence the default stderr access log, which would land in test output."""


@pytest.fixture
def fake_index(monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeIndex]:
    """Serve the update check from localhost, and turn the notifier back on."""
    index = FakeIndex()
    server = ThreadingHTTPServer(("127.0.0.1", 0), _IndexHandler)
    server.index = index  # type: ignore[attr-defined]
    # A short poll interval so teardown is immediate: at the default 0.5s,
    # shutting the server down would dominate the suite's runtime.
    threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True).start()
    monkeypatch.delenv("BEA_NO_UPDATE_NOTIFIER", raising=False)
    monkeypatch.setenv("BEA_UPDATE_API_URL", f"http://127.0.0.1:{server.server_address[1]}")
    monkeypatch.setenv("BEA_TAP_FORMULA_URL", f"http://127.0.0.1:{server.server_address[1]}/bea.rb")
    try:
        yield index
    finally:
        server.shutdown()
        server.server_close()


@pytest.fixture
def logged_in(monkeypatch: pytest.MonkeyPatch) -> None:
    """Authenticate the way an unattended job does, through the real credential path."""
    monkeypatch.setenv("BEA_TOKEN", "test-token")


@pytest.fixture
def tmp_bean_file(tmp_path: Path) -> Path:
    f = tmp_path / "main.bean"
    f.write_text("")
    return f
