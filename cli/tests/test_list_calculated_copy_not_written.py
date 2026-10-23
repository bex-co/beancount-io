"""A plugin's recalculated copy of a transaction is not a written entry (w5/937).

The copy keeps the source's file, line, date and header and changes only its
amounts. The shared-location test compared the header alone, so `list` marked
both rows written, `--on-disk` kept both, a limited listing could show only the
copy, and import judged a bank row against the copy's amount: a correction to
the written 10 USD was reported a duplicate.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from decimal import Decimal
from beancount.core.data import Transaction

__plugins__ = ("derive",)

def scale(p):
    if isinstance(getattr(p.units, "number", None), Decimal):
        return p._replace(units=p.units._replace(number=p.units.number * Decimal(2)))
    return p

def derive(entries, options, config=None):
    out = []
    for entry in entries:
        if isinstance(entry, Transaction) and entry.narration == "Source row":
            copy = entry._replace(
                meta=entry.meta.copy(),
                postings=[scale(p) for p in entry.postings],
            )
            out.extend([copy, entry] if {reverse} else [entry, copy])
        else:
            out.append(entry)
    return out, []
"""
LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "qa_derive"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-02-01 * "Source row"
  bank_id: "source-10"
  Assets:Cash -10.00 USD
  Expenses:Food 10.00 USD
"""
INFERRED = LEDGER.replace("  Expenses:Food 10.00 USD\n", "  Expenses:Food\n")
MAPPING = "date=Date,narration=Description,amount=Amount,id=Reference"


def _books(tmp_path: Path, ledger: str = LEDGER, reverse: bool = False, amount: str = "-20.00") -> None:
    (tmp_path / "qa_derive.py").write_text(PLUGIN.format(reverse=reverse))
    (tmp_path / "main.bean").write_text(ledger)
    (tmp_path / "correction.csv").write_text(
        f"Date,Description,Amount,Reference\n2024-02-01,Source row,{amount},source-10\n"
    )


def _amounts(tmp_path: Path, *flags: str) -> tuple[list[tuple[str, bool]], bool]:
    result = _bea(tmp_path, "list", "transaction", "--sort", "oldest", "--limit", "100", *flags)
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    rows = [(str(row["postings"][0]["units"]["number"]), bool(row.get("generated"))) for row in payload["data"]]
    return rows, bool(payload.get("truncated"))


def _import(tmp_path: Path, *flags: str) -> object:
    return _bea(
        tmp_path,
        "import",
        "correction.csv",
        "--csv",
        MAPPING,
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        *flags,
    )


@pytest.mark.parametrize("reverse", [False, True], ids=["copy-after", "copy-before"])
@pytest.mark.parametrize("ledger", [LEDGER, INFERRED], ids=["explicit", "inferred"])
def test_only_the_written_amount_is_on_disk(tmp_path: Path, ledger: str, reverse: bool) -> None:
    _books(tmp_path, ledger, reverse)

    full, _ = _amounts(tmp_path)
    on_disk, _ = _amounts(tmp_path, "--on-disk")

    assert sorted(full) == [("-10.00", False), ("-20.00", True)]
    assert on_disk == [("-10.00", False)]


@pytest.mark.parametrize("reverse", [False, True], ids=["copy-after", "copy-before"])
def test_a_limited_listing_shows_the_written_row(tmp_path: Path, reverse: bool) -> None:
    _books(tmp_path, LEDGER, reverse)

    result = _bea(tmp_path, "list", "transaction", "--on-disk", "--sort", "newest", "--limit", "1")

    payload = json.loads(result.stdout)
    assert [row["postings"][0]["units"]["number"] for row in payload["data"]] == ["-10.00"]
    assert not payload.get("truncated")


def test_a_changed_amount_under_the_bank_id_conflicts_and_a_repeat_skips(tmp_path: Path) -> None:
    _books(tmp_path)
    before = (tmp_path / "main.bean").read_bytes()

    conflict = _import(tmp_path, "--apply")
    (tmp_path / "correction.csv").write_text(
        "Date,Description,Amount,Reference\n2024-02-01,Source row,-10.00,source-10\n"
    )
    repeat = _import(tmp_path, "--apply")

    assert conflict.returncode == 4, conflict.stdout  # type: ignore[attr-defined]
    assert repeat.returncode == 0, repeat.stderr  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


def test_two_written_transactions_with_one_header_stay_two(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n'
        '2024-02-01 * "Twin"\n  Assets:Cash -5.00 USD\n  Expenses:Food 5.00 USD\n'
        '2024-02-01 * "Twin"\n  Assets:Cash -7.00 USD\n  Expenses:Food 7.00 USD\n'
    )

    on_disk, _ = _amounts(tmp_path, "--on-disk")

    assert sorted(on_disk) == [("-5.00", False), ("-7.00", False)]
