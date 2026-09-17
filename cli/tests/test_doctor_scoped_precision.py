"""`doctor region`/`linked` number the tree from the scope, not the ledger (w3/352)."""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
# 5.50 in scope; whole-dollar amounts everywhere else, so the ledger-wide
# display context infers zero fractional digits for USD.
CENTS_IN_SCOPE = """option "operating_currency" "USD"
2020-01-01 open Assets:Checking USD
2020-01-01 open Expenses:Food USD
2020-01-01 open Income:Job USD

2020-02-01 * "Coffee" ^coffee-feb
  Expenses:Food       5.50 USD
  Assets:Checking    -5.50 USD

2020-03-01 * "Paycheck"
  Assets:Checking   100 USD
  Income:Job       -100 USD

2020-04-01 * "Paycheck"
  Assets:Checking   200 USD
  Income:Job       -200 USD

2020-05-01 * "Paycheck"
  Assets:Checking   300 USD
  Income:Job       -300 USD
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


def _ledger(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text)
    return ledger


def _tree_amounts(stdout: str) -> set[str]:
    """The amounts on the tree lines, which is where the rounding showed."""
    return {
        match.group(1)
        for line in stdout.splitlines()
        if "--" in line
        for match in re.finditer(r"(-?[\d.,]+) USD", line)
    }


@pytest.mark.parametrize(
    ("op", "scope"),
    [("region", "6:8"), ("linked", "^coffee-feb")],
)
def test_the_tree_keeps_the_cents_the_scope_has(tmp_path: Path, op: str, scope: str) -> None:
    result = _bea(tmp_path, "doctor", op, str(_ledger(tmp_path, CENTS_IN_SCOPE)), scope)
    assert result.returncode == 0, result.stdout + result.stderr
    assert _tree_amounts(result.stdout) == {"-5.50", "5.50"}
    assert "Net Income: (-5.50 USD)" in result.stdout


def test_a_whole_number_scope_keeps_no_trailing_zeros(tmp_path: Path) -> None:
    ledger = _ledger(
        tmp_path,
        CENTS_IN_SCOPE.replace("2020-02-01", "2020-06-01").replace("5.50", "42").replace("Coffee", "Round"),
    )
    result = _bea(tmp_path, "doctor", "linked", str(ledger), "^coffee-feb")
    assert result.returncode == 0, result.stdout + result.stderr
    # The tree agrees with Net Income in this direction too.
    assert _tree_amounts(result.stdout) == {"-42", "42"}
    assert "Net Income: (-42 USD)" in result.stdout


def test_an_empty_scope_still_fails(tmp_path: Path) -> None:
    result = _bea(tmp_path, "doctor", "linked", str(_ledger(tmp_path, CENTS_IN_SCOPE)), "^nope")
    assert result.returncode == 1
    assert "matched no entries" in result.stderr


def test_upstream_usage_errors_are_still_upstream_s(tmp_path: Path) -> None:
    result = _bea(tmp_path, "doctor", "region", str(_ledger(tmp_path, CENTS_IN_SCOPE)), "not-a-region")
    assert result.returncode == 2
    assert "is not a valid region" in result.stdout + result.stderr


def test_conversion_is_still_forwarded(tmp_path: Path) -> None:
    result = _bea(tmp_path, "doctor", "region", str(_ledger(tmp_path, CENTS_IN_SCOPE)), "6:8", "--conversion", "cost")
    assert result.returncode == 0, result.stdout + result.stderr
    assert _tree_amounts(result.stdout) == {"-5.50", "5.50"}
