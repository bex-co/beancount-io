"""Init and custom values accept decimal spellings without silently rewriting other notation."""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Custom, Transaction
from typer.testing import CliRunner

from bea_engine import initiating
from bea_engine.amounts import parse_decimal_number as engine_decimal_number
from bea_engine.protocol import UsageError as EngineUsageError
from cli.amounts import parse_decimal_number
from cli.errors import UsageError
from cli.main import app

runner = CliRunner()
DAY = "2026-01-01"
BASE = 'option "operating_currency" "USD"\n2026-01-01 open Assets:Checking USD\n'


def _scientific_message(number: str) -> str:
    return (
        f"Scientific notation {number!r} is not supported in Beancount amounts. "
        "Use decimal notation, such as '1000' instead of '1e3'."
    )


def _assert_notation_message(message: str, number: str) -> None:
    if number in {"1e3", "1E3"}:
        assert _scientific_message(number) in message
    elif number not in {"NaN", "Infinity"}:
        assert "decimal notation" in message
        assert "ASCII" in message


def _balances(file: Path) -> dict[str, Decimal]:
    entries, errors, _ = loader.load_file(file)
    assert not errors
    opening = next(entry for entry in entries if isinstance(entry, Transaction))
    return {posting.account: posting.units.number for posting in opening.postings}


@pytest.mark.parametrize("number", ["1_000e3", "1e_3", ".5e+2"])
def test_scalar_exponent_diagnostics_agree_across_the_engine_boundary(number: str) -> None:
    with pytest.raises(UsageError) as frontend:
        parse_decimal_number(number)
    with pytest.raises(ValueError) as engine:
        engine_decimal_number(number)
    assert str(frontend.value) == str(engine.value) == _scientific_message(number)


@pytest.mark.parametrize("number", ["1e3", "1_000", "٥٠", "NaN", "Infinity"])
def test_init_flags_refuse_invalid_notation_without_creating_a_destination(tmp_path: Path, number: str) -> None:
    destination = tmp_path / "new-books"

    result = runner.invoke(
        app,
        [
            "--json",
            "--no-input",
            "init",
            str(destination),
            "--currency",
            "USD",
            "--date",
            DAY,
            "--opening-balance",
            f"Assets:Checking {number}",
        ],
    )

    assert result.exit_code == 2, result.output
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    _assert_notation_message(error["message"], number)
    assert not destination.exists()


@pytest.mark.parametrize(("invalid", "valid"), [("1e3", "1000"), ("1_000", "1000"), ("٥٠", "50")])
def test_opening_balance_prompt_retries_instead_of_silently_normalizing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, invalid: str, valid: str
) -> None:
    monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)
    destination = tmp_path / "books"

    result = runner.invoke(
        app,
        ["init", str(destination), "--currency", "USD", "--date", DAY],
        input=f"{invalid}\n{valid}\n",
    )

    assert result.exit_code == 0, result.output
    assert result.output.count("Checking opening balance") == 2
    _assert_notation_message(result.output, invalid)
    assert _balances(destination / "main.bean")["Assets:Checking"] == Decimal(valid)


@pytest.mark.parametrize("number", ["1e3", "1_000", "٥٠", "Infinity"])
def test_engine_init_refuses_the_same_notation_before_creating_directories(tmp_path: Path, number: str) -> None:
    destination = tmp_path / "engine-books" / "main.bean"

    with pytest.raises(EngineUsageError) as raised:
        initiating.answer(destination, currency="USD", date=DAY, opening_balances=[f"Assets:Checking {number}"])

    _assert_notation_message(str(raised.value), number)
    if number == "1e3":
        assert str(raised.value) == _scientific_message(number)
    assert not destination.parent.exists()


@pytest.mark.parametrize(
    ("value", "number"),
    [
        ("number:1e3", "1e3"),
        ("amount:1E3 USD", "1E3"),
        ("number:1_000", "1_000"),
        ("amount:1_000 USD", "1_000"),
        ("number:٥٠", "٥٠"),
        ("amount:٥٠ USD", "٥٠"),
        ("number:1 000", "1 000"),
        ("number:NaN", "NaN"),
        ("amount:Infinity USD", "Infinity"),
    ],
)
def test_custom_numeric_values_refuse_invalid_notation_without_writing(tmp_path: Path, value: str, number: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(BASE)
    before = ledger.read_bytes()

    result = runner.invoke(
        app,
        ["--json", "--file", str(ledger), "add", "custom", "--date", DAY, "--type", "budget", "--value", value],
    )

    assert result.exit_code == 2, result.output
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    _assert_notation_message(error["message"], number)
    if number in {"1e3", "1E3"}:
        assert error["message"] == _scientific_message(number)
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("entrypoint", ["cli", "engine"])
def test_init_keeps_signed_fractional_and_tiny_ascii_balances(tmp_path: Path, entrypoint: str) -> None:
    ledger = tmp_path / "books" / "main.bean"
    balances = ["  Assets:Checking   +12.50  ", "Liabilities:CreditCard -.5", "Assets:Cash 0.00000001"]
    if entrypoint == "engine":
        initiating.answer(ledger, currency="USD", date=DAY, opening_balances=balances)
    else:
        result = runner.invoke(
            app,
            [
                "--json",
                "--no-input",
                "init",
                str(ledger),
                "--currency",
                "USD",
                "--date",
                DAY,
                *(arg for balance in balances for arg in ("--opening-balance", balance)),
            ],
        )
        assert result.exit_code == 0, result.output
    actual = _balances(ledger)
    assert actual["Assets:Checking"] == Decimal("12.50")
    assert actual["Liabilities:CreditCard"] == Decimal("-0.5")
    assert actual["Assets:Cash"] == Decimal("0.00000001")
    assert "1E-8" not in ledger.read_text()


def test_custom_keeps_ascii_signs_fractional_values_whitespace_and_tiny_values(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(BASE)
    values = ["number:  +12.50  ", "number:-.5", "number:0.00000001", "amount:+.25 USD"]

    result = runner.invoke(
        app,
        [
            "--json",
            "--file",
            str(ledger),
            "add",
            "custom",
            "--date",
            DAY,
            "--type",
            "budget",
            *(arg for value in values for arg in ("--value", value)),
        ],
    )

    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(ledger)
    assert not errors
    custom = next(entry for entry in entries if isinstance(entry, Custom))
    assert [value.value for value in custom.values[:3]] == [Decimal("12.50"), Decimal("-0.5"), Decimal("0.00000001")]
    assert custom.values[3].value.number == Decimal("0.25")
    assert custom.values[3].value.currency == "USD"
