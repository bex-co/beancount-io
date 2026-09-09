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
    assert "Row 2" in result.stderr and "'Amount'" in result.stderr


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
    assert result.exit_code == 1
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
    # Explicit flags overwrite the remembered mapping for those headers.
    source.write_text(CSV_HEADER + CSV_ROW)
    updated = run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Savings")
    assert updated.exit_code == 0, updated.output
    recall = runner.invoke(app, ["--json", "--file", str(book), "import", str(source)])
    assert json.loads(recall.stdout)["data"]["account"] == "Assets:Savings"


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


def test_an_option_typed_on_this_run_beats_the_remembered_one(book: Path, isolated_config: Path) -> None:
    source = book.parent / "bank.csv"
    source.write_text(CSV_HEADER + CSV_ROW)
    assert run_csv(book, source, "--csv", CSV_MAPPING, "--account", "Assets:Checking").exit_code == 0
    result = run_csv(book, source, "--account", "Assets:Checking", "--default-account", "Expenses:Fees")
    assert result.exit_code == 0, result.output
    assert "Expenses:Fees" in json.loads(result.stdout)["data"]["diff"]
