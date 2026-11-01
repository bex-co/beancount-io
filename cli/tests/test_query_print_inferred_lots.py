"""A `PRINT` export keeps a source-inferred lot quantity open (w5/1066).

Two purchases whose quantities Beancount interpolated book as one undated lot;
the export printed the booked quantities, the reload dated each purchase, and
the later partial sale became ambiguous under strict booking.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_price_export_plugin_siblings import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Broker HOOL{booking}
2024-01-01 open Equity:Opening USD
2024-01-01 open Income:Gains USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
2024-01-02 * "Trade buy 1"
  Assets:Cash -10.00 USD
  Assets:Broker {qty}HOOL {lot}
2024-01-03 * "Trade buy 2"
  Assets:Cash -10.00 USD
  Assets:Broker {qty}HOOL {lot}
2024-01-04 * "Trade sale"
  Assets:Cash 12.00 USD
  Assets:Broker -2 HOOL {sale} @ 6 USD
  Income:Gains -2.00 USD
"""


def _lots(tmp_path: Path, ledger: Path) -> list[list[object]]:
    result = _bea(
        tmp_path,
        "--json",
        "-f",
        str(ledger),
        "query",
        "SELECT str(cost_date), sum(number) WHERE account = 'Assets:Broker' GROUP BY 1 ORDER BY 1",
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]["rows"]  # type: ignore[no-any-return]


@pytest.mark.parametrize(
    ("booking", "qty", "lot", "sale"),
    [
        ("", "", "{5 USD}", "{5 USD}"),
        (' "FIFO"', "", "{5 USD}", "{5 USD}"),
        ("", "", "{5 USD, 2023-12-31}", "{5 USD, 2023-12-31}"),
        ("", "2 ", "{5 USD}", "{5 USD, 2024-01-02}"),
    ],
    ids=["strict", "fifo", "dated", "explicit"],
)
def test_the_export_reloads_with_the_same_lots(tmp_path: Path, booking: str, qty: str, lot: str, sale: str) -> None:
    source = tmp_path / "main.bean"
    source.write_text(LEDGER.format(booking=booking, qty=qty, lot=lot, sale=sale))
    out = tmp_path / "export.bean"

    exported = _bea(tmp_path, "-f", str(source), "query", "PRINT", "-f", "beancount", "-o", str(out))

    assert exported.returncode == 0, exported.stderr
    assert _bea(tmp_path, "-f", str(out), "check").returncode == 0
    assert _lots(tmp_path, out) == _lots(tmp_path, source)


OPENING = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Broker HOOL
2024-01-01 open Equity:Opening USD
2024-01-01 open Equity:Opening-Balances
2024-01-01 open Income:Gains USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
2024-01-02 * "Purchase"
  Assets:Broker HOOL {5 USD}
  Assets:Cash -25.00 USD
2024-01-03 * "Purchase"
  Assets:Broker HOOL {5 USD}
  Assets:Cash -15.00 USD
2026-01-02 * "Purchase"
  Assets:Broker HOOL {5 USD}
  Assets:Cash -10.00 USD
2026-01-03 * "Partial sale"
  Assets:Broker -2 HOOL {5 USD} @ 7 USD
  Assets:Cash 14.00 USD
  Income:Gains -4.00 USD
"""
WINDOW = "PRINT FROM OPEN ON 2026-01-01 CLOSE ON 2027-01-01"


def test_an_opening_export_that_would_date_an_undated_lot_is_refused(tmp_path: Path) -> None:
    """The generated opening has no source line, so its quantity would print explicit and date the lot (w5/1084)."""
    source = tmp_path / "main.bean"
    source.write_text(OPENING)
    out = tmp_path / "export.bean"
    full = _bea(tmp_path, "-f", str(source), "query", "PRINT", "-f", "beancount", "-o", str(out))
    assert full.returncode == 0, full.stderr
    kept = out.read_bytes()

    window = _bea(tmp_path, "-f", str(source), "query", WINDOW, "-f", "beancount", "-o", str(out))

    assert window.returncode != 0
    assert "no acquisition date" in window.stderr and "Nothing was written" in window.stderr
    assert out.read_bytes() == kept
    assert _bea(tmp_path, "-f", str(out), "check").returncode == 0


def test_an_opening_export_of_dated_lots_still_works(tmp_path: Path) -> None:
    source = tmp_path / "main.bean"
    source.write_text(OPENING.replace("HOOL {5 USD}\n  Assets:Cash -", "HOOL {5 USD, 2023-12-31}\n  Assets:Cash -", 3))
    out = tmp_path / "export.bean"

    window = _bea(tmp_path, "-f", str(source), "query", WINDOW, "-f", "beancount", "-o", str(out))

    assert window.returncode == 0, window.stderr
    assert _bea(tmp_path, "-f", str(out), "check").returncode == 0


MULTILINE_LABEL = r"""option "operating_currency" "USD"
2023-01-01 open Assets:Cash USD
2023-01-01 open Assets:Stock HOOL
2023-01-01 open Equity:Opening USD
2023-01-01 open Income:Gain USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
2024-01-02 * "Buy first"
  Assets:Stock HOOL {5 USD, "First\nLot"}
  Assets:Cash -10 USD
2024-01-03 * "Buy again"
  Assets:Stock HOOL {5 USD, "First\nLot"}
  Assets:Cash -15 USD
2024-02-01 * "Sell one"
  Assets:Stock -1 HOOL {5 USD, "First\nLot"} @ 7 USD
  Assets:Cash 7 USD
  Income:Gain -2 USD
"""


def test_a_second_export_keeps_inferred_quantities_beside_a_newline_label(tmp_path: Path) -> None:
    """The printer writes the label across lines; the reader must still see the quantity left open (w5/1086)."""
    source = tmp_path / "main.bean"
    source.write_text(MULTILINE_LABEL)
    first, second = tmp_path / "first.bean", tmp_path / "second.bean"

    assert _bea(tmp_path, "-f", str(source), "query", "PRINT", "-f", "beancount", "-o", str(first)).returncode == 0
    assert _bea(tmp_path, "-f", str(first), "check").returncode == 0
    again = _bea(tmp_path, "-f", str(first), "query", "PRINT", "-f", "beancount", "-o", str(second))

    assert again.returncode == 0, again.stderr
    assert _bea(tmp_path, "-f", str(second), "check").returncode == 0, second.read_text()
    assert _lots(tmp_path, second) == _lots(tmp_path, source)


def test_list_details_keeps_inferred_quantities_so_the_redirect_reloads_the_same_lots(tmp_path: Path) -> None:
    """`list transaction --details` printed the booked quantities, which date each purchase (w5/1088)."""
    source = tmp_path / "main.bean"
    source.write_text(LEDGER.format(booking="", qty="", lot="{5 USD}", sale="{5 USD}"))
    details = tmp_path / "details.bean"

    listed = _bea(tmp_path, "-f", str(source), "list", "transaction", "--details", "--sort", "oldest")
    assert listed.returncode == 0, listed.stderr
    # Header comments come with the listing; the entries alone must be loadable.
    details.write_text(
        'option "operating_currency" "USD"\n'
        "2024-01-01 open Assets:Cash USD\n2024-01-01 open Assets:Broker HOOL\n"
        "2024-01-01 open Equity:Opening USD\n2024-01-01 open Income:Gains USD\n" + listed.stdout
    )

    assert _bea(tmp_path, "-f", str(details), "check").returncode == 0, listed.stdout
    assert _lots(tmp_path, details) == _lots(tmp_path, source)
