"""Untrusted text, option diagnostics, and formatting as an automation gate."""

import csv
import datetime
import json
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Open, Transaction
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
CONFIG = Path(__file__).resolve().parents[1] / "docs/examples/csv_importers.py"
PAYLOAD = 'innocent"\r\n2026-01-01 open Assets:Evil USD ;"\rtail\nend'
NORMALIZED = 'innocent" 2026-01-01 open Assets:Evil USD ;" tail end'


@pytest.fixture
def book(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(
        'option "operating_currency" "USD"\n2020-01-01 open Assets:Checking USD\n2020-01-01 open Expenses:Food USD\n'
    )
    return file


def invoke(book: Path, *args: str):
    return runner.invoke(app, ["--json", "-f", str(book), *args])


@pytest.mark.parametrize("bulk", [False, True])
def test_add_flattens_untrusted_strings_without_changing_escaping(book: Path, bulk: bool) -> None:
    if bulk:
        source = book.parent / "entries.json"
        source.write_text(
            json.dumps(
                [
                    {
                        "date": "2026-01-02",
                        "payee": PAYLOAD,
                        "narration": PAYLOAD,
                        "meta": {"note": PAYLOAD},
                        "postings": [
                            {"account": "Assets:Checking", "amount": "-1 USD", "meta": {"receipt": PAYLOAD}},
                            {"account": "Expenses:Food"},
                        ],
                    }
                ]
            )
        )
        result = invoke(book, "add", "transactions", "--from", str(source))
    else:
        result = invoke(
            book,
            "add",
            "transaction",
            "--date",
            "2026-01-02",
            "--payee",
            PAYLOAD,
            "-n",
            PAYLOAD,
            "--meta",
            f"note:{PAYLOAD}",
            "-p",
            "Assets:Checking -1 USD",
            "-p",
            "Expenses:Food",
        )
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    transaction = next(e for e in entries if isinstance(e, Transaction))
    assert transaction.payee == transaction.narration == transaction.meta["note"] == NORMALIZED
    if bulk:
        assert transaction.postings[0].meta["receipt"] == NORMALIZED
    assert not any(e.account == "Assets:Evil" for e in entries if isinstance(e, Open))
    assert not any(line.startswith("2026-01-01 open Assets:Evil") for line in book.read_text().splitlines())
    assert b"\r" not in book.read_bytes()
    listed = runner.invoke(app, ["-f", str(book), "list", "transaction"])
    assert listed.exit_code == 0, listed.output
    assert len(listed.stdout.splitlines()) == 3


def test_csv_newlines_are_flattened_in_preview_and_stored_ids_remain_idempotent(book: Path) -> None:
    source = book.parent / "bank.csv"
    with source.open("w", newline="") as stream:
        csv.writer(stream).writerows(
            [
                ["Date", "Payee", "Narration", "Amount", "Currency", "Category", "BankID"],
                ["2026-01-02", PAYLOAD, PAYLOAD, "-1", "USD", "Expenses:Food", "bank\r\n001"],
            ]
        )
    args = ("import", str(source), "--config", str(CONFIG))
    before = book.read_bytes()
    preview = invoke(book, *args)
    assert preview.exit_code == 0, preview.output
    row = json.loads(preview.stdout)["data"]["rows"][0]
    assert row["payee"] == row["narration"] == NORMALIZED
    assert book.read_bytes() == before
    applied = invoke(book, *args, "--apply")
    assert applied.exit_code == 0, applied.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    transaction = next(e for e in entries if isinstance(e, Transaction))
    assert transaction.payee == transaction.narration == NORMALIZED
    assert transaction.meta["bank_id"] == "bank 001"
    before = book.read_bytes()
    repeated = invoke(book, *args, "--apply")
    assert repeated.exit_code == 0, repeated.output
    assert json.loads(repeated.stdout)["data"]["written"] == 0
    # Re-download with a different byte representation still matches the bank ID.
    source.write_bytes(source.read_bytes().replace(b"\r\n", b"\n"))
    repeated = invoke(book, *args, "--apply")
    assert repeated.exit_code == 0, repeated.output
    assert json.loads(repeated.stdout)["data"]["written"] == 0
    assert book.read_bytes() == before


def test_existing_multiline_text_stays_in_one_table_row(book: Path) -> None:
    with book.open("a") as stream:
        stream.write('2026-01-02 * "Cafe\nDiner" "Coffee\r\nCake"\n  Assets:Checking -1 USD\n  Expenses:Food 1 USD\n')
    before = book.read_bytes()
    result = runner.invoke(app, ["-f", str(book), "list", "transaction"])
    assert result.exit_code == 0, result.output
    assert "Cafe Diner" in result.stdout and "Coffee Cake" in result.stdout
    assert len(result.stdout.splitlines()) == 3
    assert book.read_bytes() == before


def test_bare_metadata_and_explicit_strings_keep_their_types(book: Path) -> None:
    values = [
        "note:hello",
        "receipt:IMG_1234.jpg",
        'memo:Joe "The Chef" Diner',
        r"path:C:\receipts\1.pdf",
        'literal:"1e3"',
        'empty:""',
        "reviewed:TRUE",
        "rate:1.125",
        "received:2026-01-01",
        "fee:0.25 USD",
    ]
    args = ["add", "transaction", "--date", "2026-01-02", "-p", "Assets:Checking -1 USD", "-p", "Expenses:Food"]
    for value in values:
        args += ["--meta", value]
    result = invoke(book, *args)
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    meta = next(e for e in entries if isinstance(e, Transaction)).meta
    assert meta["note"] == "hello" and meta["receipt"] == "IMG_1234.jpg"
    assert meta["memo"] == 'Joe "The Chef" Diner' and meta["path"] == r"C:\receipts\1.pdf"
    assert meta["literal"] == "1e3" and meta["empty"] == ""
    assert meta["reviewed"] is True and meta["rate"] == Decimal("1.125")
    assert meta["received"] == datetime.date(2026, 1, 1) and meta["fee"].number == Decimal("0.25")


@pytest.mark.parametrize(
    "args, hint",
    [
        (
            ["add", "transaction", "-p", "Assets:Checking -1 USD", "-p", "Expenses:Food", "--meta", 'note:"unfinished'],
            "--meta",
        ),
        (["add", "transaction", "-p", "Assets:Checking -1e3 USD", "-p", "Expenses:Food"], "decimal notation"),
        (["add", "transaction", "-p", "Assets:Checking -1E+3 USD", "-p", "Expenses:Food"], "decimal notation"),
        (["add", "transaction", "-p", "Assets:Checking 1 USD {bad}", "-p", "Expenses:Food"], "--posting"),
        (
            ["add", "balance", "--date", "2026-01-02", "-a", "Assets:Checking", "--amount", "1e3 USD"],
            "decimal notation",
        ),
        (["add", "price", "--date", "2026-01-02", "-c", "EUR", "--amount", "1e3 USD"], "decimal notation"),
        (["add", "open", "--date", "2026-01-02", "-a", "assets:lower"], "Account names"),
        (["add", "transaction", "-p", "assets:lower -1 USD", "-p", "Expenses:Food"], "Account names"),
    ],
)
def test_invalid_options_are_actionable_and_never_expose_parse_buffers(book: Path, args: list[str], hint: str) -> None:
    before = book.read_bytes()
    result = invoke(book, *args)
    assert result.exit_code == 2, result.output
    assert hint in result.stderr
    assert "<string>" not in result.stderr and str(book) not in result.stderr
    assert result.stdout == "" and book.read_bytes() == before


def test_account_validation_accepts_configured_roots_unicode_digits_and_plugins(book: Path) -> None:
    book.write_text('option "name_assets" "Actif"\nplugin "beancount.plugins.auto_accounts"\n')
    opened = invoke(book, "add", "open", "--date", "2020-01-01", "-a", "Actif:Épargne:401k-1E3", "-c", "USD")
    assert opened.exit_code == 0, opened.output
    result = invoke(
        book,
        "add",
        "transaction",
        "-p",
        "Actif:Épargne:401k-1E3 -42 USD",
        "-p",
        "Expenses:Food (84/2) USD",
        "--meta",
        'label:"1e3"',
    )
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert not errors and any(e.account == "Expenses:Food" for e in entries if isinstance(e, Open))


def test_format_check_gates_ci_and_dry_run_remains_a_preview(book: Path) -> None:
    with book.open("a") as stream:
        stream.write('2026-01-02 * "Food"\n Assets:Checking -1 USD\n Expenses:Food 1 USD\n')
    before = book.read_bytes()
    dry_run = invoke(book, "format", str(book), "--dry-run")
    assert dry_run.exit_code == 0, dry_run.output
    assert json.loads(dry_run.stdout)["data"]["formatted"] == [str(book)]
    check = invoke(book, "format", str(book), "--check")
    assert check.exit_code == 1, check.output
    assert check.stdout == ""
    error = json.loads(check.stderr)["error"]
    assert error["result"]["formatted"] == [str(book)] and error["result"]["check"] is True
    assert book.read_bytes() == before
    assert invoke(book, "format", str(book)).exit_code == 0
    assert invoke(book, "format", str(book), "--check").exit_code == 0


@pytest.mark.parametrize("flags", [[], ["--dry-run"], ["--check"]])
def test_format_reports_syntax_errors_and_preserves_bad_files(book: Path, flags: list[str]) -> None:
    bad = book.parent / "broken.beancount"
    bad.write_text("2026-01-01 open assets:lower USD\n")
    before = bad.read_bytes()
    result = invoke(book, "format", str(book.parent), *flags)
    assert result.exit_code == 1, result.output
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert "syntax" in error["message"].lower()
    assert str(bad) + ":1:" in " ".join(error["details"])
    assert error["result"]["skipped"] == [str(bad)]
    assert bad.read_bytes() == before
    human = runner.invoke(app, ["format", str(bad), *flags])
    assert human.exit_code == 1 and "skipped" in human.stderr.lower()


def test_formatting_split_files_does_not_require_root_options_or_account_opens(book: Path) -> None:
    book.write_text('option "name_assets" "Actif"\ninclude "year.bean"\n')
    year = book.parent / "year.bean"
    year.write_text('2026-01-02 * "Food"\n Actif:Épargne -1 USD\n Expenses:Food 1 USD\n')
    result = invoke(book, "format", str(book.parent))
    assert result.exit_code == 0, result.output
    assert invoke(book, "format", str(book.parent), "--check").exit_code == 0
