"""A quoted CSV bank reference is kept exactly, edge spaces included (w5/1045).

Every mapped cell was trimmed, so ` payment-2026` and `payment-2026 ` became
`payment-2026`: a second, distinct same-day payment was skipped as the
first one's exact duplicate, or a different amount falsely conflicted.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD
2026-01-01 * "Capital"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
"""
MAPPING = "date=Date,narration=Description,amount=Amount,id=Reference"


def _statement(path: Path, reference: str, amount: str) -> None:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n", quoting=csv.QUOTE_ALL)
    writer.writerows([["Date", "Description", "Amount", "Reference"], ["2026-01-02", "Coffee", amount, reference]])
    path.write_text(out.getvalue())


def _import(tmp_path: Path, name: str, *flags: str) -> object:
    return _bea(
        tmp_path,
        "import",
        name,
        "--csv",
        MAPPING,
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        *flags,
    )


def _cash(tmp_path: Path) -> str:
    result = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Cash'")
    return str(json.loads(result.stdout)["data"]["rows"][0][0])


@pytest.mark.parametrize("reference", [" payment-2026", "payment-2026 "], ids=["leading", "trailing"])
@pytest.mark.parametrize("amount", ["-10.00", "-12.00"], ids=["same-amount", "different-amount"])
def test_an_edge_spaced_reference_is_its_own_payment(tmp_path: Path, reference: str, amount: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    _statement(tmp_path / "first.csv", "payment-2026", "-10.00")
    _statement(tmp_path / "second.csv", reference, amount)
    assert json.loads(_import(tmp_path, "first.csv", "--apply").stdout)["data"]["written"] == 1  # type: ignore[attr-defined]

    applied = _import(tmp_path, "second.csv", "--apply", "--duplicates", "include")

    assert applied.returncode == 0, applied.stderr  # type: ignore[attr-defined]
    assert json.loads(applied.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert f'bank_id: "{reference}"' in (tmp_path / "main.bean").read_text()
    repeat = _import(tmp_path, "second.csv", "--apply")
    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
