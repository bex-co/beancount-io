"""A plugin copy with a different posting count is not the written transaction (w5/991)."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = textwrap.dedent(
    """
    from decimal import Decimal
    from beancount.core.data import Transaction
    __plugins__ = ("derive",)
    def derive(entries, options, config=None):
        out = []
        for entry in entries:
            if not isinstance(entry, Transaction) or entry.narration != "Source row":
                out.append(entry)
                continue
            posts = [p._replace(units=p.units._replace(number=p.units.number * Decimal(2)))
                     for p in entry.postings]
            second = posts[1]
            half = second._replace(units=second.units._replace(number=second.units.number / Decimal(2)))
            posts[1:] = [half, half]
            out.extend([entry, entry._replace(meta=entry.meta.copy(), postings=posts)])
        return out, []
    """
)


def _ledger(tmp_path: Path, food: str) -> None:
    (tmp_path / "qa_derive.py").write_text(PLUGIN)
    (tmp_path / "main.bean").write_text(
        'option "insert_pythonpath" "TRUE"\nplugin "qa_derive"\n'
        "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
        '2024-02-01 * "Source row"\n  bank_id: "source-10"\n'
        f"  Assets:Cash -10.00 USD\n  Expenses:Food{food}\n"
    )


@pytest.mark.parametrize("food", [" 10.00 USD", ""], ids=["stated", "inferred"])
def test_the_split_copy_is_generated_and_a_changed_amount_conflicts(tmp_path: Path, food: str) -> None:
    _ledger(tmp_path, food)

    on_disk = _bea(tmp_path, "list", "transaction", "--on-disk", "--limit", "100")
    rows = json.loads(on_disk.stdout)["data"]
    assert len(rows) == 1

    (tmp_path / "c.csv").write_text("Date,Description,Amount,Reference\n2024-02-01,Source row,-20.00,source-10\n")
    before = (tmp_path / "main.bean").read_bytes()
    result = _bea(
        tmp_path,
        "import",
        "c.csv",
        "--csv",
        "date=Date,narration=Description,amount=Amount,id=Reference",
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        "--apply",
    )
    assert result.returncode == 4, result.stdout + result.stderr
    assert (tmp_path / "main.bean").read_bytes() == before


def test_a_booking_split_still_counts_as_written(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(
        'option "booking_method" "FIFO"\n'
        "2024-01-01 open Assets:Broker HOOL\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Income:Gain USD\n"
        '2024-01-02 * "Buy"\n  Assets:Broker 1 HOOL {10 USD}\n  Assets:Cash -10 USD\n'
        '2024-01-03 * "Buy"\n  Assets:Broker 1 HOOL {20 USD}\n  Assets:Cash -20 USD\n'
        '2024-01-04 * "Sell"\n  Assets:Broker -2 HOOL {}\n  Assets:Cash 40 USD\n  Income:Gain\n'
    )
    rows = json.loads(_bea(tmp_path, "list", "transaction", "--on-disk", "--limit", "100").stdout)["data"]
    assert len(rows) == 3
