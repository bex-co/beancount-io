"""A native ID's authored row may leave its own amount to booking (w5/1005).

The file's Cash amount was inferred, so the raw row under the bank ID had no
number, and comparing the incoming explicit row with it raised the importer's
"must supply explicit source amounts" error: both the unchanged repeat and the
correction failed with exit 1 instead of skipping and conflicting.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

SPEC = "date=Date,narration=Description,amount=Amount,id=Reference"
PLUGIN = """from beancount.core.data import Transaction
__plugins__ = ("hide",)
def hide(entries, options, config=None):
    return [e for e in entries if not isinstance(e, Transaction) or e.narration != "Source row"], []
"""
LAYOUTS = {
    "bare": "  Assets:Cash\n  Expenses:Food 10.00 USD\n",
    "currency": "  Assets:Cash USD\n  Expenses:Food 10.00 USD\n",
    "counter": "  Assets:Cash -10.00 USD\n  Expenses:Food\n",
}


def _books(tmp_path: Path, layout: str, *, filtered: bool) -> Path:
    (tmp_path / "hide.py").write_text(PLUGIN)
    settings = 'option "insert_pythonpath" "TRUE"\nplugin "hide"\n' if filtered else ""
    (tmp_path / "main.bean").write_text(
        settings
        + "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
        + '2024-02-01 * "Source row"\n  bank_id: "B1"\n'
        + LAYOUTS[layout]
    )
    return tmp_path / "main.bean"


def _import(tmp_path: Path, amount: str, *flags: str) -> object:
    (tmp_path / "bank.csv").write_text(f"Date,Description,Amount,Reference\n2024-02-01,Source row,{amount},B1\n")
    return _bea(
        tmp_path, "import", "bank.csv", "--csv", SPEC, "--account", "Assets:Cash",
        "--default-account", "Expenses:Food", *flags,
    )  # fmt: skip


@pytest.mark.parametrize("filtered", [False, True], ids=["plain", "filtered"])
@pytest.mark.parametrize("layout", list(LAYOUTS))
def test_the_unchanged_repeat_skips_and_a_correction_conflicts(tmp_path: Path, layout: str, filtered: bool) -> None:
    ledger = _books(tmp_path, layout, filtered=filtered)
    before = ledger.read_bytes()

    repeat = _import(tmp_path, "-10.00", "--apply")
    changed = _import(tmp_path, "-20.00", "--apply")

    assert repeat.returncode == 0, repeat.stdout  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


# Booking rounds an omitted amount to the tolerance its other postings infer:
# 4.8 + 2.97 books Cash at -7.8 by default, at -7.77 with precise interpolation
# or when 4.80 states cents (w5/1005).
ROUNDED = {
    "bare": ("", "  Assets:Cash\n  Expenses:Food 4.8 USD\n  Expenses:Food 2.97 USD\n", "-7.80", "-7.77"),
    "currency": ("", "  Assets:Cash USD\n  Expenses:Food 4.8 USD\n  Expenses:Food 2.97 USD\n", "-7.80", "-7.77"),
    "reversed": ("", "  Assets:Cash\n  Expenses:Food 2.97 USD\n  Expenses:Food 4.8 USD\n", "-7.80", "-7.77"),
    "precise": (
        'option "use_precise_interpolation" "TRUE"\n',
        "  Assets:Cash\n  Expenses:Food 4.8 USD\n  Expenses:Food 2.97 USD\n",
        "-7.77",
        "-7.80",
    ),
    "cents": ("", "  Assets:Cash\n  Expenses:Food 4.80 USD\n  Expenses:Food 2.97 USD\n", "-7.77", "-7.80"),
}


@pytest.mark.parametrize("skip", [False, True], ids=["default", "skip"])
@pytest.mark.parametrize("layout", list(ROUNDED))
def test_an_omitted_amount_is_compared_as_booking_rounds_it(tmp_path: Path, layout: str, skip: bool) -> None:
    options, postings, booked, other = ROUNDED[layout]
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n' + options
        + "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
        + '2024-02-01 * "Source row"\n  bank_id: "B1"\n' + postings
    )  # fmt: skip
    before = ledger.read_bytes()
    flags = ["--duplicates", "skip"] if skip else []

    repeat = _import(tmp_path, booked, *flags, "--apply")
    changed = _import(tmp_path, other, *flags, "--apply")

    assert repeat.returncode == 0, repeat.stdout  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["rows"][0]["status"] == "duplicate"  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before
