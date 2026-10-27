"""A partial transaction listing survives a posting price that never resolved (w5/1044).

`@ USD` leaves Beancount's MISSING sentinel as the price number, and the
listing converted its class name to a Decimal: `list transaction
--allow-errors` crashed in JSON, table and details alike.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea
from tests.test_price_export_plugin_siblings import _bea as _bea_plain

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Stock HOOL "FIFO"
2026-01-01 open Income:Gains USD
2026-01-02 * "Purchase"
  Assets:Stock 2 HOOL {{100 USD}}
  Assets:Cash -200 USD
2026-01-04 * "Last entry"
  Assets:Stock -1 HOOL {{}}{annotation}
  Assets:Cash 100 USD
  Income:Gains 0 USD
"""


@pytest.mark.parametrize("annotation", [" @ USD", " @@ USD"], ids=["per-unit", "total"])
def test_the_partial_listing_reports_the_price_without_a_number(tmp_path: Path, annotation: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER.format(annotation=annotation))

    listed = _bea(tmp_path, "list", "transaction", "--allow-errors", "--sort", "oldest")

    assert listed.returncode == 0, listed.stderr
    purchase, last = json.loads(listed.stdout)["data"]
    assert purchase["narration"] == "Purchase"
    (stock,) = [p for p in last["postings"] if p["account"] == "Assets:Stock"]
    assert stock["price"] == {"number": None, "currency": "USD"}
    for human in (["--allow-errors"], ["--allow-errors", "--details"]):
        shown = _bea_plain(tmp_path, "-f", str(tmp_path / "main.bean"), "list", "transaction", *human)
        assert shown.returncode == 0, shown.stderr
        assert "Last entry" in shown.stdout and "ConversionSyntax" not in shown.stderr


def test_a_write_still_needs_a_price_number(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER.format(annotation=" @ 100 USD"))
    row = {
        "date": "2026-01-05",
        "narration": "Sale",
        "postings": [
            {
                "account": "Assets:Stock",
                "units": {"number": "-1", "currency": "HOOL"},
                "cost": {},
                "price": {"number": None, "currency": "USD"},
            },
            {"account": "Assets:Cash", "amount": "100 USD"},
        ],
    }
    (tmp_path / "rows.json").write_text(json.dumps([row]))

    refused = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "rows.json"))

    assert refused.returncode == 1
    assert "price needs" in refused.stderr
