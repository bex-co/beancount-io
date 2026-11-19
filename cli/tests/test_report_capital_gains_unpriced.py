"""Capital-gains discloses a priceless reduction that is a sale, not a movement (w1/308).

A sale written without an `@` price books its gain through the income leg,
so the report total no longer ties to the ledger's `Income:Gains` postings
(the w22/m4 definition of done) when the row silently vanishes. The report
keeps proceeds unguessed — no price means no stated proceeds — but must name
the reduction instead of dropping it. Splits and own-account transfers stay
out: the same transaction offsets them with an augmentation of the same
commodity.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from tests.report_helpers import bea, write_ledger

LEDGER = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Broker
2024-01-01 open Assets:Broker2
2024-01-01 open Income:Gains USD
2024-01-01 open Equity:Opening
2024-01-02 * "Fund"
  Assets:Bank  10000.00 USD
  Equity:Opening
2024-01-10 * "Buy"
  Assets:Broker  10 AAPL {150.00 USD}
  Assets:Bank
2024-02-01 * "Transfer between own accounts"
  Assets:Broker   -2 AAPL {150.00 USD}
  Assets:Broker2   2 AAPL {150.00 USD}
2024-03-10 * "Sell with price"
  Assets:Broker  -3 AAPL {150.00 USD} @ 170.00 USD
  Assets:Bank  510.00 USD
  Income:Gains
2024-03-11 * "Sell without price"
  Assets:Broker  -5 AAPL {150.00 USD}
  Assets:Bank  900.00 USD
  Income:Gains
"""

SPLIT = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Broker
2024-01-01 open Income:Gains USD
2024-01-01 open Equity:Opening USD
2024-01-10 * "Buy"
  Assets:Broker  5 X {100 USD}
  Equity:Opening -500 USD
2024-02-01 * "Split two for one"
  Assets:Broker  -5 X {100 USD}
  Assets:Broker  10 X {50 USD}
"""


def _json(tmp_path: Path, text: str, *args: str) -> dict:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "--json", "report", "capital-gains", *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"]


def _text(tmp_path: Path, text: str, *args: str) -> subprocess.CompletedProcess[str]:
    ledger = write_ledger(tmp_path, text)
    return bea(["--file", str(ledger), "report", "capital-gains", *args], tmp_path)


def test_unpriced_sale_is_disclosed_and_not_counted(tmp_path: Path) -> None:
    data = _json(tmp_path, LEDGER)

    assert [(row["sold"], row["gain"]) for row in data["rows"]] == [
        ("2024-03-10", {"number": "60.00", "currency": "USD"}),
    ]
    assert data["totals"]["one_year_or_less"] == {"USD": "60.00"}
    assert data["unpriced_reductions"] == [
        {
            "date": "2024-03-11",
            "location": "main.beancount:20",
            "account": "Assets:Broker",
            "commodity": "AAPL",
            "quantity": {"number": "5", "currency": "AAPL"},
            "cost": {"number": "750.00", "currency": "USD"},
        }
    ]


def test_transfer_and_split_stay_out_of_both_lists(tmp_path: Path) -> None:
    data = _json(tmp_path, LEDGER)
    assert [reduction["date"] for reduction in data["unpriced_reductions"]] == ["2024-03-11"]

    split = _json(tmp_path, SPLIT)
    assert split["rows"] == []
    assert split["unpriced_reductions"] == []


def test_text_note_names_the_location_after_the_totals(tmp_path: Path) -> None:
    proc = _text(tmp_path, LEDGER)
    assert proc.returncode == 0, proc.stderr
    assert "60.00 USD" in proc.stdout
    assert "No sales." not in proc.stdout
    note = "1 lot reduction without a price is not counted: main.beancount:20"
    assert note in proc.stdout
    assert proc.stdout.index(note) > proc.stdout.index("One year or less:")
    assert "(add @ PRICE to report it as a sale)" in proc.stdout


def test_only_unpriced_sale_never_reads_bare_no_sales(tmp_path: Path) -> None:
    only = (
        LEDGER.split('2024-03-10 * "Sell with price"')[0]
        + '2024-03-11 * "Sell without price"'
        + LEDGER.split('2024-03-11 * "Sell without price"')[1]
    )
    proc = _text(tmp_path, only)
    assert proc.returncode == 0, proc.stderr
    assert "No sales." not in proc.stdout
    assert "main.beancount:16" in proc.stdout

    data = _json(tmp_path, only)
    assert data["rows"] == []
    assert len(data["unpriced_reductions"]) == 1


def test_csv_carries_the_priced_rows_only(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = bea(["--file", str(ledger), "report", "capital-gains", "--format", "csv"], tmp_path)
    assert proc.returncode == 0, proc.stderr
    lines = [line for line in proc.stdout.splitlines() if line]
    assert len(lines) == 2
    assert lines[1].split(",")[0] == "2024-03-10"
