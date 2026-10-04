"""Native `query --source` honors the missing-query policy of `--no-input` (w1/040).

The `--source` branch dispatched to native Beanquery before the stdin/query and
no-input handling the `--file` branch runs. On a real terminal with
`--no-input` (or `CI`), the native shell printed its statistics and a
`beanquery>` prompt and waited for a human; with stdin closed and no query, it
exited 0 having run nothing. Both now fail with exit 2 before the engine starts,
while an explicit query, a piped query and ordinary interactive use still work.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Opening"
  Assets:Cash 1 USD
  Equity:Opening
"""
REFUSAL = "A query is required with --no-input"


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _bea(tmp_path: Path, *args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
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


@pytest.mark.parametrize(
    ("args", "env"),
    [
        (["--no-input"], {}),
        ([], {"CI": "1"}),
    ],
    ids=["no-input-flag", "ci-env"],
)
@pytest.mark.parametrize("spelling", ["{path}", "beancount:{path}"], ids=["path", "uri"])
def test_terminal_without_a_query_is_refused_without_a_prompt(
    tmp_path: Path, ledger: Path, args: list[str], env: dict[str, str], spelling: str
) -> None:
    before = ledger.read_bytes()
    with QueryTerminal(tmp_path, [*args, "query", "--source", spelling.format(path=ledger)], env=env) as terminal:
        screen = terminal.read()
        status = terminal.process.wait(timeout=30)
    assert status == 2, screen
    assert REFUSAL in screen
    assert "beanquery>" not in screen
    assert ledger.read_bytes() == before


def test_closed_stdin_without_a_query_is_a_usage_error(tmp_path: Path, ledger: Path) -> None:
    result = _bea(tmp_path, "--no-input", "query", "--source", str(ledger))
    assert result.returncode == 2, result.stdout + result.stderr
    assert "A query is required" in result.stderr
    assert result.stdout == ""


def test_explicit_and_piped_queries_still_answer(tmp_path: Path, ledger: Path) -> None:
    explicit = _bea(tmp_path, "--no-input", "query", "--source", str(ledger), "SELECT 73 AS n")
    assert explicit.returncode == 0, explicit.stderr
    assert "73" in explicit.stdout

    piped = _bea(tmp_path, "--no-input", "query", "--source", str(ledger), stdin="SELECT 74 AS n\n")
    assert piped.returncode == 0, piped.stderr
    assert "74" in piped.stdout


def test_explicit_query_on_a_terminal_still_answers(tmp_path: Path, ledger: Path) -> None:
    with QueryTerminal(tmp_path, ["--no-input", "query", "--source", str(ledger), "SELECT 73 AS n"]) as terminal:
        screen = terminal.read()
        status = terminal.process.wait(timeout=30)
    assert status == 0, screen
    assert "73" in screen
    assert "beanquery>" not in screen


def test_interactive_native_shell_still_opens(tmp_path: Path, ledger: Path) -> None:
    with QueryTerminal(tmp_path, ["query", "--source", str(ledger)]) as shell:
        shell.read("beanquery>")
        shell.send("SELECT 73 AS n")
        assert "73" in shell.read("beanquery>")
        assert shell.finish() == 0
