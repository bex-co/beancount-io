"""A posting held at a cost or priced in its own commodity is refused before any write (w1/278).

`-p 'Expenses:Food 10 USD @ 2 USD'` balances by weight (20 USD), so Beancount
accepted it: exit 0, `bea check` passed, and the account gained 10 USD while
20 USD left the bank, so the books stopped summing to zero. Only a defaulted
commodity was compared with its rate (w5/098); a typed one never was. Bulk
rows, `bea ask`'s approved text and configured-importer rows refuse the same
postings; a rate in another commodity is still written.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from bea_engine import protocol
from bea_engine.ledger import appending
from cli.main import app

runner = CliRunner()

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Broker
2026-01-01 open Assets:Euro EUR
2026-01-01 open Expenses:Food
2026-01-01 open Equity:Opening
2026-01-02 * "open"
  Assets:Bank 1000 USD
  Equity:Opening
"""

IMPORTER = """\
import datetime
from decimal import Decimal
from beancount.core import amount, data, position


class Lunches:
    name = "lunches"

    def identify(self, filepath):
        return filepath.endswith("stmt.txt")

    def account(self, filepath):
        return "Assets:Bank"

    def extract(self, filepath, existing):
        out = []
        for line, text in enumerate(open(filepath).read().split(), start=1):
            currency, rate = text.split(":")
            meta = data.new_metadata(filepath, line)
            food = data.Posting(
                "Expenses:Food", amount.Amount(Decimal(10), currency), None,
                amount.Amount(Decimal(rate), "USD"), None, None,
            )
            spent = amount.Amount(Decimal(-10) * Decimal(rate), "USD")
            bank = data.Posting("Assets:Bank", spent, None, None, None, None)
            out.append(
                data.Transaction(meta, datetime.date(2026, 2, line), "*", None, f"Lunch {line}",
                                 data.EMPTY_SET, data.EMPTY_SET, [food, bank])
            )
        return out


CONFIG = [Lunches()]
"""


@pytest.fixture
def ledger(tmp_path: Path, bea_config_dir: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _add(ledger: Path, *postings: str, json_output: bool = False) -> Any:
    args = ["--json"] if json_output else []
    flags = [part for posting in postings for part in ("-p", posting)]
    return runner.invoke(
        app,
        [*args, "--no-input", "--file", str(ledger), "add", "transaction", "Lunch", "--date", "2026-02-01", *flags],
    )


@pytest.mark.parametrize(
    ("posting", "kind"),
    [
        ("Expenses:Food 10 USD @ 2 USD", "priced"),
        ("Expenses:Food 10 USD @@ 20 USD", "priced"),
        ("Expenses:Food 10 USD @ 1 USD", "priced"),
        ("Expenses:Food 10 USD {2 USD}", "held at a cost"),
        ("Expenses:Food 10 USD {2 USD} @ 2 USD", "held at a cost and priced"),
    ],
)
def test_a_typed_self_rate_is_refused_and_nothing_is_written(ledger: Path, posting: str, kind: str) -> None:
    result = _add(ledger, posting, "Assets:Bank")
    assert result.exit_code == 2, result.output
    assert f"--posting 1 is {kind} in its own commodity USD" in result.output
    assert "Nothing was written." in result.output
    assert ledger.read_text() == LEDGER


def test_an_explicit_balancing_leg_does_not_help(ledger: Path) -> None:
    result = _add(ledger, "Assets:Bank -20 USD", "Expenses:Food 10 USD @ 2 USD")
    assert result.exit_code == 2, result.output
    assert "--posting 2 is priced in its own commodity USD" in result.output
    assert ledger.read_text() == LEDGER


def test_json_returns_the_usage_error_envelope(ledger: Path) -> None:
    result = _add(ledger, "Expenses:Food 10 USD @ 2 USD", "Assets:Bank", json_output=True)
    assert result.exit_code == 2, result.output
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert error["message"].startswith("--posting 1 is priced in its own commodity USD")
    assert ledger.read_text() == LEDGER


@pytest.mark.parametrize(
    "postings",
    [
        ("Assets:Euro 10 EUR @ 1.1 USD", "Assets:Bank"),
        ("Assets:Broker 5 ABC {10 USD}", "Assets:Bank"),
        ("Expenses:Food 10 USD", "Assets:Bank"),
    ],
)
def test_a_rate_in_another_commodity_is_still_written(ledger: Path, postings: tuple[str, str]) -> None:
    result = _add(ledger, *postings)
    assert result.exit_code == 0, result.output
    assert postings[0].split()[0] in ledger.read_text().split('"Lunch"', 1)[1]


def _bulk(ledger: Path, rows: list[dict[str, Any]]) -> Any:
    source = ledger.parent / "rows.json"
    source.write_text(json.dumps(rows))
    return runner.invoke(
        app, ["--no-input", "--file", str(ledger), "add", "transactions", "--from", str(source), "--partial"]
    )


def _row(food: dict[str, Any]) -> dict[str, Any]:
    return {
        "date": "2026-02-01",
        "narration": "Lunch",
        "postings": [{"account": "Expenses:Food", **food}, {"account": "Assets:Bank"}],
    }


def test_bulk_rows_with_a_self_rate_are_refused_per_row(ledger: Path) -> None:
    result = _bulk(
        ledger,
        [
            _row({"amount": "10 USD", "price": {"number": "2", "currency": "USD"}}),
            _row({"amount": "10 USD", "cost": {"number": "2", "currency": "USD"}}),
            _row({"amount": "10 USD", "price_total": {"number": "20", "currency": "USD"}}),
            _row({"amount": "10 USD @ 2 USD"}),
            _row({"amount": "10 USD"}),
        ],
    )
    assert result.exit_code == 1, result.output
    for row in (1, 2, 3, 4):
        assert f"Row {row}, postings.0" in result.output
    assert "Row 5" not in result.output
    assert "in its own commodity USD" in result.output
    written = ledger.read_text()[len(LEDGER) :]
    assert written.count('"Lunch"') == 1
    assert "@" not in written and "{" not in written


def test_ask_text_with_a_self_rate_is_refused(ledger: Path) -> None:
    text = '2026-02-01 * "Lunch"\n  Expenses:Food  10 USD @ 2 USD\n  Assets:Bank\n'
    with pytest.raises(protocol.UsageError) as refused:
        appending.answer(ledger, text, dry_run=True)
    assert str(refused.value).startswith("Write rejected: Expenses:Food is priced in its own commodity USD")
    assert ledger.read_text() == LEDGER


def _import(ledger: Path, rows: str, *args: str) -> Any:
    books = ledger.parent
    (books / "imp.py").write_text(IMPORTER)
    (books / "stmt.txt").write_text(rows)
    return runner.invoke(
        app,
        ["--json", "--no-input", "--file", str(ledger), "import", str(books / "stmt.txt")]
        + ["--config", str(books / "imp.py"), *args],
    )


def test_import_marks_a_self_rate_row_invalid(ledger: Path) -> None:
    preview = _import(ledger, "USD:2 EUR:1.1")
    data = json.loads(preview.stdout).get("data") or json.loads(preview.stdout)["error"]["result"]
    statuses = [row["status"] for row in data["rows"]]
    assert statuses == ["invalid", "new"]
    assert data["rows"][0]["reason"].startswith("Expenses:Food is priced in its own commodity USD")

    applied = _import(ledger, "USD:2 EUR:1.1", "--apply")
    assert applied.exit_code == 1, applied.output
    assert "Row 1: Expenses:Food is priced in its own commodity USD" in applied.output
    assert ledger.read_text() == LEDGER
