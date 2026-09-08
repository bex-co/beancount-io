"""Real importer configuration, CSV extraction, preview, and repeat application."""

import datetime
import json
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Transaction
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
CONFIG = Path(__file__).resolve().parents[1] / "docs/examples/csv_importers.py"
HEADER = "Date,Payee,Narration,Amount,Currency,Category,BankID\n"
ROW = "2026-08-02,Cafe,Coffee,-5.25,USD,Expenses:Dining,bank-001\n"


@pytest.fixture
def book(tmp_path: Path) -> Path:
    result = runner.invoke(app, ["--json", "init", str(tmp_path), "--currency", "USD", "--date", "2026-08-01"])
    assert result.exit_code == 0, result.output
    return tmp_path / "main.bean"


def run(book: Path, source: Path, *args: str, config: Path = CONFIG):
    return runner.invoke(app, ["--json", "--file", str(book), "import", str(source), "--config", str(config), *args])


def test_preview_apply_and_repeat_are_safe(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW)
    before = book.read_bytes()
    preview = run(book, source)
    assert preview.exit_code == 0, preview.output
    data = json.loads(preview.stdout)["data"]
    assert book.read_bytes() == before
    assert data["ready"] == 1 and data["written"] == 0
    assert "Expenses:Dining" in data["diff"]
    assert data["validation_errors"] == []
    applied = run(book, source, "--apply")
    assert applied.exit_code == 0, applied.output
    assert json.loads(applied.stdout)["data"]["written"] == 1
    saved = book.read_bytes()
    repeated = run(book, source, "--apply")
    assert repeated.exit_code == 0, repeated.output
    assert json.loads(repeated.stdout)["data"]["written"] == 0
    assert book.read_bytes() == saved
    entries, errors, _ = loader.load_file(book)
    assert not errors
    transaction = next(e for e in entries if isinstance(e, Transaction))
    assert transaction.meta["bank_id"] == "bank-001"


def test_reused_bank_id_with_changed_amount_is_a_conflict(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW)
    assert run(book, source, "--apply").exit_code == 0
    before = book.read_bytes()
    source.write_text(HEADER + ROW.replace("-5.25", "-6.25"))
    result = run(book, source, "--apply")
    assert result.exit_code == 4
    assert json.loads(result.stderr)["error"]["result"]["rows"][0]["status"] == "conflict"
    assert book.read_bytes() == before


def test_distinct_bank_ids_preserve_identical_real_purchases(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW + ROW.replace("bank-001", "bank-002"))
    result = run(book, source, "--apply")
    assert result.exit_code == 4, result.output
    assert json.loads(result.stderr)["error"]["result"]["possible_duplicates"] == 1
    result = run(book, source, "--apply", "--duplicates", "include")
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["written"] == 2


def test_possible_duplicates_require_a_decision(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW.replace("bank-001", ""))
    assert run(book, source, "--apply").exit_code == 0
    # Different source bytes, but the same normalized transaction values.
    source.write_text(HEADER + ROW.replace("bank-001", "").replace("Cafe", "CAFE"))
    before = book.read_bytes()
    result = run(book, source, "--apply")
    assert result.exit_code == 4
    assert book.read_bytes() == before
    result = run(book, source, "--apply", "--duplicates", "skip")
    assert result.exit_code == 0, result.output
    assert book.read_bytes() == before
    result = run(book, source, "--apply", "--duplicates", "include")
    assert result.exit_code == 0
    assert json.loads(result.stdout)["data"]["written"] == 1


def test_unattended_human_import_refusal_has_a_nonzero_process_status(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW)
    assert run(book, source, "--apply").exit_code == 0
    source.write_text(HEADER + ROW.replace("bank-001", "bank-002"))
    before = book.read_bytes()
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "-f",
            str(book),
            "import",
            str(source),
            "--config",
            str(CONFIG),
            "--apply",
        ],
        text=True,
        capture_output=True,
        timeout=10,
    )
    assert result.returncode == 4, (result.stdout, result.stderr)
    assert "Import needs review; nothing was written" in result.stderr
    assert "Row 1 (possible_duplicate)" in result.stderr
    assert result.stdout == ""
    assert book.read_bytes() == before


def test_rotated_bank_id_and_changed_narration_still_require_review(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW)
    assert run(book, source, "--apply").exit_code == 0
    before = book.read_bytes()
    source.write_text(HEADER + ROW.replace("bank-001", "replacement-id").replace("Coffee", "Posted purchase"))
    preview = run(book, source)
    row = json.loads(preview.stdout)["data"]["rows"][0]
    assert row["status"] == "possible_duplicate"
    assert row["date"] == "2026-08-02"
    assert row["payee"] == "Cafe" and row["amount"] == "-5.25 USD"
    assert "Coffee" in row["match"]["entry"]
    assert run(book, source, "--apply").exit_code == 4
    assert book.read_bytes() == before


def test_import_into_an_included_file_validates_and_deduplicates_against_root(book: Path) -> None:
    accounts = book.parent / "accounts.bean"
    accounts.write_bytes(book.read_bytes())
    target = book.parent / "2026.bean"
    target.write_text("")
    book.write_text('include "accounts.bean"\ninclude "2026.bean"\n')
    before = book.read_bytes()
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW)
    result = run(book, source, "--apply", "--into", "2026.bean")
    assert result.exit_code == 0, result.output
    assert book.read_bytes() == before
    assert "bank-001" in target.read_text()
    saved = target.read_bytes()
    repeated = run(book, source, "--apply", "--into", "2026.bean")
    assert json.loads(repeated.stdout)["data"]["written"] == 0
    assert target.read_bytes() == saved
    assert not loader.load_file(book)[1]


def test_config_is_remembered_per_root_and_conventional_file_is_ledger_relative(
    book: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW)
    explicit = run(book, source)
    assert explicit.exit_code == 0, explicit.output
    assert json.loads(explicit.stdout)["data"]["config_source"] == "--config"
    monkeypatch.chdir(book.parent.parent)
    result = runner.invoke(app, ["--json", "-f", str(book), "import", str(source)])
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["config"] == str(CONFIG)
    assert json.loads(result.stdout)["data"]["config_source"] == "remembered"

    second = book.parent / "second.bean"
    second.write_bytes(book.read_bytes())
    result = runner.invoke(app, ["--json", "-f", str(second), "import", str(source)])
    assert result.exit_code == 2 and "--config" in result.stderr
    conventional = second.parent / "importers.py"
    conventional.write_bytes(CONFIG.read_bytes())
    result = runner.invoke(app, ["--json", "-f", str(second), "import", str(source)])
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["config"] == str(conventional)
    assert json.loads(result.stdout)["data"]["config_source"] == "default beside root ledger"


def test_uncategorized_or_unbalanced_import_never_changes_the_ledger(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW.replace("Expenses:Dining", "Expenses:Unknown"))
    before = book.read_bytes()
    preview = run(book, source)
    assert json.loads(preview.stdout)["data"]["validation_errors"]
    result = run(book, source, "--apply")
    assert result.exit_code == 1
    assert book.read_bytes() == before


def test_native_metadata_and_custom_types_survive_import_and_json_round_trip(book: Path) -> None:
    config = book.parent / "importers.py"
    config.write_text("""from beancount import loader
class Native:
    name = "native"
    def identify(self, filepath): return filepath.endswith(".beancount")
    def account(self, filepath): return "Assets:Checking"
    def extract(self, filepath, existing): return loader.load_file(filepath)[0]
CONFIG = [Native()]
""")
    source = book.parent / "native.beancount"
    source.write_text("""2026-08-02 * "Native"
  bank_id: "id-001"
  cleared: TRUE
  rate: 1.125
  posted: 2026-08-03
  Assets:Checking -5 USD
    reference: "posting metadata"
  Expenses:Dining 5 USD
2026-08-02 custom "types" TRUE 2026-08-03 1.125 "café"
""")
    result = run(book, source, "--apply", config=config)
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    transaction = next(e for e in entries if isinstance(e, Transaction))
    assert transaction.meta["cleared"] is True
    assert transaction.meta["rate"] == Decimal("1.125")
    assert transaction.meta["posted"] == datetime.date(2026, 8, 3)
    assert transaction.postings[0].meta["reference"] == "posting metadata"
    listed = runner.invoke(app, ["--json", "--file", str(book), "list", "transaction"])
    row = json.loads(listed.stdout)["data"][0]
    assert row["meta"]["rate"] == {"kind": "number", "value": "1.125"}
    source_json = book.parent / "transactions.json"
    source_json.write_text(json.dumps([row]))
    added = runner.invoke(app, ["--json", "--file", str(book), "add", "transactions", "--from", str(source_json)])
    assert added.exit_code == 0, added.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    copies = [e for e in entries if isinstance(e, Transaction)]
    assert copies[1].meta["rate"] == copies[0].meta["rate"]
    listed_custom = runner.invoke(app, ["--json", "--file", str(book), "list", "custom"])
    assert [v["kind"] for v in json.loads(listed_custom.stdout)["data"][0]["values"]] == [
        "bool",
        "date",
        "number",
        "text",
    ]
