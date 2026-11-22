"""A remembered importer path that no longer exists is ignored, not fatal (w5/141).

After one `--config` run, moving or deleting that importer made every flag-free
`bea import` on the ledger exit 2 with "Importer configuration not found" —
even for a plain CSV whose header row needs no importer at all.
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
    "2026-01-01 open Expenses:Food\n"
    "2026-01-01 open Expenses:Uncategorized USD\n"
)
EXPORT = "Date,Payee,Narration,Amount,Currency,Category\n2026-08-02,Cafe,Coffee,-5.25,USD,Expenses:Food\n"
PLAIN = "Date,Description,Amount\n2026-02-02,Grocer,-20.00\n"


@pytest.fixture
def book(tmp_path: Path, bea_config_dir: Path) -> Path:
    """A ledger whose remembered importer has since been moved away."""
    books = tmp_path / "books"
    (books / "old").mkdir(parents=True)
    ledger = books / "main.bean"
    ledger.write_text(LEDGER)
    (books / "bank.csv").write_text(EXPORT)
    (books / "s.csv").write_text(PLAIN)
    config = books / "old" / "imp.py"
    shutil.copy(CONFIG, config)
    selected = _import(ledger, "bank.csv", "--config", str(config))
    assert selected.exit_code == 0, selected.output
    config.rename(books / "old" / "imp_moved.py")
    return ledger


def _import(book: Path, source: str, *args: str, json_output: bool = False) -> Result:
    lead = ["--json"] if json_output else []
    return runner.invoke(app, [*lead, "--no-input", "--file", str(book), "import", str(book.parent / source), *args])


def _missing_note(book: Path) -> str:
    return f"The remembered importer {book.parent / 'old' / 'imp.py'} is missing; ignoring it."


def test_selecting_a_replacement_importer_updates_the_saved_path(book: Path) -> None:
    conventional = book.parent / "importers.py"
    shutil.copy(CONFIG, conventional)

    result = _import(book, "bank.csv", "--config", str(conventional))

    assert result.exit_code == 0, result.output
    assert f"Using importers from {conventional} (--config)" in result.stderr
    assert "1 ready" in result.stdout

    again = _import(book, "bank.csv")
    assert again.exit_code == 0, again.output
    assert f"Using importers from {conventional} (remembered)" in again.stderr
    assert "is missing" not in again.stderr


def test_a_plain_csv_falls_back_to_its_header_row(book: Path) -> None:
    shutil.copy(CONFIG, book.parent / "importers.py")
    result = _import(book, "s.csv", "--account", "Assets:Checking")

    assert result.exit_code == 0, result.output
    assert _missing_note(book) in result.stderr
    assert "Read the column mapping from the header row" in result.stderr
    assert "csv → Assets:Checking: 1 ready" in result.stdout


def test_legacy_importer_memory_requires_explicit_selection(book: Path, bea_config_dir: Path) -> None:
    config = book.parent / "importers.py"
    shutil.copy(CONFIG, config)
    (record,) = (bea_config_dir / "importers").glob("*.json")
    legacy = json.dumps({"config": str(config)})
    record.write_text(legacy)

    result = _import(book, "s.csv", "--account", "Assets:Checking")

    assert result.exit_code == 0, result.output
    assert "was saved without a record of explicit selection" in result.stderr
    assert "csv → Assets:Checking: 1 ready" in result.stdout
    assert record.read_text() == legacy


def test_json_carries_the_note_and_the_fallback_source(book: Path) -> None:
    result = _import(book, "s.csv", "--account", "Assets:Checking", json_output=True)

    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["config_source"] == "inferred --csv"
    assert any(note.startswith(_missing_note(book)) for note in data["notes"])


def test_with_no_fallback_the_refusal_names_the_missing_importer(book: Path) -> None:
    (book.parent / "a.txt").write_text("one line\n")

    result = _import(book, "a.txt")

    assert result.exit_code == 2, result.output
    assert _missing_note(book) in result.stderr
    assert "Choose a Python importer with --config FILE" in result.stderr
    assert "Importer configuration not found" not in result.stderr


def test_csv_auto_never_consulted_the_saved_path(book: Path) -> None:
    result = _import(book, "s.csv", "--csv", "auto", "--account", "Assets:Checking")

    assert result.exit_code == 0, result.output
    assert "is missing" not in result.stderr
    assert "csv → Assets:Checking: 1 ready" in result.stdout


def test_a_remembered_importer_that_still_exists_is_still_used(book: Path) -> None:
    moved = book.parent / "old" / "imp_moved.py"
    moved.rename(book.parent / "old" / "imp.py")

    result = _import(book, "bank.csv")

    assert result.exit_code == 0, result.output
    assert f"Using importers from {book.parent / 'old' / 'imp.py'} (remembered)" in result.stderr
    assert "is missing" not in result.stderr
