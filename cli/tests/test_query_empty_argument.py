"""An explicitly empty query argument is a usage error, not a missing one (w5/110).

`bea query ""` tested the argument for truthiness, so an empty string was
handled like an omitted argument: on a terminal it opened the interactive
`beanquery>` prompt and waited, and with piped stdin it ran whatever the pipe
carried. A script line such as `bea query "$Q"` with `Q` unset therefore
stalled or ran the wrong query instead of getting the documented exit 2. Only
an omitted argument reads stdin or opens the shell now; `""` takes the same
refusal as a whitespace-only query, on `--file` and on native `--source`, before
any `--output` file is opened.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-05 * "Cafe" "Coffee"
  Expenses:Food  4.00 USD
  Assets:Checking
"""
REFUSAL = "A query is required as an argument or on stdin."
KEPT = "kept by the caller\n"


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _target(mode: str, ledger: Path) -> tuple[list[str], list[str]]:
    """Global and command arguments selecting the ledger for one branch."""
    if mode == "file":
        return ["-f", str(ledger)], []
    return [], ["--source", str(ledger)]


def _bea(tmp_path: Path, *args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        input=stdin,
        stdin=subprocess.DEVNULL if stdin is None else None,
    )


@pytest.mark.parametrize("mode", ["file", "source"])
@pytest.mark.parametrize("blank", ["", " "], ids=["empty", "whitespace"])
def test_blank_argument_on_a_terminal_is_refused_without_a_prompt(
    tmp_path: Path, ledger: Path, mode: str, blank: str
) -> None:
    before = ledger.read_bytes()
    global_args, command_args = _target(mode, ledger)
    with QueryTerminal(tmp_path, [*global_args, "query", *command_args, blank]) as terminal:
        screen = terminal.read(REFUSAL)
        status = terminal.process.wait(timeout=30)
    assert status == 2, screen
    assert "beanquery>" not in terminal.screen
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("mode", ["file", "source"])
def test_empty_argument_does_not_fall_back_to_piped_stdin(tmp_path: Path, ledger: Path, mode: str) -> None:
    global_args, command_args = _target(mode, ledger)
    result = _bea(tmp_path, *global_args, "query", *command_args, "", stdin="SELECT 73 AS n\n")
    assert result.returncode == 2, result.stdout + result.stderr
    assert REFUSAL in result.stderr
    assert result.stdout == ""


@pytest.mark.parametrize("mode", ["file", "source"])
def test_empty_argument_leaves_an_existing_output_file_untouched(tmp_path: Path, ledger: Path, mode: str) -> None:
    out = tmp_path / "out.txt"
    out.write_text(KEPT)
    global_args, command_args = _target(mode, ledger)
    with QueryTerminal(tmp_path, [*global_args, "query", *command_args, "", "-o", str(out)]) as terminal:
        screen = terminal.read(REFUSAL)
        status = terminal.process.wait(timeout=30)
    assert status == 2, screen
    assert "beanquery>" not in terminal.screen
    assert out.read_text() == KEPT


@pytest.mark.parametrize("mode", ["file", "source"])
def test_omitted_argument_still_opens_the_shell(tmp_path: Path, ledger: Path, mode: str) -> None:
    global_args, command_args = _target(mode, ledger)
    with QueryTerminal(tmp_path, [*global_args, "query", *command_args]) as shell:
        shell.read("beanquery>")
        shell.send("SELECT 73 AS n")
        assert "73" in (line.strip() for line in shell.read("beanquery>").splitlines())
        assert shell.finish() == 0


@pytest.mark.parametrize("mode", ["file", "source"])
def test_omitted_argument_still_reads_piped_stdin(tmp_path: Path, ledger: Path, mode: str) -> None:
    global_args, command_args = _target(mode, ledger)
    result = _bea(tmp_path, *global_args, "query", *command_args, stdin="SELECT 73 AS n\n")
    assert result.returncode == 0, result.stderr
    assert "73" in result.stdout
