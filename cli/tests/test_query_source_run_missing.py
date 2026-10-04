"""Native `query --source` fails when a stored query is missing (w1/043).

Native one-shots went straight to `bean-query`, whose `.run` prints
`error: query "x" not found` and returns, so `bea query --source main.bean
'.run missing'` exited 0 — automation could not tell an unavailable query from
an empty answer. The one-shot now runs upstream's shell on the native source
inside the engine, where `.run` classifies that failure as a usage error
(exit 2, naming the stored queries that exist), and an `--output` export is
only replaced after the query succeeds. Native sources, rendering and empty
results are unchanged.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """2025-01-01 open Assets:Cash USD
2025-01-01 open Equity:Opening USD
2025-01-02 * "opening"
  Assets:Cash 1 USD
  Equity:Opening -1 USD
2025-01-03 query "saved" "SELECT 2 AS n"
2025-01-03 query "multi" "SELECT 1; SELECT 2"
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        [sys.executable, "-m", "cli.main", "--no-input", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


@pytest.mark.parametrize("spelling", ["{path}", "beancount:{path}"], ids=["path", "uri"])
def test_missing_stored_query_exits_2(tmp_path: Path, ledger: Path, spelling: str) -> None:
    before = ledger.read_bytes()
    result = _bea(tmp_path, "query", "--source", spelling.format(path=ledger), ".run missing")

    assert result.returncode == 2, result.stdout + result.stderr
    assert 'query "missing" not found' in result.stderr
    assert "multi, saved" in result.stderr
    assert "Traceback" not in result.stderr
    assert result.stdout == ""
    assert ledger.read_bytes() == before


def test_too_many_run_arguments_exit_2(tmp_path: Path, ledger: Path) -> None:
    result = _bea(tmp_path, "query", "--source", str(ledger), ".run saved extra")

    assert result.returncode == 2, result.stdout + result.stderr
    assert 'too many arguments for "run"' in result.stderr


def test_stored_statement_tail_exits_2(tmp_path: Path, ledger: Path) -> None:
    result = _bea(tmp_path, "query", "--source", str(ledger), ".run multi")

    assert result.returncode == 2, result.stdout + result.stderr
    assert "One BQL statement per" in result.stderr
    assert result.stdout == ""


def test_invalid_bql_is_a_usage_error_not_a_traceback(tmp_path: Path, ledger: Path) -> None:
    result = _bea(tmp_path, "query", "--source", str(ledger), "SELECT nosuch")

    assert result.returncode == 2, result.stdout + result.stderr
    assert 'column "nosuch" not found' in result.stderr
    assert "Traceback" not in result.stderr


@pytest.mark.parametrize("spelling", ["{path}", "beancount:{path}"], ids=["path", "uri"])
def test_existing_stored_query_still_answers(tmp_path: Path, ledger: Path, spelling: str) -> None:
    result = _bea(tmp_path, "query", "--source", spelling.format(path=ledger), ".run saved")

    assert result.returncode == 0, result.stderr
    assert "2" in result.stdout.split()
    assert result.stderr == ""


def test_empty_valid_answer_is_still_success(tmp_path: Path, ledger: Path) -> None:
    result = _bea(tmp_path, "query", "--source", str(ledger), "SELECT account WHERE account = 'Assets:Nope'")

    assert result.returncode == 0, result.stderr
    assert "error" not in result.stderr


def test_listing_stored_queries_still_succeeds(tmp_path: Path, ledger: Path) -> None:
    result = _bea(tmp_path, "query", "--source", str(ledger), ".run")

    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == ["multi", "saved"]


def test_missing_query_preserves_an_existing_export(tmp_path: Path, ledger: Path) -> None:
    export = tmp_path / "export.txt"
    export.write_text("previous export\n")
    result = _bea(tmp_path, "query", "--source", str(ledger), "--output", str(export), ".run missing")

    assert result.returncode == 2, result.stdout + result.stderr
    assert export.read_text() == "previous export\n"


def test_existing_query_exports_to_output(tmp_path: Path, ledger: Path) -> None:
    export = tmp_path / "export.txt"
    export.write_text("previous export\n")
    os.chmod(export, 0o640)
    result = _bea(tmp_path, "query", "--source", str(ledger), "--output", str(export), ".run saved")

    assert result.returncode == 0, result.stderr
    assert result.stdout == ""
    assert "2" in export.read_text().split()
    assert export.stat().st_mode & 0o777 == 0o640


def test_csv_source_still_answers(tmp_path: Path) -> None:
    (tmp_path / "t.csv").write_text("a,b\n1,2\n")
    result = _bea(tmp_path, "query", "--source", f"csv:{tmp_path / 't.csv'}", "SELECT a FROM t")

    assert result.returncode == 0, result.stderr
    assert "1" in result.stdout.split()


def test_interactive_missing_query_is_reported_and_recoverable(tmp_path: Path, ledger: Path) -> None:
    with QueryTerminal(tmp_path, ["query", "--source", str(ledger)]) as shell:
        shell.read("beanquery>")
        shell.send(".run missing")
        reported = shell.read("beanquery>")
        assert 'query "missing" not found' in reported
        assert "multi, saved" in reported
        shell.send(".run saved")
        assert "\n2\n" in shell.read("beanquery>")
        assert shell.finish() == 0
        assert "Traceback" not in shell.screen
