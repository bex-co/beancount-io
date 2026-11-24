"""The remembered-settings line names one `--csv` and the account, so it pastes back (w5/283).

With an encoding in force the line read `--csv <columns> … --csv encoding=cp1252`.
Pasted back, the last `--csv` won: the columns were dropped and, with nothing
remembered to fall back on, a mapping inferred from the header replaced them.
The line also left out `--account`, the one setting a paste cannot do without.
"""

from __future__ import annotations

import json
import shlex
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Checking USD\n"
    "2026-01-01 open Assets:Savings USD\n"
    "2026-01-01 open Expenses:Food\n"
    "2026-01-01 open Expenses:Uncategorized\n"
)
COLUMNS = "date=Date,amount=Amount,payee=Description"
ROWS = "Date,Description,Amount\n2026-01-05,Café Zürich,-3.00\n"
PREFIX = "Using remembered settings for jan.csv: "


@pytest.fixture
def book(tmp_path: Path, bea_config_dir: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def _import(book: Path, source: Path, *args: str) -> Any:
    result = runner.invoke(app, ["--json", "--no-input", "--file", str(book), "import", str(source), *args])
    assert result.exit_code == 0, result.output
    return json.loads(result.stdout)["data"]


def _export(book: Path, codec: str = "cp1252") -> Path:
    source = book.parent / "jan.csv"
    source.write_bytes(ROWS.encode(codec))
    return source


def _settings(data: Any) -> str:
    """The option string of the remembered-settings note, without the sentence around it."""
    (note,) = [line for line in data["notes"] if line.startswith(PREFIX)]
    return str(note).removeprefix(PREFIX).removesuffix(".")


def _records(config: Path) -> list[Path]:
    return sorted((config / "importers").glob("csv-*.json"))


def _stored(config: Path) -> list[dict[str, Any]]:
    (record,) = _records(config)
    return list(json.loads(record.read_text())["sources"])


def test_an_encoding_joins_the_columns_in_one_csv_option(book: Path, bea_config_dir: Path) -> None:
    source = _export(book)
    first = _import(book, source, "--csv", f"{COLUMNS},encoding=cp1252", "--account", "Assets:Savings")
    (saved,) = _stored(bea_config_dir)

    recalled = _import(book, source)
    settings = _settings(recalled)
    pasted = _import(book, source, *shlex.split(settings))

    # The date format was read from the file, not remembered: its own note says so (w1/379).
    assert settings == f"--csv {COLUMNS},encoding=cp1252 --account Assets:Savings"
    assert "Read the date format from jan.csv: --date-format %Y-%m-%d." in recalled["notes"]
    assert shlex.split(settings).count("--csv") == 1
    assert pasted["config_source"] == "--csv"
    assert pasted["diff"] == recalled["diff"] == first["diff"]
    assert pasted["rows"][0]["payee"] == "Café Zürich" and '"Café Zürich" ""' in pasted["diff"]
    (kept,) = _stored(bea_config_dir)
    assert kept["mapping"] == saved["mapping"] == f"{COLUMNS},encoding=cp1252"
    assert kept["account"] == saved["account"] == "Assets:Savings"


def test_the_line_alone_reproduces_the_preview_with_nothing_remembered(book: Path, bea_config_dir: Path) -> None:
    source = _export(book)
    _import(book, source, "--csv", f"{COLUMNS},encoding=cp1252", "--account", "Assets:Savings")
    recalled = _import(book, source)
    settings = _settings(recalled)
    for record in _records(bea_config_dir):
        record.unlink()

    pasted = _import(book, source, *shlex.split(settings))

    # No memory to lean on: the columns, the codec and the account all come from the line.
    assert pasted["config_source"] == "--csv"
    assert pasted["diff"] == recalled["diff"]
    assert pasted["rows"][0]["payee"] == "Café Zürich"
    (saved,) = _stored(bea_config_dir)
    assert saved["mapping"] == f"{COLUMNS},encoding=cp1252" and saved["account"] == "Assets:Savings"


def test_the_line_names_the_account_two_exports_sharing_a_header_need(book: Path, bea_config_dir: Path) -> None:
    source = _export(book)
    _import(book, source, "--csv", f"{COLUMNS},encoding=cp1252", "--account", "Assets:Savings")
    checking = "date=Date,amount=Amount,narration=Description,encoding=cp1252"
    _import(book, source, "--csv", checking, "--account", "Assets:Checking")

    recalled = _import(book, source, "--account", "Assets:Savings")
    settings = _settings(recalled)
    pasted = _import(book, source, *shlex.split(settings))

    assert shlex.split(settings)[:4] == ["--csv", f"{COLUMNS},encoding=cp1252", "--account", "Assets:Savings"]
    assert pasted["diff"] == recalled["diff"] and "Assets:Savings" in pasted["diff"]
    by_account = {entry["account"]: entry["mapping"] for entry in _stored(bea_config_dir)}
    assert by_account == {
        "Assets:Savings": f"{COLUMNS},encoding=cp1252",
        "Assets:Checking": checking,
    }


def test_a_recalled_ledger_sign_shares_the_one_csv_option_with_the_encoding(book: Path) -> None:
    source = _export(book)
    first = _import(book, source, "--csv", f"{COLUMNS},sign=ledger,encoding=cp1252", "--account", "Assets:Savings")

    recalled = _import(book, source)
    settings = _settings(recalled)
    pasted = _import(book, source, *shlex.split(settings))

    assert shlex.split(settings)[:2] == ["--csv", f"{COLUMNS},sign=ledger,encoding=cp1252"]
    assert shlex.split(settings).count("--csv") == 1
    assert pasted["diff"] == recalled["diff"] == first["diff"]
    assert "Assets:Savings           3.00 USD" in pasted["diff"]


def test_a_utf8_export_keeps_its_single_csv_option_and_gains_the_account(book: Path, bea_config_dir: Path) -> None:
    source = _export(book, "utf-8")
    first = _import(book, source, "--csv", COLUMNS, "--account", "Assets:Savings")

    recalled = _import(book, source)
    settings = _settings(recalled)
    pasted = _import(book, source, *shlex.split(settings))

    assert settings == f"--csv {COLUMNS} --account Assets:Savings"
    assert pasted["diff"] == recalled["diff"] == first["diff"]
    (kept,) = _stored(bea_config_dir)
    assert kept["mapping"] == COLUMNS and kept["account"] == "Assets:Savings"
