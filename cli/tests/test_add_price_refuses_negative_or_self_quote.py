"""A negative quote, or a commodity quoted in itself, is refused before any write (w1/277).

Beancount refuses a negative price on a posting but parses one on a `price`
directive, so `add price --amount '-250 USD'` wrote at exit 0, `bea check`
passed, and holdings were valued below zero. `-c USD --amount '1 USD'` wrote a
self-quote that values nothing. A configured importer's price rows refuse the
same quotes; a zero quote stays allowed for a delisted security.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = """\
option "operating_currency" "USD"
2024-01-01 commodity VTI
2024-01-01 open Assets:Broker:VTI VTI
2024-01-01 open Assets:Cash USD
2024-01-02 * "buy"
  Assets:Broker:VTI  10 VTI {100 USD}
  Assets:Cash  -1000 USD
"""

IMPORTER = """\
import datetime
from decimal import Decimal
from beancount.core import amount, data


class Quotes:
    name = "quotes"

    def identify(self, filepath):
        return filepath.endswith("stmt.txt")

    def account(self, filepath):
        return "Assets:Broker"

    def extract(self, filepath, existing):
        out = []
        for line, text in enumerate(open(filepath).read().split(), start=1):
            commodity, number, currency = text.split(":")
            out.append(
                data.Price(
                    data.new_metadata(filepath, line),
                    datetime.date(2024, 1, 3),
                    commodity,
                    amount.Amount(Decimal(number), currency),
                )
            )
        return out


CONFIG = [Quotes()]
"""


@pytest.fixture
def ledger(tmp_path: Path, bea_config_dir: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _add_price(ledger: Path, commodity: str, amount: str, *, json_output: bool = False) -> Any:
    args = ["--json"] if json_output else []
    return runner.invoke(
        app,
        [*args, "--no-input", "--file", str(ledger), "add", "price", "--date", "2024-01-03"]
        + ["-c", commodity, "--amount", amount],
    )


def test_a_negative_quote_is_refused_and_nothing_is_written(ledger: Path) -> None:
    result = _add_price(ledger, "VTI", "-250 USD")
    assert result.exit_code == 2, result.output
    assert "Negative prices are not allowed: -250 USD" in result.output
    assert ledger.read_text() == LEDGER


def test_json_returns_the_usage_error_envelope(ledger: Path) -> None:
    result = _add_price(ledger, "VTI", "-250 USD", json_output=True)
    assert result.exit_code == 2, result.output
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "Negative prices are not allowed: -250 USD" in error["message"]
    assert ledger.read_text() == LEDGER


def test_a_commodity_quoted_in_itself_is_refused(ledger: Path) -> None:
    result = _add_price(ledger, "USD", "1 USD")
    assert result.exit_code == 2, result.output
    assert "A price of USD in USD values nothing" in result.output
    assert ledger.read_text() == LEDGER


@pytest.mark.parametrize("amount", ["0 USD", "250 USD"])
def test_a_zero_or_positive_quote_is_still_written(ledger: Path, amount: str) -> None:
    result = _add_price(ledger, "VTI", amount)
    assert result.exit_code == 0, result.output
    assert "2024-01-03 price VTI" in ledger.read_text()
    assert amount.split()[0] in ledger.read_text().rsplit("price VTI", 1)[1]


def _import(ledger: Path, quotes: str, *args: str) -> Any:
    books = ledger.parent
    (books / "imp.py").write_text(IMPORTER)
    (books / "stmt.txt").write_text(quotes)
    return runner.invoke(
        app,
        ["--json", "--no-input", "--file", str(ledger), "import", str(books / "stmt.txt")]
        + ["--config", str(books / "imp.py"), *args],
    )


def test_import_marks_a_negative_or_self_quote_row_invalid(ledger: Path) -> None:
    preview = _import(ledger, "VTI:-250:USD USD:1:USD VTI:0:USD")
    data = json.loads(preview.stdout).get("data") or json.loads(preview.stdout)["error"]["result"]
    rows = [(row["status"], row["reason"]) for row in data["rows"]]
    assert rows[0] == ("invalid", "Negative prices are not allowed: -250 USD.")
    assert rows[1][0] == "invalid" and "values nothing" in rows[1][1]
    assert rows[2][0] == "new"
    assert data["invalid"] == 2

    applied = _import(ledger, "VTI:-250:USD USD:1:USD VTI:0:USD", "--apply")
    assert applied.exit_code == 1, applied.output
    assert "Row 1: Negative prices are not allowed" in applied.output
    assert ledger.read_text() == LEDGER


def test_import_still_writes_a_valid_quote(ledger: Path) -> None:
    applied = _import(ledger, "VTI:250:USD", "--apply")
    assert applied.exit_code == 0, applied.output
    assert "2024-01-03 price VTI" in ledger.read_text()
