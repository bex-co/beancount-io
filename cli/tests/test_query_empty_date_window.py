"""A BQL window of zero days is refused, not answered with (no rows) (w3/372)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD

2024-03-10 * "Lunch"
  Expenses:Food   12.00 USD
  Assets:Cash    -12.00 USD

2024-03-12 * "Dinner"
  Expenses:Food   20.00 USD
  Assets:Cash    -20.00 USD
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
        timeout=60,
    )


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def test_same_day_window_is_refused_with_the_inclusive_alternatives(tmp_path: Path) -> None:
    result = _bea(
        tmp_path,
        "--file",
        str(_ledger(tmp_path)),
        "query",
        "SELECT date, narration FROM OPEN ON 2024-03-10 CLOSE ON 2024-03-10",
    )
    assert result.returncode == 2
    assert "covers no days" in result.stderr
    assert "CLOSE ON 2024-03-11" in result.stderr
    assert "--from-date 2024-03-10 --to-date 2024-03-10" in result.stderr
    assert "(no rows)" not in result.stderr


def test_the_refusal_reaches_json_callers(tmp_path: Path) -> None:
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(_ledger(tmp_path)),
        "query",
        "SELECT date FROM OPEN ON 2024-03-10 CLOSE ON 2024-03-10",
    )
    assert result.returncode == 2
    # --json puts the envelope on stdout and errors on stderr.
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "covers no days" in error["message"]


def test_reversed_window_is_refused(tmp_path: Path) -> None:
    result = _bea(
        tmp_path,
        "--file",
        str(_ledger(tmp_path)),
        "query",
        "SELECT date FROM OPEN ON 2024-03-12 CLOSE ON 2024-03-10",
    )
    assert result.returncode == 2
    assert "covers no days" in result.stderr


def test_the_suggested_window_returns_that_day(tmp_path: Path) -> None:
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(_ledger(tmp_path)),
        "query",
        'SELECT date, narration FROM OPEN ON 2024-03-10 CLOSE ON 2024-03-11 WHERE narration ~ "Lunch"',
    )
    assert result.returncode == 0, result.stderr
    rows = json.loads(result.stdout)["data"]["rows"]
    assert rows and all(row[0] == "2024-03-10" for row in rows)


def test_queries_without_a_date_window_are_untouched(tmp_path: Path) -> None:
    ledger = str(_ledger(tmp_path))
    for query in ("SELECT count(*)", "SELECT date FROM OPEN ON 2024-03-01", ".tables"):
        result = _bea(tmp_path, "--file", ledger, "query", query)
        assert result.returncode == 0, f"{query}: {result.stderr}"


def test_an_empty_but_real_window_still_answers_no_rows(tmp_path: Path) -> None:
    result = _bea(
        tmp_path,
        "--file",
        str(_ledger(tmp_path)),
        "query",
        'SELECT date FROM OPEN ON 2024-03-11 CLOSE ON 2024-03-12 WHERE narration ~ "Nothing"',
    )
    assert result.returncode == 0, result.stderr
    assert "(no rows)" in result.stderr
