"""Regressions from sustained use of the CLI for everyday bookkeeping."""

import datetime
import json
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from typer.testing import CliRunner

from bea_engine.ledger import write as ledger_write
from cli.main import app

runner = CliRunner()


@pytest.fixture
def book(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text("""option "operating_currency" "USD"
2026-01-01 open Assets:Checking EUR,USD
2026-01-01 open Equity:OpeningBalances EUR,USD
2026-01-01 open Expenses:Food EUR,USD
2026-01-02 * "Opening"
  Assets:Checking 1538 EUR
  Equity:OpeningBalances -1538 EUR
2026-06-01 price EUR 1.10 USD
""")
    return file


@pytest.mark.parametrize("report", ["overview", "balance-sheet", "income-statement"])
def test_missing_price_diagnostics_summarize_one_line_per_commodity(book: Path, report: str) -> None:
    with book.open("a") as stream:
        stream.write('2026-01-15 * "Food"\n  Assets:Checking -10 EUR\n  Expenses:Food 10 EUR\n')
    command = ["--json", "-f", str(book), "report", report, "-x", "USD", "--time", "2026-01 - 2026-06"]
    result = runner.invoke(app, command)
    assert result.exit_code == 1, result.output
    error = json.loads(result.stderr)["error"]
    assert error["details"] == ["EUR → USD has no price before 2026-06-01; earlier rows shown in EUR"]
    assert not any("2026-06-30" in detail for detail in error["details"])
    assert {"from": "EUR", "to": "USD", "date": "2026-01-31"} in error["result"]["missing_price_dates"]
    partial = json.loads(runner.invoke(app, [*command, "--allow-errors"]).stdout)["data"]
    assert {"from": "EUR", "to": "USD", "date": "2026-01-31"} in partial["missing_price_dates"]
    with book.open("a") as stream:
        stream.write("2026-01-31 price EUR 1.05 USD\n")
    fixed = runner.invoke(app, command)
    assert fixed.exit_code == 0, fixed.output
    assert json.loads(fixed.stdout)["data"]["valuation"] == "complete"


@pytest.mark.parametrize("split", [False, True])
def test_readonly_destination_refuses_add_and_preserves_bytes(book: Path, split: bool) -> None:
    target = book
    if split:
        target = book.parent / "2026.bean"
        target.write_bytes(book.read_bytes())
        book.write_text('include "2026.bean"\n')
    before = target.read_bytes()
    target.chmod(0o444)
    try:
        result = runner.invoke(
            app,
            [
                "--json",
                "-f",
                str(book),
                "add",
                "transaction",
                "--date",
                "2026-06-02",
                "-p",
                "Assets:Checking -5 EUR",
                "-p",
                "Expenses:Food 5 EUR",
                *(["--into", "2026.bean"] if split else []),
            ],
        )
        assert result.exit_code == 3, result.output
        assert "read-only" in json.loads(result.stderr)["error"]["message"]
        assert target.read_bytes() == before
        assert target.stat().st_mode & 0o777 == 0o444
    finally:
        target.chmod(0o600)


def test_init_reprompts_without_losing_valid_answers(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)
    result = runner.invoke(
        app, ["init", str(tmp_path / "books")], input="?\nEUR\nbad date\n2026-01-01\noops\nNaN\n1538.25\n"
    )
    assert result.exit_code == 0, result.output
    entries, errors, options = loader.load_file(tmp_path / "books/main.bean")
    assert not errors
    assert options["operating_currency"] == ["EUR"]
    assert "1538.25 EUR" in (tmp_path / "books/main.bean").read_text()
    assert str(entries[0].date) == "2026-01-01"


@pytest.mark.parametrize(
    ("operation", "expected_exit"),
    [("format", 1), ("import", 3)],
)
def test_readonly_ledger_refuses_other_writes(book: Path, operation: str, expected_exit: int) -> None:
    args = ["format", str(book), "--in-place"]
    if operation == "import":
        source = book.parent / "bank.csv"
        source.write_text(
            "Date,Payee,Narration,Amount,Currency,Category,BankID\n2026-06-02,Cafe,Coffee,-5.25,EUR,Expenses:Food,bank-001\n"
        )
        config = Path(__file__).parents[1] / "docs/examples/csv_importers.py"
        args = ["-f", str(book), "import", str(source), "--config", str(config), "--apply"]
    before = book.read_bytes()
    book.chmod(0o444)
    try:
        result = runner.invoke(app, ["--json", *args])
        assert result.exit_code == expected_exit, result.output
        assert book.read_bytes() == before
    finally:
        book.chmod(0o600)


def test_permissions_changed_during_validation_are_respected(book: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Race coverage lives in the write module: `bea add` runs it in a child process."""
    from bea_engine.protocol import AuthError

    validate = ledger_write.validate_candidate
    before = book.read_bytes()

    def change_permissions(*args, **kwargs):
        warnings = validate(*args, **kwargs)
        book.chmod(0o444)
        return warnings

    monkeypatch.setattr(ledger_write, "validate_candidate", change_permissions)
    try:
        with pytest.raises(AuthError, match="read-only|Permission|writable"):
            ledger_write.append(book, ["2026-01-01 open Assets:Stock"])
        assert book.read_bytes() == before
        assert book.stat().st_mode & 0o777 == 0o444
    finally:
        book.chmod(0o600)


def test_price_duplicate_in_an_include_is_skipped_with_its_location(book: Path) -> None:
    prices = book.parent / "prices.bean"
    prices.write_text("2026-06-01 price EUR 1.10 USD\n")
    book.write_text(book.read_text().replace("2026-06-01 price EUR 1.10 USD", 'include "prices.bean"'))
    before = book.read_bytes()
    args = ["--json", "-f", str(book), "add", "price", "--currency", "EUR", "--amount", "1.100 USD"]
    result = runner.invoke(app, [*args, "--date", "2026-06-01"])
    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 0 and data["duplicate"] is True
    assert data["source"] == {"filename": str(prices), "lineno": 1}
    assert book.read_bytes() == before
    added = runner.invoke(app, [*args, "--date", "2026-06-02"])
    assert added.exit_code == 0, added.output
    assert json.loads(added.stdout)["data"]["written"] == 1
    assert not loader.load_file(book)[1]


def test_balance_tolerance_controls_validation_and_round_trips(book: Path) -> None:
    from beancount.core.data import Balance

    args = ["--json", "-f", str(book), "add", "balance", "--account", "Assets:Checking", "--date", "2026-01-03"]
    before = book.read_bytes()
    assert runner.invoke(app, [*args, "--amount", "1538.5 ~ 0.1 EUR"]).exit_code == 1
    assert book.read_bytes() == before
    result = runner.invoke(app, [*args, "--amount", "1538.5 ~ 1 EUR"])
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    assert next(e for e in entries if isinstance(e, Balance)).tolerance == Decimal(1)
    listed = runner.invoke(app, ["--json", "-f", str(book), "list", "balance"])
    assert json.loads(listed.stdout)["data"][0]["tolerance"] == "1"
    padded = runner.invoke(
        app,
        [
            "--json",
            "-f",
            str(book),
            "add",
            "balance",
            "--account",
            "Assets:Checking",
            "--date",
            "2026-06-02",
            "--amount",
            "1500 ~ 1 EUR",
            "--pad-from",
            "Equity:OpeningBalances",
        ],
    )
    assert padded.exit_code == 0, padded.output
    assert not loader.load_file(book)[1]


def test_native_metadata_survives_single_and_bulk_entry_and_flag_filter(book: Path) -> None:
    from beancount.core.data import Transaction

    result = runner.invoke(
        app,
        [
            "--json",
            "-f",
            str(book),
            "add",
            "transaction",
            "--date",
            "2026-06-02",
            "--flag",
            "!",
            "--meta",
            'receipt: "réçu R-42"',
            "--meta",
            "reviewed: TRUE",
            "--meta",
            "rate: 1.125",
            "--meta",
            "received: 2026-06-01",
            "--meta",
            "fee: 0.25 EUR",
            "-p",
            "Assets:Checking -5 EUR",
            "-p",
            "Expenses:Food",
        ],
    )
    assert result.exit_code == 0, result.output
    payload = book.parent / "repeat.json"
    payload.write_text(json.dumps([json.loads(result.stdout)["data"]["directive"]]))
    copied = runner.invoke(app, ["--json", "-f", str(book), "add", "transactions", "--from", str(payload)])
    assert copied.exit_code == 0, copied.output
    # A newer unflagged entry must not consume the limit before filtering.
    plain = runner.invoke(
        app,
        [
            "--json",
            "-f",
            str(book),
            "add",
            "transaction",
            "--date",
            "2026-06-03",
            "-p",
            "Assets:Checking -1 EUR",
            "-p",
            "Expenses:Food",
        ],
    )
    assert plain.exit_code == 0, plain.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    flagged = [e for e in entries if isinstance(e, Transaction) and e.flag == "!"]
    assert len(flagged) == 2
    for entry in flagged:
        assert entry.meta["receipt"] == "réçu R-42"
        assert entry.meta["reviewed"] is True
        assert entry.meta["rate"] == Decimal("1.125")
        assert entry.meta["received"] == datetime.date(2026, 6, 1)
        assert entry.meta["fee"].number == Decimal("0.25")
    listed = runner.invoke(app, ["--json", "-f", str(book), "list", "transaction", "--flag", "!", "--limit", "1"])
    data = json.loads(listed.stdout)
    assert data["truncated"] is True
    assert len(data["data"]) == 1 and data["data"][0]["flag"] == "!"


def test_importer_name_and_debug_errors_remain_actionable_json(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text("Date,Payee,Narration,Amount,Currency,Category,BankID\n")
    config = Path(__file__).parents[1] / "docs/examples/csv_importers.py"
    args = ["--json", "-f", str(book), "import", str(source), "--config", str(config)]
    unknown = runner.invoke(app, [*args, "--importer", "nope"])
    assert unknown.exit_code == 2
    assert "No importer named 'nope'; available: categorized-checking" in json.loads(unknown.stderr)["error"]["message"]
    broken = book.parent / "broken.py"
    broken.write_text('raise RuntimeError("boom at import time")\n')
    args = [*args[:-1], str(broken)]
    normal = runner.invoke(app, args)
    assert normal.exit_code == 1
    error = json.loads(normal.stderr)["error"]
    assert "--debug" in error["message"] and "traceback" not in error
    debug = runner.invoke(app, ["--debug", *args])
    assert debug.exit_code == 1 and debug.stdout == ""
    error = json.loads(debug.stderr)["error"]
    assert str(broken) in error["traceback"]
    assert "RuntimeError: boom at import time" in error["traceback"]


@pytest.fixture
def profitable(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text("""option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Salary USD
2026-01-01 open Expenses:Rent USD
2026-01-05 * "Pay"
  Assets:Checking 5000 USD
  Income:Salary -5000 USD
2026-01-06 * "Rent"
  Expenses:Rent 2000 USD
  Assets:Checking -2000 USD
""")
    return file


def test_the_two_statements_never_disagree_about_the_same_period_profit(profitable: Path) -> None:
    """The balance sheet's earnings credit is the income statement's profit negated."""
    sheet = runner.invoke(app, ["-f", str(profitable), "report", "balance-sheet"])
    statement = runner.invoke(app, ["-f", str(profitable), "report", "income-statement"])
    assert sheet.exit_code == 0 and statement.exit_code == 0
    assert "Current-period earnings (credit):" in sheet.stdout
    assert "-3,000.00 USD" in sheet.stdout
    assert "the same period's Net Profit is 3,000.00 USD" in sheet.stdout
    assert "Net Profit: 3,000.00 USD" in statement.stdout
    # Only the report that prints a profit may promise the sign it uses.
    assert "profit is positive for a gain" in statement.stdout
    assert "profit is positive for a gain" not in sheet.stdout


def test_the_balance_sheet_json_carries_the_profit_in_both_conventions(profitable: Path) -> None:
    data = json.loads(runner.invoke(app, ["--json", "-f", str(profitable), "report", "balance-sheet"]).stdout)["data"]
    assert data["current_earnings"] == {"USD": "-3000"}
    assert data["net_profit"] == {"USD": "3000"}
    assert data["current_earnings_signs"] == "negative_for_gain"


def test_a_period_end_balance_assertion_is_inside_the_period_it_closes(profitable: Path) -> None:
    """A close writes its assertion last; a report that stopped short would omit it."""
    with profitable.open("a") as stream:
        stream.write("2026-03-31 balance Assets:Checking 3000 USD\n")
    result = runner.invoke(app, ["--json", "-f", str(profitable), "report", "balance-sheet"])
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["as_of"] == "2026-03-31"


def test_a_placeholder_commodity_date_does_not_stretch_the_period(profitable: Path) -> None:
    with profitable.open("a") as stream:
        stream.write('1900-01-01 commodity USD\n  name: "US Dollar"\n')
    result = runner.invoke(app, ["--json", "-f", str(profitable), "report", "balance-sheet"])
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["period"]["start"] == "2026-01-05"
