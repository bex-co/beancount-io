"""An amount marked negative twice is refused, not booked as money in (w1/153).

`(-5.00)` and `-5.00-` carry a minus sign *and* a parentheses or trailing-minus
negation. The parser applied both, so the cell imported as `+5.00` — a payment
booked as a deposit, balanced and passing `bea check`.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest
from typer.testing import CliRunner

from bea_engine.csv_mapper import _parse_amount_cell
from bea_engine.protocol import UsageError
from cli.main import app

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
"""
DOUBLE = ["(-5.00)", "-5.00-", "(5.00-)", "($-5.00)", "-$5.00-"]


@pytest.mark.parametrize("cell", DOUBLE)
def test_a_double_negative_cell_is_refused(cell: str) -> None:
    with pytest.raises(UsageError, match="marked negative twice"):
        _parse_amount_cell("Row 1 (line 2)", "Amount", cell, decimal_comma=False)


@pytest.mark.parametrize("cell", ["(5.00)", "5.00-", "-$5.00", "$-5.00", "-5.00", "(+5.00)", "+5.00-"])
def test_one_negative_marker_still_parses(cell: str) -> None:
    assert _parse_amount_cell("Row 1 (line 2)", "Amount", cell, decimal_comma=False) == Decimal("-5.00")


@pytest.mark.parametrize("cell", DOUBLE[:2])
def test_import_refuses_the_row_and_writes_nothing(tmp_path: Path, bea_config_dir: Path, cell: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    source = tmp_path / "a.csv"
    source.write_text(f'Date,Description,Amount\n2026-08-01,Fine,-1.00\n2026-08-02,Rent,"{cell}"\n')
    result = CliRunner().invoke(
        app,
        [
            "--json",
            "--no-input",
            "--file",
            str(ledger),
            "import",
            str(source),
            "--csv",
            "date=Date,amount=Amount,narration=Description",
            "--account",
            "Assets:Checking",
            "--apply",
        ],
    )
    assert result.exit_code == 2, result.output
    message = json.loads(result.stderr)["error"]["message"]
    assert message.startswith(f"Row 2 (line 3): amount {cell!r} in column 'Amount' is marked negative twice")
    assert ledger.read_text() == LEDGER
