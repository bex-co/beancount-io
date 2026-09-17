"""Amount strings follow the same decimal-notation rule on every input surface (w5/007)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest
from beancount import loader
from beancount.core.data import Transaction
from pydantic import ValidationError

from bea_engine.amounts import require_decimal_notation
from bea_engine.ledger.models import Amount, Cost, TransactionDirective
from cli.commands.add import _check_decimal_notation
from cli.errors import UsageError

CLI_ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking
2026-01-01 open Assets:Stock AAPL
2026-01-01 open Expenses:Food USD
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _bea(ledger: Path, *args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    # conftest's autouse fixture supplies isolated config/cache/data directories.
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), *args],
        cwd=ledger.parent,
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src"), "NO_COLOR": "1", "TERM": "dumb"},
        input=stdin,
        capture_output=True,
        text=True,
        timeout=20,
    )


def _row(field: str, number: str | float, narration: str = "Amount") -> dict[str, Any]:
    posting: dict[str, Any] = {"account": "Expenses:Food"}
    if field == "amount":
        posting["amount"] = f"{number} USD"
    elif field == "units":
        posting["units"] = {"number": number, "currency": "USD"}
    else:
        posting |= {"account": "Assets:Stock", "units": {"number": "1", "currency": "AAPL"}}
        posting[field] = {"number": number, "currency": "USD"}
    return {
        "date": "2026-01-02",
        "narration": narration,
        "postings": [posting, {"account": "Assets:Checking"}],
    }


def _field_path(field: str) -> str:
    return f"postings.0.{'units' if field == 'amount' else field}.number"


@pytest.mark.parametrize("number", ["1e3", "1E+21", "1e-7", "-2.5e3"])
@pytest.mark.parametrize("field", ["amount", "units", "cost", "price"])
def test_exponent_amount_strings_fail_at_their_schema_field(field: str, number: str) -> None:
    with pytest.raises(ValidationError) as raised:
        TransactionDirective.model_validate(_row(field, number))

    errors = raised.value.errors(include_url=False, include_input=False)
    assert len(errors) == 1
    assert ".".join(str(part) for part in errors[0]["loc"]) == _field_path(field)
    assert "decimal notation" in errors[0]["msg"]


@pytest.mark.parametrize("number", [0.3, 3.0, 0.30000000000000004])
@pytest.mark.parametrize("field", ["units", "cost", "price"])
def test_float_amounts_fail_at_their_schema_field(field: str, number: float) -> None:
    with pytest.raises(ValidationError) as raised:
        TransactionDirective.model_validate(_row(field, number))

    errors = raised.value.errors(include_url=False, include_input=False)
    assert len(errors) == 1
    assert ".".join(str(part) for part in errors[0]["loc"]) == _field_path(field)
    assert "decimal string" in errors[0]["msg"]
    assert f"'{number}'" in errors[0]["msg"]


def test_float_amount_shorthand_is_rejected_as_a_string() -> None:
    row = _row("amount", "2")
    row["postings"][0]["amount"] = 0.3

    with pytest.raises(ValidationError, match="must be a string"):
        TransactionDirective.model_validate(row)


@pytest.mark.parametrize("field", ["units", "cost", "price"])
def test_bulk_floats_name_the_row_and_leave_the_ledger_unchanged(ledger: Path, field: str) -> None:
    source = ledger.parent / "rows.json"
    source.write_text(json.dumps([_row("amount", "2", "Valid"), _row(field, 0.3, "Rejected")]))
    before = ledger.read_bytes()

    result = _bea(ledger, "add", "transactions", "--from", str(source))

    assert result.returncode == 1, result.stderr
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "validation"
    assert any(
        detail.startswith(f"Row 2, {_field_path(field)}:") and "decimal string" in detail and "'0.3'" in detail
        for detail in error["details"]
    )
    assert error["result"] == {"written": 0, "written_rows": [], "rejected_rows": [1]}
    assert ledger.read_bytes() == before


def test_bulk_string_and_int_amounts_write_exactly(ledger: Path) -> None:
    rows = [
        _row("units", "0.3", "String"),
        {
            "date": "2026-01-03",
            "narration": "Int",
            "postings": [
                {"account": "Expenses:Food", "units": {"number": 3, "currency": "USD"}},
                {"account": "Assets:Checking"},
            ],
        },
    ]
    source = ledger.parent / "rows.json"
    source.write_text(json.dumps(rows))

    result = _bea(ledger, "add", "transactions", "--from", str(source))

    assert result.returncode == 0, result.stderr
    entries, errors, _ = loader.load_file(ledger)
    assert not errors
    transactions = [entry for entry in entries if isinstance(entry, Transaction)]
    assert [entry.postings[0].units.number for entry in transactions] == [Decimal("0.3"), Decimal("3")]
    assert "0.30000000000000004" not in ledger.read_text()


def test_exponent_refusal_matches_across_the_process_boundary() -> None:
    with pytest.raises(ValueError, match="Scientific notation") as engine:
        require_decimal_notation("1e2")
    with pytest.raises(UsageError) as frontend:
        _check_decimal_notation("1e2 USD")

    assert str(frontend.value) == str(engine.value)


@pytest.mark.parametrize("field", ["amount", "units", "cost", "price"])
def test_bulk_rejections_name_the_row_and_leave_the_ledger_unchanged(ledger: Path, field: str) -> None:
    source = ledger.parent / "rows.json"
    source.write_text(json.dumps([_row("amount", "2", "Valid"), _row(field, "1e3", "Rejected")]))
    before = ledger.read_bytes()

    result = _bea(ledger, "add", "transactions", "--from", str(source))

    assert result.returncode == 1, result.stderr
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "validation"
    assert any(
        detail.startswith(f"Row 2, {_field_path(field)}:") and "decimal notation" in detail
        for detail in error["details"]
    )
    assert error["result"] == {"written": 0, "written_rows": [], "rejected_rows": [1]}
    assert ledger.read_bytes() == before


def test_partial_bulk_keeps_valid_rows_and_original_indexes(ledger: Path) -> None:
    rows = [
        _row("amount", "2", "First valid"),
        _row("units", "1e-7", "Rejected"),
        _row("amount", "0.0000001", "Last valid"),
    ]

    result = _bea(ledger, "add", "transactions", "--from", "-", "--partial", stdin=json.dumps(rows))

    assert result.returncode == 1, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["result"] == {"written": 2, "written_rows": [0, 2], "rejected_rows": [1]}
    assert any("Row 2, postings.0.units.number:" in detail for detail in error["details"])
    entries, errors, _ = loader.load_file(ledger)
    assert not errors
    transactions = [entry for entry in entries if isinstance(entry, Transaction)]
    assert [entry.narration for entry in transactions] == ["First valid", "Last valid"]
    assert [entry.postings[0].units.number for entry in transactions] == [Decimal("2"), Decimal("0.0000001")]


@pytest.mark.parametrize(
    ("header", "valid", "invalid", "mapping", "column"),
    [
        ("Amount", "2", "1e3", "amount=Amount", "Amount"),
        ("Debit,Credit", "2,", "1E+21,", "debit=Debit,credit=Credit", "Debit"),
        ("Debit,Credit", ",2", ",1e-7", "debit=Debit,credit=Credit", "Credit"),
    ],
)
def test_csv_exponents_name_the_row_and_column_before_any_write(
    ledger: Path, header: str, valid: str, invalid: str, mapping: str, column: str
) -> None:
    source = ledger.parent / "bank.csv"
    source.write_text(f"Date,Payee,{header}\n2026-01-02,Valid,{valid}\n2026-01-03,Rejected,{invalid}\n")
    before = ledger.read_bytes()

    result = _bea(
        ledger,
        "import",
        str(source),
        "--csv",
        f"date=Date,payee=Payee,{mapping}",
        "--account",
        "Assets:Checking",
        "--default-account",
        "Expenses:Food",
        "--apply",
    )

    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "Row 3" in error["message"] and repr(column) in error["message"]
    assert "decimal notation" in error["message"]
    assert ledger.read_bytes() == before


@pytest.mark.parametrize(
    "args",
    [
        ["transaction", "-p", "Assets:Checking 1e3 USD", "-p", "Expenses:Food"],
        ["transaction", "-p", "Assets:Checking 1E3", "-p", "Expenses:Food"],
        ["transaction", "-p", "Assets:Stock 1 AAPL {1e3 USD}", "-p", "Assets:Checking"],
        ["transaction", "-p", "Assets:Stock 1 AAPL @ 1e3 USD", "-p", "Assets:Checking"],
        ["balance", "--date", "2026-01-02", "--account", "Assets:Checking", "--amount", "1e3 USD"],
        ["price", "--date", "2026-01-02", "--currency", "EUR", "--amount", "1e3 USD"],
    ],
)
def test_argv_keeps_rejecting_exponents_before_native_parsing(ledger: Path, args: list[str]) -> None:
    before = ledger.read_bytes()

    result = _bea(ledger, "add", *args)

    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "decimal notation" in error["message"]
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("model", [Amount, Cost])
@pytest.mark.parametrize("number", ["0.0000001", Decimal("0.0000001"), Decimal("1E+21")])
def test_amount_json_preserves_values_without_introducing_exponent_strings(
    model: type[Amount] | type[Cost], number: str | Decimal
) -> None:
    amount = model.model_validate({"number": number, "currency": "USD"})

    serialized = amount.model_dump(mode="json")

    assert serialized["number"] == format(Decimal(number), "f")
    assert model.model_validate(serialized) == amount


def test_tiny_decimal_transactions_survive_listing_and_bulk_reimport(ledger: Path) -> None:
    rows = [_row("units", "0.0000001", "Original tiny value")]
    added = _bea(ledger, "add", "transactions", "--from", "-", stdin=json.dumps(rows))
    assert added.returncode == 0, added.stderr

    listed = _bea(ledger, "list", "transaction")
    assert listed.returncode == 0, listed.stderr
    copies = json.loads(listed.stdout)["data"]
    assert copies[0]["postings"][0]["units"]["number"] == "0.0000001"
    copies[0]["date"] = "2026-01-03"
    copies[0]["narration"] = "Copied tiny value"

    copied = _bea(ledger, "add", "transactions", "--from", "-", stdin=json.dumps(copies))

    assert copied.returncode == 0, copied.stderr
    entries, errors, _ = loader.load_file(ledger)
    assert not errors
    transactions = [entry for entry in entries if isinstance(entry, Transaction)]
    assert [entry.narration for entry in transactions] == ["Original tiny value", "Copied tiny value"]
    assert [entry.postings[0].units.number for entry in transactions] == [Decimal("0.0000001")] * 2


def test_native_arithmetic_and_quoted_exponent_text_remain_valid(ledger: Path) -> None:
    result = _bea(
        ledger,
        "add",
        "transaction",
        "Arithmetic",
        "--date",
        "2026-01-02",
        "-p",
        "Expenses:Food (84/2) USD",
        "-p",
        "Assets:Checking",
        "--meta",
        'label:"1e3"',
    )

    assert result.returncode == 0, result.stderr
    entries, errors, _ = loader.load_file(ledger)
    assert not errors
    transaction = next(entry for entry in entries if isinstance(entry, Transaction))
    assert transaction.meta["label"] == "1e3"
    assert [posting.units.number for posting in transaction.postings] == [Decimal("42"), Decimal("-42")]
