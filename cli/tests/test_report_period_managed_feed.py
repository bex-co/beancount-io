"""A managed feed's quotes do not start the report period (w1/315).

`include "https://beancount.io/prices/BTC-USD"` backfills years of quotes, and
the period started at the first dated fact, so a ledger whose first entry is
2026-01-02 reported "2021-09-30 through …" and opened every monthly series with
dozens of zero months. The feed values holdings; it is not ledger activity,
the same reason placeholder `custom` and `query` directives stopped bounding
the period (w5/193). The end still reaches the feed's newest quote, a written
`price` still starts the period (w3/349), and a ledger with no dated fact of
its own falls back to the feed's dates.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from tests.test_price import _FeedHandler, _run_bea
from tests.test_price import feed_server as feed_server

FEED = """\
; alias: BTC-USD
; commodity: BTC
; quote: USD
; source: fixture
2021-09-30 price BTC 43800.00 USD
2024-06-30 price BTC 62700.00 USD
2026-11-19 price BTC 61930.75 USD
"""


def _ledger(feed_server: str, extra: str = "", body: bool = True) -> str:
    text = f"""option "operating_currency" "USD"
include "{feed_server}/prices/BTC-USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Crypto BTC
2026-01-01 open Equity:Opening-Balances USD
{extra}"""
    if body:
        text += """
2026-01-02 * "Opening"
  Assets:Bank  10000.00 USD
  Equity:Opening-Balances

2026-02-01 * "Buy BTC"
  Assets:Crypto  0.1 BTC {80000.00 USD}
  Assets:Bank   -8000.00 USD
"""
    return text


@pytest.fixture
def served(feed_server: str) -> str:
    _FeedHandler.routes["/prices/BTC-USD"] = {
        "body": FEED.encode("utf-8"),
        "headers": {"Content-Type": "text/plain; charset=utf-8", "ETag": '"r1"'},
        "etag": '"r1"',
        "etag_match": True,
    }
    return feed_server


def _write(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text, encoding="utf-8")
    return ledger


def _report(tmp_path: Path, served: str, ledger: Path, *args: str) -> dict[str, Any]:
    done = _run_bea(tmp_path, served, "--json", "--file", str(ledger), "report", *args)
    assert done.returncode == 0, done.stderr or done.stdout
    data: dict[str, Any] = json.loads(done.stdout)["data"]
    return data


def _dates(kind: str, data: dict[str, Any]) -> list[str]:
    if kind == "balance-sheet":
        points = data["net_worth_series"]
    elif kind == "income-statement":
        points = data["periods"]
    else:
        points = [point for series in data["series"].values() for point in series]
    return [point["date"] for point in points]


@pytest.mark.parametrize("kind", ["overview", "income-statement", "balance-sheet", "trial-balance", "holdings"])
def test_the_period_starts_at_the_ledgers_own_first_entry(tmp_path: Path, served: str, kind: str) -> None:
    data = _report(tmp_path, served, _write(tmp_path, _ledger(served)), kind)

    # The end still reaches the feed's newest quote, so holdings value at it.
    assert data["period"] == {"start": "2026-01-02", "end_exclusive": "2026-11-20"}


@pytest.mark.parametrize("kind", ["overview", "income-statement", "balance-sheet"])
def test_no_series_point_falls_before_the_first_entry(tmp_path: Path, served: str, kind: str) -> None:
    data = _report(tmp_path, served, _write(tmp_path, _ledger(served)), kind, "-i", "monthly")

    dates = _dates(kind, data)
    assert dates, kind
    assert min(dates) >= "2026-01-02"
    assert max(dates) == "2026-11-19"


def test_the_monthly_net_worth_has_one_row_per_ledger_month(tmp_path: Path, served: str) -> None:
    data = _report(tmp_path, served, _write(tmp_path, _ledger(served)), "balance-sheet", "-i", "monthly")

    assert len(data["net_worth_series"]) == 11
    assert data["net_worth_series"][0] == {"date": "2026-01-31", "balance": {"USD": "10000.00"}}


def test_the_text_heading_names_the_ledgers_own_start(tmp_path: Path, served: str) -> None:
    ledger = _write(tmp_path, _ledger(served))

    done = _run_bea(tmp_path, served, "--file", str(ledger), "report", "balance-sheet")

    assert done.returncode == 0, done.stderr or done.stdout
    assert "Balance Sheet — 2026-01-02 through 2026-11-19" in done.stdout
    assert "2021-" not in done.stdout and "2025-" not in done.stdout


def test_an_account_filter_keeps_the_ledgers_own_start(tmp_path: Path, served: str) -> None:
    data = _report(tmp_path, served, _write(tmp_path, _ledger(served)), "balance-sheet", "-a", "Assets:Crypto")

    assert data["period"] == {"start": "2026-01-02", "end_exclusive": "2026-11-20"}


def test_a_written_price_before_the_first_transaction_still_starts_the_period(tmp_path: Path, served: str) -> None:
    """The w3/349 control: a `price` the user wrote is a dated fact."""
    extra = "2025-12-15 price BTC 70000.00 USD\n"

    data = _report(tmp_path, served, _write(tmp_path, _ledger(served, extra)), "balance-sheet")

    assert data["period"] == {"start": "2025-12-15", "end_exclusive": "2026-11-20"}


def test_a_ledger_with_no_dated_fact_of_its_own_falls_back_to_the_feed(tmp_path: Path, served: str) -> None:
    data = _report(tmp_path, served, _write(tmp_path, _ledger(served, body=False)), "balance-sheet")

    assert data["period"] == {"start": "2021-09-30", "end_exclusive": "2026-11-20"}


def test_a_time_filter_is_unaffected(tmp_path: Path, served: str) -> None:
    data = _report(tmp_path, served, _write(tmp_path, _ledger(served)), "balance-sheet", "-t", "2024")

    assert data["period"] == {"start": "2024-01-01", "end_exclusive": "2025-01-01"}


def test_an_exported_snapshot_bounds_the_period_like_any_written_price(tmp_path: Path, served: str) -> None:
    ledger = _write(tmp_path, _ledger(served))
    assert _run_bea(tmp_path, served, "--file", str(ledger), "price", "export").returncode == 0
    exported = tmp_path / "main-export" / "main.bean"

    data = _report(tmp_path, served, exported, "balance-sheet")

    assert data["period"]["start"] == "2021-09-30"
