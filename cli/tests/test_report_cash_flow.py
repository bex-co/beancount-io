"""`bea-engine report --kind cash-flow`: sections net to the CCE change (w21/m4/t004).

Direct-method statement at cost: inverted non-cash flows by activity,
cash-account closing with opening derived from the net change. Transfers
between cash accounts never appear as rows; lots collapse to the cash
they moved; each currency reconciles on its own.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from tests.report_helpers import engine, engine_json, write_ledger

BASE = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Bank:Savings USD
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Bank:CD USD
  cash-flow-role: "investing"
2026-01-01 open Liabilities:Card USD
2026-01-01 open Income:Salary USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD
2026-01-05 * "Opening"
  Assets:Bank:Checking  4000.00 USD
  Equity:Opening
2026-01-06 * "Salary"
  Assets:Bank:Checking  3000.00 USD
  Income:Salary        -3000.00 USD
2026-01-10 * "Groceries"
  Liabilities:Card  -78.20 USD
  Expenses:Food       78.20 USD
2026-01-15 * "Transfer to savings"
  Assets:Bank:Checking  -500.00 USD
  Assets:Bank:Savings    500.00 USD
2026-01-18 * "To CD"
  Assets:Bank:CD  200.00 USD
  Assets:Bank:Checking
2026-01-20 * "Buy VTI"
  Assets:Brokerage  10 VTI {100 USD}
  Assets:Bank:Checking  -1000.00 USD
2026-01-25 * "Pay card"
  Assets:Bank:Checking  -78.20 USD
  Liabilities:Card        78.20 USD
"""

FX = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Liabilities:Card USD
2026-01-01 open Expenses:Food USD,EUR
2026-01-01 open Income:Salary USD
2026-02-01 * "Salary"
  Assets:Bank:Checking  3000.00 USD
  Income:Salary        -3000.00 USD
2026-02-10 * "Paris hotel"
  Liabilities:Card  -330.00 USD
  Expenses:Food       300 EUR @ 1.10 USD
2026-02-12 * "Pay card"
  Assets:Bank:Checking  -330.00 USD
  Liabilities:Card        330.00 USD
"""

ROLES = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Mattress USD
  cash-flow-role: "cash"
2026-01-01 open Assets:Weird USD
  cash-flow-role: "Cash"
2026-01-01 open Income:Salary USD
2026-01-05 * "Seed"
  Assets:Bank:Checking  1000.00 USD
  Income:Salary
2026-01-07 * "To mattress"
  Assets:Mattress  50.00 USD
  Assets:Bank:Checking
2026-01-08 * "Weird one"
  Assets:Weird  10.00 USD
  Assets:Bank:Checking
"""


def _cash_flow(ledger: Path, *args: str) -> dict[str, Any]:
    return engine_json(["report", "--file", str(ledger), "--kind", "cash-flow", *args], ledger.parent)["data"]


def test_sections_net_equals_cash_change(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, BASE))
    assert data["conversion"] == "at_cost"
    assert data["row_signs"] == "positive_for_inflow"
    operating = {row["account"]: row["amounts"] for row in data["sections"]["operating"]}
    assert operating == {
        "Expenses:Food": {"USD": "-78.20"},
        "Income:Salary": {"USD": "3000.00"},
    }
    investing = {row["account"]: row["amounts"] for row in data["sections"]["investing"]}
    assert investing == {
        "Assets:Bank:CD": {"USD": "-200.00"},
        "Assets:Brokerage": {"USD": "-1000"},
    }
    assert data["sections"]["financing"] == [
        {"account": "Equity:Opening", "amounts": {"USD": "4000.00"}, "role_source": "heuristic"}
    ]
    assert data["totals"] == {
        "operating": {"USD": "2921.80"},
        "investing": {"USD": "-1200.00"},
        "financing": {"USD": "4000.00"},
    }
    assert data["net_change"] == {"USD": "5721.80"}
    assert data["opening"] == {"USD": "0.00"}
    assert data["closing"] == {"USD": "5721.80"}
    assert [entry["account"] for entry in data["cash_accounts"]] == [
        "Assets:Bank:Checking",
        "Assets:Bank:Savings",
    ]


def test_transfers_between_cash_accounts_never_appear(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, BASE))
    rows = [row["account"] for section in data["sections"].values() for row in section]
    assert "Assets:Bank:Checking" not in rows
    assert "Assets:Bank:Savings" not in rows
    # The card round-trips to zero, so it is not a row either.
    assert "Liabilities:Card" not in rows


def test_multi_currency_reconciles_per_currency(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, FX))
    operating = {row["account"]: row["amounts"] for row in data["sections"]["operating"]}
    assert operating == {
        "Expenses:Food": {"EUR": "-300"},
        "Income:Salary": {"USD": "3000.00"},
    }
    assert data["net_change"] == {"USD": "3000.00", "EUR": "-300"}
    assert data["closing"] == {"USD": "2670.00"}
    assert data["opening"] == {"USD": "-330.00", "EUR": "300"}


def test_empty_period_has_no_rows_and_matching_bottom_lines(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, BASE), "--time", "2025")
    assert data["sections"] == {"operating": [], "investing": [], "financing": []}
    assert data["net_change"] == {}
    assert data["opening"] == data["closing"]


def test_bounds_after_activity_keep_position_without_flows(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, BASE), "--from-date", "2027-01-01")
    assert data["sections"] == {"operating": [], "investing": [], "financing": []}
    assert data["net_change"] == {}
    assert data["closing"] == {"USD": "5721.80"}
    assert data["opening"] == data["closing"]


def test_window_bounds_flows_and_closing(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, BASE), "--from-date", "2026-01-10", "--to-date", "2026-01-15")
    assert data["net_change"] == {"USD": "0.00"}
    assert data["closing"] == {"USD": "7000.00"}
    assert data["opening"] == {"USD": "7000.00"}


def test_declared_roles_win_and_invalid_values_flagged(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, ROLES))
    investing = {row["account"]: row for row in data["sections"]["investing"]}
    assert investing["Assets:Weird"]["role_source"] == "heuristic"
    assert [entry["account"] for entry in data["cash_accounts"]] == [
        "Assets:Bank:Checking",
        "Assets:Mattress",
    ]
    mattress = next(entry for entry in data["cash_accounts"] if entry["account"] == "Assets:Mattress")
    assert mattress["role_source"] == "declared"
    assert "Assets:Mattress" not in {row["account"] for section in data["sections"].values() for row in section}
    assert data["invalid_role_values"] == [{"account": "Assets:Weird", "value": "Cash"}]


def test_declared_investing_pulls_account_out_of_cash(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, BASE))
    cd_row = next(row for row in data["sections"]["investing"] if row["account"] == "Assets:Bank:CD")
    assert cd_row["role_source"] == "declared"
    assert "Assets:Bank:CD" not in [entry["account"] for entry in data["cash_accounts"]]


NOCASH = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Income:Gains USD
2026-01-05 * "Grant"
  Assets:Brokerage  10 VTI {100 USD}
  Income:Gains  -1000 USD
"""

EURCASH = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Bank:Savings EUR
2026-01-01 open Income:Salary USD
2026-01-01 open Expenses:Food USD,EUR
2026-01-01 open Equity:Opening USD,EUR
2026-01-05 * "Opening"
  Assets:Bank:Checking  4000.00 USD
  Assets:Bank:Savings  500 EUR
  Equity:Opening
2026-01-06 * "Salary"
  Assets:Bank:Checking  3000.00 USD
  Income:Salary        -3000.00 USD
2026-01-10 * "Groceries"
  Assets:Bank:Savings  -50 EUR
  Expenses:Food          50 EUR
"""

NESTED = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Cash:Petty USD
2026-01-01 open Income:Salary USD
2026-01-05 * "Seed"
  Assets:Cash:Petty  100.00 USD
  Income:Salary
"""


def test_no_cash_accounts_still_reports_sections(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, NOCASH))
    assert data["cash_accounts"] == []
    assert data["closing"] == {}
    operating = {row["account"]: row["amounts"] for row in data["sections"]["operating"]}
    assert operating == {"Income:Gains": {"USD": "1000"}}
    investing = {row["account"]: row["amounts"] for row in data["sections"]["investing"]}
    assert investing == {"Assets:Brokerage": {"USD": "-1000"}}
    assert data["net_change"] == {"USD": "0"}
    assert data["opening"] == {"USD": "0"}


def test_foreign_cash_stays_in_its_own_units(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, EURCASH))
    operating = {row["account"]: row["amounts"] for row in data["sections"]["operating"]}
    assert operating == {
        "Expenses:Food": {"EUR": "-50"},
        "Income:Salary": {"USD": "3000.00"},
    }
    assert data["net_change"] == {"USD": "7000.00", "EUR": "450"}
    assert data["closing"] == {"USD": "7000.00", "EUR": "450"}
    assert data["opening"] == {"USD": "0.00", "EUR": "0"}


def test_inherited_cash_leaf_is_never_a_row(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, NESTED))
    assert [entry["account"] for entry in data["cash_accounts"]] == ["Assets:Cash", "Assets:Cash:Petty"]
    rows = [row["account"] for section in data["sections"].values() for row in section]
    assert rows == ["Income:Salary"]
    assert data["closing"] == {"USD": "100.00"}
    assert data["net_change"] == {"USD": "100.00"}
    assert data["opening"] == {"USD": "0.00"}


def test_to_date_before_activity_is_empty_with_zero_position(tmp_path: Path) -> None:
    data = _cash_flow(write_ledger(tmp_path, BASE), "--to-date", "2025-12-31")
    assert data["sections"] == {"operating": [], "investing": [], "financing": []}
    assert data["net_change"] == {}
    assert data["closing"] == {}
    assert data["opening"] == {}


def test_malformed_bounds_are_refused(tmp_path: Path) -> None:
    import json

    ledger = write_ledger(tmp_path, BASE)
    proc = engine(
        ["report", "--file", str(ledger), "--kind", "cash-flow", "--from-date", "banana"],
        tmp_path,
    )
    assert proc.returncode == 2
    assert "Invalid --from-date" in json.loads(proc.stdout)["error"]["message"]
    proc = engine(
        [
            "report",
            "--file",
            str(ledger),
            "--kind",
            "cash-flow",
            "--from-date",
            "2026-02-01",
            "--to-date",
            "2026-01-01",
        ],
        tmp_path,
    )
    assert proc.returncode == 2
    assert "is after --to-date" in json.loads(proc.stdout)["error"]["message"]


def test_conversion_is_refused(tmp_path: Path) -> None:
    import json

    proc = engine(
        ["report", "--file", str(write_ledger(tmp_path, BASE)), "--kind", "cash-flow", "--conversion", "USD"],
        tmp_path,
    )
    assert proc.returncode == 2
    refused = json.loads(proc.stdout)
    assert refused["ok"] is False
    assert "takes no --conversion" in refused["error"]["message"]
