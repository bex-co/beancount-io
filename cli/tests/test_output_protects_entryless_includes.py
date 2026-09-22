"""`.output` refuses every loaded file, not just the ones holding entries (w3/400).

`_loaded_files` built its protection set from `entries[].meta.filename`, so an
included child containing only `option` lines, comments or further includes
produced no entries and was absent from it. Interactive `.output` then opened
that file with `"w"` and a query result replaced a settings file — after which
the ledger no longer loaded at all.

The loader already records its whole include closure in `options["include"]`;
that is what the guard reads now.

The one-shot `--output` guard walks includes independently in the frontend and
was always correct, which is why it refused the same destination. It is kept
here as the control.
"""

from __future__ import annotations

import hashlib
import os
import pty
import select
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BEA = ROOT / ".venv" / "bin" / "bea"

MAIN = """include "settings.bean"
include "accounts.bean"
2026-01-02 * "Lunch"
  Assets:Cash -10 USD
  Expenses:Food
"""
SETTINGS = '; synthetic settings to preserve\noption "operating_currency" "USD"\n'
ACCOUNTS = "2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Food USD\n"
# No entries, no options — only a comment. Nothing about it reaches the
# entries table, so it is the sharpest case for an entry-derived guard.
EMPTY = "; nothing but a comment\n"

SELECT = "SELECT 73 AS sentinel LIMIT 1"


@pytest.fixture
def books(tmp_path: Path) -> dict[str, Path]:
    files = {
        "main": tmp_path / "main.bean",
        "settings": tmp_path / "settings.bean",
        "accounts": tmp_path / "accounts.bean",
        "empty": tmp_path / "empty.bean",
    }
    files["main"].write_text('include "empty.bean"\n' + MAIN, encoding="utf-8")
    files["settings"].write_text(SETTINGS, encoding="utf-8")
    files["accounts"].write_text(ACCOUNTS, encoding="utf-8")
    files["empty"].write_text(EMPTY, encoding="utf-8")
    return files


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _digests(files: dict[str, Path]) -> dict[str, str]:
    return {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in files.items()}


def _shell_session(tmp_path: Path, ledger: Path, script: str, timeout: float = 120.0) -> tuple[int, str]:
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        os.execve(str(BEA), [str(BEA), "--file", str(ledger), "query"], _env(tmp_path))
    screen = ""
    sent = False
    started = time.time()
    try:
        while True:
            if not sent and "beanquery>" in screen:
                os.write(fd, script.encode())
                sent = True
            ready, _, _ = select.select([fd], [], [], 0.3)
            if ready:
                try:
                    chunk = os.read(fd, 65536)
                except OSError:
                    chunk = b""
                if chunk:
                    screen += chunk.decode("utf-8", "replace")
            finished, status = os.waitpid(pid, os.WNOHANG)
            if finished:
                return os.waitstatus_to_exitcode(status), screen
            if time.time() - started > timeout:
                os.kill(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
                raise AssertionError(f"the shell never exited; screen was {screen!r}")
    finally:
        os.close(fd)


@pytest.mark.parametrize("target", ["settings", "accounts", "main", "empty"])
def test_interactive_output_refuses_every_loaded_file(tmp_path: Path, books: dict[str, Path], target: str) -> None:
    """`settings` and `empty` carry no entries; they were unprotected."""
    before = _digests(books)

    status, screen = _shell_session(tmp_path, books["main"], f".output {books[target]}\n{SELECT}\n.exit\n")

    assert status == 0
    assert "Refusing to write query output" in screen, screen
    assert _digests(books) == before, f"{target}.bean was modified"


def test_the_ledger_still_loads_afterwards(tmp_path: Path, books: dict[str, Path]) -> None:
    """The real damage was a ledger that stopped parsing, so check it does."""
    _shell_session(tmp_path, books["main"], f".output {books['settings']}\n{SELECT}\n.exit\n")

    done = subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(books["main"]), "check"],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert done.returncode == 0, done.stderr


def test_an_external_destination_is_still_writable(tmp_path: Path, books: dict[str, Path]) -> None:
    """The guard must refuse ledger files, not redirection itself."""
    export = tmp_path / "export.txt"

    status, _ = _shell_session(tmp_path, books["main"], f".output {export}\n{SELECT}\n.output\n.exit\n")

    assert status == 0
    assert "73" in export.read_text(encoding="utf-8")


def test_the_session_keeps_working_after_a_refusal(tmp_path: Path, books: dict[str, Path]) -> None:
    """A refusal must not cost the session its current output stream."""
    status, screen = _shell_session(
        tmp_path, books["main"], f".output {books['settings']}\nSELECT 42 AS n LIMIT 1\n.exit\n"
    )

    assert status == 0
    assert "\n42\n" in screen.replace("\r", ""), screen


@pytest.mark.parametrize("target", ["settings", "accounts", "main", "empty"])
def test_the_one_shot_guard_still_refuses_too(tmp_path: Path, books: dict[str, Path], target: str) -> None:
    """The control: this path walks includes in the frontend and always worked."""
    before = _digests(books)

    done = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--file",
            str(books["main"]),
            "query",
            SELECT,
            "--output",
            str(books[target]),
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert done.returncode == 2
    assert "would overwrite the ledger it reads" in done.stderr
    assert _digests(books) == before
