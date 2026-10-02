"""An imported row stays imported after its ledger presentation is reviewed."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest
from beancount import loader
from beancount.core.data import Transaction
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
ACCOUNT = "Assets:Checking"
LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Checking\n"
    "2026-01-01 open Expenses:Groceries\n"
    "2026-01-01 open Expenses:Uncategorized\n"
)
GROCERY = ("2026-02-02", "Whole Foods", "groceries", "-20.00", "USD", "bank-1")
CAFE = ("2026-02-10", "Cafe", "coffee", "-3.00", "USD", "bank-2")


def _source(path: Path, id_kind: str, rows: list[tuple[str, ...]]) -> Path:
    with path.open("w", newline="") as stream:
        writer = csv.writer(stream)
        header = ["Date", "Payee", "Narration", "Amount", "Currency"]
        writer.writerow(header + (["Id"] if id_kind == "native" else []))
        writer.writerows(row if id_kind == "native" else row[:5] for row in rows)
    return path


def _import(ledger: Path, source: Path, id_kind: str, *flags: str) -> Any:
    mapping = "date=Date,payee=Payee,narration=Narration,amount=Amount,currency=Currency"
    if id_kind == "native":
        mapping += ",id=Id"
    return runner.invoke(
        app,
        [
            "--json",
            "--no-input",
            "--file",
            str(ledger),
            "import",
            str(source),
            "--csv",
            mapping,
            "--account",
            ACCOUNT,
            "--default-account",
            "Expenses:Groceries",
            "--duplicates",
            "skip",
            *flags,
        ],
    )


def _data(result: Any) -> dict[str, Any]:
    assert result.exit_code == 0, result.output
    return dict(json.loads(result.stdout)["data"])


def _transactions(ledger: Path) -> list[Transaction]:
    entries, errors, _ = loader.load_file(ledger)
    assert not errors
    return [entry for entry in entries if isinstance(entry, Transaction)]


def _seed(tmp_path: Path, id_kind: str) -> tuple[Path, Path]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    first = _source(tmp_path / "first.csv", id_kind, [GROCERY])
    assert _data(_import(ledger, first, id_kind, "--apply"))["written"] == 1
    identifier = _transactions(ledger)[0].meta["import-id"]
    assert str(identifier).startswith("csv:sha256:" if id_kind == "hash" else "bank:")
    overlapping = _source(tmp_path / "overlapping.csv", id_kind, [GROCERY, CAFE])
    return ledger, overlapping


def _apply_only_the_new_cafe(ledger: Path, source: Path, id_kind: str) -> None:
    before = ledger.read_bytes()
    preview = _data(_import(ledger, source, id_kind))
    assert [row["status"] for row in preview["rows"]] == ["duplicate", "new"]
    assert preview["duplicates"] == 1
    assert preview["conflicts"] == 0
    assert preview["ready"] == 1
    assert ledger.read_bytes() == before

    applied = _data(_import(ledger, source, id_kind, "--apply"))
    assert [row["status"] for row in applied["rows"]] == ["duplicate", "new"]
    assert applied["written"] == 1
    assert applied["conflicts"] == 0
    assert ledger.read_bytes().startswith(before), "appending must preserve the user's edited entry byte-for-byte"
    entries = _transactions(ledger)
    assert len(entries) == 2
    assert sum(entry.payee == "Cafe" for entry in entries) == 1


@pytest.mark.parametrize("id_kind", ["hash", "native"])
@pytest.mark.parametrize(
    ("original", "edited"),
    [
        ('"Whole Foods"', '"Whole Foods Market"'),
        ('"groceries"', '"Weekly groceries, reviewed"'),
        ("2026-02-02 ", "2026-02-03 "),
    ],
    ids=["payee", "narration", "date"],
)
def test_edited_entries_stay_duplicate_while_new_rows_import(
    tmp_path: Path, id_kind: str, original: str, edited: str
) -> None:
    ledger, source = _seed(tmp_path, id_kind)
    text = ledger.read_text()
    assert original in text
    ledger.write_text(text.replace(original, edited, 1))
    assert len(_transactions(ledger)) == 1

    _apply_only_the_new_cafe(ledger, source, id_kind)


def test_a_content_hash_stays_imported_after_a_balanced_amount_edit(tmp_path: Path) -> None:
    ledger, source = _seed(tmp_path, "hash")
    edited, changed = re.subn(
        r"(?m)^(\s+(?:Assets:Checking|Expenses:Groceries)\s+)(-?)20(?:\.0+)? USD$",
        lambda match: f"{match[1]}{match[2]}21.00 USD",
        ledger.read_text(),
    )
    assert changed == 2, "the source and balancing posting must both change"
    ledger.write_text(edited)
    transaction = _transactions(ledger)[0]
    assert next(posting.units.number for posting in transaction.postings if posting.account == ACCOUNT) == Decimal(
        "-21"
    )

    _apply_only_the_new_cafe(ledger, source, "hash")


def test_a_canonical_hash_match_takes_priority_over_an_older_file_id(tmp_path: Path) -> None:
    ledger, _ = _seed(tmp_path, "hash")
    source = tmp_path / "first.csv"
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    file_id = hashlib.sha256(f"{ACCOUNT}:{source_hash}:0".encode()).hexdigest()
    canonical_id = _transactions(ledger)[0].meta["import-id"]
    edited = (
        ledger.read_text()
        .replace("2026-02-02 ", "2026-02-03 ", 1)
        .replace('"Whole Foods"', '"Whole Foods Market"', 1)
        .replace("  import-id:", f'  bea_import_id: "{file_id}"\n  import-id:', 1)
    )
    ledger.write_text(edited)
    transaction = _transactions(ledger)[0]
    assert transaction.meta["import-id"] == canonical_id
    assert transaction.meta["bea_import_id"] == file_id
    before = ledger.read_bytes()

    preview = _data(_import(ledger, source, "hash"))
    assert [row["status"] for row in preview["rows"]] == ["duplicate"]
    assert preview["conflicts"] == 0
    assert ledger.read_bytes() == before
    applied = _data(_import(ledger, source, "hash", "--apply"))
    assert applied["duplicates"] == 1
    assert applied["conflicts"] == 0
    assert applied["written"] == 0
    assert ledger.read_bytes() == before


@pytest.mark.parametrize(("column", "value"), [(3, "-20.01"), (4, "EUR")], ids=["amount", "currency"])
def test_a_native_id_reused_for_different_money_still_blocks_the_batch(tmp_path: Path, column: int, value: str) -> None:
    ledger, source = _seed(tmp_path, "native")
    reused = list(GROCERY)
    reused[column] = value
    _source(source, "native", [tuple(reused), CAFE])
    before = ledger.read_bytes()

    preview = _data(_import(ledger, source, "native"))
    assert [row["status"] for row in preview["rows"]] == ["conflict", "new"]
    assert preview["conflicts"] == 1
    assert preview["ready"] == 1
    assert ledger.read_bytes() == before
    applied = _import(ledger, source, "native", "--apply")
    assert applied.exit_code == 4, applied.output
    error = json.loads(applied.stderr)["error"]
    assert error["category"] == "conflict"
    assert error["result"]["written"] == 0
    assert error["result"]["conflicts"] == 1
    assert ledger.read_bytes() == before


def test_repeated_native_id_with_a_cleaner_payee_in_one_export_writes_once(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    cleaned = list(GROCERY)
    cleaned[1] = "Whole Foods Market"
    source = _source(tmp_path / "same-batch.csv", "native", [GROCERY, tuple(cleaned), CAFE])
    before = ledger.read_bytes()

    preview = _data(_import(ledger, source, "native"))
    assert [row["status"] for row in preview["rows"]] == ["new", "duplicate", "new"]
    assert ledger.read_bytes() == before
    applied = _data(_import(ledger, source, "native", "--apply"))
    assert applied["written"] == 2
    assert applied["duplicates"] == 1
    assert applied["conflicts"] == 0
    assert [entry.payee for entry in _transactions(ledger)] == ["Whole Foods", "Cafe"]
