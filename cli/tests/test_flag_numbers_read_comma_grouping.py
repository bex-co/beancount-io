"""`add price`, `add custom` and `init --opening-balance` read `65,432.10` as `add balance` does (w5/290)."""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Balance, Custom, Price, Transaction
from typer.testing import CliRunner

from bea_engine import initiating
from bea_engine.amounts import parse_decimal_number as engine_decimal_number
from bea_engine.protocol import UsageError as EngineUsageError
from cli.amounts import parse_decimal_number
from cli.errors import UsageError
from cli.main import app

runner = CliRunner()
DAY = "2026-03-01"
BASE = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Cash USD\n"
    "2026-01-01 open Equity:Opening\n"
    "2026-01-01 commodity BTC\n"
    '2026-01-02 * "Opening"\n'
    "  Assets:Cash        70000.00 USD\n"
    "  Equity:Opening\n"
)
MALFORMED = ["65,43", "12,34,567", "1234,567", "1,2345", ",123", "1,234,", "1,,234", "1,234.5,6"]


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(BASE)
    return ledger


def _entries(ledger: Path) -> list:
    entries, errors, _ = loader.load_file(ledger)
    assert not errors
    return entries


def _price(ledger: Path, amount: str) -> object:
    return runner.invoke(
        app, ["--json", "--file", str(ledger), "add", "price", "--date", DAY, "-c", "BTC", "--amount", amount]
    )


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("65,432.10", "65432.10"),
        ("1,000", "1000"),
        ("-1,234,567.", "-1234567"),
        ("+999,000.5", "999000.5"),
        ("  1,000.00  ", "1000.00"),
    ],
)
def test_grouping_in_threes_is_dropped_on_both_sides_of_the_engine_boundary(text: str, expected: str) -> None:
    assert format(parse_decimal_number(text), "f") == format(engine_decimal_number(text), "f") == expected


@pytest.mark.parametrize("text", MALFORMED)
def test_any_other_comma_is_refused_naming_the_separators_on_both_sides(text: str) -> None:
    with pytest.raises(UsageError) as frontend:
        parse_decimal_number(text)
    with pytest.raises(ValueError) as engine:
        engine_decimal_number(text)
    assert str(frontend.value) == str(engine.value)
    assert repr(text) in str(frontend.value)
    assert "thousands separator" in str(frontend.value)


@pytest.mark.parametrize("text", ["4,50", "1.234,56", "1,5000", "1.234.567,89", "-12,34"])
def test_a_decimal_comma_keeps_the_separator_advice_on_both_sides(text: str) -> None:
    with pytest.raises(UsageError) as frontend:
        parse_decimal_number(text)
    with pytest.raises(ValueError) as engine:
        engine_decimal_number(text)
    assert str(frontend.value) == str(engine.value)
    assert "thousands separator" in str(frontend.value)


@pytest.mark.parametrize("text", ["$1,500.00", "~1,500", "1,500.5.5", "1,234..5", "1,500 USD", "1,000-", "€1,000"])
def test_a_well_grouped_number_refused_for_something_else_is_not_told_about_separators(text: str) -> None:
    """The comma advice is for a comma that is the obstacle; these group correctly (w1/370)."""
    with pytest.raises(UsageError) as frontend:
        parse_decimal_number(text)
    with pytest.raises(ValueError) as engine:
        engine_decimal_number(text)
    assert str(frontend.value) == str(engine.value)
    assert repr(text) in str(frontend.value)
    assert "thousands separator" not in str(frontend.value)
    assert "Use finite decimal notation with ASCII digits" in str(frontend.value)


def test_add_price_writes_a_grouped_quote_ungrouped(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = _price(ledger, "65,432.10 USD")

    assert result.exit_code == 0, result.output
    assert "price BTC" in ledger.read_text()
    assert "65432.10 USD" in ledger.read_text()
    price = next(entry for entry in _entries(ledger) if isinstance(entry, Price))
    assert (price.currency, price.amount.number, price.amount.currency) == ("BTC", Decimal("65432.10"), "USD")


@pytest.mark.parametrize("number", ["65,43", "12,34,567"])
def test_add_price_refuses_a_decimal_comma_without_writing(tmp_path: Path, number: str) -> None:
    ledger = _ledger(tmp_path)

    result = _price(ledger, f"{number} USD")

    assert result.exit_code == 2, result.output
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "thousands separator" in error["message"]
    assert ledger.read_text() == BASE


def test_add_custom_reads_grouped_number_and_amount_values(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = runner.invoke(
        app,
        ["--json", "--file", str(ledger), "add", "custom", "--date", DAY, "--type", "budget"]
        + ["--value", "number:1,500", "--value", "amount:-2,000,000.50 USD"],
    )

    assert result.exit_code == 0, result.output
    custom = next(entry for entry in _entries(ledger) if isinstance(entry, Custom))
    assert custom.values[0].value == Decimal("1500")
    assert custom.values[1].value.number == Decimal("-2000000.50")
    assert "," not in ledger.read_text()[len(BASE) :]


@pytest.mark.parametrize("entrypoint", ["cli", "engine"])
def test_init_reads_a_grouped_opening_balance(tmp_path: Path, entrypoint: str) -> None:
    ledger = tmp_path / "books" / "main.bean"
    if entrypoint == "engine":
        initiating.answer(ledger, currency="USD", date="2026-01-01", opening_balances=["Assets:Checking 1,000.00"])
    else:
        result = runner.invoke(
            app,
            ["--json", "--no-input", "init", str(ledger), "--currency", "USD", "--date", "2026-01-01"]
            + ["--opening-balance", "Assets:Checking 1,000.00"],
        )
        assert result.exit_code == 0, result.output

    opening = next(entry for entry in _entries(ledger) if isinstance(entry, Transaction))
    balances = {posting.account: posting.units.number for posting in opening.postings}
    assert balances["Assets:Checking"] == Decimal("1000.00")
    assert "1000.00 USD" in ledger.read_text()


@pytest.mark.parametrize("entrypoint", ["cli", "engine"])
def test_init_refuses_a_decimal_comma_without_creating_a_destination(tmp_path: Path, entrypoint: str) -> None:
    ledger = tmp_path / "books" / "main.bean"
    if entrypoint == "engine":
        with pytest.raises(EngineUsageError) as raised:
            initiating.answer(ledger, currency="USD", date="2026-01-01", opening_balances=["Assets:Checking 1,50"])
        message = str(raised.value)
    else:
        result = runner.invoke(
            app,
            ["--json", "--no-input", "init", str(ledger), "--currency", "USD", "--date", "2026-01-01"]
            + ["--opening-balance", "Assets:Checking 1,50"],
        )
        assert result.exit_code == 2, result.output
        message = json.loads(result.stderr)["error"]["message"]

    assert "thousands separator" in message
    assert not ledger.parent.exists()


def test_opening_balance_prompt_reads_grouping_and_retries_a_decimal_comma(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)
    monkeypatch.setattr("cli.context._stderr_is_a_terminal", lambda: True)
    destination = tmp_path / "books"

    result = runner.invoke(
        app, ["init", str(destination), "--currency", "USD", "--date", "2026-01-01"], input="1,50\n1,000.00\n"
    )

    assert result.exit_code == 0, result.output
    assert result.output.count("Checking opening balance") == 2
    assert "thousands separator" in result.output
    opening = next(entry for entry in _entries(destination / "main.bean") if isinstance(entry, Transaction))
    assert {p.account: p.units.number for p in opening.postings}["Assets:Checking"] == Decimal("1000.00")


def test_controls_plain_price_and_grouped_balance_are_unchanged(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    plain = _price(ledger, "65432.10 USD")
    balance = runner.invoke(
        app,
        ["--json", "--file", str(ledger), "add", "balance", "--date", DAY, "-a", "Assets:Cash"]
        + ["--amount", "70,000.00 USD"],
    )

    assert plain.exit_code == 0, plain.output
    assert balance.exit_code == 0, balance.output
    entries = _entries(ledger)
    assert next(e for e in entries if isinstance(e, Price)).amount.number == Decimal("65432.10")
    assert next(e for e in entries if isinstance(e, Balance)).amount.number == Decimal("70000.00")


@pytest.mark.parametrize("number", ["1_000", "1e3", "٥٠", "1 000", "NaN"])
def test_the_other_refused_spellings_keep_their_messages(number: str) -> None:
    with pytest.raises(UsageError) as raised:
        parse_decimal_number(number)
    assert "thousands separator" not in str(raised.value)


@pytest.mark.parametrize(
    ("row", "path"),
    [
        ({"account": "Assets:Cash", "units": {"number": "1,000.00", "currency": "USD"}}, "postings.0.units.number"),
        (
            {"account": "Assets:Cash", "amount": "1 USD", "meta": {"note": {"kind": "number", "value": "1,500"}}},
            "postings.0.meta.note",
        ),
    ],
)
def test_structured_bulk_numbers_still_take_no_grouping(tmp_path: Path, row: dict, path: str) -> None:
    ledger = _ledger(tmp_path)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps([{"date": DAY, "narration": "x", "postings": [row, {"account": "Equity:Opening"}]}]))

    result = runner.invoke(app, ["--json", "--file", str(ledger), "add", "transactions", "--from", str(rows)])

    assert result.exit_code == 1, result.output
    details = json.loads(result.stderr)["error"]["details"]
    assert any(path in detail and "ASCII digits" in detail for detail in details), details
    assert ledger.read_text() == BASE
