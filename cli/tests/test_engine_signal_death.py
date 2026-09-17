"""A child that dies on a signal must not exit outside the table, or in silence (w5/010).

Upstream's parser segfaults on a zero divisor in an amount expression, which is
not bea's bug to fix. What was bea's was the reporting: `bea check` forwarded
the shell's 128+SIGSEGV as exit 139 with nothing on either stream, and the
commands that did report said only `exit -11`.

The signal cases here are driven by a stub engine rather than the real crash, so
they pin the behaviour for any child death — a kill, an OOM — and do not rest on
upstream continuing to segfault.
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "EUR"
2026-01-01 open Assets:Cash EUR
2026-01-01 open Expenses:X EUR
"""
DIVIDE_BY_ZERO = (
    LEDGER
    + """
2026-02-01 * "dz"
  Expenses:X   100/0 EUR
  Assets:Cash
"""
)


def _bea(tmp_path: Path, *args: str, engine: Path | None = None) -> subprocess.CompletedProcess[str]:
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
    if engine is not None:
        env["BEA_ENGINE_PYTHON"] = str(engine)
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _stub_engine(tmp_path: Path, signal_name: str) -> Path:
    """An engine whose `bean-check` kills itself with `signal_name` and prints nothing."""
    bin_dir = tmp_path / "stub" / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    python = bin_dir / "python3"
    if not python.exists():
        python.symlink_to(sys.executable)
    check = bin_dir / "bean-check"
    check.write_text(
        f"#!{sys.executable}\nimport os, signal\nos.kill(os.getpid(), signal.{signal_name})\n",
        encoding="utf-8",
    )
    check.chmod(0o755)
    return python


# --- the input-boundary guard: a zero divisor never reaches the engine --------


@pytest.mark.parametrize("expression", ["100/0", "100/00", "100/0.0", "100/.0", "100/0."])
def test_add_refuses_a_zero_divisor_as_usage(tmp_path: Path, expression: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    before = ledger.read_bytes()

    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "dz",
        "--date",
        "2026-02-01",
        "-p",
        f"Expenses:X {expression} EUR",
        "-p",
        "Assets:Cash",
    )

    assert result.returncode == 2, result.stderr
    assert "Division by zero" in result.stderr
    assert expression in result.stderr
    # Refused at the boundary, so the engine is never asked and never crashes.
    assert "killed by" not in result.stderr
    assert ledger.read_bytes() == before


@pytest.mark.parametrize(
    ("expression", "written"),
    [("84/2", "42"), ("3*5", "15"), ("(2+3)*4", "20"), ("100/0.5", "200"), ("100/10", "10")],
)
def test_add_still_evaluates_ordinary_arithmetic(tmp_path: Path, expression: str, written: str) -> None:
    """The guard must not catch a divisor that merely starts with a zero."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")

    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "ok",
        "--date",
        "2026-02-01",
        "-p",
        f"Expenses:X {expression} EUR",
        "-p",
        "Assets:Cash",
    )

    assert result.returncode == 0, result.stderr
    # The writer aligns amount columns, so compare on collapsed whitespace.
    posted = " ".join(ledger.read_text(encoding="utf-8").split())
    assert f"Expenses:X {written} EUR" in posted


# --- a ledger already containing one: report it, inside the exit table --------


def test_check_reports_the_crash_instead_of_exiting_139_in_silence(tmp_path: Path) -> None:
    ledger = tmp_path / "dz.bean"
    ledger.write_text(DIVIDE_BY_ZERO, encoding="utf-8")

    result = _bea(tmp_path, "--file", str(ledger), "check")

    # 139 is 128 + SIGSEGV, outside the documented 0-4 table.
    assert result.returncode == 1, f"exit {result.returncode}"
    assert result.stdout == ""
    assert "SIGSEGV" in result.stderr
    assert "/0" in result.stderr


def test_json_check_names_the_signal_rather_than_a_raw_negative_exit(tmp_path: Path) -> None:
    ledger = tmp_path / "dz.bean"
    ledger.write_text(DIVIDE_BY_ZERO, encoding="utf-8")

    result = _bea(tmp_path, "--json", "--file", str(ledger), "check")

    assert result.returncode == 1
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "validation"
    assert error["exit_code"] == 1
    assert "SIGSEGV" in error["message"]
    assert "exit -11" not in error["message"]
    assert any("/0" in detail for detail in error["details"])


@pytest.mark.parametrize("command", [("list", "transaction"), ("balance",), ("report", "trial-balance")])
def test_helper_commands_name_the_signal(tmp_path: Path, command: tuple[str, ...]) -> None:
    ledger = tmp_path / "dz.bean"
    ledger.write_text(DIVIDE_BY_ZERO, encoding="utf-8")

    result = _bea(tmp_path, "--file", str(ledger), *command)

    assert result.returncode == 1
    assert result.stdout == ""
    assert "SIGSEGV" in result.stderr
    assert "exit -11" not in result.stderr


@pytest.mark.parametrize("command", [("doctor", "lex"), ("format",)])
def test_commands_that_never_parse_the_expression_still_work(tmp_path: Path, command: tuple[str, ...]) -> None:
    """The lexer and the formatter do not evaluate arithmetic, so they must be unaffected."""
    ledger = tmp_path / "dz.bean"
    ledger.write_text(DIVIDE_BY_ZERO, encoding="utf-8")

    result = _bea(tmp_path, *command, str(ledger))

    assert result.returncode == 0, result.stderr
    assert result.stdout != ""


# --- any signal death, not just this crash ------------------------------------


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
def test_a_child_killed_from_outside_is_reported_not_forwarded(tmp_path: Path) -> None:
    """SIGTERM used to come back as a silent exit 143."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    engine = _stub_engine(tmp_path, "SIGTERM")

    result = _bea(tmp_path, "--file", str(ledger), "check", engine=engine)

    assert result.returncode == 1, f"exit {result.returncode}"
    assert "SIGTERM" in result.stderr
    # A kill from outside is not an upstream parser crash, so it must not
    # suggest hunting for a zero divisor.
    assert "/0" not in result.stderr
    assert "out-of-memory" in result.stderr


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
def test_interrupt_keeps_the_shell_convention_and_stays_quiet(tmp_path: Path) -> None:
    """Ctrl-C is not a failure to explain: the user already knows, and 130 is what a shell reports."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    engine = _stub_engine(tmp_path, "SIGINT")

    result = _bea(tmp_path, "--file", str(ledger), "check", engine=engine)

    assert result.returncode == 128 + int(signal.SIGINT)
    assert "killed by" not in result.stderr
