"""`--id` finds a merged transfer by its second row's `import-id-2` (w1/373).

beancount-migrate merges a transfer's two statement rows into one entry and
keeps the second row's id as `import-id-2`. Importing that second account
skips its row, reporting "import-id bank:2002 is already in the ledger", yet
`bea update transaction --id bank:2002` exited 2 with "No transaction with
import-id, ref, or bank ID", and a batch row with the id was rejected: the
lookup read `import-id` and never the second key.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from bea_engine import protocol
from bea_engine.ledger import reader, updating
from tests.test_import_source_facts import _bea

MIGRATED = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Assets:Savings USD
2026-01-01 open Expenses:Uncategorized USD

2026-03-10 ! "Transfer to savings"
  import-id: "bank:1001"
  import-id-2: "bank:2002"
  Assets:Checking  -500.00 USD
  Assets:Savings    500.00 USD
"""
SAVINGS_IMPORT = [
    "import",
    "savings.csv",
    "--account",
    "Assets:Savings",
    "--csv",
    "date=Date,amount=Amount,narration=Description,id=ID",
    "--apply",
]


@pytest.fixture
def migrated(tmp_path: Path) -> Path:
    """A migrated transfer whose savings row a re-import reports by its `import-id-2`."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(MIGRATED)
    (tmp_path / "savings.csv").write_text("Date,Description,Amount,ID\n2026-03-10,TRANSFER FROM CHECKING,500.00,2002\n")
    result = _bea(tmp_path, *SAVINGS_IMPORT)
    assert result.returncode == 0, result.stderr or result.stdout
    (row,) = json.loads(result.stdout)["data"]["rows"]
    assert row["reason"] == "import-id bank:2002 is already in the ledger."
    return ledger


def _cleared(tmp_path: Path, ledger: Path) -> None:
    assert ledger.read_text() == MIGRATED.replace('! "Transfer', '* "Transfer')
    # Both ids stay, so either account's next import still skips its row.
    again = _bea(tmp_path, *SAVINGS_IMPORT)
    assert again.returncode == 0, again.stderr or again.stdout
    assert json.loads(again.stdout)["data"]["written"] == 0


def test_update_transaction_finds_a_merged_transfer_by_its_second_id(tmp_path: Path, migrated: Path) -> None:
    applied = _bea(tmp_path, "update", "transaction", "--id", "bank:2002", "--flag", "*", "--apply")

    assert applied.returncode == 0, applied.stderr or applied.stdout
    assert json.loads(applied.stdout)["data"]["written"] == 1
    _cleared(tmp_path, migrated)


def test_a_batch_row_finds_a_merged_transfer_by_its_second_id(tmp_path: Path, migrated: Path) -> None:
    (tmp_path / "rows.csv").write_text("id,flag\nbank:2002,*\n")

    applied = _bea(tmp_path, "update", "transactions", "--from", "rows.csv", "--apply")

    assert applied.returncode == 0, applied.stderr or applied.stdout
    data = json.loads(applied.stdout)["data"]
    assert [row["status"] for row in data["rows"]] == ["ok"]
    assert data["written"] == 1
    _cleared(tmp_path, migrated)


def _entries(tmp_path: Path, body: str) -> list:
    file = tmp_path / "main.bean"
    file.write_text(MIGRATED.split("\n\n")[0] + "\n" + body)
    entries, errors = reader.load_file(file)
    assert not errors
    return entries


def _row(narration: str, meta: str) -> str:
    return f'\n2026-03-10 ! "{narration}"\n{meta}  Assets:Checking -1.00 USD\n  Assets:Savings\n'


def test_a_generated_second_id_resolves(tmp_path: Path) -> None:
    second = "monarch:sha256:0123456789abcdef"
    entries = _entries(
        tmp_path, _row("Mine", f'  import-id: "monarch:sha256:fedcba9876543210"\n  import-id-2: "{second}"\n')
    )
    assert updating.locate_transaction(entries, second).narration == "Mine"


def test_a_second_id_wins_over_a_ref_and_a_bank_id(tmp_path: Path) -> None:
    entries = _entries(
        tmp_path,
        _row("By ref", '  ref: "X"\n')
        + _row("By bank", '  bank_id: "X"\n')
        + _row("By second id", '  import-id: "A"\n  import-id-2: "X"\n'),
    )
    assert updating.locate_transaction(entries, "X").narration == "By second id"


def test_one_entry_holding_the_id_under_both_keys_is_one_match(tmp_path: Path) -> None:
    entries = _entries(tmp_path, _row("Mine", '  import-id: "X"\n  import-id-2: "X"\n'))
    assert updating.locate_transaction(entries, "X").narration == "Mine"


def test_an_id_one_entry_holds_first_and_another_second_is_ambiguous(tmp_path: Path) -> None:
    entries = _entries(
        tmp_path, _row("One", '  import-id: "X"\n') + _row("Two", '  import-id: "A"\n  import-id-2: "X"\n')
    )
    with pytest.raises(protocol.UsageError, match="^import-id or import-id-2 'X' matches 2 transactions.*file:line"):
        updating.locate_transaction(entries, "X")
