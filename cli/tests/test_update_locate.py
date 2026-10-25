"""`updating.locate_transaction` finds one transaction by import-id, `ref`, or file:line."""

from __future__ import annotations

from pathlib import Path

import pytest

from bea_engine import protocol
from bea_engine.ledger import reader, updating

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking
2026-01-01 open Expenses:Groceries
2026-01-01 open Expenses:Uncategorized

2026-01-02 ! "Mystery Shop" #review
  import-id: "abc123"
  Expenses:Uncategorized 9.99 USD
  Assets:Checking

2026-01-03 * "Whole Foods"
  ref: "bank-ref-7"
  Expenses:Groceries 28.40 USD
  Assets:Checking
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _entries(ledger: Path) -> list:
    entries, errors = reader.load_file(ledger)
    assert not errors
    return entries


def test_import_id_resolves(ledger: Path) -> None:
    entry = updating.locate_transaction(_entries(ledger), "abc123")
    assert entry.narration == "Mystery Shop"


def test_ref_resolves(ledger: Path) -> None:
    entry = updating.locate_transaction(_entries(ledger), "bank-ref-7")
    assert entry.narration == "Whole Foods"


def test_import_id_wins_over_ref(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(
        LEDGER + '\n2026-01-04 * "Clash"\n  ref: "abc123"\n  Expenses:Groceries 1.00 USD\n  Assets:Checking\n'
    )
    entry = updating.locate_transaction(_entries(file), "abc123")
    assert entry.narration == "Mystery Shop"


def test_file_line_resolves_absolute(ledger: Path) -> None:
    entry = updating.locate_transaction(_entries(ledger), f"{ledger}:6")
    assert entry.narration == "Mystery Shop"


def test_file_line_resolves_relative(ledger: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(ledger.parent)
    entry = updating.locate_transaction(_entries(ledger), "main.bean:11")
    assert entry.narration == "Whole Foods"


def test_repeated_import_id_is_ambiguous(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(
        LEDGER + '\n2026-01-04 * "Again"\n  import-id: "abc123"\n  Expenses:Groceries 1.00 USD\n  Assets:Checking\n'
    )
    with pytest.raises(protocol.UsageError, match="matches 2 transactions.*file:line"):
        updating.locate_transaction(_entries(file), "abc123")


def test_unknown_id_is_not_found(ledger: Path) -> None:
    with pytest.raises(protocol.UsageError, match="No transaction with import-id or ref 'nope'"):
        updating.locate_transaction(_entries(ledger), "nope")


def test_line_holding_no_transaction_is_not_found(ledger: Path) -> None:
    with pytest.raises(protocol.UsageError, match="No transaction at .* line holds no transaction"):
        updating.locate_transaction(_entries(ledger), f"{ledger}:2")


def test_colon_value_without_a_file_is_metadata(ledger: Path) -> None:
    with pytest.raises(protocol.UsageError, match="No transaction with import-id or ref 'stmt:42'"):
        updating.locate_transaction(_entries(ledger), "stmt:42")


def test_repeated_ref_is_ambiguous(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(
        LEDGER + '\n2026-01-04 * "Again"\n  ref: "bank-ref-7"\n  Expenses:Groceries 1.00 USD\n  Assets:Checking\n'
    )
    with pytest.raises(protocol.UsageError, match="matches 2 transactions.*file:line"):
        updating.locate_transaction(_entries(file), "bank-ref-7")


def test_typed_ref_resolves(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Checking\n"
        "2026-01-01 open Expenses:Groceries\n"
        '\n2026-01-02 * "Numbered"\n'
        "  ref: 42\n"
        "  Expenses:Groceries 1.00 USD\n"
        "  Assets:Checking\n"
    )
    entry = updating.locate_transaction(_entries(file), "42")
    assert entry.narration == "Numbered"


def test_line_zero_is_not_a_location(ledger: Path) -> None:
    with pytest.raises(protocol.UsageError, match="No transaction with import-id or ref"):
        updating.locate_transaction(_entries(ledger), f"{ledger}:0")


def test_drive_letter_without_a_file_is_metadata(ledger: Path) -> None:
    with pytest.raises(protocol.UsageError, match="No transaction with import-id or ref") as caught:
        updating.locate_transaction(_entries(ledger), "C:\\x.bean:12")
    assert repr("C:\\x.bean:12") in str(caught.value)


def test_duplicated_location_is_ambiguous(ledger: Path) -> None:
    from beancount.core.data import Transaction

    entries = _entries(ledger)
    entry = next(entry for entry in entries if isinstance(entry, Transaction))
    # A plugin stamping a second entry with the source's location: the same
    # entry object twice shares one (file, line, date, type) key.
    with pytest.raises(protocol.UsageError, match="holds 2 transactions"):
        updating.locate_transaction([entry, entry], f"{ledger}:{entry.meta['lineno']}")


def test_synthesized_entry_never_resolves() -> None:
    from beancount.parser import parser

    entries, errors, _ = parser.parse_string(
        '2026-01-02 * "Nowhere"\n  import-id: "ghost"\n  Expenses:X 1 USD\n  Assets:Y\n'
    )
    assert not errors
    with pytest.raises(protocol.UsageError, match="No transaction with import-id or ref 'ghost'"):
        updating.locate_transaction(list(entries), "ghost")
