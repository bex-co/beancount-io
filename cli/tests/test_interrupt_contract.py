"""Ctrl-C at a prompt exits 130 without a message, as the exit table promises (w3/388).

`USAGE.md` carves out exactly two signals that mean the run was ended on
purpose: Ctrl-C exits 130 and a closed downstream pipe exits 141, both without
a message. The pipe half was fixed in w3/378. This is the SIGINT half.

A mid-computation Ctrl-C and `bea query`'s interactive shell already complied.
A `bea`-owned Typer prompt did not: `click` turns the `KeyboardInterrupt` into
`Abort`, and its own top-level handler prints `Aborted!` and exits 1 — so a
script could not tell a deliberate Ctrl-C from a genuine failure, which is the
whole reason the carve-out exists.

These tests need a real terminal: the prompts never appear otherwise, so the
defect cannot be reproduced with redirected stdin. Each spawns `bea` under
`pty.fork()` and writes a literal ETX once the prompt is on screen.
"""

from __future__ import annotations

import os
import pty
import select
import signal
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BEA = ROOT / ".venv" / "bin" / "bea"

CTRL_C = b"\x03"
LEDGER = 'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n'


def _child_env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _interrupt_at(tmp_path: Path, argv: list[str], *, expect: str, timeout: float = 60.0) -> tuple[int, str]:
    """Run `bea` on a PTY, send Ctrl-C once `expect` is on screen, and report its exit."""
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        os.execve(str(BEA), [str(BEA), *argv], _child_env(tmp_path))
    screen = ""
    sent_at: float | None = None
    started = time.time()
    try:
        while True:
            # `click` echoes the prompt text before it enters the blocking read,
            # so a SIGINT landing in that gap can be handled before the read
            # starts and leave it waiting forever. Press Ctrl-C again, as a user
            # would, until the process leaves.
            if expect in screen and (sent_at is None or time.time() - sent_at > 1.0):
                os.write(fd, CTRL_C)
                sent_at = time.time()
            ready, _, _ = select.select([fd], [], [], 0.2)
            if ready:
                try:
                    chunk = os.read(fd, 4096)
                except OSError:  # The PTY closes when the child exits.
                    chunk = b""
                if chunk:
                    screen += chunk.decode("utf-8", "replace")
            finished, status = os.waitpid(pid, os.WNOHANG)
            if finished:
                return os.waitstatus_to_exitcode(status), screen
            if time.time() - started > timeout:
                os.kill(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
                raise AssertionError(f"{argv} never exited; screen was {screen!r}")
    finally:
        os.close(fd)


def _noise(screen: str) -> str:
    """Whatever the command printed after the terminal echoed the interrupt.

    The prompt itself and the terminal's own `^C` echo are not the command
    speaking; anything past them is, and the contract says there is nothing.
    """
    _, marker, tail = screen.rpartition("^C")
    assert marker, f"the terminal never echoed the interrupt: {screen!r}"
    return tail.strip()


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


@pytest.mark.parametrize(
    ("argv", "expect"),
    [
        pytest.param(["init", "books"], "Operating currency", id="currency-prompt"),
        pytest.param(["init", "books", "--currency", "USD"], "Earliest date", id="date-prompt"),
        pytest.param(
            ["init", "books", "--currency", "USD", "--date", "2026-01-01"],
            "opening balance",
            id="opening-balance-prompt",
        ),
    ],
)
def test_ctrl_c_at_a_prompt_exits_130_silently(tmp_path: Path, argv: list[str], expect: str) -> None:
    status, screen = _interrupt_at(tmp_path, argv, expect=expect)

    assert status == 130, f"expected the documented interrupt status; screen was {screen!r}"
    assert "Aborted!" not in screen
    assert _noise(screen) == "", f"a deliberate Ctrl-C prints nothing; got {screen!r}"


def test_an_aborted_init_writes_nothing(tmp_path: Path) -> None:
    status, _ = _interrupt_at(tmp_path, ["init", "books", "--currency", "USD"], expect="Earliest date")

    assert status == 130
    assert not (tmp_path / "books").exists(), "a prompt aborts before the command does any work"


def test_the_interactive_shell_still_exits_130(tmp_path: Path, ledger: Path) -> None:
    """The control w5/010 established, and the one path that already complied."""
    status, screen = _interrupt_at(tmp_path, ["--file", str(ledger), "query"], expect="beanquery>")

    assert status == 130
    # The shell answers Ctrl-C with its own `(interrupted)` and returns to the
    # prompt; that is the shell's behaviour, not a `bea` failure report.
    assert "Aborted!" not in screen


def test_declining_a_confirmation_is_not_an_interrupt(monkeypatch: pytest.MonkeyPatch) -> None:
    """Answering "no" must stay an ordinary False, not become exit 130.

    `Abort` now maps to 130, so this pins the boundary: a declined prompt has
    to reach the caller as a value. No `bea` prompt passes `abort=True`, and
    this is what keeps it that way.
    """
    import typer

    from cli import context

    # `no_input` is also implied by a non-terminal stdin, which is exactly what
    # pytest gives us, so the prompt has to be reached with a terminal claimed.
    monkeypatch.setattr(context, "_stdin_is_a_terminal", lambda: True)
    context.configure(no_input=False, yes=False)
    monkeypatch.setattr(typer, "confirm", lambda prompt: False)

    assert context.current().confirm("Permanently delete something?") is False


def test_yes_and_no_input_still_bypass_the_prompt(monkeypatch: pytest.MonkeyPatch) -> None:
    """The non-interactive contract around the same gate is unchanged."""
    import typer

    from cli import context
    from cli.errors import UsageError

    monkeypatch.setattr(typer, "confirm", lambda prompt: pytest.fail("--yes must not prompt"))
    context.configure(no_input=False, yes=True)
    assert context.current().confirm("Delete?") is True

    context.configure(no_input=True, yes=False)
    with pytest.raises(UsageError):
        context.current().confirm("Delete?")
