import asyncio
import json
import os
import pty
import select
import signal
import subprocess
import sys
import threading
import time
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from cli import context

# ---------------------------------------------------------------------------
# Optional Beangulp / Beanprice integration (session venv)
# ---------------------------------------------------------------------------

CLI_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def optional_engine_python(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """A Python with beancount + beangulp + beanprice, for BEA_ENGINE_PYTHON."""
    root = tmp_path_factory.mktemp("optional-engine")
    venv = root / "venv"
    subprocess.run(
        ["uv", "venv", "--python", "3.12", str(venv)],
        check=True,
        cwd=CLI_ROOT,
        capture_output=True,
        text=True,
    )
    python = venv / ("Scripts" if sys.platform == "win32" else "bin") / "python"
    install = subprocess.run(
        [
            "uv",
            "pip",
            "install",
            "--python",
            str(python),
            "beancount==3.2.3",
            "beangulp==0.2.0",
            "beanprice==2.1.0",
        ],
        check=False,
        cwd=CLI_ROOT,
        capture_output=True,
        text=True,
    )
    if install.returncode != 0:
        pytest.skip(f"Could not install optional engine packages: {install.stderr[-500:]}")
    probe = subprocess.run(
        [str(python), "-c", "import beangulp, beanprice, beancount"],
        capture_output=True,
        text=True,
        check=False,
    )
    if probe.returncode != 0:
        pytest.skip(f"Optional packages not importable: {probe.stderr[-500:]}")
    return python


@pytest.fixture
def use_optional_engine(monkeypatch: pytest.MonkeyPatch, optional_engine_python: Path) -> Path:
    """Point this test's bea at the session optional engine."""
    monkeypatch.setenv("BEA_ENGINE_PYTHON", str(optional_engine_python))
    monkeypatch.delenv("BEA_ENGINE_DIR", raising=False)
    return optional_engine_python


@pytest.fixture(autouse=True)
def event_loop() -> Iterator[None]:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield
    loop.close()
    asyncio.set_event_loop(None)


@pytest.fixture(autouse=True)
def bea_config_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Give every test its own `~/.config/bea` and a clean `BEA_*` environment.

    Autouse, because a test that read the developer's real credentials or wrote
    to their config directory would be both flaky and rude.
    """
    directory = tmp_path / "bea-config"
    monkeypatch.setenv("BEA_CONFIG_DIR", str(directory))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / "xdg-config"))
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path / "xdg-cache"))
    # `XDG_DATA_HOME` is where a provisioned Beancount engine lives. Pointed at
    # tmp so no test can reuse — or corrupt — the developer's real engine; with
    # nothing installed there, `cli.engine.launch` falls through to running the
    # helper out of this checkout instead of provisioning one.
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "xdg-data"))
    for name in ("BEA_FILE", "BEA_TOKEN", "CI", "BEA_ENGINE_PYTHON", "BEA_ENGINE_DIR"):
        monkeypatch.delenv(name, raising=False)
    # No test may reach the real index. The notifier is off by default and its
    # endpoint points at a closed port, so a check that slips past the gate
    # fails instantly instead of asking PyPI about a release.
    monkeypatch.setenv("BEA_NO_UPDATE_NOTIFIER", "1")
    monkeypatch.setenv("BEA_UPDATE_API_URL", "http://127.0.0.1:9")
    monkeypatch.setenv("BEA_TAP_FORMULA_URL", "http://127.0.0.1:9/bea.rb")
    context.configure()
    yield directory
    # Error paths and timeouts can leave the notifier running after the CLI
    # returns. Finish it before monkeypatch restores cache paths and endpoints.
    for worker in threading.enumerate():
        if worker.name == "bea-update-check":
            worker.join(timeout=5)
            assert not worker.is_alive(), "Update check outlived its isolated test environment"


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


@dataclass
class GitRemote:
    url: str
    """The ssh URL the stubbed server hands out; git rewrites it to `origin`."""
    origin: Path


@pytest.fixture
def git_remote(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> GitRemote:
    """A bare local repository reachable as an `ssh://` clone URL.

    `bea cloud ledger clone` only accepts ssh/https remotes from the server, so
    tests cannot hand it a filesystem path. Instead the clone URL is a real
    ssh URL that git's `url.<base>.insteadOf` (set through the environment the
    clone inherits) rewrites to the local bare repository: no network, no ssh.
    """
    origin = tmp_path / "origin.git"
    subprocess.run(["git", "init", "--bare", str(origin)], check=True, capture_output=True)
    url = "ssh://git@example.test/alice/books.git"
    monkeypatch.setenv("GIT_CONFIG_COUNT", "1")
    monkeypatch.setenv("GIT_CONFIG_KEY_0", f"url.{origin.as_uri()}.insteadOf")
    monkeypatch.setenv("GIT_CONFIG_VALUE_0", url)
    return GitRemote(url=url, origin=origin)


@pytest.fixture
def tmp_bean_file(tmp_path: Path) -> Path:
    f = tmp_path / "main.bean"
    f.write_text("")
    return f


# ---------------------------------------------------------------------------
# `bea ask` against a local stub model, driven on a real terminal
# ---------------------------------------------------------------------------
#
# The model's side of an `ask` run is a **simulation**: these fixtures answer the
# OpenAI protocol from localhost, so nothing here is a statement about the hosted
# AI service — what they pin is how `bea` reacts. A real PTY is required for the
# rendering assertions, because a piped capture strips control sequences and
# under-reports exactly the bytes at issue (w3/392's wrinkle), and because the
# interactive session's prompt never appears without a terminal.


def model_tool_call(name: str, arguments: dict[str, object], call_id: str = "call_1") -> dict[str, object]:
    """One tool call, in the shape the OpenAI chat-completions protocol returns it."""
    return {
        "index": 0,
        "finish_reason": "tool_calls",
        "message": {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": call_id,
                    "type": "function",
                    "function": {"name": name, "arguments": json.dumps(arguments)},
                }
            ],
        },
    }


def model_answer(text: str) -> dict[str, object]:
    """A final assistant answer, same protocol shape."""
    return {"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": text}}


#: A choice to answer with, a status to fail with, or a status with its body.
StubReply = dict[str, object] | int | tuple[int, dict[str, object]]


@dataclass
class StubModel:
    """A model that answers from localhost: what it replies, and what it was asked.

    `reply` is called with the 1-based request number and returns either a
    `model_answer`/`model_tool_call` choice, an HTTP status to fail with, or a
    `(status, body)` pair when the failure's body is what is under test.
    """

    url: str = ""
    reply: Callable[[int], StubReply] = field(default=lambda n: model_answer("stub answer"))
    requests: list[dict[str, object]] = field(default_factory=list)

    @property
    def count(self) -> int:
        return len(self.requests)

    def prompts(self, index: int) -> list[str]:
        """The user/assistant/tool content of one request, for history assertions."""
        messages = self.requests[index].get("messages") or []
        return [str(message.get("content")) for message in messages]  # type: ignore[union-attr]


class _ModelHandler(BaseHTTPRequestHandler):
    # HTTP/1.0 semantics on purpose: one connection per request. Keeping the
    # connection alive let the client find it stale and transparently retry a
    # turn, which would make "how many requests did one question cost" — the
    # thing the usage ceiling is about — unmeasurable.
    protocol_version = "HTTP/1.0"

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler's spelling
        stub: StubModel = self.server.stub  # type: ignore[attr-defined]
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        try:
            stub.requests.append(json.loads(body))
        except ValueError:
            stub.requests.append({})
        outcome = stub.reply(len(stub.requests))
        if isinstance(outcome, int):
            self._send(outcome, {"message": "Upstream model provider failed."})
            return
        if isinstance(outcome, tuple):
            self._send(*outcome)
            return
        self._send(
            200,
            {
                "id": "chatcmpl-stub",
                "object": "chat.completion",
                "created": 0,
                "model": "gpt-4o",
                "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
                "choices": [outcome],
            },
        )

    def _send(self, status: int, payload: dict[str, object]) -> None:
        encoded = json.dumps(payload).encode()
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
        except (BrokenPipeError, ConnectionResetError):
            # An interrupted turn hangs up mid-answer on purpose; that is the
            # behavior under test, not a failure worth a socketserver traceback.
            pass

    def log_message(self, *args: object) -> None:
        """Silence the access log, which would otherwise land in test output."""


@pytest.fixture
def stub_model() -> Iterator[StubModel]:
    """A local model server for `bea ask`, reachable through `BEA_API_URL`."""
    stub = StubModel()
    server = ThreadingHTTPServer(("127.0.0.1", 0), _ModelHandler)
    server.stub = stub  # type: ignore[attr-defined]
    stub.url = f"http://127.0.0.1:{server.server_address[1]}"
    threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True).start()
    try:
        yield stub
    finally:
        server.shutdown()
        server.server_close()


@dataclass
class TerminalRun:
    """One `bea` run on a PTY: its exit status and every byte it emitted."""

    status: int
    emitted: bytes

    @property
    def screen(self) -> str:
        return self.emitted.decode("utf-8", "replace")


#: The session's prompt arrow, as the terminal receives it.
PROMPT_ARROW = "\u276f".encode()

#: Keystrokes an `ask` script can send, by name.
KEYS = {"CTRL_C": b"\x03", "CTRL_D": b"\x04", "ENTER": b"\r"}


@pytest.fixture
def ask_on_a_terminal(tmp_path: Path, stub_model: StubModel) -> Callable[..., TerminalRun]:
    """Run `bea ask` on a PTY against `stub_model`, typing a script of keystrokes.

    A script entry is literal text, `@NAME` from `KEYS`, or `@WAIT:text` to
    await output before the next keystroke. Wait markers match in order, so a
    later prompt cannot accidentally match the one from an earlier turn.
    `@REQUESTS:n` awaits the stub's n-th request — the one point a turn can be
    observed between its tool calls, since a tool's work ends before the next
    request is sent.
    """

    def run(
        argv: list[str], script: list[str], *, timeout: float = 120.0, env_overrides: dict[str, str] | None = None
    ) -> TerminalRun:
        env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
        env.update(
            BEA_CONFIG_DIR=str(tmp_path / "config"),
            XDG_CACHE_HOME=str(tmp_path / "cache"),
            XDG_DATA_HOME=str(tmp_path / "data"),
            XDG_CONFIG_HOME=str(tmp_path / "xdg-config"),
            BEA_NO_UPDATE_NOTIFIER="1",
            BEA_API_URL=stub_model.url,
            BEA_TOKEN="stub-token",
            PYTHONPATH=str(CLI_ROOT / "src"),
            TERM="dumb",
            NO_COLOR="1",
            COLUMNS="100",
            LINES="40",
        )
        env.update(env_overrides or {})
        pid, fd = pty.fork()
        if pid == 0:  # pragma: no cover - replaced by exec in the child
            os.chdir(tmp_path)
            os.execve(sys.executable, [sys.executable, "-m", "cli.main", *argv], env)
        emitted = b""
        step = 0
        matched_output = 0
        started = last = time.time()
        try:
            while True:
                ready, _, _ = select.select([fd], [], [], 0.2)
                if ready:
                    try:
                        chunk = os.read(fd, 65536)
                    except OSError:  # The PTY closes when the child exits.
                        chunk = b""
                    if chunk:
                        emitted += chunk
                        last = time.time()
                finished, status = os.waitpid(pid, os.WNOHANG)
                if finished:
                    return TerminalRun(os.waitstatus_to_exitcode(status), emitted)
                # Nothing is typed until the session's own prompt is on screen:
                # a keystroke sent while the child is still importing is eaten by
                # the terminal, and a Ctrl-C then lands on startup instead of on
                # the prompt under test.
                ready_to_type = step > 0 or PROMPT_ARROW in emitted
                if step < len(script) and script[step].startswith("@REQUESTS:"):
                    if stub_model.count >= int(script[step].removeprefix("@REQUESTS:")):
                        step += 1
                        last = time.time()
                elif step < len(script) and script[step].startswith("@WAIT:"):
                    marker = script[step].removeprefix("@WAIT:").encode()
                    match = emitted.find(marker, matched_output)
                    if match >= 0:
                        matched_output = match + len(marker)
                        step += 1
                elif step < len(script) and ready_to_type and time.time() - last > 1.5:
                    key = script[step]
                    os.write(fd, KEYS[key[1:]] if key.startswith("@") else key.encode())
                    step += 1
                    last = time.time()
                if time.time() - started > timeout:
                    os.kill(pid, signal.SIGKILL)
                    os.waitpid(pid, 0)
                    raise AssertionError(f"bea {argv} never exited; screen was {emitted!r}")
        finally:
            os.close(fd)

    return run
