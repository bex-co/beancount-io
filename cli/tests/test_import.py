"""Real importer configuration, CSV extraction, preview, and repeat application."""

import datetime
import hashlib
import json
import re
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


def test_apply_summary_counts_entries_in_the_right_number(book: Path) -> None:
    single = book.parent / "single.csv"
    single.write_text(HEADER + ROW)
    applied = runner.invoke(app, ["--file", str(book), "import", str(single), "--config", str(CONFIG), "--apply"])
    assert applied.exit_code == 0, applied.output
    assert f"Wrote 1 entry to {book}." in applied.output
    assert "1 entries" not in applied.output

    double = book.parent / "double.csv"
    double.write_text(
        HEADER
        + "2026-08-03,Grocer,Food,-12.00,USD,Expenses:Dining,bank-002\n"
        + "2026-08-04,Grocer,Food,-7.50,USD,Expenses:Dining,bank-003\n"
    )
    applied = runner.invoke(app, ["--file", str(book), "import", str(double), "--config", str(CONFIG), "--apply"])
    assert applied.exit_code == 0, applied.output
    assert f"Wrote 2 entries to {book}." in applied.output


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


def test_in_batch_duplicate_names_the_import_row(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(HEADER + ROW + ROW.replace("bank-001", "bank-002"))
    result = run(book, source)

    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["rows"][1]["match"]["row"] == 1
    human = runner.invoke(app, ["--file", str(book), "import", str(source), "--config", str(CONFIG)])

    assert human.exit_code == 0, human.output
    assert "Matches row 1 of this import:" in human.stdout.replace("\r\n", "\n")


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
    # A second root inherits nothing: this export's header is readable, so the
    # only thing still missing is the account, and --config stays on offer.
    assert result.exit_code == 2 and "--config" in result.stderr and "--account" in result.stderr
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
    data = json.loads(preview.stdout)["data"]
    assert data["ready"] == 0
    assert data["rows"][0]["status"] == "blocked"
    assert "Expenses:Unknown" in data["rows"][0]["reason"]
    result = run(book, source, "--apply")
    assert result.exit_code == 4
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
        # Payee and narration are both hashed, so rows differing in payee differ (w1/149).
        "csv:sha256:" + hashlib.sha256(b"2026-08-04|-5.25 USD|CAFE|COFFEE|Assets:Checking").hexdigest()[:16],
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
        # No payee, exactly as in the reference's narration-only worked example.
        "Date,Payee,Narration,Amount\n2026-05-07,,Trader Joes #123 Seattle WA,-54.20\n",
    )
    assert run(book, source, "--apply", config=config).exit_code == 0
    # The worked example from the skill reference, recomputed for the exact
    # amount form: `-54.20` is written `-54.2 USD` (w3/m45).
    base = b"2026-05-07|-54.2 USD|TRADER JOES #123 SEATTLE WA|Assets:Bank:Checking"
    assert _import_ids(book) == ["csv:sha256:" + hashlib.sha256(base).hexdigest()[:16]]


def test_identical_same_day_rows_take_occurrence_suffixes(book: Path) -> None:
    row = ROW.replace("bank-001", "")
    source = book.parent / "bank.csv"
    source.write_text(HEADER + row + row)
    assert run(book, source, "--apply", "--duplicates", "include").exit_code == 0
    base = "2026-08-02|-5.25 USD|CAFE|COFFEE|Assets:Checking"
    first = "csv:sha256:" + hashlib.sha256(base.encode()).hexdigest()[:16]
    second = "csv:sha256:" + hashlib.sha256(f"{base}|2".encode()).hexdigest()[:16]
    assert first != second
    assert _import_ids(book)[-2:] == [first, second]
    repeated = run(book, source, "--apply")
    assert repeated.exit_code == 0, repeated.output
    assert json.loads(repeated.stdout)["data"]["written"] == 0


def test_handwritten_skill_entry_is_an_exact_duplicate(book: Path) -> None:
    # A hand-written skill-style entry carrying only the content hash matches.
    identifier = "csv:sha256:" + hashlib.sha256(b"2026-08-02|-5.25 USD|COFFEE|Assets:Checking").hexdigest()[:16]
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


CSV_HEADER = "Date,Payee,Narration,Amount\n"
CSV_ROW = "2026-08-02,Cafe,Coffee,-5.25\n"
CSV_MAPPING = "date=Date,amount=Amount,payee=Payee"


def run_csv(book: Path, source: Path, *args: str):
    return runner.invoke(app, ["--json", "--file", str(book), "import", str(source), *args])


@pytest.fixture
def isolated_config(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cfg = tmp_path / "cfg"
    cfg.mkdir()
    monkeypatch.setenv("BEA_CONFIG_DIR", str(cfg))
    return cfg


def csv_result(book: Path, body: str, *args: str, mapping: str = CSV_MAPPING, account: str = "Assets:Checking"):
    source = book.parent / "bank.csv"
    source.write_text(body)
    return run_csv(book, source, "--csv", mapping, "--account", account, *args)


def test_csv_signed_amount_posts_source_and_default_flag_queue(book: Path, isolated_config: Path) -> None:
    result = csv_result(book, CSV_HEADER + CSV_ROW, "--apply")
    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["importer"] == "csv" and data["config_source"] == "--csv"
    assert data["written"] == 1
    row = data["rows"][0]
    assert row["rule"] == "unmatched" and row["amount"] == "-5.25 USD"
    entries, errors, _ = loader.load_file(book)
    assert not errors
    transaction = next(e for e in entries if isinstance(e, Transaction))
    assert transaction.flag == "!"
    assert [(p.account, str(p.units)) for p in transaction.postings] == [
        ("Assets:Checking", "-5.25 USD"),
        ("Expenses:Uncategorized", "5.25 USD"),
    ]
    assert transaction.meta["import-id"].startswith("csv:sha256:")
    queued = runner.invoke(app, ["--json", "--file", str(book), "list", "transaction", "--flag", "!"])
    assert json.loads(queued.stdout)["data"][0]["payee"] == "Cafe"


def test_csv_debit_credit_pair_signs_each_side(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text("Date,Payee,Debit,Credit\n2026-08-02,Cafe,5.25,\n2026-08-03,Employer,,1000.00\n")
    result = run_csv(
        book,
        source,
        "--csv",
        "date=Date,payee=Payee,debit=Debit,credit=Credit",
        "--account",
        "Assets:Checking",
        "--default-account",
        "Expenses:Dining",
        "--apply",
    )
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["written"] == 2
    entries, errors, _ = loader.load_file(book)
    assert not errors
    amounts = {
        e.payee: str(next(p.units for p in e.postings if p.account == "Assets:Checking"))
        for e in entries
        if isinstance(e, Transaction)
    }
    assert amounts == {"Cafe": "-5.25 USD", "Employer": "1000.00 USD"}


def test_csv_sign_ledger_flips_the_file_convention(book: Path, isolated_config: Path) -> None:
    result = csv_result(
        book,
        CSV_HEADER + CSV_ROW.replace("-5.25", "5.25"),
        "--default-account",
        "Expenses:Dining",
        "--apply",
        mapping=f"{CSV_MAPPING},sign=ledger",
    )
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    transaction = next(e for e in entries if isinstance(e, Transaction))
    assert str(transaction.postings[0].units) == "-5.25 USD"


def test_csv_explicit_date_format(book: Path, isolated_config: Path) -> None:
    result = csv_result(
        book,
        "Date,Payee,Narration,Amount\n08/02/2026,Cafe,Coffee,-5.25\n",
        "--date-format",
        "%m/%d/%Y",
        "--default-account",
        "Expenses:Dining",
        "--apply",
    )
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["rows"][0]["date"] == "2026-08-02"


def test_csv_currency_column_overrides_the_operating_currency(book: Path, isolated_config: Path) -> None:
    result = csv_result(
        book,
        "Date,Payee,Amount,Cur\n2026-08-02,Cafe,-5.25,EUR\n",
        mapping=f"{CSV_MAPPING},currency=Cur",
    )
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["rows"][0]["amount"] == "-5.25 EUR"


def test_csv_missing_required_field_exits_2(book: Path, isolated_config: Path) -> None:
    result = csv_result(book, CSV_HEADER + CSV_ROW, mapping="date=Date,amount=Amount")
    assert result.exit_code == 2
    assert "--csv needs payee=Column" in result.stderr


def test_csv_bad_row_reports_line_and_column(book: Path, isolated_config: Path) -> None:
    result = csv_result(book, CSV_HEADER + CSV_ROW.replace("-5.25", "five"))
    assert result.exit_code == 2
    # The sole data row is Row 1; "line 2" is its physical line, labelled as
    # such so the two numbers cannot be read as one (w3/385).
    assert "Row 1 (line 2)" in result.stderr and "'Amount'" in result.stderr


def test_csv_unknown_field_exits_2(book: Path, isolated_config: Path) -> None:
    result = csv_result(book, CSV_HEADER + CSV_ROW, mapping=f"{CSV_MAPPING},foo=Bar")
    assert result.exit_code == 2
    assert "Unknown --csv field 'foo'" in result.stderr


def rules_file(book: Path, body: str) -> Path:
    rules = book.parent / "rules.toml"
    rules.write_text(body)
    return rules


def test_csv_rules_first_match_wins_case_insensitively(book: Path, isolated_config: Path) -> None:
    rules = rules_file(
        book,
        '[[rule]]\nmatch = "cafe|diner"\naccount = "Expenses:Dining"\n'
        '[[rule]]\nmatch = "cafe"\naccount = "Expenses:Groceries"\n',
    )
    result = csv_result(book, CSV_HEADER + "2026-08-02,CAFE MORNING,Coffee,-5.25\n", "--rules", str(rules))
    assert result.exit_code == 0, result.output
    row = json.loads(result.stdout)["data"]["rows"][0]
    assert row["rule"] == "cafe|diner"
    assert "Expenses:Dining" in row["entry"]


def test_csv_rule_matches_narration_when_payee_misses(book: Path, isolated_config: Path) -> None:
    rules = rules_file(book, '[[rule]]\nmatch = "salary"\naccount = "Income:Salary"\n')
    result = csv_result(
        book,
        CSV_HEADER + "2026-08-03,Unknown,Monthly salary,1000.00\n",
        "--rules",
        str(rules),
        "--apply",
        mapping=f"{CSV_MAPPING},narration=Narration",
    )
    assert result.exit_code == 0, result.output
    entries, errors, _ = loader.load_file(book)
    assert not errors
    transaction = next(e for e in entries if isinstance(e, Transaction))
    assert transaction.flag == "*"
    assert "Income:Salary" in [p.account for p in transaction.postings]


def test_csv_category_column_categorizes_and_rules_win(book: Path, isolated_config: Path) -> None:
    rules = rules_file(book, '[[rule]]\nmatch = "cafe"\naccount = "Expenses:Dining"\n')
    result = run_csv(
        book,
        category_source(book),
        "--csv",
        CSV_MAPPING,
        "--account",
        "Assets:Checking",
        "--rules",
        str(rules),
    )
    assert result.exit_code == 0, result.output
    rows = json.loads(result.stdout)["data"]["rows"]
    assert [row["rule"] for row in rows] == ["cafe", "Expenses:Groceries"]
    assert "Expenses:Dining" in rows[0]["entry"]
    assert "Expenses:Groceries" in rows[1]["entry"]


def test_csv_category_that_is_not_an_account_queues_the_row(book: Path, isolated_config: Path) -> None:
    """A card export's own labels ("Groceries") are not accounts; verbatim they broke every preview."""
    source = book.parent / "card.csv"
    source.write_text(
        "Date,Description,Category,Amount\n"
        "2026-08-03,WHOLEFDS,Groceries,-45.67\n"
        "2026-08-04,MARKET,Expenses:Groceries,-9.99\n"
    )
    mapping = "date=Date,amount=Amount,narration=Description"
    result = run_csv(book, source, "--csv", mapping, "--account", "Assets:Checking")
    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["validation_errors"] == []
    assert [row["rule"] for row in data["rows"]] == ["unmatched", "Expenses:Groceries"]
    assert data["rows"][0]["entry"].startswith("2026-08-03 !")
    assert "Expenses:Uncategorized" in data["rows"][0]["entry"]
    human = runner.invoke(
        app, ["--file", str(book), "import", str(source), "--csv", mapping, "--account", "Assets:Checking"]
    )
    assert human.exit_code == 0, human.output
    assert "1 row(s) carry a category that is not an account name ('Groceries')" in human.output
    assert "--rules" in human.output


def test_import_allow_errors_previews_and_applies_over_a_failing_assertion(book: Path, isolated_config: Path) -> None:
    """Books mid-reconciliation carry a failing assertion for days; that must not block every import."""
    book.write_text(book.read_text() + "\n2026-08-05 balance Assets:Checking 500 USD\n")
    source = book.parent / "bank.csv"
    source.write_text(CSV_HEADER + CSV_ROW)
    refused = run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking")
    assert refused.exit_code == 1, refused.output
    assert "Pass --allow-errors" in json.loads(refused.stderr)["error"]["message"]
    previewed = run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking", "--allow-errors")
    assert previewed.exit_code == 0, previewed.output
    data = json.loads(previewed.stdout)["data"]
    assert data["ready"] == 1 and data["validation_errors"] == []
    assert any("Balance failed" in warning for warning in data["validation_warnings"])
    applied = run_csv(book, source, "--apply", "--allow-errors")
    assert applied.exit_code == 0, applied.output
    assert json.loads(applied.stdout)["data"]["written"] == 1
    entries, errors, _ = loader.load_file(book)
    assert [type(error.entry).__name__ for error in errors] == ["Balance"]
    assert any(isinstance(e, Transaction) and e.payee == "Cafe" for e in entries)


def category_source(book: Path) -> Path:
    source = book.parent / "categorized.csv"
    source.write_text(
        "Date,Payee,Amount,Category\n"
        "2026-08-02,Cafe,-5.25,Expenses:Groceries\n"
        "2026-08-03,Market,-9.99,Expenses:Groceries\n"
    )
    return source


def test_csv_invalid_regex_exits_2(book: Path, isolated_config: Path) -> None:
    rules = rules_file(book, '[[rule]]\nmatch = "("\naccount = "Expenses:Dining"\n')
    result = csv_result(book, CSV_HEADER + CSV_ROW, "--rules", str(rules))
    assert result.exit_code == 2
    assert "invalid regex" in result.stderr


def test_csv_rule_naming_an_unopened_account_guides_to_add_open(book: Path, isolated_config: Path) -> None:
    rules = rules_file(book, '[[rule]]\nmatch = "cafe"\naccount = "Expenses:Popcorn"\n')
    before = book.read_bytes()
    result = csv_result(book, CSV_HEADER + CSV_ROW, "--rules", str(rules), "--apply")
    assert result.exit_code == 4
    assert "bea add open --account Expenses:Popcorn" in result.stderr
    assert book.read_bytes() == before


def test_csv_mapping_is_remembered_per_ledger_and_header(
    book: Path, isolated_config: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = book.parent / "bank.csv"
    source.write_text(CSV_HEADER + CSV_ROW)
    explicit = run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking")
    assert explicit.exit_code == 0, explicit.output
    assert json.loads(explicit.stdout)["data"]["config_source"] == "--csv"
    monkeypatch.chdir(book.parent.parent)
    bare = runner.invoke(app, ["--json", "--file", str(book), "import", str(source)])
    assert bare.exit_code == 0, bare.output
    data = json.loads(bare.stdout)["data"]
    assert data["config_source"] == "remembered --csv"
    assert data["config"] == CSV_MAPPING
    # A changed header matches nothing remembered: the guidance names --csv.
    other = book.parent / "other.csv"
    other.write_text("Day,Who,Total\n2026-08-06,X,1.00\n")
    missing = runner.invoke(app, ["--json", "--file", str(book), "import", str(other)])
    assert missing.exit_code == 2
    assert "--csv" in missing.stderr
    # A second account keeps its own mapping and requires account selection.
    source.write_text(CSV_HEADER + CSV_ROW)
    updated = run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Savings")
    assert updated.exit_code == 0, updated.output
    recall = runner.invoke(app, ["--json", "--file", str(book), "import", str(source)])
    assert recall.exit_code == 2
    assert "multiple source accounts" in recall.stderr
    selected = run_csv(book, source, "--account", "Assets:Savings")
    assert json.loads(selected.stdout)["data"]["account"] == "Assets:Savings"


def test_csv_config_takes_precedence_over_a_remembered_mapping(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(CSV_HEADER + CSV_ROW)
    assert run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking").exit_code == 0
    config = book.parent / "importers.py"
    config.write_text(
        "class Empty:\n"
        '    name = "empty"\n'
        "    def identify(self, filepath): return True\n"
        '    def account(self, filepath): return "Assets:Checking"\n'
        "    def extract(self, filepath, existing): return []\n"
        "CONFIG = [Empty()]\n"
    )
    result = runner.invoke(app, ["--json", "--file", str(book), "import", str(source), "--config", str(config)])
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["config_source"] == "--config"


def test_csv_reimport_skips_every_row(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(CSV_HEADER + CSV_ROW)
    assert run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking", "--apply").exit_code == 0
    saved = book.read_bytes()
    repeated = run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking", "--apply")
    assert repeated.exit_code == 0, repeated.output
    data = json.loads(repeated.stdout)["data"]
    assert data["written"] == 0
    assert [row["status"] for row in data["rows"]] == ["duplicate"]
    assert book.read_bytes() == saved


def test_csv_id_column_becomes_a_bank_import_id(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text("Date,Payee,Narration,Amount,Ref\n2026-08-02,Cafe,Coffee,-5.25,ref-7\n")
    result = run_csv(book, source, "--csv", f"{CSV_MAPPING},id=Ref", "--account", "Assets:Checking", "--apply")
    assert result.exit_code == 0, result.output
    assert _import_ids(book) == ["bank:ref-7"]


def test_a_fresh_ledger_takes_an_export_without_opening_another_account(book: Path, isolated_config: Path) -> None:
    """`bea init` and `bea import` compose: the default counter account exists."""
    assert "open Expenses:Uncategorized" in book.read_text()
    result = csv_result(book, CSV_HEADER + CSV_ROW, "--apply", mapping="date=Date,narration=Narration,amount=Amount")
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"]["written"] == 1


def test_a_description_only_export_maps_to_narration_and_writes_no_empty_payee(
    book: Path, isolated_config: Path
) -> None:
    result = csv_result(book, CSV_HEADER + CSV_ROW, "--apply", mapping="date=Date,narration=Narration,amount=Amount")
    assert result.exit_code == 0, result.output
    entries, _, _ = loader.load_file(str(book))
    written = [entry for entry in entries if isinstance(entry, Transaction) and entry.narration == "Coffee"]
    assert [(entry.payee, entry.narration) for entry in written] == [(None, "Coffee")]
    assert '""' not in book.read_text()


def test_a_mapping_naming_neither_description_field_is_refused(book: Path, isolated_config: Path) -> None:
    result = csv_result(book, CSV_HEADER + CSV_ROW, mapping="date=Date,amount=Amount")
    assert result.exit_code == 2
    assert "payee=Column or narration=Column" in result.stderr


def test_a_readable_header_row_supplies_the_mapping_and_the_date_format(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text("Transaction Date,Merchant,Description,Amount\n08/03/2026,Cafe,Coffee,-5.25\n")
    result = run_csv(book, source, "--account", "Assets:Checking", "--apply")
    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["config_source"] == "inferred --csv"
    assert data["config"] == "date=Transaction Date,amount=Amount,payee=Merchant,narration=Description"
    assert data["rows"][0]["date"] == "2026-08-03"


def test_an_unreadable_header_row_still_asks_for_an_importer(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text("col1,col2\na,b\n")
    result = run_csv(book, source, "--account", "Assets:Checking")
    assert result.exit_code == 2
    assert "--config" in result.stderr


def test_csv_auto_reports_the_columns_it_could_not_read(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text("col1,col2\na,b\n")
    result = run_csv(book, source, "--csv", "auto", "--account", "Assets:Checking")
    assert result.exit_code == 2
    assert "col1, col2" in result.stderr


@pytest.mark.parametrize("auto", [False, True])
@pytest.mark.parametrize("json_output", [False, True])
@pytest.mark.parametrize(
    ("header", "ambiguity"),
    [
        ("Date,Description,Memo,Amount", "narration (Description, Memo)"),
        ("Date,Posting Date,Description,Amount", "date (Date, Posting Date)"),
        ("Date,Description,Amount,Transaction Amount", "amount (Amount, Transaction Amount)"),
    ],
)
def test_fatal_csv_ambiguity_names_competing_columns(
    book: Path, auto: bool, json_output: bool, header: str, ambiguity: str
) -> None:
    source = book.parent / "bank.csv"
    source.write_text(header + "\n2026-08-02,A,B,-5.25\n")
    before = book.read_bytes()
    result = runner.invoke(
        app,
        [
            *(["--json"] if json_output else []),
            "--file",
            str(book),
            "import",
            str(source),
            "--account",
            "Assets:Checking",
            *(["--csv", "auto"] if auto else []),
        ],
    )
    assert result.exit_code == 2
    assert result.stdout == ""
    if json_output:
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "usage"
        assert any(ambiguity in detail for detail in error["details"])
    else:
        assert ambiguity in result.stderr
    assert "Choose a Python importer" not in result.stderr
    assert "--csv" in result.stderr
    assert book.read_bytes() == before


def test_nonfatal_csv_ambiguity_still_reports_the_dropped_role(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text("Date,Payee,Merchant,Description,Amount\n2026-08-02,A,B,Coffee,-5.25\n")
    result = runner.invoke(app, ["-f", str(book), "import", str(source), "--account", "Assets:Checking"])
    assert result.exit_code == 0, result.output
    assert "payee (Merchant, Payee)" in result.stderr
    assert "1 ready" in result.stdout


def test_changed_recognizable_csv_header_requests_mapping_instead_of_python(book: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(CSV_HEADER + CSV_ROW)
    assert run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking").exit_code == 0
    source.write_text("Date,Memo,Debit\n2026-08-02,Coffee,5.25\n")
    result = run_csv(book, source, "--account", "Assets:Checking")
    assert result.exit_code == 2
    error = json.loads(result.stderr)["error"]
    assert "Date, Memo, Debit" in error["message"]
    assert "--config" not in error["message"]


def test_an_option_typed_on_this_run_beats_the_remembered_one(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(CSV_HEADER + CSV_ROW)
    assert run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking").exit_code == 0
    result = run_csv(book, source, "--account", "Assets:Checking", "--default-account", "Expenses:Fees")
    assert result.exit_code == 0, result.output
    assert "Expenses:Fees" in json.loads(result.stdout)["data"]["diff"]


@pytest.mark.parametrize("explicit_mapping", [False, True])
def test_shared_csv_headers_require_account_and_preserve_each_mapping(
    book: Path, isolated_config: Path, explicit_mapping: bool
) -> None:
    checking = book.parent / "checking.csv"
    savings = book.parent / "savings.csv"
    checking.write_text(CSV_HEADER + CSV_ROW)
    savings.write_text(CSV_HEADER + CSV_ROW.replace("Cafe", "Savings fee"))
    assert run_csv(book, checking, "--csv", CSV_MAPPING, "--account", "Assets:Checking").exit_code == 0
    mapping_args = ["--csv", CSV_MAPPING] if explicit_mapping else []
    preview = run_csv(book, savings, *mapping_args, "--account", "Assets:Savings", "--default-account", "Expenses:Fees")
    assert preview.exit_code == 0, preview.output
    before = book.read_bytes()
    for args in [[], ["--apply"]]:
        refused = run_csv(book, checking, *args)
        assert refused.exit_code == 2, refused.output
        assert (
            "--account" in refused.stderr and "Assets:Checking" in refused.stderr and "Assets:Savings" in refused.stderr
        )
        assert book.read_bytes() == before
    for source, account in [(checking, "Assets:Checking"), (savings, "Assets:Savings")]:
        applied = run_csv(book, source, "--account", account, "--apply")
        assert applied.exit_code == 0, applied.output
        assert json.loads(applied.stdout)["data"]["account"] == account
    entries, errors, _ = loader.load_file(book)
    assert not errors
    purchases = {entry.payee: entry for entry in entries if isinstance(entry, Transaction)}
    assert [p.account for p in purchases["Cafe"].postings] == ["Assets:Checking", "Expenses:Uncategorized"]
    assert [p.account for p in purchases["Savings fee"].postings] == ["Assets:Savings", "Expenses:Fees"]


def test_zero_postings_do_not_block_imports_into_the_account(book: Path, isolated_config: Path) -> None:
    """Beancount's Amount is falsy at zero; a `0 USD` posting is explicit, not missing."""
    with book.open("a") as stream:
        stream.write('2026-08-01 * "Zero"\n  Assets:Checking 0 USD\n  Assets:Savings 0 USD\n')
    rows = CSV_HEADER + "2026-08-02,Shop,Purchase,-10\n2026-08-03,Shop,Nothing,0\n"

    result = csv_result(book, rows, "--apply")

    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 2
    assert sorted(row["amount"] for row in data["rows"]) == ["-10 USD", "0 USD"]
    entries, errors, _ = loader.load_file(book)
    assert not errors
    amounts = [
        str(p.units)
        for e in entries
        if isinstance(e, Transaction)
        for p in e.postings
        if p.account == "Assets:Checking"
    ]
    assert amounts == ["0 USD", "-10 USD", "0 USD"]

    again = csv_result(book, rows, "--apply")
    assert again.exit_code == 0, again.output
    assert json.loads(again.stdout)["data"]["written"] == 0


def _checking_amounts(book: Path) -> list[str]:
    entries, errors, _ = loader.load_file(book)
    assert not errors, errors
    return [
        str(p.units)
        for e in entries
        if isinstance(e, Transaction)
        for p in e.postings
        if p.account == "Assets:Checking"
    ]


@pytest.mark.parametrize("mapping", ["auto", "date=Date,narration=Description,amount=Amount"])
@pytest.mark.parametrize("bom", ["", "﻿"], ids=["plain", "bom"])
def test_csv_padded_headers_are_stripped_everywhere(book: Path, isolated_config: Path, mapping: str, bom: str) -> None:
    """IMPORTING.md promises header stripping; discovery, date inference, and extraction must all agree."""
    rows = f"{bom} Date , Description , Amount \n2026-08-15,Shop,-12.34\n"

    result = csv_result(book, rows, "--apply", mapping=mapping)

    assert result.exit_code == 0, result.output
    assert _checking_amounts(book) == ["-12.34 USD"]


def test_csv_headers_that_collide_after_stripping_are_rejected(book: Path, isolated_config: Path) -> None:
    before = book.read_text()

    result = csv_result(
        book,
        "Date, Date ,Description,Amount\n2026-08-15,2026-08-16,Shop,-12.34\n",
        "--apply",
        mapping="date=Date,narration=Description,amount=Amount",
    )

    assert result.exit_code == 2, result.output
    assert "'Date'" in result.stderr and "2 times" in result.stderr
    assert book.read_text() == before


def test_csv_duplicate_mapped_amount_column_is_rejected_before_writing(book: Path, isolated_config: Path) -> None:
    before = book.read_text()

    result = csv_result(
        book,
        "Date,Description,Amount,Amount\n2026-08-15,Shop,-12.34,-99\n",
        "--apply",
        mapping="date=Date,narration=Description,amount=Amount",
    )

    assert result.exit_code == 2, result.output
    assert "'Amount'" in result.stderr and "ambiguous" in result.stderr
    assert book.read_text() == before


def test_csv_duplicate_unmapped_columns_are_fine(book: Path, isolated_config: Path) -> None:
    result = csv_result(
        book,
        "Date,Description,Amount,Note,Note\n2026-08-15,Shop,-12.34,a,b\n",
        "--apply",
        mapping="date=Date,narration=Description,amount=Amount",
    )

    assert result.exit_code == 0, result.output
    assert _checking_amounts(book) == ["-12.34 USD"]


def test_csv_unterminated_quote_is_rejected_with_its_line(book: Path, isolated_config: Path) -> None:
    before = book.read_text()
    malformed = 'Date,Amount,Description\n2026-08-15,-12.34,"Shop\n2026-08-16,-56.78,Second\n'

    result = csv_result(book, malformed, "--apply", mapping="date=Date,narration=Description,amount=Amount")

    assert result.exit_code == 2, result.output
    assert "not well-formed CSV" in result.stderr and "quote" in result.stderr
    assert book.read_text() == before

    fixed = csv_result(
        book, malformed.replace('"Shop', '"Shop"'), "--apply", mapping="date=Date,narration=Description,amount=Amount"
    )
    assert fixed.exit_code == 0, fixed.output
    assert _checking_amounts(book) == ["-12.34 USD", "-56.78 USD"]


def test_csv_quoted_multiline_and_escaped_quotes_still_import(book: Path, isolated_config: Path) -> None:
    rows = 'Date,Amount,Description\n2026-08-15,-12.34,"Shop\nsecond line"\n2026-08-16,-1,"say ""hi"""\n'

    result = csv_result(book, rows, "--apply", mapping="date=Date,narration=Description,amount=Amount")

    assert result.exit_code == 0, result.output
    entries, _, _ = loader.load_file(book)
    narrations = [e.narration for e in entries if isinstance(e, Transaction) and e.narration]
    assert "Shop second line" in narrations and 'say "hi"' in narrations


def test_a_missing_importer_dependency_names_the_engine_not_the_frontend(book: Path, tmp_path: Path) -> None:
    """Importer configurations run under the engine interpreter, so that is the
    environment the package is missing from — installing it beside `bea` changes nothing."""
    source = tmp_path / "bank.csv"
    source.write_text(HEADER + ROW)
    config = tmp_path / "needs_a_package.py"
    config.write_text("import definitely_not_installed_module_xyz\nCONFIG = []\n")

    result = runner.invoke(app, ["--file", str(book), "import", str(source), "--config", str(config)])

    assert result.exit_code == 2, result.output
    message = result.stderr
    assert "Importer dependency is unavailable" in message
    assert "managed engine" in message
    assert "bea engine status" in message
    assert "docs/IMPORTING.md" in message
    # The advice this replaces: it sent the user to change the environment
    # running bea, which the engine never consults.
    assert "Run bea in an environment" not in message


def test_an_importer_that_raises_is_still_a_different_error(book: Path, tmp_path: Path) -> None:
    """The ImportError branch must stay distinct from the general failure branch."""
    source = tmp_path / "bank.csv"
    source.write_text(HEADER + ROW)
    config = tmp_path / "boom.py"
    config.write_text("raise ValueError('boom')\nCONFIG = []\n")

    result = runner.invoke(app, ["--file", str(book), "import", str(source), "--config", str(config)])

    assert result.exit_code != 0
    assert "Importer dependency is unavailable" not in result.stderr


class TestCsvBankAmountSpellings:
    """The no-code path parses the spellings real exports use (w1/m24/t003)."""

    MAPPING = "date=Date,amount=Amount,payee=Payee,narration=Narration"

    def _apply(self, book: Path, body: str) -> dict:
        source = book.parent / "bank.csv"
        source.write_text(body)
        result = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking", "--apply")
        assert result.exit_code == 0, result.output
        return json.loads(result.stdout)["data"]

    def _posted(self, book: Path) -> str:
        entries, errors, _ = loader.load_file(book)
        assert not errors
        transaction = next(e for e in entries if isinstance(e, Transaction))
        return str(transaction.postings[0].units)

    @pytest.mark.parametrize(
        ("cell", "expected"),
        [
            ('"$1,000.00"', "1000.00 USD"),
            ("(4.50)", "-4.50 USD"),
            ("4.50-", "-4.50 USD"),
            ("$12.50", "12.50 USD"),
            ('"1,00,000"', "100000 USD"),
            ("1\u2009000.00", "1000.00 USD"),
        ],
    )
    def test_bank_spellings_import_exact(self, book: Path, isolated_config: Path, cell: str, expected: str) -> None:
        self._apply(book, f"Date,Payee,Narration,Amount\n2026-08-02,Cafe,Coffee,{cell}\n")
        assert self._posted(book) == expected

    def test_comma_decimals_import_under_eu_column(self, book: Path, isolated_config: Path) -> None:
        body = "Date;Payee;Narration;Amount\n2026-08-02;Cafe;Coffee;1.000,00\n2026-08-03;Cafe;Coffee;1.000\n"
        source = book.parent / "bank.csv"
        source.write_text(body)
        result = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking", "--apply")
        assert result.exit_code == 0, result.output
        entries, errors, _ = loader.load_file(book)
        assert not errors
        amounts = sorted(str(t.postings[0].units) for t in entries if isinstance(t, Transaction))
        assert amounts == ["1000 USD", "1000.00 USD"]

    def test_mixed_decimal_conventions_refused(self, book: Path, isolated_config: Path) -> None:
        body = 'Date,Payee,Narration,Amount\n2026-08-02,Cafe,Coffee,"1,000.00"\n2026-08-03,Cafe,Coffee,"1.000,00"\n'
        source = book.parent / "bank.csv"
        source.write_text(body)
        before = book.read_bytes()
        result = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert result.exit_code == 2, result.output
        assert "decimal conventions" in result.stderr
        assert "1,000.00" in result.stderr
        assert "1.000,00" in result.stderr
        assert book.read_bytes() == before

    @pytest.mark.parametrize("cell", ["NaN", "nan", "Infinity", "-INF", "+inf"])
    def test_nonfinite_amounts_blocked_in_preview(self, book: Path, isolated_config: Path, cell: str) -> None:
        body = f"Date,Payee,Narration,Amount\n2026-08-02,Cafe,Coffee,{cell}\n"
        source = book.parent / "bank.csv"
        source.write_text(body)
        before = book.read_bytes()
        preview = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert preview.exit_code == 2, preview.output
        assert "not a finite number" in preview.stderr
        assert "Row 1 (line 2)" in preview.stderr
        applied = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking", "--apply")
        assert applied.exit_code == 2, applied.output
        assert book.read_bytes() == before

    def test_bad_amount_names_cell_row_and_spellings(self, book: Path, isolated_config: Path) -> None:
        body = "Date,Payee,Narration,Amount\n2026-08-02,Cafe,Coffee,abc\n"
        source = book.parent / "bank.csv"
        source.write_text(body)
        result = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert result.exit_code == 2, result.output
        assert "abc" in result.stderr
        assert "Row 1 (line 2)" in result.stderr
        assert "Accepted" in result.stderr

    def test_comma_decimal_lookalike_refused_in_us_column(self, book: Path, isolated_config: Path) -> None:
        body = 'Date,Payee,Narration,Amount\n2026-08-02,Cafe,Coffee,"1,000.00"\n2026-08-03,Cafe,Coffee,"4,50"\n'
        source = book.parent / "bank.csv"
        source.write_text(body)
        result = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert result.exit_code == 2, result.output
        assert "4,50" in result.stderr

    def test_debit_credit_accepts_symbols(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Payee,Debit,Credit\n2026-08-02,Cafe,$5.25,\n")
        result = run_csv(
            book,
            source,
            "--csv",
            "date=Date,payee=Payee,debit=Debit,credit=Credit",
            "--account",
            "Assets:Checking",
            "--apply",
        )
        assert result.exit_code == 0, result.output
        assert self._posted(book) == "-5.25 USD"


class TestCsvBlankRowsAndTies:
    MAPPING = "date=Date,amount=Amount,narration=Description"

    def test_blank_rows_skip_and_count_in_preview(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n\n   \n2026-08-03,Tea,-2.00\n")
        result = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert result.exit_code == 0, result.output
        data = json.loads(result.stdout)["data"]
        assert data["ready"] == 2
        assert data["skipped_blank"] == 2

    def test_blank_count_shows_in_human_summary(self, book: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n\n")
        result = runner.invoke(
            app, ["--file", str(book), "import", str(source), "--csv", self.MAPPING, "--account", "Assets:Checking"]
        )
        assert result.exit_code == 0, result.output
        assert "1 ready" in result.stdout
        assert "1 blank row skipped" in result.stdout

    def test_row_with_content_but_no_date_still_fails(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n,Coffee,-5.25\n")
        result = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert result.exit_code == 2
        assert "cannot parse date" in result.stderr

    @pytest.mark.parametrize("auto", [False, True])
    def test_fatal_tie_shows_resolving_csv_line(self, book: Path, auto: bool) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Transaction Date,Description,Memo,Transaction Amount\n2026-08-02,A,B,-5.25\n")
        result = runner.invoke(
            app,
            [
                "--file",
                str(book),
                "import",
                str(source),
                "--account",
                "Assets:Checking",
                *(["--csv", "auto"] if auto else []),
            ],
        )
        assert result.exit_code == 2
        assert "narration (Description, Memo)" in result.stderr
        assert "--csv date=Transaction Date,amount=Transaction Amount,narration=Description" in result.stderr

    def test_original_description_alone_is_narration(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Original Description,Amount\n2026-08-02,POS CAFE XYZ,-5.25\n")
        result = runner.invoke(
            app, ["--file", str(book), "import", str(source), "--csv", "auto", "--account", "Assets:Checking"]
        )
        assert result.exit_code == 0, result.output
        assert "narration=Original Description" in result.stderr
        assert "POS CAFE XYZ" in result.stdout

    def test_description_and_original_description_tie(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Original Description,Amount\n2026-08-02,A,B,-5.25\n")
        result = run_csv(book, source, "--csv", "auto", "--account", "Assets:Checking")
        assert result.exit_code == 2
        assert "narration (Description, Original Description)" in result.stderr


class TestCsvBankIdentifiers:
    def test_bare_id_column_dedups_across_runs(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount,ID\n2026-08-02,Cafe,-5.25,txn-1\n")
        preview = run_csv(book, source, "--csv", "auto", "--account", "Assets:Checking")
        assert preview.exit_code == 0, preview.output
        assert "id=ID" in json.loads(preview.stdout)["data"]["config"]
        applied = run_csv(book, source, "--csv", "auto", "--account", "Assets:Checking", "--apply")
        assert applied.exit_code == 0, applied.output
        assert 'import-id: "bank:txn-1"' in book.read_text()
        repeat = run_csv(book, source, "--csv", "auto", "--account", "Assets:Checking")
        assert repeat.exit_code == 0, repeat.output
        data = json.loads(repeat.stdout)["data"]
        assert data["ready"] == 0
        assert data["duplicates"] == 1

    def test_lowercase_id_column_infers(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount,id\n2026-08-02,Cafe,-5.25,txn-1\n")
        result = run_csv(book, source, "--csv", "auto", "--account", "Assets:Checking", "--apply")
        assert result.exit_code == 0, result.output
        assert 'import-id: "bank:txn-1"' in book.read_text()

    def test_skill_written_bank_id_is_an_exact_duplicate(self, book: Path, isolated_config: Path) -> None:
        with book.open("a") as handle:
            handle.write(
                '\n2026-08-02 * "Cafe" "Coffee"\n'
                '  import-id: "bank:txn-9"\n'
                "  Assets:Checking  -5.25 USD\n"
                "  Expenses:Uncategorized  5.25 USD\n"
            )
        source = book.parent / "bank.csv"
        source.write_text("Date,Payee,Description,Amount,ID\n2026-08-02,Cafe,Coffee,-5.25,txn-9\n")
        result = run_csv(book, source, "--csv", "auto", "--account", "Assets:Checking")
        assert result.exit_code == 0, result.output
        (row,) = json.loads(result.stdout)["data"]["rows"]
        assert row["status"] == "duplicate"
        assert "bank:txn-9" in (row["reason"] or "")

    def test_preview_names_the_identifier_source(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount,ID\n2026-08-02,Cafe,-5.25,txn-1\n2026-08-03,Tea,-2.00,\n")
        result = run_csv(
            book,
            source,
            "--csv",
            "date=Date,amount=Amount,narration=Description,id=ID",
            "--account",
            "Assets:Checking",
        )
        assert result.exit_code == 0, result.output
        rows = json.loads(result.stdout)["data"]["rows"]
        assert [row["id_source"] for row in rows] == ["bank", "hash"]

    def test_human_table_shows_the_identifier_source(self, book: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount,ID\n2026-08-02,Cafe,-5.25,txn-1\n2026-08-03,Tea,-2.00,\n")
        result = runner.invoke(
            app,
            [
                "--file",
                str(book),
                "import",
                str(source),
                "--csv",
                "date=Date,amount=Amount,narration=Description,id=ID",
                "--account",
                "Assets:Checking",
            ],
        )
        assert result.exit_code == 0, result.output
        assert "ID" in result.stdout.splitlines()[1]
        assert "bank" in result.stdout
        assert "hash" in result.stdout


class TestCsvRulesMatching:
    def test_empty_match_refused_naming_file_and_rule(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = ""\naccount = "Expenses:Food"\n')
        before = book.read_bytes()
        result = csv_result(book, CSV_HEADER + CSV_ROW, "--rules", str(rules))
        assert result.exit_code == 2, result.output
        assert "rules.toml" in result.stderr
        assert "Rule 1" in result.stderr
        assert ".*" in result.stderr
        assert book.read_bytes() == before

    def test_whitespace_match_refused(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "   "\naccount = "Expenses:Food"\n')
        result = csv_result(book, CSV_HEADER + CSV_ROW, "--rules", str(rules))
        assert result.exit_code == 2, result.output
        assert "Rule 1" in result.stderr
        assert "empty match" in result.stderr

    @pytest.mark.parametrize("pattern", ["whole foods|trader joe|", "|cafe", "(cafe)?", "x*", "^"])
    def test_pattern_matching_empty_text_refused(self, book: Path, isolated_config: Path, pattern: str) -> None:
        rules = rules_file(book, f'[[rule]]\nmatch = "{pattern}"\naccount = "Expenses:Food"\n')
        before = book.read_bytes()
        result = csv_result(book, CSV_HEADER + CSV_ROW, "--rules", str(rules), "--apply")
        assert result.exit_code == 2, result.output
        assert "Rule 1" in result.stderr
        assert "matches empty text" in result.stderr
        assert ".*" in result.stderr
        assert book.read_bytes() == before

    @pytest.mark.parametrize("pattern", ["whole foods|trader joe|", "(cafe)?"])
    def test_engine_refuses_pattern_matching_empty_text(self, pattern: str) -> None:
        from bea_engine.csv_mapper import CsvRule as EngineCsvRule
        from bea_engine.protocol import UsageError as EngineUsageError

        with pytest.raises(EngineUsageError, match="Rule 2 pattern .* matches empty text"):
            EngineCsvRule.compile(1, {"match": pattern, "account": "Expenses:Food"})

    @pytest.mark.parametrize("pattern", [".*", "^.*$", " .* "])
    def test_explicit_catch_all_spellings_still_load(self, pattern: str) -> None:
        from bea_engine.csv_mapper import CsvRule as EngineCsvRule
        from cli.csv_mapper import CsvRule

        assert CsvRule.compile(0, {"match": pattern, "account": "Expenses:Food"}).pattern == pattern
        assert EngineCsvRule.compile(0, {"match": pattern, "account": "Expenses:Food"}).pattern == pattern

    def test_explicit_catch_all_categorizes_everything(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = ".*"\naccount = "Expenses:Food"\n')
        result = csv_result(book, CSV_HEADER + CSV_ROW, "--rules", str(rules))
        assert result.exit_code == 0, result.output
        row = json.loads(result.stdout)["data"]["rows"][0]
        assert row["rule"] == ".*"
        assert "Expenses:Food" in row["entry"]

    def test_rule_matches_category_label(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "STARBUCKS"\naccount = "Expenses:Food"\n')
        result = csv_result(
            book,
            "Date,Description,Amount,Category\n2026-08-02,Card purchase,-12.50,STARBUCKS\n",
            "--rules",
            str(rules),
            mapping="date=Date,amount=Amount,narration=Description,category=Category",
        )
        assert result.exit_code == 0, result.output
        data = json.loads(result.stdout)["data"]
        (row,) = data["rows"]
        assert row["rule"] == "STARBUCKS"
        assert "Expenses:Food" in row["entry"]
        assert "STARBUCKS" not in " ".join(data["notes"])

    @pytest.mark.parametrize("rule_form", ["NFC", "NFD"])
    def test_rule_matches_either_unicode_normalization(self, book: Path, isolated_config: Path, rule_form: str) -> None:
        import unicodedata

        nfc, nfd = (unicodedata.normalize(form, "Café Nero") for form in ("NFC", "NFD"))
        label = unicodedata.normalize("NFD", "Crème")
        rules = rules_file(
            book,
            f'[[rule]]\nmatch = "{unicodedata.normalize(rule_form, "café")}"\naccount = "Expenses:Food"\n'
            f'[[rule]]\nmatch = "{unicodedata.normalize(rule_form, "^crème$")}"\naccount = "Expenses:Dining"\n',
        )
        result = csv_result(
            book,
            "Date,Description,Amount,Category\n"
            f"2026-08-02,{nfd},-4.00,\n2026-08-03,{nfc},-5.00,\n2026-08-04,Card,-6.00,{label}\n",
            "--rules",
            str(rules),
            mapping="date=Date,amount=Amount,narration=Description,category=Category",
        )
        assert result.exit_code == 0, result.output
        rows = json.loads(result.stdout)["data"]["rows"]
        assert [row["rule"] != "unmatched" for row in rows] == [True, True, True]
        assert "Expenses:Food" in rows[0]["entry"] and "Expenses:Food" in rows[1]["entry"]
        assert "Expenses:Dining" in rows[2]["entry"]


class TestStickyRecall:
    MAPPING = "date=Date,amount=Amount,narration=Description"
    BAD_MAPPING = "date=Date,amount=Description,narration=Amount"

    def _record(self, book: Path, cfg: Path) -> Path:
        key = hashlib.sha256(str(book.resolve()).encode()).hexdigest()
        return cfg / "importers" / f"csv-{key}.json"

    def _remember_rule_mapping(self, book: Path) -> tuple[Path, Path]:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        rules = rules_file(book, '[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Dining"\n')
        seed = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking", "--rules", str(rules))
        assert seed.exit_code == 0, seed.output
        assert json.loads(seed.stdout)["data"]["ready"] == 1
        return source, rules

    def test_failed_first_mapping_leaves_the_next_import_free_to_infer(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        before = book.read_bytes()

        failed = run_csv(book, source, "--csv", self.BAD_MAPPING, "--account", "Assets:Checking")

        assert failed.exit_code == 2, failed.output
        assert "cannot parse amount 'Coffee'" in failed.stderr
        assert not self._record(book, isolated_config).exists()
        assert book.read_bytes() == before
        retry = run_csv(book, source, "--account", "Assets:Checking")
        assert retry.exit_code == 0, retry.output
        data = json.loads(retry.stdout)["data"]
        assert data["config_source"] == "inferred --csv"
        assert data["ready"] == 1
        assert data["rows"][0]["amount"] == "-5.25 USD"
        assert book.read_bytes() == before

    @pytest.mark.parametrize("apply", [False, True], ids=["preview", "apply"])
    @pytest.mark.parametrize("as_json", [False, True], ids=["human", "json"])
    def test_failed_explicit_mapping_preserves_the_working_rules(
        self, book: Path, isolated_config: Path, apply: bool, as_json: bool
    ) -> None:
        source, rules = self._remember_rule_mapping(book)
        record = self._record(book, isolated_config)
        remembered = record.read_bytes()
        before = book.read_bytes()

        failed = runner.invoke(
            app,
            [
                *(["--json"] if as_json else []),
                "--file",
                str(book),
                "import",
                str(source),
                "--csv",
                self.BAD_MAPPING,
                "--account",
                "Assets:Checking",
                *(["--apply"] if apply else []),
            ],
        )

        assert failed.exit_code == 2, failed.output
        assert "cannot parse amount 'Coffee'" in failed.stderr
        assert record.read_bytes() == remembered
        assert book.read_bytes() == before
        assert "Discarded remembered" not in failed.output
        retry = run_csv(book, source)
        assert retry.exit_code == 0, retry.output
        data = json.loads(retry.stdout)["data"]
        assert data["config_source"] == "remembered --csv"
        assert data["remembered"]["rules"] == str(rules)
        assert data["rows"][0]["rule"] == "Coffee"
        assert "Expenses:Dining" in data["rows"][0]["entry"]
        assert record.read_bytes() == remembered
        assert book.read_bytes() == before

    def test_review_blocked_apply_preserves_the_working_memory(self, book: Path, isolated_config: Path) -> None:
        source, rules = self._remember_rule_mapping(book)
        record = self._record(book, isolated_config)
        remembered = record.read_bytes()
        before = book.read_bytes()

        failed = run_csv(
            book,
            source,
            "--csv",
            self.MAPPING,
            "--account",
            "Assets:Checking",
            "--default-account",
            "Expenses:NotOpened",
            "--apply",
        )

        assert failed.exit_code == 4, failed.output
        error = json.loads(failed.stderr)["error"]
        assert error["result"]["written"] == 0
        assert error["result"]["rows"][0]["status"] == "blocked"
        assert record.read_bytes() == remembered
        assert book.read_bytes() == before
        assert "Discarded remembered" not in failed.output
        retry = run_csv(book, source)
        assert retry.exit_code == 0, retry.output
        data = json.loads(retry.stdout)["data"]
        assert data["remembered"]["rules"] == str(rules)
        assert data["rows"][0]["rule"] == "Coffee"
        assert data["ready"] == 1
        assert record.read_bytes() == remembered
        assert book.read_bytes() == before

    @pytest.mark.parametrize("stale_setting", ["missing-rules", "corrupt-rules", "legacy-sign"])
    def test_failed_extraction_does_not_persist_stale_memory_repairs(
        self, book: Path, isolated_config: Path, stale_setting: str
    ) -> None:
        source, rules = self._remember_rule_mapping(book)
        record = self._record(book, isolated_config)
        if stale_setting == "missing-rules":
            rules.unlink()
        elif stale_setting == "corrupt-rules":
            rules.write_text("NOT TOML {{{")
        else:
            payload = json.loads(record.read_text())
            payload["sources"][0]["mapping"] += ",sign=ledger"
            record.write_text(json.dumps(payload, indent=2) + "\n")
        remembered = record.read_bytes()
        before = book.read_bytes()
        source.write_text("Date,Description,Amount\n2026-08-03,Coffee,not-a-number\n")

        failed = run_csv(book, source)

        assert failed.exit_code == 2, failed.output
        assert "cannot parse amount 'not-a-number'" in failed.stderr
        assert record.read_bytes() == remembered
        assert book.read_bytes() == before

    def test_remembered_run_lists_every_setting(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Food"\n')
        first = book.parent / "first.csv"
        first.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        seed = run_csv(
            book,
            first,
            "--csv",
            self.MAPPING,
            "--account",
            "Assets:Checking",
            "--rules",
            str(rules),
            "--default-account",
            "Expenses:Misc",
            "--date-format",
            "%Y-%m-%d",
        )
        assert seed.exit_code == 0, seed.output
        second = book.parent / "second.csv"
        second.write_text("Date,Description,Amount\n2026-08-03,Tea,-2.00\n")
        result = runner.invoke(app, ["--file", str(book), "import", str(second), "--account", "Assets:Checking"])
        assert result.exit_code == 0, result.output
        assert "remembered" in result.stderr
        assert "first.csv" in result.stderr
        assert "--csv date=Date" in result.stderr
        assert "--date-format %Y-%m-%d" in result.stderr
        assert "rules.toml" in result.stderr
        assert "--default-account Expenses:Misc" in result.stderr

    def test_remembered_json_exposes_settings(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Food"\n')
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        seed = run_csv(
            book,
            source,
            "--csv",
            self.MAPPING,
            "--account",
            "Assets:Checking",
            "--rules",
            str(rules),
            "--default-account",
            "Expenses:Misc",
        )
        assert seed.exit_code == 0, seed.output
        assert json.loads(seed.stdout)["data"]["remembered"] is None
        repeat = run_csv(book, source, "--account", "Assets:Checking")
        assert repeat.exit_code == 0, repeat.output
        data = json.loads(repeat.stdout)["data"]
        assert data["config_source"] == "remembered --csv"
        assert data["remembered"]["rules"] == str(rules)
        assert data["remembered"]["default_account"] == "Expenses:Misc"
        assert "date=Date" in data["remembered"]["mapping"]

    def test_remembered_sign_is_not_reused(self, book: Path, isolated_config: Path) -> None:
        ledger_sign = book.parent / "ledger-sign.csv"
        ledger_sign.write_text("Date,Description,Amount\n2026-08-02,Cafe,4.50\n")
        seed = run_csv(book, ledger_sign, "--csv", f"{self.MAPPING},sign=ledger", "--account", "Assets:Checking")
        assert seed.exit_code == 0, seed.output
        stored = json.loads(self._record(book, isolated_config).read_text())["sources"][0]
        assert "sign=" not in stored["mapping"]
        bank = book.parent / "bank.csv"
        bank.write_text("Date,Description,Amount\n2026-08-03,Coffee,-4.50\n")
        repeat = run_csv(book, bank, "--account", "Assets:Checking")
        assert repeat.exit_code == 0, repeat.output
        (row,) = json.loads(repeat.stdout)["data"]["rows"]
        assert row["amount"] == "-4.50 USD"
        notes = " ".join(json.loads(repeat.stdout)["data"]["notes"])
        assert "ledger-sign.csv was imported with sign=ledger" in notes
        assert "bank.csv is read bank-signed" in notes

    def test_flag_free_apply_of_the_previewed_file_keeps_sign_ledger(self, book: Path, isolated_config: Path) -> None:
        """w1/150: the documented preview-then-flag-free-apply wrote the opposite sign."""
        source = book.parent / "cc.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Grocery,25.00\n")
        preview = run_csv(book, source, "--csv", f"{self.MAPPING},sign=ledger", "--account", "Assets:Checking")
        assert preview.exit_code == 0, preview.output
        (previewed,) = json.loads(preview.stdout)["data"]["rows"]
        assert previewed["amount"] == "-25.00 USD"
        stored = json.loads(self._record(book, isolated_config).read_text())["sources"][0]
        assert "sign=" not in stored["mapping"]

        applied = run_csv(book, source, "--apply")

        assert applied.exit_code == 0, applied.output
        data = json.loads(applied.stdout)["data"]
        (row,) = data["rows"]
        assert row["amount"] == "-25.00 USD"
        assert data["written"] == 1
        assert data["remembered"]["mapping"].endswith(",sign=ledger")
        assert any("Re-applied sign=ledger: cc.csv" in note for note in data["notes"])
        assert re.search(r"^\s+Assets:Checking\s+-25\.00 USD$", book.read_text(), re.MULTILINE)

    def test_explicit_sign_ledger_still_works(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Cafe,4.50\n")
        result = run_csv(book, source, "--csv", f"{self.MAPPING},sign=ledger", "--account", "Assets:Checking")
        assert result.exit_code == 0, result.output
        (row,) = json.loads(result.stdout)["data"]["rows"]
        assert row["amount"] == "-4.50 USD"

    def test_remembered_date_format_mismatch_is_refused(self, book: Path, isolated_config: Path) -> None:
        us = book.parent / "us.csv"
        us.write_text("Date,Description,Amount\n08/02/2026,Coffee,-5.25\n")
        seed = run_csv(book, us, "--csv", self.MAPPING, "--account", "Assets:Checking", "--date-format", "%m/%d/%Y")
        assert seed.exit_code == 0, seed.output
        iso = book.parent / "iso.csv"
        iso.write_text("Date,Description,Amount\n2026-08-03,Tea,-2.00\n")
        result = run_csv(book, iso, "--account", "Assets:Checking")
        assert result.exit_code == 2
        assert "Remembered --date-format %m/%d/%Y" in result.stderr
        assert "%Y-%m-%d" in result.stderr
        assert "--date-format" in result.stderr

    def test_remembered_date_format_reused_when_file_agrees(self, book: Path, isolated_config: Path) -> None:
        us = book.parent / "us.csv"
        us.write_text("Date,Description,Amount\n08/02/2026,Coffee,-5.25\n")
        seed = run_csv(book, us, "--csv", self.MAPPING, "--account", "Assets:Checking", "--date-format", "%m/%d/%Y")
        assert seed.exit_code == 0, seed.output
        us2 = book.parent / "us2.csv"
        us2.write_text("Date,Description,Amount\n08/20/2026,Tea,-2.00\n")
        result = run_csv(book, us2, "--account", "Assets:Checking")
        assert result.exit_code == 0, result.output
        (row,) = json.loads(result.stdout)["data"]["rows"]
        assert row["date"] == "2026-08-20"

    def test_missing_remembered_rules_warns_and_continues(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Food"\n')
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        seed = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking", "--rules", str(rules))
        assert seed.exit_code == 0, seed.output
        rules.unlink()
        result = runner.invoke(app, ["--file", str(book), "import", str(source), "--account", "Assets:Checking"])
        assert result.exit_code == 0, result.output
        assert "rules.toml" in result.stderr
        assert "without rules" in result.stderr
        assert "unmatched" in result.stdout
        again = runner.invoke(app, ["--file", str(book), "import", str(source), "--account", "Assets:Checking"])
        assert again.exit_code == 0, again.output
        assert "without rules" not in again.stderr

    def test_corrupt_remembered_rules_warns_and_continues(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Food"\n')
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        seed = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking", "--rules", str(rules))
        assert seed.exit_code == 0, seed.output
        rules.write_text("NOT TOML {{{")
        result = runner.invoke(app, ["--file", str(book), "import", str(source), "--account", "Assets:Checking"])
        assert result.exit_code == 0, result.output
        assert "rules.toml" in result.stderr
        assert "without rules" in result.stderr
        assert "unmatched" in result.stdout

    def test_explicit_rules_failure_still_hard(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        result = run_csv(
            book,
            source,
            "--csv",
            self.MAPPING,
            "--account",
            "Assets:Checking",
            "--rules",
            str(book.parent / "missing.toml"),
        )
        assert result.exit_code == 2

    def test_bare_csv_refresh_announces_discards(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Food"\n')
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        seed = run_csv(
            book,
            source,
            "--csv",
            self.MAPPING,
            "--account",
            "Assets:Checking",
            "--rules",
            str(rules),
            "--default-account",
            "Expenses:Misc",
        )
        assert seed.exit_code == 0, seed.output
        refresh = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert refresh.exit_code == 0, refresh.output
        assert "Discarded remembered" in " ".join(json.loads(refresh.stdout)["data"]["notes"])
        (row,) = json.loads(refresh.stdout)["data"]["rows"]
        assert row["rule"] == "unmatched"
        assert "Expenses:Uncategorized" in row["entry"]
        reseed = run_csv(
            book,
            source,
            "--csv",
            self.MAPPING,
            "--account",
            "Assets:Checking",
            "--rules",
            str(rules),
            "--default-account",
            "Expenses:Misc",
        )
        assert reseed.exit_code == 0, reseed.output
        human = runner.invoke(
            app,
            ["--file", str(book), "import", str(source), "--csv", self.MAPPING, "--account", "Assets:Checking"],
        )
        assert human.exit_code == 0, human.output
        assert "Discarded remembered" in human.stderr
        assert "--rules" in human.stderr
        assert "--default-account Expenses:Misc" in human.stderr

    def test_csv_refresh_keeping_flags_announces_nothing(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Food"\n')
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        seed = run_csv(
            book,
            source,
            "--csv",
            self.MAPPING,
            "--account",
            "Assets:Checking",
            "--rules",
            str(rules),
            "--default-account",
            "Expenses:Misc",
        )
        assert seed.exit_code == 0, seed.output
        refresh = run_csv(
            book,
            source,
            "--csv",
            self.MAPPING,
            "--account",
            "Assets:Checking",
            "--rules",
            str(rules),
            "--default-account",
            "Expenses:Misc",
        )
        assert refresh.exit_code == 0, refresh.output
        assert "Discarded remembered" not in refresh.stderr
        repeat = run_csv(book, source, "--account", "Assets:Checking")
        (row,) = json.loads(repeat.stdout)["data"]["rows"]
        assert row["rule"] == "Coffee"
        assert "Expenses:Food" in row["entry"]

    def test_refresh_with_same_effective_values_announces_nothing(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        seed = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert seed.exit_code == 0, seed.output
        refresh = run_csv(book, source, "--csv", self.MAPPING, "--account", "Assets:Checking")
        assert refresh.exit_code == 0, refresh.output
        assert "Discarded remembered" not in " ".join(json.loads(refresh.stdout)["data"]["notes"])

    def test_old_record_with_sign_announces_the_drop(self, book: Path, isolated_config: Path) -> None:
        record = self._record(book, isolated_config)
        record.parent.mkdir(parents=True, exist_ok=True)
        record.write_text(
            json.dumps(
                {
                    "sources": [
                        {
                            "headers": ["Date", "Description", "Amount"],
                            "mapping": f"{self.MAPPING},sign=ledger",
                            "account": "Assets:Checking",
                            "rules": None,
                            "default_account": "Expenses:Uncategorized",
                            "date_format": None,
                            "delimiter": ",",
                        }
                    ]
                }
            )
        )
        source = book.parent / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        result = runner.invoke(app, ["--file", str(book), "import", str(source), "--account", "Assets:Checking"])
        assert result.exit_code == 0, result.output
        assert "sign=ledger" in result.stderr
        assert "-5.25 USD" in result.stdout


class TestBlockedRows:
    LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
"""

    def _ledger(self, tmp_path: Path) -> Path:
        file = tmp_path / "main.bean"
        file.write_text(self.LEDGER)
        return file

    def test_unopen_counter_account_blocks_row(self, tmp_path: Path, isolated_config: Path) -> None:
        book = self._ledger(tmp_path)
        source = tmp_path / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        result = run_csv(book, source, "--csv", TestStickyRecall.MAPPING, "--account", "Assets:Checking")
        assert result.exit_code == 0, result.output
        data = json.loads(result.stdout)["data"]
        assert data["ready"] == 0
        assert data["blocked"] == 1
        (row,) = data["rows"]
        assert row["status"] == "blocked"
        assert row["include"] is False
        assert "Expenses:Uncategorized" in (row["reason"] or "")
        assert "bea add open" in (row["reason"] or "")
        assert "Expenses:Uncategorized" in data["diff"]

    def test_apply_refuses_blocked_rows(self, tmp_path: Path, isolated_config: Path) -> None:
        book = self._ledger(tmp_path)
        source = tmp_path / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        before = book.read_bytes()
        result = run_csv(book, source, "--csv", TestStickyRecall.MAPPING, "--account", "Assets:Checking", "--apply")
        assert result.exit_code == 4
        assert "Import needs review; nothing was written" in result.stderr
        assert "Expenses:Uncategorized" in result.stderr
        assert book.read_bytes() == before

    def test_opening_account_unblocks(self, tmp_path: Path, isolated_config: Path) -> None:
        book = self._ledger(tmp_path)
        source = tmp_path / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        opened = runner.invoke(
            app,
            [
                "--file",
                str(book),
                "add",
                "open",
                "--date",
                "2026-01-01",
                "--account",
                "Expenses:Uncategorized",
                "-c",
                "USD",
            ],
        )
        assert opened.exit_code == 0, opened.output
        preview = run_csv(book, source, "--csv", TestStickyRecall.MAPPING, "--account", "Assets:Checking")
        assert preview.exit_code == 0, preview.output
        assert json.loads(preview.stdout)["data"]["ready"] == 1
        applied = run_csv(book, source, "--csv", TestStickyRecall.MAPPING, "--account", "Assets:Checking", "--apply")
        assert applied.exit_code == 0, applied.output
        assert json.loads(applied.stdout)["data"]["written"] == 1

    def test_unopen_rules_target_blocks(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(book, '[[rule]]\nmatch = "Cafe"\naccount = "Expenses:Nope"\n')
        result = csv_result(book, CSV_HEADER + CSV_ROW, "--rules", str(rules))
        assert result.exit_code == 0, result.output
        data = json.loads(result.stdout)["data"]
        assert data["blocked"] == 1
        (row,) = data["rows"]
        assert row["status"] == "blocked"
        assert "Expenses:Nope" in (row["reason"] or "")
        assert "bea add open" in (row["reason"] or "")

    def test_currency_mismatch_blocks(self, book: Path, isolated_config: Path) -> None:
        result = csv_result(
            book,
            "Date,Payee,Amount,Currency\n2026-08-02,Cafe,-5.25,EUR\n",
            mapping="date=Date,amount=Amount,payee=Payee,currency=Currency",
        )
        assert result.exit_code == 0, result.output
        data = json.loads(result.stdout)["data"]
        assert data["ready"] == 0
        (row,) = data["rows"]
        assert row["status"] == "blocked"
        assert "EUR" in (row["reason"] or "")
        assert "Assets:Checking" in (row["reason"] or "")

    def test_ready_and_duplicate_rows_unaffected(self, book: Path, isolated_config: Path) -> None:
        rules = rules_file(
            book,
            '[[rule]]\nmatch = "Cafe"\naccount = "Expenses:Dining"\n'
            '[[rule]]\nmatch = "Shop"\naccount = "Expenses:Nope"\n',
        )
        body = CSV_HEADER + "2026-08-02,Cafe,Coffee,-5.25\n2026-08-03,Shop,Tea,-2.00\n"
        result = csv_result(book, body, "--rules", str(rules))
        assert result.exit_code == 0, result.output
        data = json.loads(result.stdout)["data"]
        assert [row["status"] for row in data["rows"]] == ["new", "blocked"]
        assert data["ready"] == 1
        assert data["blocked"] == 1
        applied = csv_result(book, body, "--rules", str(rules), "--apply")
        assert applied.exit_code == 4
        assert "Expenses:Nope" in applied.stderr

    def test_human_summary_shows_blocked_rows(self, tmp_path: Path, isolated_config: Path) -> None:
        book = self._ledger(tmp_path)
        source = tmp_path / "bank.csv"
        source.write_text("Date,Description,Amount\n2026-08-02,Coffee,-5.25\n")
        result = runner.invoke(
            app,
            [
                "--file",
                str(book),
                "import",
                str(source),
                "--csv",
                TestStickyRecall.MAPPING,
                "--account",
                "Assets:Checking",
            ],
        )
        assert result.exit_code == 0, result.output
        assert "0 ready" in result.stdout
        assert "1 blocked" in result.stdout
        assert "blocked" in result.stdout
        assert "Expenses:Uncategorized" in result.stdout
        assert "bea add open" in result.stdout


class TestImportFixtureSet:
    """Real-world export shapes, end to end: preview, apply, check, re-import."""

    US_BANK = b'Date,Description,Amount\n2026-08-02,Whole Foods,"-$1,000.00"\n2026-08-03,Refund,(4.50)\n'
    EU_BANK = "Date;Description;Amount\n2026-08-02;Café;1.000,00\n2026-08-03;Shop;-4,50\n".encode()
    BROKER = b"Date\tDescription\tAmount\n2026-08-02\tDividend\t12.34\n"
    CP1252 = "Date,Description,Amount\n2026-08-02,Café,-5.25\n".encode("cp1252")
    BOM = b"\xef\xbb\xbfDate,Description,Amount\n2026-08-02,Coffee,-5.25\n"
    TRAILERS = b"Date,Description,Amount\n2026-08-02,Coffee,-5.25\n\n   \n2026-08-03,Tea,-2.00\n"
    BARE_ID = b"Date,Description,Amount,ID\n2026-08-02,Coffee,-5.25,txn-1\n"

    @pytest.mark.parametrize(
        ("name", "content", "csv_args", "amounts"),
        [
            ("us_bank.csv", US_BANK, ["--csv", "auto"], ["-1000.00 USD", "-4.50 USD"]),
            ("eu_bank.csv", EU_BANK, ["--csv", "auto"], ["1000.00 USD", "-4.50 USD"]),
            ("broker.tsv", BROKER, ["--csv", "auto"], ["12.34 USD"]),
            (
                "cp1252.csv",
                CP1252,
                ["--csv", "date=Date,amount=Amount,narration=Description,encoding=cp1252"],
                ["-5.25 USD"],
            ),
            ("bom.csv", BOM, ["--csv", "auto"], ["-5.25 USD"]),
            ("trailers.csv", TRAILERS, ["--csv", "auto"], ["-5.25 USD", "-2.00 USD"]),
            ("bare_id.csv", BARE_ID, ["--csv", "auto"], ["-5.25 USD"]),
        ],
    )
    def test_fixture_imports_applies_checks_and_dedups(
        self, book: Path, isolated_config: Path, name: str, content: bytes, csv_args: list[str], amounts: list[str]
    ) -> None:
        source = book.parent / name
        source.write_bytes(content)
        preview = run_csv(book, source, "--account", "Assets:Checking", *csv_args)
        assert preview.exit_code == 0, preview.output
        data = json.loads(preview.stdout)["data"]
        assert data["ready"] == len(amounts)
        assert data["blocked"] == 0
        assert [row["amount"] for row in data["rows"]] == amounts
        applied = run_csv(book, source, "--account", "Assets:Checking", *csv_args, "--apply")
        assert applied.exit_code == 0, applied.output
        assert json.loads(applied.stdout)["data"]["written"] == len(amounts)
        check = runner.invoke(app, ["--file", str(book), "check"])
        assert check.exit_code == 0, check.output
        repeat = run_csv(book, source, "--account", "Assets:Checking", *csv_args)
        assert repeat.exit_code == 0, repeat.output
        again = json.loads(repeat.stdout)["data"]
        assert again["ready"] == 0
        assert again["duplicates"] == len(amounts)

    def test_two_claimant_header_refuses_without_writing(self, book: Path, isolated_config: Path) -> None:
        source = book.parent / "twonarr.csv"
        source.write_text("Date,Description,Memo,Amount\n2026-08-02,A,B,-5.25\n")
        before = book.read_bytes()
        result = run_csv(book, source, "--csv", "auto", "--account", "Assets:Checking")
        assert result.exit_code == 2
        assert "narration (Description, Memo)" in result.stderr
        assert book.read_bytes() == before


class TestCsvDebitCreditSigns:
    """A debit posts negative by magnitude, and a zero cell is an empty cell (w3/424)."""

    MAPPING = "date=Date,debit=Money Out,credit=Money In,narration=Description"

    def _posted(self, book: Path) -> list[str]:
        entries, errors, _ = loader.load_file(book)
        assert not errors, errors
        return [str(e.postings[0].units) for e in entries if isinstance(e, Transaction)]

    def test_a_debit_cell_that_carries_its_own_minus_still_posts_out(self, book: Path, isolated_config: Path) -> None:
        body = "Date,Description,Money Out,Money In\n2026-08-02,Coffee,-4.50,\n2026-08-03,Salary,,1000.00\n"

        result = csv_result(book, body, "--apply", mapping=self.MAPPING)

        assert result.exit_code == 0, result.output
        # Negating a cell that was already negative booked the outflow as income.
        assert sorted(self._posted(book)) == ["-4.50 USD", "1000.00 USD"]

    def test_a_positive_debit_cell_still_posts_out(self, book: Path, isolated_config: Path) -> None:
        body = "Date,Description,Money Out,Money In\n2026-08-02,Coffee,20.00,\n"

        result = csv_result(book, body, "--apply", mapping=self.MAPPING)

        assert result.exit_code == 0, result.output
        assert self._posted(book) == ["-20.00 USD"]

    def test_a_zero_filled_companion_cell_is_treated_as_empty(self, book: Path, isolated_config: Path) -> None:
        body = "Date,Description,Money Out,Money In\n2026-08-02,Shop,30.00,0.00\n"

        result = csv_result(book, body, "--apply", mapping=self.MAPPING)

        assert result.exit_code == 0, result.output
        assert self._posted(book) == ["-30.00 USD"]

    def test_two_nonzero_cells_are_still_refused(self, book: Path, isolated_config: Path) -> None:
        body = "Date,Description,Money Out,Money In\n2026-08-02,Shop,30.00,5.00\n"
        before = book.read_bytes()

        result = csv_result(book, body, mapping=self.MAPPING)

        assert result.exit_code == 2, result.output
        assert "fill exactly one of 'Money Out' or 'Money In'" in result.stderr
        assert book.read_bytes() == before

    def test_a_debit_column_mixing_signs_is_refused_naming_the_column(self, book: Path, isolated_config: Path) -> None:
        body = "Date,Description,Money Out,Money In\n2026-08-02,A,-5,\n2026-08-03,B,7,\n"
        before = book.read_bytes()

        result = csv_result(book, body, mapping=self.MAPPING)

        assert result.exit_code == 2, result.output
        assert "Column 'Money Out' mixes signs" in result.stderr
        assert "row 1" in result.stderr and "row 2" in result.stderr
        assert book.read_bytes() == before


class TestCsvRowCurrency:
    """An imported row's commodity comes from the account, not the ledger (w3/421)."""

    MAPPING = "date=Date,amount=Amount,narration=Description"

    def _units(self, book: Path, account: str) -> list[str]:
        entries, errors, _ = loader.load_file(book)
        assert not errors, errors
        return [str(p.units) for e in entries if isinstance(e, Transaction) for p in e.postings if p.account == account]

    def _euro_account(self, book: Path) -> None:
        """A euro source account, plus a counter account any commodity may reach."""
        book.write_text(book.read_text() + "2026-08-01 open Assets:EurBank EUR\n2026-08-01 open Expenses:Foreign\n")

    def test_an_account_opened_for_one_currency_books_that_currency(self, book: Path, isolated_config: Path) -> None:
        self._euro_account(book)
        body = "Date,Description,Amount\n2026-08-02,Cafe Paris,-4.50\n"

        result = csv_result(
            book,
            body,
            "--default-account",
            "Expenses:Foreign",
            "--apply",
            mapping=self.MAPPING,
            account="Assets:EurBank",
        )

        assert result.exit_code == 0, result.output
        assert self._units(book, "Assets:EurBank") == ["-4.50 EUR"]

    def test_a_euro_symbol_posted_to_a_dollar_account_is_refused(self, book: Path, isolated_config: Path) -> None:
        body = 'Date,Description,Amount\n2026-08-02,Cafe Paris,"-4,50 €"\n'
        before = book.read_bytes()

        result = csv_result(book, body, mapping=self.MAPPING)

        assert result.exit_code == 2, result.output
        assert "Row 1" in result.stderr and "(EUR)" in result.stderr and "currency=EUR" in result.stderr
        assert book.read_bytes() == before

    def test_a_constant_currency_needs_no_column_in_the_bank_file(self, book: Path, isolated_config: Path) -> None:
        self._euro_account(book)
        body = 'Date,Description,Amount\n2026-08-02,Cafe Paris,"-4,50 €"\n2026-08-03,London Pub,"-12,00"\n'

        result = csv_result(
            book,
            body,
            "--default-account",
            "Expenses:Foreign",
            "--apply",
            mapping=f"{self.MAPPING},currency=EUR",
            account="Assets:EurBank",
        )

        assert result.exit_code == 0, result.output
        assert self._units(book, "Assets:EurBank") == ["-4.50 EUR", "-12.00 EUR"]
        assert any("every row posts in EUR" in note for note in json.loads(result.stdout)["data"]["notes"])

    def test_a_currency_column_misspelled_by_case_is_refused_not_a_constant(
        self, book: Path, isolated_config: Path
    ) -> None:
        self._euro_account(book)
        body = "Date,Description,Amount,Currency\n2026-08-02,Hotel Paris,-120.00,EUR\n"
        before = book.read_bytes()

        result = csv_result(book, body, "--apply", mapping=f"{self.MAPPING},currency=CURRENCY")

        assert result.exit_code == 2, result.output
        assert "'CURRENCY'" in result.stderr and "Did you mean 'Currency'?" in result.stderr
        assert book.read_bytes() == before

    def test_a_constant_the_ledger_does_not_know_is_refused(self, book: Path, isolated_config: Path) -> None:
        body = "Date,Description,Amount\n2026-08-02,Hotel Paris,-120.00\n"
        before = book.read_bytes()

        result = csv_result(book, body, "--apply", mapping=f"{self.MAPPING},currency=XYZ")

        assert result.exit_code == 2, result.output
        assert "currency=XYZ" in result.stderr and "bea add commodity" in result.stderr
        assert book.read_bytes() == before

    def test_a_declared_commodity_is_a_valid_constant(self, book: Path, isolated_config: Path) -> None:
        book.write_text(
            book.read_text()
            + "2026-08-01 commodity GBP\n2026-08-01 open Assets:Foreign\n2026-08-01 open Expenses:Foreign\n"
        )
        body = "Date,Description,Amount\n2026-08-02,London Pub,-12.00\n"

        result = csv_result(
            book,
            body,
            "--default-account",
            "Expenses:Foreign",
            "--apply",
            mapping=f"{self.MAPPING},currency=GBP",
            account="Assets:Foreign",
        )

        assert result.exit_code == 0, result.output
        assert self._units(book, "Assets:Foreign") == ["-12.00 GBP"]

    def test_an_ambiguous_dollar_symbol_is_unchanged(self, book: Path, isolated_config: Path) -> None:
        body = "Date,Description,Amount\n2026-08-02,Cafe,$4.50\n"

        result = csv_result(book, body, "--apply", mapping=self.MAPPING)

        assert result.exit_code == 0, result.output
        assert self._units(book, "Assets:Checking") == ["4.50 USD"]
