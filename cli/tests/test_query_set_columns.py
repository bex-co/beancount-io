"""DISTINCT/GROUP BY on tags and links explains itself and offers a recipe (w3/353)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD

2020-01-02 * "a" #grocery
  Expenses:Food   1.00 USD
  Assets:Cash    -1.00 USD

2020-01-03 * "b" #grocery #travel ^trip-1
  Expenses:Food   2.00 USD
  Assets:Cash    -2.00 USD
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


@pytest.mark.parametrize("column", ["tags", "links"])
def test_distinct_on_a_set_column_names_the_problem(tmp_path: Path, column: str) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "query", f"SELECT DISTINCT {column}")
    assert result.returncode == 2, result.stdout + result.stderr
    assert f"cannot use DISTINCT or GROUP BY on {column}" in result.stderr
    assert "joinstr(tags)" in result.stderr
    # The leaked Python compile error is gone.
    assert "starred expression" not in result.stderr


def test_group_by_a_set_column_carries_the_same_recipes(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "query", "SELECT tags, count(*) GROUP BY tags")
    assert result.returncode == 2, result.stdout + result.stderr
    assert "joinstr(tags)" in result.stderr
    assert "'grocery' IN tags" in result.stderr


def test_json_callers_get_the_recipes_in_details(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--json", "--file", str(_ledger(tmp_path)), "query", "SELECT DISTINCT tags")
    assert result.returncode == 2
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert any("joinstr(tags)" in detail for detail in error["details"])


def test_the_recommended_recipes_actually_work(tmp_path: Path) -> None:
    ledger = str(_ledger(tmp_path))
    combinations = _bea(tmp_path, "--json", "--file", ledger, "query", "SELECT DISTINCT joinstr(tags)")
    assert combinations.returncode == 0, combinations.stderr
    # joinstr orders set members unstably across runs, so compare by membership.
    rows = {frozenset(row[0].split(",")) for row in json.loads(combinations.stdout)["data"]["rows"]}
    assert rows == {frozenset({"grocery"}), frozenset({"grocery", "travel"})}

    one_tag = _bea(tmp_path, "--json", "--file", ledger, "query", "SELECT count(*) WHERE 'travel' IN tags")
    assert one_tag.returncode == 0, one_tag.stderr
    assert json.loads(one_tag.stdout)["data"]["rows"] == [[2]]


def test_distinct_on_an_ordinary_column_is_unchanged(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--json", "--file", str(_ledger(tmp_path)), "query", "SELECT DISTINCT account")
    assert result.returncode == 0, result.stderr
    rows = {row[0] for row in json.loads(result.stdout)["data"]["rows"]}
    assert rows == {"Assets:Cash", "Expenses:Food"}


def test_group_by_accounts_names_the_set_problem(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path, "--file", str(ledger), "query", "SELECT accounts, count(*) FROM transactions GROUP BY accounts"
    )
    assert result.returncode == 2, result.stderr
    assert "accounts" in result.stderr
    assert "issubclass" not in result.stderr
    assert "Traceback" not in result.stderr


def test_group_by_accounts_without_target_still_names_it(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--file", str(ledger), "query", "SELECT count(*) FROM transactions GROUP BY accounts")
    assert result.returncode == 2, result.stderr
    assert "accounts" in result.stderr
    assert "issubclass" not in result.stderr
