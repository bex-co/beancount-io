"""Export artifacts stay outside copied plugin packages (w5/1017).

A relocated external include went to `_shared/01-…` even when the ledger's
plugin package was itself named `_shared`, and a plugin enumerating its own
package resources read the include as one more: the snapshot's derived price
and net worth changed while `check` passed.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_price_export_plugin_siblings import _bea

PLUGIN = """import datetime as dt
from decimal import Decimal as D
from importlib.resources import files
from beancount.core import amount, data
from beancount.parser import parser
__plugins__ = ("average",)

def average(entries, options):
    values = []
    for p in sorted(files(__package__).iterdir(), key=lambda p: p.name):
        if p.name.endswith((".bean", ".beancount")):
            parsed, errors, _ = parser.parse_string(p.read_text())
            values += [e.amount.number for e in parsed if isinstance(e, data.Price)]
    if not values:
        return entries, []
    price = data.Price(data.new_metadata("<avg>", 0), dt.date(2024, 1, 3), "BTC",
                       amount.Amount(sum(values, D(0)) / len(values), "USD"))
    return [*entries, price], []
"""
LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "{plugin}"
include "../shared/quotes.bean"
2024-01-01 open Assets:Coin BTC
2024-01-01 open Equity:Opening USD
2024-01-02 * "Trade"
  Assets:Coin 1 BTC {{100 USD}}
  Equity:Opening -100 USD
"""


def _btc(tmp_path: Path, ledger: Path) -> list[list[object]]:
    result = _bea(
        tmp_path,
        "--json",
        "-f",
        str(ledger),
        "query",
        "SELECT date, str(number(amount)) FROM #prices WHERE currency = 'BTC'",
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]["rows"]  # type: ignore[no-any-return]


@pytest.mark.parametrize("helper", [False, True], ids=["direct", "helper"])
def test_a_relocated_include_does_not_join_a_package_named_shared(tmp_path: Path, helper: bool) -> None:
    books, shared = tmp_path / "books", tmp_path / "shared"
    (books / "_shared").mkdir(parents=True)
    shared.mkdir()
    (books / "_shared" / "__init__.py").write_text(PLUGIN)
    (books / "_shared" / "local-data.bean").write_text("2024-01-01 price BTC 900 USD\n")
    if helper:
        (books / "qa_entry.py").write_text('from _shared import average\n__plugins__ = ("average",)\n')
    (shared / "quotes.bean").write_text("2024-01-02 price BTC 1000 USD\n")
    (books / "main.bean").write_text(LEDGER.format(plugin="qa_entry" if helper else "_shared"))
    snap = tmp_path / "snap"

    exported = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap))

    assert exported.returncode == 0, exported.stderr
    assert sorted(p.name for p in (snap / "_shared").iterdir() if p.is_file()) == ["__init__.py", "local-data.bean"]
    assert (snap / "_shared-files" / "01-quotes.bean").is_file()
    assert _bea(tmp_path, "-f", str(snap / "main.bean"), "check").returncode == 0
    # The plugin's January 3 average is still 900 from its one resource.
    assert _btc(tmp_path, snap / "main.bean") == _btc(tmp_path, books / "main.bean")
    assert ["2024-01-03", "900"] in _btc(tmp_path, snap / "main.bean")
