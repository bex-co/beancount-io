"""A negative zero in an imported balance or note is the same directive on repeat (w5/1023).

The comparison key kept `Decimal('-0.00')`'s sign while the ledger, reparsed,
holds `0.00`: an unchanged balance (or its tolerance) conflicted with itself
and blocked the rest of an overlapping statement, and a note carrying `-0.00`
metadata was appended again on every run.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Refunds USD
"""
IMPORTER = """import datetime, json
from decimal import Decimal
from pathlib import Path
from beancount.core import data
from beancount.core.amount import Amount

class Imp:
    def identify(self, path): return path.endswith(".json")
    def account(self, path): return "Assets:Cash"
    def extract(self, path, existing):
        spec = json.loads(Path(path).read_text())
        meta = data.new_metadata(path, 1)
        day = datetime.date(2024, 2, 1)
        out = []
        if spec["mode"] == "balance":
            out.append(data.Balance(meta, day, "Assets:Cash", Amount(Decimal(spec["zero"]), "USD"), None, None))
        elif spec["mode"] == "tolerance":
            out.append(data.Balance(meta, day, "Assets:Cash", Amount(Decimal("0.00"), "USD"),
                                    Decimal(spec["zero"]), None))
        elif spec["mode"] == "amount-note":
            meta["rate"] = Amount(Decimal(spec["zero"]), "USD")
            out.append(data.Note(meta, day, "Assets:Cash", "Statement", frozenset(), frozenset()))
        else:
            meta["fee"] = Decimal(spec["zero"])
            out.append(data.Note(meta, day, "Assets:Cash", "Statement", frozenset(), frozenset()))
        for refund in spec.get("refunds", []):
            out.append(data.Transaction(data.new_metadata(path, 2), datetime.date(2024, 2, 2), "*", None, refund,
                frozenset(), frozenset(), [
                data.Posting("Assets:Cash", Amount(Decimal("5.00"), "USD"), None, None, None, None),
                data.Posting("Income:Refunds", Amount(Decimal("-5.00"), "USD"), None, None, None, None)]))
        return out

CONFIG = [Imp()]
"""


def _run(tmp_path: Path, spec: dict[str, object]) -> dict[str, object]:
    (tmp_path / "statement.json").write_text(json.dumps(spec))
    result = _bea(tmp_path, "import", "statement.json", "--config", "importers.py", "--apply")
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]  # type: ignore[no-any-return]


@pytest.mark.parametrize("mode", ["balance", "tolerance", "note", "amount-note"])
@pytest.mark.parametrize("zero", ["-0.00", "0.00"], ids=["negative", "positive"])
def test_an_unchanged_signed_zero_directive_repeats_as_a_duplicate(tmp_path: Path, mode: str, zero: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importers.py").write_text(IMPORTER)
    assert _run(tmp_path, {"mode": mode, "zero": zero})["written"] == 1
    after = (tmp_path / "main.bean").read_bytes()

    assert _run(tmp_path, {"mode": mode, "zero": zero})["written"] == 0
    assert (tmp_path / "main.bean").read_bytes() == after
    # An overlapping statement with a new refund still imports the refund alone.
    assert _run(tmp_path, {"mode": mode, "zero": zero, "refunds": ["Refund"]})["written"] == 1
    assert _bea(tmp_path, "check").returncode == 0
