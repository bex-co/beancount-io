"""A real query PTY with bounded output and isolated Beanquery history/init files."""

from __future__ import annotations

import os
import pty
import select
import signal
import subprocess
import termios
import time
from pathlib import Path
from types import TracebackType

ROOT = Path(__file__).resolve().parents[1]


class QueryTerminal:
    def __init__(self, directory: Path, args: list[str], *, env: dict[str, str] | None = None) -> None:
        startup = directory / "startup"
        startup.mkdir(exist_ok=True)
        # Only storage constants change; the executable and every query handler
        # are real. The frontend console script does not import Beanquery.
        (startup / "sitecustomize.py").write_text(
            "import os, sys\n"
            "if sys.argv[0] == '-m' or sys.argv[0].endswith('/bean-query'):\n"
            "    import beanquery.shell\n"
            "    beanquery.shell.HISTORY_FILENAME = os.environ['TEST_BQL_HISTORY']\n"
            "    beanquery.shell.INIT_FILENAME = os.environ['TEST_BQL_INIT']\n"
        )
        child_env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
        child_env.update(
            BEA_CONFIG_DIR=str(directory / "config"),
            BEA_ENGINE_DIR=str(directory / "engine"),
            BEA_NO_UPDATE_NOTIFIER="1",
            XDG_CACHE_HOME=str(directory / "cache"),
            XDG_DATA_HOME=str(directory / "data"),
            TEST_BQL_HISTORY=str(startup / "history"),
            TEST_BQL_INIT=str(startup / "init"),
            PYTHONPATH=os.pathsep.join((str(ROOT / "src"), str(startup))),
            TERM="dumb",
            NO_COLOR="1",
            CI="",
        )
        child_env.update(env or {})
        self.fd, slave = pty.openpty()
        attrs = termios.tcgetattr(slave)
        attrs[3] &= ~termios.ECHO
        termios.tcsetattr(slave, termios.TCSANOW, attrs)
        try:
            self.process = subprocess.Popen(
                [str(ROOT / ".venv/bin/bea"), *args],
                cwd=directory,
                env=child_env,
                stdin=slave,
                stdout=slave,
                stderr=slave,
                start_new_session=True,
            )
        finally:
            os.close(slave)
        self.screen = ""

    def __enter__(self) -> QueryTerminal:
        return self

    def __exit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, tb: TracebackType | None
    ) -> None:
        if self.process.poll() is None:
            os.killpg(self.process.pid, signal.SIGKILL)
        self.process.wait(timeout=10)
        os.close(self.fd)

    def send(self, command: str) -> None:
        os.write(self.fd, (command + "\n").encode())

    def read(self, until: str | None = None, *, timeout: float = 30) -> str:
        start = len(self.screen)
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            ready, _, _ = select.select([self.fd], [], [], 0.1)
            if ready:
                try:
                    chunk = os.read(self.fd, 8192)
                except OSError:
                    chunk = b""
                if not chunk:
                    break
                self.screen += chunk.decode("utf-8", "replace").replace("\r", "")
                assert len(self.screen) < 65536, f"query shell output overflow: {self.screen[-2000:]}"
            if until is not None and until in self.screen[start:]:
                break
            if self.process.poll() is not None and not ready:
                break
        result = self.screen[start:]
        if until is not None:
            assert until in result, f"expected {until!r}, got {result!r}"
        return result

    def finish(self) -> int:
        self.send(".exit")
        self.read()
        return self.process.wait(timeout=10)
