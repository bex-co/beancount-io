"""A native bank ID's authored amount outranks a plugin view that agrees with another one (w5/996).

A plugin that scales the written 10 USD payment to 20 USD made a real bank
correction to 20 USD agree with the calculated view, so it was skipped as an
exact duplicate while the recorded source still said 10.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from decimal import Decimal
from beancount.core.data import Transaction
__plugins__ = ("transform",)
def transform(entries, options, config=None):
    out = []
    for entry in entries:
        if isinstance(entry, Transaction) and entry.narration == "Source row":
            factor = Decimal(FACTOR)
            posts = [p._replace(units=p.units._replace(number=p.units.number * factor)) for p in entry.postings]
            entry = entry._replace(meta=entry.meta.copy(), postings=posts)
        out.append(entry)
    return out, []
"""
LEDGER = (
    'option "operating_currency" "USD"\n{plugin}'
    "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
    '2024-02-01 * "Source row"\n  bank_id: "source-10"\n  Assets:Cash -10.00 USD\n  Expenses:Food 10.00 USD\n'
)
SPEC = "date=Date,narration=Description,amount=Amount,id=Reference"


def _import(tmp_path: Path, factor: int | None, amount: str) -> tuple[object, bytes]:
    plugin = "" if factor is None else 'option "insert_pythonpath" "TRUE"\nplugin "qa_transform"\n'
    (tmp_path / "main.bean").write_text(LEDGER.format(plugin=plugin))
    (tmp_path / "qa_transform.py").write_text(PLUGIN.replace("FACTOR", str(factor or 1)))
    (tmp_path / "bank.csv").write_text(
        f"Date,Description,Amount,Reference\n2024-02-01,Source row,-{amount},source-10\n"
    )
    before = (tmp_path / "main.bean").read_bytes()
    result = _bea(
        tmp_path, "import", "bank.csv", "--csv", SPEC, "--account", "Assets:Cash",
        "--default-account", "Expenses:Food", "--apply",
    )  # fmt: skip
    return result, before


@pytest.mark.parametrize("factor", [2, None])
def test_the_authored_amount_repeat_still_skips(tmp_path: Path, factor: int | None) -> None:
    result, before = _import(tmp_path, factor, "10.00")

    assert result.returncode == 0, result.stderr  # type: ignore[attr-defined]
    assert json.loads(result.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


@pytest.mark.parametrize("factor", [2, None])
def test_a_correction_agreeing_with_the_transformed_view_conflicts(tmp_path: Path, factor: int | None) -> None:
    result, before = _import(tmp_path, factor, "20.00")

    assert result.returncode == 4, result.stdout  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before
