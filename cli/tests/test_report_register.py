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


def _trial_total(ledger: Path, account: str) -> dict[str, str]:
    data = _engine(ledger, "trial-balance", "--account", account)

    def find(node: dict[str, Any]) -> dict[str, Any] | None:
        if node["account"] == account:
            return node
        for child in node["children"]:
            found = find(child)
            if found is not None:
                return found
        return None

    node = find(data["assets"])
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
    assert rows[2]["amount"] == {"number": "2920", "currency": "USD"}
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
    ]


def test_register_carries_lot_cost(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "register", "--account", "Assets:Brokerage")
    (row,) = data["rows"]
    assert row["amount"] == {"number": "10", "currency": "VTI"}
    assert row["cost"] == {"number": "150", "currency": "USD", "date": "2026-01-05"}
    assert row["balance"] == {"USD": "1700"}


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
    assert len(data["rows"]) == 5


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
