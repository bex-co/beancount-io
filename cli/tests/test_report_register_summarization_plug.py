"""A period register lists each summarized account's own opening leg, not its plug (w1/279).

A `--time` clamp summarizes every account into a transaction whose postings
pair the account's positions with plugs on `Equity:Opening-Balances`. The
register took every leg in the subtree, so an equity register ran through
balances the account never held and named an account the ledger never opened.
"""

from __future__ import annotations

import csv
import io
import json
from decimal import Decimal
from pathlib import Path

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Liabilities:Card USD
2024-01-01 open Income:Salary USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Expenses:Rent USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "Opening"
  Assets:Bank:Checking  1000.00 USD
  Equity:Opening-Balances
2024-01-15 * "Employer" "Salary Jan"
  Assets:Bank:Checking  3000.00 USD
  Income:Salary
2024-01-20 * "Cafe" "Lunch"
  Expenses:Food  12.50 USD
  Liabilities:Card
2024-02-01 * "Landlord" "Rent Feb"
  Expenses:Rent  1500.00 USD
  Assets:Bank:Checking
2024-02-15 * "Employer" "Salary Feb"
  Assets:Bank:Checking  3000.00 USD
  Income:Salary
2024-03-01 * "Landlord" "Rent Mar"
  Expenses:Rent  1500.00 USD
  Assets:Bank:Checking
"""
RENAMED = LEDGER.replace("Opening-Balances", "Opening")


def _json_rows(tmp_path: Path, text: str, account: str, period: str) -> list[tuple[str, Decimal, Decimal]]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "--json", "report", "register", account, "-t", period], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return [
        (row["account"], Decimal(row["amount"]["number"]), Decimal(row["balance"]["USD"]))
        for row in json.loads(proc.stdout)["data"]["rows"]
    ]


def test_the_plug_account_shows_only_its_own_opening(tmp_path: Path) -> None:
    rows = _json_rows(tmp_path, LEDGER, "Equity:Opening-Balances", "2024-03")

    assert rows == [("Equity:Opening-Balances", Decimal("-1000.00"), Decimal("-1000.00"))]


def test_an_equity_register_names_no_unopened_plug_account(tmp_path: Path) -> None:
    rows = _json_rows(tmp_path, RENAMED, "Equity", "2024-03")

    assert rows == [
        ("Equity:Earnings:Previous", Decimal("-4487.50"), Decimal("-4487.50")),
        ("Equity:Opening", Decimal("-1000.00"), Decimal("-5487.50")),
    ]


def test_csv_carries_the_same_rows(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, RENAMED)
    proc = bea(
        ["--file", str(ledger), "report", "register", "Equity", "-t", "2024-03", "--format", "csv"],
        tmp_path,
    )
    assert proc.returncode == 0, proc.stderr
    rows = list(csv.DictReader(io.StringIO(proc.stdout)))

    assert [(row["account"], row["balance"]) for row in rows] == [
        ("Equity:Earnings:Previous", "-4487.50"),
        ("Equity:Opening", "-5487.50"),
    ]


def test_an_asset_register_keeps_its_opening_and_period_rows(tmp_path: Path) -> None:
    rows = _json_rows(tmp_path, LEDGER, "Assets:Bank:Checking", "2024-02")

    assert [balance for *_, balance in rows] == [Decimal("4000.00"), Decimal("2500.00"), Decimal("5500.00")]


def test_every_position_of_a_multi_position_account_is_kept(tmp_path: Path) -> None:
    """Summarization interleaves account and plug legs, one pair per position."""
    text = """option "operating_currency" "USD"
2024-01-01 open Assets:Wallet
2024-01-01 open Equity:Opening-Balances
2024-01-01 price EUR 1.10 USD
2024-01-01 * "Fund"
  Assets:Wallet  100 USD
  Assets:Wallet  50 EUR
  Equity:Opening-Balances  -100 USD
  Equity:Opening-Balances  -50 EUR
2024-02-01 * "Spend"
  Assets:Wallet  -10 USD
  Equity:Opening-Balances  10 USD
"""
    ledger = write_ledger(tmp_path, text)
    proc = bea(
        ["--file", str(ledger), "--json", "report", "register", "Equity:Opening-Balances", "-t", "2024-02"],
        tmp_path,
    )
    assert proc.returncode == 0, proc.stderr
    rows = json.loads(proc.stdout)["data"]["rows"]

    opening = [row for row in rows if "Summarization" in (row["narration"] or "")]
    assert sorted((row["amount"]["currency"], Decimal(row["amount"]["number"])) for row in opening) == [
        ("EUR", Decimal(-50)),
        ("USD", Decimal(-100)),
    ]
    assert all(row["account"] == "Equity:Opening-Balances" for row in rows)
