"""Human tables honor the ledger's display precision and bound conversions (w3/304, w3/365)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

from cli.commands.report import _quantize

ROOT = Path(__file__).resolve().parents[1]
WHOLE = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking
2024-01-01 open Expenses:Food
2024-01-02 * "whole"
  Expenses:Food  10 USD
  Assets:Checking
"""
CENTS = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking
2024-01-01 open Expenses:Food
2024-01-02 * "cents"
  Expenses:Food  10.50 USD
  Assets:Checking
"""
CONVERT = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking
2024-01-01 open Expenses:Food
2024-01-02 price HOOL 3 USD
2024-01-02 * "whole"
  Expenses:Food  10 USD
  Assets:Checking
"""


@pytest.fixture
def books(tmp_path: Path) -> Path:
    (tmp_path / "whole.bean").write_text(WHOLE)
    (tmp_path / "cents.bean").write_text(CENTS)
    (tmp_path / "conv.bean").write_text(CONVERT)
    return tmp_path


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


def test_zero_fraction_ledger_renders_whole_numbers(books: Path) -> None:
    result = _bea(books, "--file", str(books / "whole.bean"), "balance")

    assert result.returncode == 0, result.stderr
    assert "10 USD" in result.stdout
    assert "10.00 USD" not in result.stdout


def test_cents_ledger_still_renders_cents(books: Path) -> None:
    result = _bea(books, "--file", str(books / "cents.bean"), "balance")

    assert result.returncode == 0, result.stderr
    assert "10.50 USD" in result.stdout


def test_conversion_to_an_unknown_currency_is_bounded(books: Path) -> None:
    result = _bea(books, "--file", str(books / "conv.bean"), "report", "balance-sheet", "--conversion", "HOOL")

    assert result.returncode == 0, result.stderr
    assert "3.33 HOOL" in result.stdout
    assert "3.3333" not in result.stdout


def test_conversion_json_stays_exact(books: Path) -> None:
    result = _bea(
        books,
        "--json",
        "--file",
        str(books / "conv.bean"),
        "report",
        "balance-sheet",
        "--conversion",
        "HOOL",
    )

    assert result.returncode == 0, result.stderr
    net_worth = json.loads(result.stdout)["data"]["net_worth"]
    assert net_worth == {"HOOL": "-3.333333333333333333333333333"}


def test_quantize_without_precision_passes_values_through() -> None:
    assert _quantize(Decimal("4.9050"), "USD", None) == Decimal("4.9050")


@pytest.mark.parametrize("spelling", ["NaN", "Infinity", "-Infinity"])
def test_quantize_passes_non_finite_values_through(spelling: str) -> None:
    """Rounding a non-finite value would raise, so it reaches the table as is."""
    number = Decimal(spelling)

    assert _quantize(number, "USD", {"USD": 2}) is number
