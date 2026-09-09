"""Real importer configuration, CSV extraction, preview, and repeat application."""

import datetime
import hashlib
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


def test_content_identical_reimport_is_an_exact_duplicate(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW.replace("bank-001", ""))
    assert run(book, source, "--apply").exit_code == 0
    # Different source bytes, but the same normalized values: the content
    # hash matches, so this is an exact duplicate, not a possible one.
    source.write_text(HEADER + ROW.replace("bank-001", "").replace("Cafe", "CAFE"))
    before = book.read_bytes()
    result = run(book, source, "--apply")
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["written"] == 0
    assert book.read_bytes() == before


def test_possible_duplicates_require_a_decision(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW.replace("bank-001", ""))
    assert run(book, source, "--apply").exit_code == 0
    # Same date, payee, and amount but different narration: no exact match.
    source.write_text(HEADER + ROW.replace("bank-001", "").replace("Coffee", "Posted purchase"))
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


def _import_ids(book: Path) -> list[str]:
    entries, errors, _ = loader.load_file(book)
    assert not errors
    return [e.meta["import-id"] for e in entries if isinstance(e, Transaction) and "import-id" in e.meta]


def test_import_writes_skill_shaped_import_ids(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW + ROW.replace("bank-001", "").replace("2026-08-02", "2026-08-04"))
    assert run(book, source, "--apply", "--duplicates", "include").exit_code == 0
    assert book.read_text().count("bea_import_id") == 0
    assert _import_ids(book)[-2:] == [
        "bank:bank-001",
        "csv:sha256:" + hashlib.sha256(b"2026-08-04|-5.25|COFFEE|Assets:Checking").hexdigest()[:16],
    ]


def test_hash_matches_the_skill_worked_example(tmp_path: Path) -> None:
    book = tmp_path / "main.bean"
    book.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Bank:Checking USD\n"
        "2026-01-01 open Expenses:Food USD\n"
        "2026-01-01 open Equity:Opening-Balances USD\n"
    )
    config = tmp_path / "importers.py"
    config.write_text(
        "import csv, datetime\n"
        "from decimal import Decimal\n"
        "from beancount.core.amount import Amount\n"
        "from beancount.core.data import Posting, Transaction, new_metadata\n"
        "class Checking:\n"
        '    name = "checking"\n'
        "    def identify(self, filepath): return True\n"
        '    def account(self, filepath): return "Assets:Bank:Checking"\n'
        "    def extract(self, filepath, existing):\n"
        "        entries = []\n"
        '        with open(filepath, encoding="utf-8-sig", newline="") as stream:\n'
        "            for line, row in enumerate(csv.DictReader(stream), start=2):\n"
        "                meta = new_metadata(filepath, line)\n"
        "                number = Decimal(row['Amount'])\n"
        "                entries.append(Transaction(meta, datetime.date.fromisoformat(row['Date']), '*',"
        " row['Payee'], row['Narration'], frozenset(), frozenset(),"
        " [Posting('Assets:Bank:Checking', Amount(number, 'USD'), None, None, None, None),"
        " Posting('Expenses:Food', Amount(-number, 'USD'), None, None, None, None)]))\n"
        "        return entries\n"
        "CONFIG = [Checking()]\n"
    )
    source = tmp_path / "bank.csv"
    source.write_text(
        "Date,Payee,Narration,Amount\n2026-05-07,Store,Trader Joes #123 Seattle WA,-54.20\n",
    )
    assert run(book, source, "--apply", config=config).exit_code == 0
    assert _import_ids(book) == ["csv:sha256:12802942bbda86f9"]


def test_identical_same_day_rows_take_occurrence_suffixes(book: Path) -> None:
    row = ROW.replace("bank-001", "")
    source = book.parent / "bank.csv"
    source.write_text(HEADER + row + row)
    assert run(book, source, "--apply", "--duplicates", "include").exit_code == 0
    base = "2026-08-02|-5.25|COFFEE|Assets:Checking"
    first = "csv:sha256:" + hashlib.sha256(base.encode()).hexdigest()[:16]
    second = "csv:sha256:" + hashlib.sha256(f"{base}|2".encode()).hexdigest()[:16]
    assert first != second
    assert _import_ids(book)[-2:] == [first, second]
    repeated = run(book, source, "--apply")
    assert repeated.exit_code == 0, repeated.output
    assert json.loads(repeated.stdout)["data"]["written"] == 0


def test_handwritten_skill_entry_is_an_exact_duplicate(book: Path) -> None:
    # A hand-written skill-style entry carrying only the content hash matches.
    identifier = "csv:sha256:" + hashlib.sha256(b"2026-08-02|-5.25|COFFEE|Assets:Checking").hexdigest()[:16]
    book.write_text(
        book.read_text() + f'\n2026-08-02 * "Cafe" "Coffee"\n  import-id: "{identifier}"\n'
        "  Assets:Checking  -5.25 USD\n  Expenses:Dining   5.25 USD\n"
    )
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW.replace("bank-001", ""))
    result = run(book, source, "--apply")
    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 0
    assert data["rows"][0]["status"] == "duplicate"
    assert data["rows"][0]["reason"] == f"import-id {identifier} is already in the ledger."


def test_legacy_bea_import_id_still_matches(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW.replace("bank-001", ""))
    raw = source.read_bytes()
    legacy = hashlib.sha256(f"Assets:Checking:{hashlib.sha256(raw).hexdigest()}:0".encode()).hexdigest()
    book.write_text(
        book.read_text() + f'\n2026-08-02 * "Cafe" "Coffee"\n  bea_import_id: "{legacy}"\n'
        "  Assets:Checking  -5.25 USD\n  Expenses:Dining   5.25 USD\n"
    )
    result = run(book, source, "--apply")
    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 0
    assert data["rows"][0]["status"] == "duplicate"
    assert data["rows"][0]["reason"] == "Previously imported source row matches."
    assert "bea_import_id" in book.read_text()


def test_id_key_override_selects_the_native_key(book: Path) -> None:
    config = book.parent / "importers.py"
    config.write_text(
        "import csv, datetime\n"
        "from decimal import Decimal\n"
        "from beancount.core.amount import Amount\n"
        "from beancount.core.data import Posting, Transaction, new_metadata\n"
        "class Orders:\n"
        '    name = "orders"\n'
        "    def identify(self, filepath): return True\n"
        '    def account(self, filepath): return "Assets:Checking"\n'
        "    def extract(self, filepath, existing):\n"
        "        entries = []\n"
        '        with open(filepath, encoding="utf-8-sig", newline="") as stream:\n'
        "            for line, row in enumerate(csv.DictReader(stream), start=2):\n"
        "                meta = new_metadata(filepath, line)\n"
        "                meta['order'] = row['Order']\n"
        "                number = Decimal(row['Amount'])\n"
        "                entries.append(Transaction(meta, datetime.date.fromisoformat(row['Date']), '*',"
        " row['Payee'], row['Narration'], frozenset(), frozenset(),"
        " [Posting('Assets:Checking', Amount(number, 'USD'), None, None, None, None),"
        " Posting('Expenses:Dining', Amount(-number, 'USD'), None, None, None, None)]))\n"
        "        return entries\n"
        "CONFIG = [Orders()]\n"
    )
    source = book.parent / "orders.csv"
    source.write_text("Date,Payee,Narration,Amount,Order\n2026-08-02,Cafe,Coffee,-5.25,A1\n")
    assert run(book, source, "--apply", "--id-key", "order", config=config).exit_code == 0
    assert _import_ids(book) == ["order:A1"]


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
