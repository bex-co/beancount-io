"""Calculated allocation fractions do not set a cents ledger's display precision (w5/946).

A plugin dividing a 10.00 USD expense over three months leaves each copy at the
source line with `3.333333333333333333333333333`. Posting amounts without
booking's `__automatic__` mark all counted as written, so every USD figure in
the human reports printed 27 places. JSON keeps the exact values.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_import_source_facts import _bea
from tests.test_init_creates_missing_ledger import _bea as _human_bea

PLUGIN = """from beancount.core.data import Transaction
from datetime import date
from decimal import Decimal

__plugins__ = ("allocate",)

def allocate(entries, options):
    output = []
    for entry in entries:
        if not isinstance(entry, Transaction) or entry.narration != "Quarterly insurance":
            output.append(entry)
            continue
        for month in (1, 2, 3):
            postings = [p._replace(units=p.units._replace(number=p.units.number / Decimal(3))) for p in entry.postings]
            output.append(entry._replace(date=date(2024, month, 15), postings=postings))
    return output, []
"""
LEDGER = """option "insert_pythonpath" "TRUE"
plugin "allocations"
option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-01 open Expenses:Insurance USD
2024-01-02 * "Opening"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
2024-01-15 * "Quarterly insurance"
  Expenses:Insurance {amount} USD
  Assets:Cash -{amount} USD
"""


def _books(tmp_path: Path, amount: str = "10.00") -> None:
    (tmp_path / "allocations.py").write_text(PLUGIN)
    (tmp_path / "main.bean").write_text(LEDGER.format(amount=amount))


def _text(tmp_path: Path, *args: str) -> str:
    """The human report: the shared runner adds `--json`, this one does not."""
    result = _human_bea(tmp_path, "-f", str(tmp_path / "main.bean"), *args)
    assert result.returncode == 0, result.stderr
    return result.stdout


def _json(tmp_path: Path, *args: str) -> dict[str, object]:
    result = _bea(tmp_path, *args)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]  # type: ignore[no-any-return]


def test_human_reports_print_the_written_cents(tmp_path: Path) -> None:
    _books(tmp_path)

    for report in ("income-statement", "balance-sheet", "trial-balance", "overview"):
        out = _text(tmp_path, "report", report, "--time", "2024-01")
        digits = {
            len(token.split(".")[1])
            for token in out.replace("\\n", " ").split()
            if token.count(".") == 1 and token.split(".")[1].isdigit()
        }
        assert not digits or max(digits) <= 2, (report, out)


def test_json_keeps_the_exact_fractions(tmp_path: Path) -> None:
    _books(tmp_path)

    data = _json(tmp_path, "report", "income-statement", "--time", "2024-01")

    assert data["net_profit"]["USD"] == "-3.333333333333333333333333333"


def test_a_genuinely_written_fine_amount_keeps_its_precision(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Fine USD\n'
        '2024-01-15 * "Fine"\n  Expenses:Fine 0.000123 USD\n  Assets:Cash -0.000123 USD\n'
    )

    out = _text(tmp_path, "report", "income-statement", "--time", "2024-01")

    assert "0.000123 USD" in out or "-0.000123 USD" in out


def test_an_explicit_display_precision_still_wins(tmp_path: Path) -> None:
    _books(tmp_path)
    (tmp_path / "main.bean").write_text(
        LEDGER.format(amount="10.00").replace(
            'option "operating_currency"', 'option "display_precision" "USD:0.0001"\noption "operating_currency"'
        )
    )

    out = _text(tmp_path, "report", "income-statement", "--time", "2024-01")

    assert "3.3333 USD" in out
