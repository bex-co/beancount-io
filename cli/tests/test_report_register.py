"""`bea-engine report --kind register`: dated postings with a running balance (w22/m3/t002).

The `--account` pattern selects one account subtree; its postings (plus
balance assertions, which move nothing) come oldest first with the running
balance converted through the same call the statement trees use, so the
last row is the trial-balance total.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

CLI_ROOT = Path(__file__).resolve().parents[1]

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Expenses:Food USD
2026-01-01 open Income:Salary USD
2026-01-02 * "Employer" "Payday"
  Assets:Checking  3000 USD
  Income:Salary
2026-01-03 * "Grocer" "Weekly shop"
  Expenses:Food  80 USD
  Assets:Checking
2026-01-04 balance Assets:Checking 2920 USD
2026-01-05 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
2026-01-05 price VTI 150 USD
2026-01-10 price VTI 170 USD
"""

NOPRICE = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
"""


def _engine(ledger: Path, kind: str, *args: str) -> dict[str, Any]:
    proc = subprocess.run(
        [
            "uv",
            "run",
            "--quiet",
            "--project",
            str(CLI_ROOT),
            "--no-sync",
            "python",
            "-m",
            "bea_engine",
            "report",
            "--file",
            str(ledger),
            "--kind",
            kind,
            *args,
        ],
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src")},
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert payload["ok"] is True, payload
    return payload["data"]


def _engine_raw(ledger: Path, kind: str, *args: str) -> tuple[int, dict[str, Any]]:
    proc = subprocess.run(
        [
            "uv",
            "run",
            "--quiet",
            "--project",
            str(CLI_ROOT),
            "--no-sync",
            "python",
            "-m",
            "bea_engine",
            "report",
            "--file",
            str(ledger),
            "--kind",
            kind,
            *args,
        ],
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src")},
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )
    return proc.returncode, json.loads(proc.stdout)


def _write(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.beancount"
    ledger.write_text(text)
    return ledger


def _trial_total(ledger: Path, account: str, *args: str, section: str = "assets") -> dict[str, str]:
    data = _engine(ledger, "trial-balance", "--account", account, *args)

    def find(node: dict[str, Any]) -> dict[str, Any] | None:
        if node["account"] == account:
            return node
        for child in node["children"]:
            found = find(child)
            if found is not None:
                return found
        return None

    node = find(data[section])
    assert node is not None
    return node["balance_children"]


def test_register_running_balance(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "Assets:Checking")
    assert data["account"] == "Assets:Checking"
    assert data["valuation"] == "complete"
    rows = data["rows"]
    assert [(row["date"], row["entry"], row["balance"]) for row in rows] == [
        ("2026-01-02", "transaction", {"USD": "3000"}),
        ("2026-01-03", "transaction", {"USD": "2920"}),
        ("2026-01-04", "balance", {"USD": "2920"}),
        ("2026-01-05", "transaction", {"USD": "1420"}),
    ]
    assert rows[0]["payee"] == "Employer"
    assert rows[0]["narration"] == "Payday"
    assert rows[0]["amount"] == {"number": "3000", "currency": "USD"}
    assert rows[1]["amount"] == {"number": "-80", "currency": "USD"}
    # The assertion moves nothing: its figure is `asserted`, not `amount` (w1/289).
    assert rows[2]["amount"] is None
    assert rows[2]["asserted"] == {"number": "2920", "currency": "USD"}
    assert rows[2]["difference"] is None
    assert all(row["cost"] is None for row in rows)


def test_register_last_balance_is_trial_balance_total(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    for account in ("Assets:Checking", "Assets"):
        data = _engine(ledger, "register", "--account", account)
        assert data["rows"][-1]["balance"] == _trial_total(ledger, account)


def test_register_parent_lists_the_subtree(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "Assets")
    assert data["account"] == "Assets"
    assert [(row["account"], row["date"]) for row in data["rows"]] == [
        ("Assets:Checking", "2026-01-02"),
        ("Assets:Checking", "2026-01-03"),
        ("Assets:Checking", "2026-01-04"),
        ("Assets:Brokerage", "2026-01-05"),
        ("Assets:Checking", "2026-01-05"),
        # The 01-10 quote moves the value after the last posting (w1/252).
        ("Assets", "2026-01-10"),
    ]


def test_register_carries_lot_cost(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "Assets:Brokerage")
    row, closing = data["rows"]
    assert row["amount"] == {"number": "10", "currency": "VTI"}
    assert row["cost"] == {"number": "150", "currency": "USD", "date": "2026-01-05"}
    assert row["balance"] == {"USD": "1500"}
    assert closing["entry"] == "closing"
    assert closing["balance"] == {"USD": "1700"}


def test_register_needs_account(tmp_path: Path) -> None:
    code, payload = _engine_raw(_write(tmp_path, LEDGER), "register")
    assert code == 2
    assert payload["error"]["message"].startswith("Register needs --account.")


def test_register_refuses_several_accounts(tmp_path: Path) -> None:
    code, payload = _engine_raw(_write(tmp_path, LEDGER), "register", "--account", "Assets:.*")
    assert code == 2
    assert payload["error"]["message"] == (
        "Register needs one account; 'Assets:.*' matches several: Assets:Brokerage, Assets:Checking. "
        "Name one account to list."
    )


def test_register_empty_pattern_answers_empty(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "Nope:.*")
    assert data["account"] is None
    assert data["rows"] == []
    assert data["valuation"] == "complete"


def test_register_time_filter_narrows_rows(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "Assets:Checking", "--time", "2026-01-02")
    assert [(row["date"], row["balance"]) for row in data["rows"]] == [
        ("2026-01-02", {"USD": "3000"}),
    ]


def test_register_at_cost_runs_on_book_value(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "Assets:Brokerage", "--conversion", "at_cost")
    (row,) = data["rows"]
    assert row["balance"] == {"USD": "1500"}
    assert data["valuation"] == "complete"


def test_register_parent_pattern_is_case_insensitive(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "assets")
    assert data["account"] == "Assets"
    assert len(data["rows"]) == 6


def test_register_single_match_regex_resolves(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "Check.*")
    assert data["account"] == "Assets:Checking"
    assert len(data["rows"]) == 4


def test_register_missing_prices_fail_strict(tmp_path: Path) -> None:
    ledger = _write(tmp_path, NOPRICE)
    code, payload = _engine_raw(ledger, "register", "--account", "Assets:Brokerage")
    assert code == 1
    assert payload["error"]["result"]["missing_prices"] == [{"from": "VTI", "to": "USD"}]
    data = _engine(ledger, "register", "--account", "Assets:Brokerage", "--allow-errors")
    assert data["valuation"] == "partial"
    assert data["rows"][-1]["balance"] == {"VTI": "10"}


# Two buys at 100 USD; the quote doubles after the last one (w1/252).
REVALUED = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Broker
2026-01-01 open Assets:Cash USD
2026-01-01 price STK 100 USD
2026-03-01 price STK 200 USD
2026-01-05 * "buy one"
  Assets:Broker  1 STK {100 USD}
  Assets:Cash  -100 USD
2026-02-05 * "buy another"
  Assets:Broker  1 STK {100 USD}
  Assets:Cash  -100 USD
"""


def test_register_values_each_row_at_its_own_date(tmp_path: Path) -> None:
    ledger = _write(tmp_path, REVALUED)
    data = _engine(ledger, "register", "--account", "Assets:Broker", "--conversion", "USD")
    assert data["valuation"] == "complete"
    assert [(row["date"], row["entry"], row["balance"]) for row in data["rows"]] == [
        ("2026-01-05", "transaction", {"USD": "100"}),
        ("2026-02-05", "transaction", {"USD": "200"}),
        ("2026-03-01", "closing", {"USD": "400"}),
    ]
    closing = data["rows"][-1]
    assert (closing["account"], closing["amount"], closing["cost"]) == ("Assets:Broker", None, None)
    assert closing["balance"] == _trial_total(ledger, "Assets:Broker")
    # The window does not change a row's value.
    january = _engine(ledger, "register", "--account", "Assets:Broker", "--conversion", "USD", "--time", "2026-01")
    assert [(row["date"], row["balance"]) for row in january["rows"]] == [("2026-01-05", {"USD": "100"})]


def test_register_has_no_closing_row_without_a_market_conversion(tmp_path: Path) -> None:
    ledger = _write(tmp_path, REVALUED)
    for conversion in ("units", "at_cost"):
        data = _engine(ledger, "register", "--account", "Assets:Broker", "--conversion", conversion)
        assert [row["entry"] for row in data["rows"]] == ["transaction", "transaction"]


def test_register_row_before_the_first_quote_is_missing_at_its_own_date(tmp_path: Path) -> None:
    ledger = _write(tmp_path, REVALUED.replace("2026-01-01 price STK 100 USD\n", ""))
    code, payload = _engine_raw(ledger, "register", "--account", "Assets:Broker", "--conversion", "USD")
    assert code == 1
    assert payload["error"]["result"]["missing_price_dates"] == [
        {"from": "STK", "to": "USD", "date": "2026-01-05"},
        {"from": "STK", "to": "USD", "date": "2026-02-05"},
    ]
    data = _engine(ledger, "register", "--account", "Assets:Broker", "--conversion", "USD", "--allow-errors")
    assert [row["balance"] for row in data["rows"]] == [{"STK": "1"}, {"STK": "2"}, {"USD": "400"}]


# Two 100 EUR trips at 1.00 and 2.00 USD, then a 3.00 quote after the last
# posting (w1/337, the w1/m49 repro).
TRIPS = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Euro EUR
2026-01-01 open Expenses:Travel EUR
2026-01-01 open Equity:Opening EUR
2026-01-01 price EUR 1.00 USD
2026-01-02 * "Opening"
  Assets:Euro  1000.00 EUR
  Equity:Opening
2026-01-15 * "Trip one"
  Expenses:Travel  100.00 EUR
  Assets:Euro
2026-02-01 price EUR 2.00 USD
2026-02-15 * "Trip two"
  Expenses:Travel  100.00 EUR
  Assets:Euro
2026-03-01 price EUR 3.00 USD
"""


def test_register_values_an_expense_on_its_own_date(tmp_path: Path) -> None:
    # A flow is worth what it was when it happened: the running balance is
    # the sum of each posting's own-date value, never revalued by a later
    # quote, so it needs no closing row and ends at the trial balance (w1/337).
    ledger = _write(tmp_path, TRIPS)
    for account in ("Expenses:Travel", "Expenses"):
        data = _engine(ledger, "register", "--account", account)
        assert data["valuation"] == "complete"
        assert [(row["date"], row["entry"], row["balance"]) for row in data["rows"]] == [
            ("2026-01-15", "transaction", {"USD": "100.0000"}),
            ("2026-02-15", "transaction", {"USD": "300.0000"}),
        ]
        assert data["rows"][-1]["balance"] == _trial_total(ledger, account, section="expenses")


def test_register_expense_window_ends_at_the_window_total(tmp_path: Path) -> None:
    ledger = _write(tmp_path, TRIPS)
    window = ("--time", "2026-02 - 2026-03")
    data = _engine(ledger, "register", "--account", "Expenses:Travel", *window)
    assert [(row["date"], row["entry"], row["balance"]) for row in data["rows"]] == [
        ("2026-02-15", "transaction", {"USD": "200.0000"}),
    ]
    assert data["rows"][-1]["balance"] == _trial_total(ledger, "Expenses:Travel", *window, section="expenses")


def test_register_expense_with_no_quote_on_its_day_stays_in_units(tmp_path: Path) -> None:
    # A posting before its commodity's first quote stays in that commodity,
    # missing on its own date only, and a later quote does not value it.
    ledger = _write(tmp_path, TRIPS.replace("2026-01-01 price EUR 1.00 USD\n", ""))
    code, payload = _engine_raw(ledger, "register", "--account", "Expenses:Travel")
    assert code == 1
    assert payload["error"]["result"]["missing_price_dates"] == [{"from": "EUR", "to": "USD", "date": "2026-01-15"}]
    data = _engine(ledger, "register", "--account", "Expenses:Travel", "--allow-errors")
    assert data["valuation"] == "partial"
    assert [row["balance"] for row in data["rows"]] == [
        {"EUR": "100.00"},
        {"EUR": "100.00", "USD": "200.0000"},
    ]
    assert data["rows"][-1]["balance"] == _trial_total(ledger, "Expenses:Travel", "--allow-errors", section="expenses")


def test_register_expense_in_units_and_at_cost_keeps_its_units(tmp_path: Path) -> None:
    ledger = _write(tmp_path, TRIPS)
    for conversion in ("units", "at_cost"):
        data = _engine(ledger, "register", "--account", "Expenses:Travel", "--conversion", conversion)
        assert [row["balance"] for row in data["rows"]] == [{"EUR": "100.00"}, {"EUR": "200.00"}]


def test_register_asset_beside_a_flow_keeps_its_closing_row(tmp_path: Path) -> None:
    ledger = _write(tmp_path, TRIPS)
    data = _engine(ledger, "register", "--account", "Assets:Euro")
    assert [(row["date"], row["entry"], row["balance"]) for row in data["rows"]] == [
        ("2026-01-02", "transaction", {"USD": "1000.0000"}),
        ("2026-01-15", "transaction", {"USD": "900.0000"}),
        ("2026-02-15", "transaction", {"USD": "1600.0000"}),
        ("2026-03-01", "closing", {"USD": "2400.0000"}),
    ]
    assert data["rows"][-1]["balance"] == _trial_total(ledger, "Assets:Euro")
