"""`--id` finds a row by the bank's own ID that `bea import` kept (w1/372).

A CSV import with an ID column writes `bank_id: "TX-1001"` beside
`import-id: "bank:TX-1001"`. The update looked only at `import-id` and
`ref`, so the statement's own `TX-1001` — the one ID a person holds — was
refused as unknown, in the single form and in a batch row, and the refusal
never mentioned the prefixed import-id the same entry carried.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from bea_engine import protocol
from bea_engine.ledger import reader, updating
from bea_engine.ledger.text import BANK_ID_KEYS
from tests.test_import_source_facts import _bea

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-01 open Expenses:Food USD
"""
CSV_IMPORT = [
    "import",
    "bank.csv",
    "--account",
    "Assets:Checking",
    "--csv",
    "date=Date,amount=Amount,narration=Description,id=Transaction ID",
    "--apply",
]


@pytest.fixture
def imported(tmp_path: Path) -> Path:
    """A ledger holding one review-queue row that `bea import` wrote from a bank ID."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "bank.csv").write_text("Date,Description,Amount,Transaction ID\n2026-02-01,COFFEE SHOP,-4.50,TX-1001\n")
    result = _bea(tmp_path, *CSV_IMPORT)
    assert result.returncode == 0, result.stderr or result.stdout
    text = ledger.read_text()
    assert 'bank_id: "TX-1001"' in text
    assert 'import-id: "bank:TX-1001"' in text
    return ledger


def _categorized(ledger: Path) -> None:
    text = ledger.read_text()
    assert '2026-02-01 * "COFFEE SHOP"' in text
    assert "Expenses:Food" in text.split('"COFFEE SHOP"', 1)[1]
    assert "Expenses:Uncategorized   4.50 USD" not in text
    # The identity stays, so the next import of the export still skips the row.
    assert 'bank_id: "TX-1001"' in text
    assert 'import-id: "bank:TX-1001"' in text


def test_update_transaction_finds_the_row_by_its_bank_id(tmp_path: Path, imported: Path) -> None:
    result = _bea(tmp_path, "update", "transaction", "--id", "TX-1001", "--account", "Expenses:Food", "--flag", "*")
    assert result.returncode == 0, result.stderr or result.stdout
    assert "+  Expenses:Food" in json.loads(result.stdout)["data"]["diff"]

    applied = _bea(
        tmp_path, "update", "transaction", "--id", "TX-1001", "--account", "Expenses:Food", "--flag", "*", "--apply"
    )

    assert applied.returncode == 0, applied.stderr or applied.stdout
    assert json.loads(applied.stdout)["data"]["written"] == 1
    _categorized(imported)
    again = _bea(tmp_path, *CSV_IMPORT)
    assert again.returncode == 0, again.stderr or again.stdout
    assert json.loads(again.stdout)["data"]["written"] == 0


def test_a_batch_row_finds_the_row_by_its_bank_id(tmp_path: Path, imported: Path) -> None:
    (tmp_path / "rows.csv").write_text("id,account,flag\nTX-1001,Expenses:Food,*\n")

    preview = _bea(tmp_path, "update", "transactions", "--from", "rows.csv")
    assert preview.returncode == 0, preview.stderr or preview.stdout
    assert json.loads(preview.stdout)["data"]["rejected"] == 0

    applied = _bea(tmp_path, "update", "transactions", "--from", "rows.csv", "--apply")

    assert applied.returncode == 0, applied.stderr or applied.stdout
    data = json.loads(applied.stdout)["data"]
    assert [row["status"] for row in data["rows"]] == ["ok"]
    assert data["written"] == 1
    _categorized(imported)


def _entries(tmp_path: Path, body: str) -> list:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER + body)
    entries, errors = reader.load_file(file)
    assert not errors
    return entries


def _row(narration: str, meta: str) -> str:
    return f'\n2026-02-01 ! "{narration}"\n{meta}  Expenses:Uncategorized 1.00 USD\n  Assets:Checking\n'


@pytest.mark.parametrize("key", BANK_ID_KEYS)
def test_every_import_id_key_resolves(tmp_path: Path, key: str) -> None:
    entries = _entries(tmp_path, _row("Other", '  bank_id: "TX-2"\n') + _row("Mine", f'  {key}: "TX-1"\n'))
    assert updating.locate_transaction(entries, "TX-1").narration == "Mine"


def test_a_numeric_bank_id_resolves_from_its_text(tmp_path: Path) -> None:
    entries = _entries(tmp_path, _row("Mine", "  fitid: 20260201001\n"))
    assert updating.locate_transaction(entries, "20260201001").narration == "Mine"


def test_import_id_and_ref_win_over_a_bank_id(tmp_path: Path) -> None:
    entries = _entries(
        tmp_path,
        _row("By bank", '  bank_id: "X"\n')
        + _row("By import", '  import-id: "X"\n')
        + _row("By bank 2", '  bank_id: "Y"\n')
        + _row("By ref", '  ref: "Y"\n'),
    )
    assert updating.locate_transaction(entries, "X").narration == "By import"
    assert updating.locate_transaction(entries, "Y").narration == "By ref"


def test_one_entry_holding_the_id_under_two_keys_is_one_match(tmp_path: Path) -> None:
    entries = _entries(tmp_path, _row("Mine", '  bank_id: "TX-1"\n  transaction_id: "TX-1"\n'))
    assert updating.locate_transaction(entries, "TX-1").narration == "Mine"


def test_a_shared_bank_id_is_ambiguous(tmp_path: Path) -> None:
    entries = _entries(tmp_path, _row("One", '  bank_id: "TX-1"\n') + _row("Two", '  bank_id: "TX-1"\n'))
    with pytest.raises(protocol.UsageError, match=r"^bank_id 'TX-1' matches 2 transactions \(.*main\.bean:6, "):
        updating.locate_transaction(entries, "TX-1")


def test_a_bank_id_shared_across_keys_is_ambiguous(tmp_path: Path) -> None:
    entries = _entries(tmp_path, _row("One", '  bank_id: "TX-1"\n') + _row("Two", '  fitid: "TX-1"\n'))
    with pytest.raises(protocol.UsageError, match="^bank_id or fitid 'TX-1' matches 2 transactions.*file:line"):
        updating.locate_transaction(entries, "TX-1")


def test_an_unknown_id_names_every_form_it_tried(tmp_path: Path) -> None:
    entries = _entries(tmp_path, _row("Mine", '  bank_id: "TX-1"\n'))
    with pytest.raises(protocol.UsageError) as caught:
        updating.locate_transaction(entries, "TX-9")
    assert str(caught.value) == (
        "No transaction with import-id, ref, or bank ID 'TX-9' in this ledger. Nothing was written."
    )
