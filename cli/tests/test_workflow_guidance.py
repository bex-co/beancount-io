"""Safe recovery commands and the filters used in routine bookkeeping."""

import json
import shlex
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Balance, Document
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()


@pytest.fixture
def book(tmp_path: Path) -> Path:
    directory = tmp_path / "books café"
    directory.mkdir()
    file = directory / "main.bean"
    file.write_text("""option "operating_currency" "USD"
2020-01-01 open Assets:Checking USD
2020-01-01 open Assets:Euro EUR
2020-01-01 open Expenses:Food USD
2020-01-01 open Equity:OpeningBalances USD
""")
    return file


def invoke(book: Path, *args: str):
    return runner.invoke(app, ["--json", "-f", str(book), *args])


@pytest.mark.parametrize("inactive", [False, True])
@pytest.mark.parametrize("atomic", [False, True])
def test_allow_errors_cannot_write_a_pad_with_an_invalid_source(book: Path, inactive: bool, atomic: bool) -> None:
    if inactive:
        with book.open("a") as stream:
            stream.write("2025-01-01 close Equity:OpeningBalances\n")
    source = "Equity:OpeningBalances" if inactive else "Equity:Opening-Balances"
    args = ["add", "balance" if atomic else "pad", "--date", "2026-01-02", "-a", "Assets:Checking"]
    args += ["--amount", "100 USD", "--pad-from", source] if atomic else ["--source", source]
    before = book.read_bytes()
    result = invoke(book, *args, "--allow-errors")
    assert result.exit_code == 1, result.output
    assert "pad" in result.stderr.lower() and "--allow-errors" in result.stderr
    assert book.read_bytes() == before
    if not inactive:
        assert "Did you mean Equity:OpeningBalances" in result.stderr


def test_valid_pad_can_still_be_staged_then_completed(book: Path) -> None:
    staged = invoke(
        book,
        "add",
        "pad",
        "--date",
        "2026-01-01",
        "-a",
        "Assets:Checking",
        "--source",
        "Equity:OpeningBalances",
        "--allow-errors",
    )
    assert staged.exit_code == 0, staged.output
    assert "Unused Pad" in json.dumps(json.loads(staged.stdout)["data"]["warnings"])
    completed = invoke(book, "add", "balance", "--date", "2026-01-02", "-a", "Assets:Checking", "--amount", "100 USD")
    assert completed.exit_code == 0, completed.output
    assert not loader.load_file(book)[1]


def test_exchange_hint_explains_pricing_and_does_not_mask_an_imbalance(book: Path) -> None:
    args = ["add", "transaction", "--date", "2026-01-02", "-p", "Assets:Euro 100 EUR", "-p", "Assets:Checking -108 USD"]
    before = book.read_bytes()
    failed = invoke(book, *args)
    assert failed.exit_code == 1 and book.read_bytes() == before
    assert "100 EUR @ 1.08 USD" in failed.stderr
    same_currency = invoke(book, "add", "transaction", "-p", "Assets:Checking -108 USD", "-p", "Expenses:Food 100 USD")
    assert same_currency.exit_code == 1 and "price annotation" not in same_currency.stderr
    args[5] = "Assets:Euro 100 EUR @ 1.08 USD"
    fixed = invoke(book, *args)
    assert fixed.exit_code == 0, fixed.output
    assert not loader.load_file(book)[1]


def test_balance_hint_command_can_be_run_for_the_exact_root_and_destination(book: Path) -> None:
    included = book.parent / "years"
    included.mkdir()
    year = included / "année.bean"
    year.write_text("")
    with book.open("a") as stream:
        stream.write('include "years/année.bean"\n')
    before = book.read_bytes()
    failed = invoke(
        book,
        "add",
        "balance",
        "--date",
        "2026-01-02",
        "-a",
        "Assets:Checking",
        "--amount",
        "100.5 ~ 0.1 USD",
        "--into",
        "years/année.bean",
    )
    assert failed.exit_code == 1, failed.output
    details = json.loads(failed.stderr)["error"]["details"]
    command = next(
        line.removeprefix("Opening adjustment command: ")
        for line in details
        if line.startswith("Opening adjustment command: ")
    )
    args = shlex.split(command)
    assert args[0] == "bea" and args[args.index("--file") + 1] == str(book)
    assert args[args.index("--into") + 1] == "years/année.bean"
    recovered = runner.invoke(app, ["--json", *args[1:]])
    assert recovered.exit_code == 0, recovered.output
    entries, errors, _ = loader.load_file(book)
    assert not errors and sum(isinstance(e, Balance) for e in entries) == 1
    assert "pad Assets:Checking Equity:OpeningBalances" in year.read_text()
    assert book.read_bytes() == before


def test_existing_failed_balance_is_not_given_a_duplicate_add_recipe(book: Path) -> None:
    staged = invoke(
        book, "add", "balance", "--date", "2026-01-02", "-a", "Assets:Checking", "--amount", "100 USD", "--allow-errors"
    )
    assert staged.exit_code == 0, staged.output
    assert "Opening adjustment command:" not in staged.stdout
    before = book.read_bytes()
    failed = invoke(book, "add", "note", "--date", "2026-01-03", "-a", "Assets:Checking", "--comment", "Review")
    assert failed.exit_code == 1 and book.read_bytes() == before
    assert "existing assertion" in failed.stderr
    assert "Opening adjustment command:" not in failed.stderr


def test_document_error_explains_the_included_files_directory(book: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    included = book.parent / "years"
    included.mkdir()
    (included / "2026.bean").write_text("")
    with book.open("a") as stream:
        stream.write('include "years/2026.bean"\n')
    monkeypatch.chdir(book.parent.parent)
    Path("receipt.pdf").write_text("in the working directory")
    args = [
        "add",
        "document",
        "--date",
        "2026-01-02",
        "-a",
        "Assets:Checking",
        "--filename",
        "receipt.pdf",
        "--into",
        "years/2026.bean",
    ]
    failed = invoke(book, *args)
    assert failed.exit_code == 1, failed.output
    assert f"Relative document paths resolve from {included}" in " ".join(json.loads(failed.stderr)["error"]["details"])
    (included / "receipt.pdf").write_text("beside the directive")
    fixed = invoke(book, *args)
    assert fixed.exit_code == 0, fixed.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    assert next(e.filename for e in entries if isinstance(e, Document)) == str(included / "receipt.pdf")


@pytest.mark.parametrize("directive", ["price", "commodity"])
def test_currency_filters_ignore_case_but_match_the_whole_symbol(book: Path, directive: str) -> None:
    with book.open("a") as stream:
        stream.write(
            "2026-01-01 commodity EUR\n2026-01-01 commodity EURO\n"
            "2026-01-02 price EUR 1.08 USD\n2026-01-02 price EURO 1.09 USD\n"
        )
    result = invoke(book, "list", directive, "--currency", "eUr")
    assert result.exit_code == 0, result.output
    assert [entry["currency"] for entry in json.loads(result.stdout)["data"]] == ["EUR"]
    assert json.loads(invoke(book, "list", directive, "--currency", "eu").stdout)["data"] == []


@pytest.mark.parametrize("currency, warns", [("US", True), ("USDT", True), ("usd", False)])
def test_init_warns_about_unusual_symbols_without_rejecting_valid_books(
    tmp_path: Path, currency: str, warns: bool
) -> None:
    result = runner.invoke(app, ["--json", "init", str(tmp_path), "--currency", currency, "--date", "2026-01-01"])
    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert bool(data.get("warnings")) is warns
    assert result.stderr == ""
    entries, errors, options = loader.load_file(tmp_path / "main.bean")
    assert entries and not errors and options["operating_currency"] == [currency.upper()]
