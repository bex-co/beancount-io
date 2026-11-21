"""A number written without its leading zero (`.5`) reads as 0.5 in every `bea add` (w1/347).

`add price`, bulk `.5 USD` cells, `add custom` and `init --opening-balance`
already wrote `.5` as `0.5`. `add transaction --posting` and `add balance
--amount` handed the text to Beancount's grammar, which has no leading-dot
number, and refused it with a bare `Invalid token: '.5'`; so did a bulk row's
lot or price fragment. What `bea` writes keeps the zero, because the file
grammar still refuses `.5`.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Balance, Transaction
from typer.testing import CliRunner

from bea_engine.amounts import with_leading_zeros
from cli.main import app

runner = CliRunner()
BASE = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Checking USD\n"
    "2026-01-01 open Assets:Broker\n"
    "2026-01-01 open Expenses:Food USD\n"
)


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(BASE)
    return path


def _bea(ledger: Path, *args: str) -> object:
    return runner.invoke(app, ["--json", "--no-input", "--file", str(ledger), *args])


def _loaded(ledger: Path) -> list:
    entries, errors, _ = loader.load_file(ledger)
    assert not errors, errors
    return entries


def _transaction(ledger: Path, narration: str, *postings: str) -> Transaction:
    args = ["add", "transaction", narration, "--date", "2026-03-01"]
    result = _bea(ledger, *args, *[part for posting in postings for part in ("-p", posting)])
    assert result.exit_code == 0, result.output
    return next(entry for entry in _loaded(ledger) if isinstance(entry, Transaction))


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        (".5 USD", "0.5 USD"),
        ("-.5 USD", "-0.5 USD"),
        ("+.25 USD", "+0.25 USD"),
        (".5 HOOL {.5 USD} @ .75 USD", "0.5 HOOL {0.5 USD} @ 0.75 USD"),
        ("-1 HOOL {} @@ .5USD", "-1 HOOL {} @@ 0.5USD"),
        ("-.5 ~ .5 USD", "-0.5 ~ 0.5 USD"),
        ("(.5+.25)*2/.5 USD", "(0.5+0.25)*2/0.5 USD"),
        # Text and the dots inside names, tags, links and numbers stay as typed.
        ('1 HOOL {2 USD, "lot .5"}', '1 HOOL {2 USD, "lot .5"}'),
        ('"say \\" .5"', '"say \\" .5"'),
        ("1 USD ; .5 later", "1 USD ; .5 later"),
        ("1.5 USD", "1.5 USD"),
        ("1..5", "1..5"),
        ("#trip.5 ^inv.5 Assets:.5 X'.5", "#trip.5 ^inv.5 Assets:.5 X'.5"),
        ("Café.5", "Café.5"),
    ],
)
def test_a_number_without_its_zero_is_given_one_and_nothing_else_changes(text: str, expected: str) -> None:
    assert with_leading_zeros(text) == expected


def test_a_posting_writes_units_without_their_zero_with_one(ledger: Path) -> None:
    entry = _transaction(ledger, "Coffee", "Expenses:Food .5 USD", "Assets:Checking")

    assert "  Expenses:Food  0.5 USD\n" in ledger.read_text()
    assert [posting.units.number for posting in entry.postings] == [Decimal("0.5"), Decimal("-0.5")]


def test_a_signed_posting_keeps_its_sign(ledger: Path) -> None:
    entry = _transaction(ledger, "Refund", "Expenses:Food -.5 USD", "Assets:Checking +.5 USD")

    written = ledger.read_text()[len(BASE) :]
    assert "-0.5 USD" in written
    assert ".5" not in written.replace("0.5", "")
    assert [posting.units.number for posting in entry.postings] == [Decimal("-0.5"), Decimal("0.5")]


def test_a_cost_price_and_total_without_their_zero_are_read(ledger: Path) -> None:
    lot = '.5 HOOL {.5 USD, "lot .5"} @ .75 USD'
    entry = _transaction(ledger, "Café .5", f"Assets:Broker {lot}", "Assets:Checking")

    text = ledger.read_text()
    # The narration and the lot label are text: they keep their `.5`.
    assert '* "Café .5"\n' in text
    assert '0.5 HOOL {0.5 USD, "lot .5"} @ 0.75 USD' in text
    bought = entry.postings[0]
    assert (bought.units.number, bought.cost.number, bought.price.number) == (Decimal("0.5"),) * 2 + (Decimal("0.75"),)


def test_a_total_price_without_its_zero_stays_a_total(ledger: Path) -> None:
    # The `@@` total is read from the line, so the probe of a glued `.5USD`
    # must see the zero too, or it fell back to the divided `@` price.
    _transaction(ledger, "Sell", "Assets:Broker -3 HOOL @@ .5USD", "Assets:Checking")

    assert "-3 HOOL @@ 0.5 USD" in ledger.read_text()


def test_a_refusal_quotes_the_posting_as_typed(ledger: Path) -> None:
    result = _bea(
        ledger,
        "add",
        "transaction",
        "Split",
        "--date",
        "2026-03-01",
        "-p",
        "Expenses:Food .5/3 USD",
        "-p",
        "Assets:Checking",
    )

    assert result.exit_code == 2, result.output
    message = json.loads(result.stderr)["error"]["message"]
    assert "--posting 1 'Expenses:Food .5/3 USD' does not divide exactly" in message
    assert ledger.read_text() == BASE


@pytest.mark.parametrize(
    ("amount", "line", "number", "tolerance"),
    [
        (".5 USD", "balance Assets:Checking 0.5 USD", Decimal("0.5"), None),
        (".4 ~ .1 USD", "balance Assets:Checking 0.4 ~ 0.1 USD", Decimal("0.4"), Decimal("0.1")),
    ],
)
def test_a_balance_amount_and_tolerance_without_their_zero_are_read(
    ledger: Path, amount: str, line: str, number: Decimal, tolerance: Decimal | None
) -> None:
    _transaction(ledger, "Deposit", "Assets:Checking .5 USD", "Expenses:Food")

    result = _bea(ledger, "add", "balance", "--date", "2026-03-05", "-a", "Assets:Checking", "--amount", amount)

    assert result.exit_code == 0, result.output
    # The writer aligns the amount column, so compare the words.
    assert f"2026-03-05 {line}" in " ".join(ledger.read_text().split())
    balance = next(entry for entry in _loaded(ledger) if isinstance(entry, Balance))
    assert (balance.amount.number, balance.tolerance) == (number, tolerance)


@pytest.mark.parametrize(
    ("amount", "written"),
    [(".5 HOOL {100 USD}", "0.5 HOOL {100 USD}"), ("2 HOOL @@ .5 USD", "2 HOOL @@ 0.5 USD")],
)
def test_a_bulk_lot_or_price_fragment_without_its_zero_is_read(
    ledger: Path, tmp_path: Path, amount: str, written: str
) -> None:
    rows = tmp_path / "rows.json"
    posting = {"account": "Assets:Broker", "amount": amount}
    rows.write_text(
        json.dumps([{"date": "2026-03-02", "narration": "Buy", "postings": [posting, {"account": "Assets:Checking"}]}])
    )

    result = _bea(ledger, "add", "transactions", "--from", str(rows))

    assert result.exit_code == 0, result.output
    assert written in ledger.read_text()
    _loaded(ledger)


def test_the_price_path_already_wrote_the_zero(ledger: Path) -> None:
    result = _bea(ledger, "add", "price", "--date", "2026-03-01", "-c", "EUR", "--amount", ".5 USD")

    assert result.exit_code == 0, result.output
    assert "price EUR  0.5 USD" in ledger.read_text()
