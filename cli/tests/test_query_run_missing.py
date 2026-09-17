"""Missing `.run` stored queries must be usage failures (w3/236)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 query "cash" "SELECT account WHERE account ~ 'Checking'"
2024-01-01 * "seed"
  Assets:Bank:Checking  1 USD
  Equity:Opening-Balances
"""


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
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_run_missing_is_usage_error(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    human = _bea(tmp_path, "--file", str(ledger), "query", ".run missing")
    assert human.returncode == 2, human.stderr
    assert "not found" in human.stderr.casefold()
    assert "cash" in human.stderr

    as_json = _bea(tmp_path, "--json", "--file", str(ledger), "query", ".run missing")
    assert as_json.returncode == 2, as_json.stderr
    error = json.loads(as_json.stderr)["error"]
    assert error["category"] == "usage"
    assert "not found" in error["message"].casefold()
    assert "syntax error" not in error["message"].casefold()


def test_run_known_query_succeeds(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--file", str(ledger), "query", ".run cash")
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip()


@pytest.mark.parametrize("blank", ["   ", "\n", "\t"])
@pytest.mark.parametrize("mode", ["human", "csv", "json"])
def test_blank_query_is_usage_error(tmp_path: Path, blank: str, mode: str) -> None:
    """A whitespace-only argv query is refused like whitespace on stdin (w3/262)."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    args = ["--json"] if mode == "json" else []
    args += ["--file", str(ledger), "query"]
    if mode == "csv":
        args += ["--format", "csv"]
    result = _bea(tmp_path, *args, blank)
    assert result.returncode == 2, result.stderr
    assert "A query is required as an argument or on stdin." in result.stderr


def test_one_shot_output_refuses_with_guidance(tmp_path: Path) -> None:
    """A one-shot `.output` names `--output FILE` instead of writing emptiness (w3/277)."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    target = tmp_path / "out.txt"
    result = _bea(tmp_path, "--file", str(ledger), "query", f".output {target}")
    assert result.returncode == 2, result.stderr
    assert "--output FILE" in result.stderr
    assert not target.exists()
    control = _bea(tmp_path, "--file", str(ledger), "query", "--output", str(target), "SELECT account LIMIT 1")
    assert control.returncode == 0, control.stderr
    assert "Assets:Bank:Checking" in target.read_text()


@pytest.mark.parametrize("query", ["SELECT account LIMIT 1", "SELECT account WHERE false"])
def test_beancount_format_refuses_empty_column_results(tmp_path: Path, query: str) -> None:
    """Emptiness must not hide an incompatible `--format beancount` (w3/269)."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--file", str(ledger), "query", "--format", "beancount", query)
    assert result.returncode == 2, result.stderr
    assert "must return entries" in result.stderr


def test_beancount_format_still_renders_entries(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    printed = _bea(tmp_path, "--file", str(ledger), "query", "--format", "beancount", "PRINT")
    assert printed.returncode == 0, printed.stderr
    assert "Assets:Bank:Checking" in printed.stdout
    text = _bea(tmp_path, "--file", str(ledger), "query", "--format", "text", "SELECT account WHERE false")
    assert text.returncode == 0, text.stderr
    assert "(no rows)" in text.stderr


def test_multi_statement_query_is_refused(tmp_path: Path) -> None:
    """A second top-level statement is named, not silently dropped (w3/282)."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--file", str(ledger), "query", "SELECT account LIMIT 1; SELECT narration LIMIT 1")
    assert result.returncode == 2, result.stderr
    assert "One BQL statement per invocation; got 2." in result.stderr
    as_json = _bea(
        tmp_path, "--json", "--file", str(ledger), "query", "SELECT account LIMIT 1; SELECT narration LIMIT 1"
    )
    assert as_json.returncode == 2, as_json.stderr
    assert json.loads(as_json.stderr)["error"]["category"] == "usage"


def test_trailing_and_quoted_semicolons_stay_green(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    trailing = _bea(tmp_path, "--file", str(ledger), "query", "SELECT account LIMIT 1;")
    assert trailing.returncode == 0, trailing.stderr
    quoted = _bea(tmp_path, "--file", str(ledger), "query", 'SELECT narration WHERE narration ~ "a;b" LIMIT 5')
    assert quoted.returncode == 0, quoted.stderr
