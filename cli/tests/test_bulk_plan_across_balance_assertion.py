"""A prefix of a valid bulk plan may sit before an assertion the whole plan meets (w5/1007).

The row builder placed rows one at a time against the ledger, so every prefix
broke the February 2 Cash assertion that the complete batch satisfies; it gave
up, and the eager reorder took the new 200 USD lot for the old sale.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_bulk_keeps_valid_sale_lot import BASE, ROWS
from tests.test_import_source_facts import _bea


@pytest.mark.parametrize("method", ["LIFO", "HIFO"])
def test_the_existing_sale_keeps_its_old_lot_beside_an_assertion(tmp_path: Path, method: str) -> None:
    (tmp_path / "main.bean").write_text(BASE.format(method=method) + "2024-02-02 balance Assets:Cash 800 USD\n")
    (tmp_path / "batch.json").write_text(json.dumps(ROWS))

    result = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "batch.json"))

    assert result.returncode == 0, result.stderr or result.stdout
    assert json.loads(result.stdout)["data"]["written"] == 4
    gains = _bea(tmp_path, "query", "SELECT sum(number) WHERE account='Income:Gains'")
    assert json.loads(gains.stdout)["data"]["rows"] == [["-100"]]
    assert _bea(tmp_path, "check").returncode == 0
