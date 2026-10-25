"""Column-mapping options are refused when a Python importer runs the import (w5/131).

With `importers.py` beside the ledger, or a remembered `--config`, `bea import
x.csv --account Assets:Savings --rules r.toml --apply` accepted both options,
dropped them, and wrote the rows to the importer's own account with exit 0.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest
from typer.testing import CliRunner, Result

from cli.main import app

runner = CliRunner()

CONFIG = Path(__file__).resolve().parents[1] / "docs/examples/csv_importers.py"
LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Checking USD\n"
    "2026-01-01 open Assets:Savings USD\n"
    "2026-01-01 open Expenses:Food\n"
    "2026-01-01 open Expenses:Groceries\n"
    "2026-01-01 open Expenses:Uncategorized\n"
)
EXPORT = "Date,Payee,Narration,Amount,Currency,Category\n2026-08-02,Cafe,Coffee,-5.25,USD,Expenses:Food\n"


@pytest.fixture
def book(tmp_path: Path, bea_config_dir: Path) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    ledger = books / "main.bean"
    ledger.write_text(LEDGER)
    (books / "savings.csv").write_text(EXPORT)
    (books / "r.toml").write_text('[[rule]]\nmatch = "coffee"\naccount = "Expenses:Groceries"\n')
    return ledger


def _import(book: Path, *args: str, json_output: bool = False) -> Result:
    source = str(book.parent / "savings.csv")
    lead = ["--json"] if json_output else []
    return runner.invoke(app, [*lead, "--no-input", "--file", str(book), "import", source, *args])


def test_the_default_importer_refuses_an_account_and_rules_it_would_drop(book: Path) -> None:
    shutil.copy(CONFIG, book.parent / "importers.py")
    rules = str(book.parent / "r.toml")

    result = _import(book, "--account", "Assets:Savings", "--rules", rules, "--apply")

    assert result.exit_code == 2, result.output
    assert "--account, --rules apply only to --csv or --ofx rows" in result.stderr
    assert "importers.py (default beside root ledger)" in result.stderr
    assert "add --csv auto" in result.stderr
    assert result.stdout == ""
    assert book.read_text() == LEDGER


@pytest.mark.parametrize(
    ("flag", "value"),
    [
        ("--account", "Assets:Savings"),
        ("--rules", "r.toml"),
        ("--default-account", "Expenses:Groceries"),
        ("--date-format", "%Y-%m-%d"),
        ("--delimiter", ","),
    ],
)
def test_each_column_mapping_option_is_named_in_preview_and_json(book: Path, flag: str, value: str) -> None:
    shutil.copy(CONFIG, book.parent / "importers.py")
    if flag == "--rules":
        value = str(book.parent / value)

    result = _import(book, flag, value, json_output=True)

    assert result.exit_code == 2, result.output
    error = json.loads(result.stderr)["error"]
    assert error["message"].startswith(f"{flag} applies only to --csv or --ofx rows")
    assert result.stdout == ""
    assert book.read_text() == LEDGER


def test_a_remembered_config_refuses_the_same_options(book: Path, tmp_path: Path) -> None:
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    config = elsewhere / "bank.py"
    shutil.copy(CONFIG, config)
    selected = _import(book, "--config", str(config), json_output=True)
    assert selected.exit_code == 0, selected.output

    result = _import(book, "--account", "Assets:Savings", "--apply")

    assert result.exit_code == 2, result.output
    assert "--account applies only to --csv or --ofx rows" in result.stderr
    assert f"{config} (remembered)" in result.stderr
    assert book.read_text() == LEDGER


def test_an_explicit_config_refuses_them_and_names_the_csv_alternative(book: Path) -> None:
    result = _import(book, "--config", str(CONFIG), "--account", "Assets:Savings", "--apply")

    assert result.exit_code == 2, result.output
    assert "--account applies only to --csv or --ofx rows" in result.stderr
    assert "replace --config with --csv auto" in result.stderr
    assert book.read_text() == LEDGER


def test_the_importer_still_runs_without_them_and_csv_auto_honours_them(book: Path) -> None:
    shutil.copy(CONFIG, book.parent / "importers.py")

    plain = _import(book, json_output=True)
    assert plain.exit_code == 0, plain.output
    assert json.loads(plain.stdout)["data"]["account"] == "Assets:Checking"

    rules = str(book.parent / "r.toml")
    mapped = _import(book, "--csv", "auto", "--account", "Assets:Savings", "--rules", rules, "--apply")
    assert mapped.exit_code == 0, mapped.output
    entry = book.read_text().split("Coffee")[1]
    assert "Assets:Savings" in entry and "Expenses:Groceries" in entry and "Assets:Checking" not in entry


def test_without_an_importer_the_same_command_is_unchanged(book: Path) -> None:
    rules = str(book.parent / "r.toml")

    result = _import(book, "--account", "Assets:Savings", "--rules", rules, "--apply")

    assert result.exit_code == 0, result.output
    assert "csv → Assets:Savings" in result.stdout
    entry = book.read_text().split("Coffee")[1]
    assert "Assets:Savings" in entry and "Expenses:Groceries" in entry
