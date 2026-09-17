"""Exercise ledger writes through the CLI and reload their actual results."""

import datetime
import json
import os
import re
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Custom, Document, Event, Note, Transaction
from typer.testing import CliRunner

from bea_engine.ledger import write as ledger_write
from bea_engine.protocol import ConflictError
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
    # The flag tolerates errors already in the books, not ones the write would
    # introduce: a bare failing balance is refused with the flag too.
    before = book.read_bytes()
    introduced = invoke(book, *args, "--allow-errors")
    assert introduced.exit_code == 1, introduced.output
    assert book.read_bytes() == before
    assert "would introduce 1 new ledger error(s)" in introduced.stderr
    result = invoke(book, "add", "open", "--date", "2026-08-01", "--account", "INVALID", "--allow-errors")
    assert result.exit_code == 2
    assert book.read_bytes() == before


def _check_errors(book: Path) -> list[tuple[str, int | None, str]]:
    """The loader errors `bea check` would report, as comparable keys."""
    _, errors, _ = loader.load_file(book)
    return [(e.source.get("filename", ""), e.source.get("lineno"), e.message) for e in errors]


@pytest.mark.parametrize(
    ("args", "detail"),
    [
        (
            ["transaction", "--date", "2026-08-01", "-p", "Assets:Cash -1 USD", "-p", "Expenses:Missing"],
            "unknown account 'Expenses:Missing'",
        ),
        (
            ["note", "--date", "2026-08-01", "--account", "Expenses:Missing", "--comment", "hi"],
            "unknown account 'Expenses:Missing'",
        ),
        (
            ["close", "--date", "2026-08-01", "--account", "Expenses:Missing"],
            "Unopened account Expenses:Missing is being closed",
        ),
        (
            ["transaction", "--date", "2026-08-01", "-p", "Assets:Cash -1 EUR", "-p", "Expenses:Food 1 EUR"],
            "Invalid currency EUR for account 'Assets:Cash'",
        ),
    ],
)
def test_allow_errors_refuses_newly_introduced_errors(book: Path, args: list[str], detail: str) -> None:
    before = book.read_bytes()
    assert _check_errors(book) == []
    result = invoke(book, "add", *args, "--allow-errors")
    assert result.exit_code == 1, result.output
    assert book.read_bytes() == before
    assert "would introduce" in result.stderr
    assert detail in result.stderr


def test_allow_errors_still_writes_clean_adds_over_failing_ledgers(book: Path) -> None:
    with book.open("a") as stream:
        stream.write("2026-08-01 balance Assets:Cash 999 USD\n")
    before_errors = _check_errors(book)
    assert before_errors != []
    result = invoke(
        book,
        "add",
        "transaction",
        "--date",
        "2026-08-02",
        "-p",
        "Assets:Cash -1 USD",
        "-p",
        "Expenses:Food 1 USD",
        "--allow-errors",
    )
    assert result.exit_code == 0, result.output
    assert _check_errors(book) == before_errors


def test_allow_errors_refuses_new_import_rows(tmp_path: Path) -> None:
    book = tmp_path / "main.bean"
    book.write_text(
        'option "operating_currency" "USD"\n'
        "2020-01-01 open Assets:Cash USD\n"
        "2020-01-01 open Equity:Opening-Balances\n"
        "2020-01-01 open Expenses:Food USD\n"
        '2020-01-01 * "seed"\n'
        "  Assets:Cash               100 USD\n"
        "  Equity:Opening-Balances  -100 USD\n"
    )
    csv_file = tmp_path / "bank.csv"
    csv_file.write_text("date,amount,description\n2020-08-01,-2.00,coffee\n")
    before = book.read_bytes()
    result = invoke(
        book,
        "import",
        str(csv_file),
        "--csv",
        "auto",
        "--account",
        "Assets:Cash",
        "--apply",
        "--duplicates",
        "include",
        "--allow-errors",
    )
    assert result.exit_code == 4, result.output
    assert book.read_bytes() == before
    assert "Import needs review; nothing was written" in result.stderr
    assert "Expenses:Uncategorized" in result.stderr


def test_allow_errors_bulk_rejects_new_accounts_without_writing(book: Path) -> None:
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
                {"account": "Expenses:Missing", "units": {"number": "5", "currency": "USD"}},
            ],
        },
    ]
    source = book.parent / "rows.json"
    source.write_text(json.dumps(rows))
    before = book.read_bytes()
    atomic = invoke(book, "add", "transactions", "--from", str(source), "--allow-errors")
    assert atomic.exit_code == 1, atomic.output
    assert book.read_bytes() == before
    assert "would introduce" in atomic.stderr
    partial = invoke(book, "add", "transactions", "--from", str(source), "--allow-errors", "--partial")
    assert partial.exit_code == 1, partial.output
    assert json.loads(partial.stderr)["error"]["result"] == {"written": 1, "written_rows": [0], "rejected_rows": [1]}
    assert "Row 2" in partial.stderr


def test_allow_errors_pad_staging_pair_still_writes(tmp_path: Path) -> None:
    book = tmp_path / "main.bean"
    book.write_text(
        'option "operating_currency" "USD"\n'
        "2020-01-01 open Assets:Savings USD\n"
        "2020-01-01 open Equity:OpeningBalances USD\n"
    )
    staged = invoke(
        book,
        "add",
        "pad",
        "--date",
        "2020-01-01",
        "--account",
        "Assets:Savings",
        "--source",
        "Equity:OpeningBalances",
        "--allow-errors",
    )
    assert staged.exit_code == 0, staged.output
    paired = invoke(book, "add", "balance", "--date", "2020-01-02", "--account", "Assets:Savings", "--amount", "50 USD")
    assert paired.exit_code == 0, paired.output
    assert _check_errors(book) == []


# An empty string is no longer valid input for these fields; its refusal is
# covered by test_add_nonempty_strings.py. This test is about what survives
# quoting and escaping.
@pytest.mark.parametrize("text", ['He said "hello"', r"C:\bank\receipts", "café 東京\nsecond line"])
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
    # Every quoted directive keeps its text on one ledger line, so a newline
    # comes back as the space it was written as. Quotes, backslashes and
    # non-ASCII survive intact.
    flattened = text.replace("\n", " ")
    assert next(e for e in entries if isinstance(e, Note)).comment == flattened
    event = next(e for e in entries if isinstance(e, Event))
    assert (event.type, event.description) == (flattened, flattened)
    custom = next(e for e in entries if isinstance(e, Custom))
    assert [v.value for v in custom.values] == [flattened, True, datetime.date(2026, 8, 1)]
    assert next(e for e in entries if isinstance(e, Transaction)).narration == flattened


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
    result = invoke(book, "format", str(book), "--in-place")
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
    formatted = invoke(book, "format", str(tmp_path), "--in-place")
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
    result = runner.invoke(app, ["--json", "format", str(file), "--in-place"])
    assert result.exit_code == 0, result.output
    assert b"\r\r\n" not in file.read_bytes()
    result = runner.invoke(app, ["--json", "format", str(file), "--check"])
    assert result.exit_code == 0, result.output


def _query_output_book(tmp_path: Path) -> Path:
    """A standalone ledger with one transaction, for output-alias tests."""
    file = tmp_path / "main.bean"
    file.write_text(
        'option "operating_currency" "USD"\n'
        "2020-01-01 open Assets:Cash USD\n"
        "2020-01-01 open Equity:Opening-Balances\n"
        '2020-01-01 * "seed"\n'
        "  Assets:Cash               100 USD\n"
        "  Equity:Opening-Balances  -100 USD\n"
    )
    return file


@pytest.mark.parametrize("spell", ["same", "relative", "hardlink"])
@pytest.mark.parametrize("json_mode", [True, False])
def test_query_output_aliasing_ledger_refuses(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, spell: str, json_mode: bool
) -> None:
    book = _query_output_book(tmp_path)
    before = book.read_bytes()
    monkeypatch.chdir(tmp_path)
    if spell == "same":
        destination = str(book)
    elif spell == "relative":
        destination = "./main.bean"
    else:
        link = tmp_path / "link.bean"
        os.link(book, link)
        destination = str(link)
    args = ["--file", str(book), "query", "PRINT", "-o", destination]
    if json_mode:
        args = ["--json", *args]
    result = runner.invoke(app, args)
    assert result.exit_code == 2, result.output
    assert book.read_bytes() == before
    if json_mode:
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "usage"
        assert "would overwrite the ledger it reads" in error["message"]
    else:
        assert "would overwrite the ledger it reads" in result.stderr


def test_query_output_aliasing_an_include_refuses(book: Path) -> None:
    child = book.parent / "accounts.beancount"
    before = child.read_bytes()
    result = runner.invoke(app, ["--file", str(book), "query", "SELECT account", "-o", str(child)])
    assert result.exit_code == 2, result.output
    assert child.read_bytes() == before
    assert "would overwrite the ledger it reads" in result.stderr


def test_query_output_to_other_files_still_works(tmp_path: Path) -> None:
    book = _query_output_book(tmp_path)
    before = book.read_bytes()
    fresh = tmp_path / "out.txt"
    result = runner.invoke(app, ["--file", str(book), "query", "PRINT", "-o", str(fresh)])
    assert result.exit_code == 0, result.output
    assert "Assets:Cash" in fresh.read_text()
    unrelated = tmp_path / "notes.txt"
    unrelated.write_text("old")
    result = runner.invoke(app, ["--file", str(book), "query", "PRINT", "-o", str(unrelated)])
    assert result.exit_code == 0, result.output
    assert "Assets:Cash" in unrelated.read_text()
    assert book.read_bytes() == before


def test_shell_dot_output_to_ledger_refuses(book: Path, capsys: pytest.CaptureFixture[str]) -> None:
    import io

    from bea_engine.query import build_shell

    before = book.read_bytes()
    stream = io.StringIO()
    shell = build_shell(book, stream)
    shell.onecmd(f".output {book}")
    assert "Refusing to write query output" in capsys.readouterr().err
    shell.onecmd("PRINT")
    assert book.read_bytes() == before
    assert "Assets:Cash" in stream.getvalue()


@pytest.mark.parametrize("flag", ["-o", "--output", "--output="])
def test_example_output_refuses_an_existing_file(tmp_path: Path, flag: str) -> None:
    victim = tmp_path / "victim.bean"
    victim.write_bytes(b"Real books\n")
    if flag == "--output=":
        output_args = [f"--output={victim}"]
    else:
        output_args = [flag, str(victim)]
    # A fixed seed: unseeded `bean-example` draws randomly and occasionally dies
    # with StopIteration inside balance-check generation.
    result = runner.invoke(
        app, ["example", "--date-begin", "2020-01-01", "--date-end", "2020-01-31", "-s", "7", *output_args]
    )
    assert result.exit_code == 4, result.output
    assert victim.read_bytes() == b"Real books\n"
    assert "Already exists" in result.stderr
    assert "--force" in result.stderr


def test_example_output_force_and_fresh_paths_write(tmp_path: Path) -> None:
    victim = tmp_path / "victim.bean"
    victim.write_bytes(b"Real books\n")
    forced = runner.invoke(
        app,
        ["example", "--date-begin", "2020-01-01", "--date-end", "2020-01-31", "-s", "7", "--force", "-o", str(victim)],
    )
    assert forced.exit_code == 0, forced.output
    assert victim.read_bytes() != b"Real books\n"
    fresh = tmp_path / "fresh.bean"
    result = runner.invoke(
        app, ["example", "--date-begin", "2020-01-01", "--date-end", "2020-01-31", "-s", "7", "-o", str(fresh)]
    )
    assert result.exit_code == 0, result.output
    assert fresh.stat().st_size > 0


def test_format_output_aliasing_its_target_refuses(tmp_path: Path) -> None:
    book = _query_output_book(tmp_path)
    before = book.read_bytes()
    result = runner.invoke(app, ["format", str(book), "-o", str(book)])
    assert result.exit_code == 2, result.output
    assert book.read_bytes() == before
    assert "would overwrite the ledger it reads" in result.stderr


def test_format_output_to_another_file_still_works(tmp_path: Path) -> None:
    book = _query_output_book(tmp_path)
    before = book.read_bytes()
    other = tmp_path / "formatted.bean"
    result = runner.invoke(app, ["format", str(book), "-o", str(other)])
    assert result.exit_code == 0, result.output
    assert "Assets:Cash" in other.read_text()
    assert book.read_bytes() == before


@pytest.mark.parametrize(
    "balances", [["Assets:Checking 0.00000001"], ["Assets:Checking -0.00000001", "Assets:Savings 0.00000003"]]
)
def test_init_writes_tiny_opening_balances_as_fixed_point(tmp_path: Path, balances: list[str]) -> None:
    args = ["--currency", "BTC", "--date", "2026-01-01"]
    for balance in balances:
        args += ["--opening-balance", balance]

    result = runner.invoke(app, ["--json", "init", str(tmp_path), *args])

    assert result.exit_code == 0, result.output
    text = (tmp_path / "main.bean").read_text()
    assert "E-" not in text
    for balance in balances:
        account, number = balance.split()
        assert re.search(rf"{re.escape(account)} +{re.escape(number)} BTC", text)
    check = runner.invoke(app, ["--json", "--file", str(tmp_path / "main.bean"), "check"])
    assert check.exit_code == 0, check.output
    total = -sum(Decimal(b.split()[1]) for b in balances)
    assert re.search(rf"Equity:OpeningBalances +{total:f} BTC", text)
