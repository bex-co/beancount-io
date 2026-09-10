"""Exercise ledger writes through the CLI and reload their actual results."""

import datetime
import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Custom, Document, Event, Note, Transaction
from typer.testing import CliRunner

from cli import ledger_write
from cli.errors import ConflictError
from cli.main import app

runner = CliRunner()


@pytest.fixture
def book(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    accounts = tmp_path / "accounts.beancount"
    accounts.write_text("2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n")
    file.write_text('include "accounts.beancount"\n')
    return file


def invoke(file: Path, *args: str):
    return runner.invoke(app, ["--json", "--file", str(file), *args])


@pytest.mark.parametrize(
    "postings",
    [
        ["Expenses:Food 5 USD", "Assets:Cash -4 USD"],
        ["Expenses:Food 5 USD", "Assets:Cahs -5 USD"],
        ["Expenses:Food 5 EUR", "Assets:Cash -5 EUR"],
    ],
)
def test_invalid_writes_preserve_original_bytes(book: Path, postings: list[str]) -> None:
    before = book.read_bytes()
    args = ["add", "transaction", "--date", "2026-08-01"]
    for posting in postings:
        args += ["-p", posting]
    result = invoke(book, *args)
    assert result.exit_code == 1, result.output
    assert book.read_bytes() == before
    assert not list(book.parent.glob(".bea-*.tmp"))
    if "Cahs" in " ".join(postings):
        assert "Did you mean Assets:Cash" in result.stderr


def test_allow_errors_is_explicit_and_never_permits_bad_syntax(book: Path) -> None:
    args = ["add", "balance", "--date", "2026-08-01", "--account", "Assets:Cash", "--amount", "5 USD"]
    assert invoke(book, *args).exit_code == 1
    allowed = invoke(book, *args, "--allow-errors")
    assert allowed.exit_code == 0, allowed.output
    assert json.loads(allowed.stdout)["data"]["warnings"]
    before = book.read_bytes()
    result = invoke(book, "add", "open", "--date", "2026-08-01", "--account", "INVALID", "--allow-errors")
    assert result.exit_code == 2
    assert book.read_bytes() == before


@pytest.mark.parametrize("text", ['He said "hello"', r"C:\bank\receipts", "café 東京\nsecond line", ""])
def test_all_quoted_directives_round_trip(book: Path, text: str) -> None:
    commands = [
        ["note", "--account", "Assets:Cash", "--comment", text],
        ["event", "--type", text, "--description", text],
        ["custom", "--type", text, "--value", f"text:{text}", "--value", "bool:true", "--value", "date:2026-08-01"],
        ["transaction", "--payee", text, "--narration", text, "-p", "Assets:Cash -1 USD", "-p", "Expenses:Food 1 USD"],
    ]
    for command in commands:
        result = invoke(book, "add", command[0], "--date", "2026-08-01", *command[1:])
        assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert errors == []
    assert next(e for e in entries if isinstance(e, Note)).comment == text
    event = next(e for e in entries if isinstance(e, Event))
    assert (event.type, event.description) == (text, text)
    custom = next(e for e in entries if isinstance(e, Custom))
    assert [v.value for v in custom.values] == [text, True, datetime.date(2026, 8, 1)]
    assert next(e for e in entries if isinstance(e, Transaction)).narration == text.replace("\n", " ")


def test_document_path_round_trips_relative_to_ledger(book: Path) -> None:
    receipt = book.parent / 'café "receipt".pdf'
    receipt.write_bytes(b"receipt")
    result = invoke(
        book, "add", "document", "--date", "2026-08-01", "--account", "Assets:Cash", "--filename", receipt.name
    )
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert errors == []
    assert next(e for e in entries if isinstance(e, Document)).filename == str(receipt)


def test_partial_batch_reports_semantic_rejections_and_validates_written_subset(book: Path) -> None:
    rows = [
        {
            "date": "2026-08-01",
            "narration": "good",
            "postings": [
                {"account": "Assets:Cash", "units": {"number": "-5", "currency": "USD"}},
                {"account": "Expenses:Food", "units": {"number": "5", "currency": "USD"}},
            ],
        },
        {
            "date": "2026-08-02",
            "narration": "bad",
            "postings": [
                {"account": "Assets:Cash", "units": {"number": "-5", "currency": "USD"}},
                {"account": "Expenses:Food", "units": {"number": "4", "currency": "USD"}},
            ],
        },
    ]
    source = book.parent / "rows.json"
    source.write_text(json.dumps(rows))
    before = book.read_bytes()
    atomic = invoke(book, "add", "transactions", "--from", str(source))
    assert atomic.exit_code == 1
    assert json.loads(atomic.stderr)["error"]["result"]["written"] == 0
    assert book.read_bytes() == before
    partial = invoke(book, "add", "transactions", "--from", str(source), "--partial")
    assert partial.exit_code == 1
    assert json.loads(partial.stderr)["error"]["result"] == {"written": 1, "written_rows": [0], "rejected_rows": [1]}
    entries, errors, _ = loader.load_file(book)
    assert not errors
    assert [e.narration for e in entries if isinstance(e, Transaction)] == ["good"]


def test_external_edit_is_preserved(book: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    validate = ledger_write.validate_candidate

    def edit(candidate: Path, file: Path, **kwargs):
        warnings = validate(candidate, file, **kwargs)
        file.write_text(file.read_text() + "; external edit\n")
        return warnings

    monkeypatch.setattr(ledger_write, "validate_candidate", edit)
    with pytest.raises(ConflictError):
        ledger_write.append(book, ['2026-08-01 event "test" "value"'])
    assert book.read_text().endswith("; external edit\n")
    assert "event" not in book.read_text()


def test_partial_batch_rejects_invalid_typed_metadata(book: Path) -> None:
    row = {
        "date": "2026-08-01",
        "postings": [
            {"account": "Assets:Cash", "units": {"number": "-1", "currency": "USD"}},
            {"account": "Expenses:Food", "units": {"number": "1", "currency": "USD"}},
        ],
    }
    source = book.parent / "metadata.json"
    source.write_text(json.dumps([row, row | {"meta": {"posted": {"kind": "date", "value": "nope"}}}]))
    result = invoke(book, "add", "transactions", "--from", str(source), "--partial")
    assert result.exit_code == 1
    assert json.loads(result.stderr)["error"]["result"] == {"written": 1, "written_rows": [0], "rejected_rows": [1]}
    entries, errors, _ = loader.load_file(book)
    assert not errors
    assert len([e for e in entries if isinstance(e, Transaction)]) == 1


def test_cost_lot_booking_is_validated_before_writing(book: Path) -> None:
    assert (
        invoke(book, "add", "open", "--date", "2020-01-01", "--account", "Assets:Stock", "--currency", "AAPL").exit_code
        == 0
    )
    sale = {
        "date": "2026-08-02",
        "postings": [
            {
                "account": "Assets:Stock",
                "units": {"number": "-1", "currency": "AAPL"},
                "cost": {"number": "100", "currency": "USD"},
            },
            {"account": "Assets:Cash", "units": {"number": "100", "currency": "USD"}},
        ],
    }
    source = book.parent / "lots.json"
    purchase = {
        "date": "2026-08-01",
        "postings": [
            {
                "account": "Assets:Stock",
                "units": {"number": "2", "currency": "AAPL"},
                "cost": {"number": "100", "currency": "USD"},
            },
            {"account": "Assets:Cash", "units": {"number": "-200", "currency": "USD"}},
        ],
    }
    wrong_lot = json.loads(json.dumps(sale))
    wrong_lot["postings"][0]["cost"]["number"] = "999"
    wrong_lot["postings"][1]["units"]["number"] = "999"
    source.write_text(json.dumps([wrong_lot, purchase]))
    before = book.read_bytes()
    invalid = invoke(book, "add", "transactions", "--from", str(source))
    assert invalid.exit_code == 1
    assert "No position matches" in invalid.stderr
    assert book.read_bytes() == before
    source.write_text(json.dumps([sale, purchase]))
    result = invoke(book, "add", "transactions", "--from", str(source))
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    assert (
        sum(
            p.units.number
            for e in entries
            if isinstance(e, Transaction)
            for p in e.postings
            if p.account == "Assets:Stock"
        )
        == 1
    )


def test_concurrent_cli_writers_do_not_lose_transactions(book: Path) -> None:
    alias = book.parent / "alias.bean"
    alias.symlink_to(book)
    commands = [
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "--file",
            str(alias if i % 2 else book),
            "add",
            "transaction",
            "--date",
            "2026-08-01",
            "--narration",
            f"write {i}",
            "-p",
            "Assets:Cash -1 USD",
            "-p",
            "Expenses:Food 1 USD",
        ]
        for i in range(6)
    ]
    processes = [
        subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=dict(os.environ))
        for command in commands
    ]
    for process in processes:
        stdout, stderr = process.communicate(timeout=20)
        assert process.returncode == 0, (stdout, stderr)
    entries, errors, _ = loader.load_file(book)
    assert not errors
    transactions = [e for e in entries if isinstance(e, Transaction)]
    assert {e.narration for e in transactions} == {f"write {i}" for i in range(6)}
    assert sum(p.units.number for e in transactions for p in e.postings if p.account == "Expenses:Food") == Decimal(6)
    assert not list(book.parent.glob("*.bea.lock"))


def _add_transaction(book: Path, date: str, narration: str, *postings: str):
    args = ["add", "transaction", "--date", date, "--narration", narration]
    for posting in postings:
        args += ["-p", posting]
    result = invoke(book, *args)
    assert result.exit_code == 0, result.output
    return result


def test_append_to_a_four_space_file_adds_only_lines(tmp_path: Path) -> None:
    book = tmp_path / "main.bean"
    book.write_text(
        'option "operating_currency" "USD"\n'
        "2026-08-01 open Assets:Checking USD\n"
        "2026-08-01 open Expenses:Dining USD\n"
        "2026-08-01 open Equity:OpeningBalances USD\n"
        "\n"
        '2026-08-01 * "Opening" "Seed"\n'
        "    Assets:Checking             1000.00 USD\n"
        "    Equity:OpeningBalances      -1000.00 USD\n"
    )
    before = book.read_bytes()
    _add_transaction(book, "2026-08-02", "Coffee", "Expenses:Dining 12.50", "Assets:Checking")
    after = book.read_text()
    assert after.startswith(before.decode("utf-8"))
    added = after[len(before.decode("utf-8")) :]
    assert "    Expenses:Dining" in added
    assert "12.50 USD" in added


def test_a_wider_account_leaves_existing_lines_byte_identical(tmp_path: Path) -> None:
    book = tmp_path / "main.bean"
    book.write_text(
        'option "operating_currency" "USD"\n'
        "2026-08-01 open Assets:Cash USD\n"
        "2026-08-01 open Expenses:Dining:AVeryLongRestaurantName USD\n"
        "2026-08-01 open Equity:OpeningBalances USD\n"
        "\n"
        '2026-08-01 * "Opening" "Seed"\n'
        "  Assets:Cash  100.00 USD\n"
        "  Equity:OpeningBalances  -100.00 USD\n"
    )
    before = book.read_bytes()
    _add_transaction(book, "2026-08-02", "Fancy", "Expenses:Dining:AVeryLongRestaurantName 50", "Assets:Cash")
    after = book.read_bytes()
    assert after.startswith(before)
    # Right-aligned against the file's widest number, exactly as bean-format leaves it.
    assert b"  Expenses:Dining:AVeryLongRestaurantName       50 USD" in after
    _assert_appended_lines_are_formatted(book, before)


def test_format_still_realigns_the_whole_file(tmp_path: Path) -> None:
    book = tmp_path / "main.bean"
    book.write_text(
        'option "operating_currency" "USD"\n'
        "2026-08-01 open Assets:Cash USD\n"
        "2026-08-01 open Equity:OpeningBalances USD\n"
        "\n"
        '2026-08-01 * "Opening" "Seed"\n'
        "  Assets:Cash  100.00 USD\n"
        "  Equity:OpeningBalances      -100.00 USD\n"
    )
    result = invoke(book, "format", str(book))
    assert result.exit_code == 0, result.output
    assert "  Assets:Cash  100.00 USD\n" not in book.read_text()
    assert "  Equity:OpeningBalances  -100.00 USD\n" in book.read_text()


def _assert_appended_lines_are_formatted(book: Path, before: bytes) -> None:
    """Every line added after `before` already sits where `bea format` would put it."""
    from beancount.scripts.format import align_beancount

    text = book.read_text()
    assert text.startswith(before.decode("utf-8"))
    kept = len(before.decode("utf-8").splitlines())
    assert align_beancount(text).splitlines()[kept:] == text.splitlines()[kept:]


def _init_with_checking(tmp_path: Path) -> Path:
    args = ["--currency", "USD", "--date", "2026-01-01", "--opening-balance", "Assets:Checking 1000"]
    result = runner.invoke(app, ["--json", "init", str(tmp_path), *args])
    assert result.exit_code == 0, result.output
    return tmp_path / "main.bean"


def test_appended_lines_are_what_format_would_write(tmp_path: Path) -> None:
    """A formatted file stays formatted after an add, so a format pre-commit hook keeps passing."""
    book = _init_with_checking(tmp_path)
    _add_transaction(book, "2026-01-02", "Coffee", "Expenses:Dining 4.50", "Assets:Checking")
    _add_transaction(book, "2026-01-03", "Lunch", "Expenses:Dining 12.00", "Assets:Checking")
    check = invoke(book, "format", "--check", str(tmp_path))
    assert check.exit_code == 0, check.output
    # A number wider than any before it cannot share the existing column. The
    # new lines still land where format will put them; only older lines move.
    before = book.read_bytes()
    _add_transaction(book, "2026-01-04", "Rent", "Expenses:Rent 1234.56", "Assets:Checking")
    _assert_appended_lines_are_formatted(book, before)
    added = book.read_bytes()[len(before) :]
    formatted = invoke(book, "format", str(tmp_path))
    assert formatted.exit_code == 0, formatted.output
    assert book.read_bytes().endswith(added)


def test_add_balance_carries_no_printer_padding(tmp_path: Path) -> None:
    """The upstream printer pads a balance's account to 47 columns; that must not reach the ledger."""
    book = _init_with_checking(tmp_path)
    before = book.read_bytes()
    plain = invoke(book, "add", "balance", "--date", "2026-01-02", "-a", "Assets:Checking", "--amount", "1000.00 USD")
    assert plain.exit_code == 0, plain.output
    assert "2026-01-02 balance Assets:Checking  1000.00 USD\n" in book.read_text()
    _assert_appended_lines_are_formatted(book, before)
    before = book.read_bytes()
    amount = "1000 ~ 0.5 USD"
    tolerant = invoke(book, "add", "balance", "--date", "2026-01-03", "-a", "Assets:Checking", "--amount", amount)
    assert tolerant.exit_code == 0, tolerant.output
    line = next(line for line in book.read_text().splitlines() if line.startswith("2026-01-03 balance"))
    assert "Assets:Checking" + " " * 10 not in line
    assert line.startswith("2026-01-03 balance Assets:Checking 1000 ~") and line.endswith("0.5 USD")
    _assert_appended_lines_are_formatted(book, before)


def test_one_missing_account_reads_as_one_problem_not_one_per_row(book: Path) -> None:
    """Forty identical paragraphs would bury the hint that says how to fix them."""
    entries = [f'2020-02-0{day} * "n"\n  Expenses:Nope 1 USD\n  Assets:Cash -1 USD\n' for day in (1, 2, 3)]
    with pytest.raises(Exception) as caught:
        ledger_write.validate_append(book, entries)
    details = getattr(caught.value, "details", [])
    assert len(details) == 1
    assert "unknown account 'Expenses:Nope'" in details[0]
    assert "Same problem on 2 more lines:" in details[0]
    assert "bea add open --account Expenses:Nope" in details[0]


def test_distinct_problems_are_still_reported_separately(book: Path) -> None:
    entries = ['2020-02-01 * "n"\n  Expenses:Nope 1 USD\n  Assets:Cash -1 USD\n', "2020-02-02 open Assets:Cash USD\n"]
    with pytest.raises(Exception) as caught:
        ledger_write.validate_append(book, entries)
    details = getattr(caught.value, "details", [])
    assert len(details) == 2
    assert not any("Same problem on" in detail for detail in details)


def test_pointing_the_root_at_an_included_leaf_names_into_as_the_fix(book: Path) -> None:
    # The leaf holds entries; its accounts and options live in the root's
    # other include, so on its own the currency cannot be resolved.
    leaf = book.parent / "2020.bean"
    leaf.write_text('2020-01-02 * "Prior"\n  Expenses:Food 1 USD\n  Assets:Cash -1 USD\n')
    book.write_text('include "accounts.beancount"\ninclude "2020.bean"\n')
    result = runner.invoke(
        app,
        [
            "-f",
            str(leaf),
            "add",
            "transaction",
            "Tea",
            "--date",
            "2020-02-01",
            "-p",
            "Expenses:Food 3",
            "-p",
            "Assets:Cash",
        ],
    )
    assert result.exit_code == 2, result.output
    assert f"included by {book}" in result.stderr
    assert "--into 2020.bean" in result.stderr


def test_a_standalone_ledger_gets_no_include_advice(book: Path) -> None:
    assert ledger_write.root_ledger_hints(book) == []


def test_candidate_preserves_existing_line_endings(tmp_path: Path) -> None:
    original = "2026-01-01 open Assets:Cash USD\r\n; café\r\n"
    with ledger_write.candidate_file(tmp_path / "main.bean", original) as candidate:
        assert candidate.read_bytes() == original.encode("utf-8")


def test_format_accepts_crlf_and_is_idempotent(tmp_path: Path) -> None:
    file = tmp_path / "windows.bean"
    file.write_bytes(b'2026-01-01 * "Food"\r\n Assets:Cash -1 USD\r\n Expenses:Food 1 USD\r\n')
    result = runner.invoke(app, ["--json", "format", str(file)])
    assert result.exit_code == 0, result.output
    assert b"\r\r\n" not in file.read_bytes()
    result = runner.invoke(app, ["--json", "format", str(file), "--check"])
    assert result.exit_code == 0, result.output
