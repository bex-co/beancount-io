"""Bulk amount shorthand accepts partial lot selectors, like `--posting` does (w5/063).

`{USD}`, `{2026-01-02}` and `{}` select an existing lot without restating its
cost. The shorthand refused all three as "incomplete cost", though single-add
and structured bulk input take the same selectors.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Stock HOOL
2026-01-01 open Income:Gain USD
2026-01-02 * "buy"
  Assets:Stock 10 HOOL {10 USD, 2026-01-02, "first"}
  Assets:Cash -100 USD
"""

SELECTORS = [
    ("{USD}", {"number": None, "currency": "USD", "date": None, "label": None}),
    ("{2026-01-02}", {"number": None, "currency": None, "date": "2026-01-02", "label": None}),
    ("{}", {"number": None, "currency": None, "date": None, "label": None}),
    ('{"first"}', {"number": None, "currency": None, "date": None, "label": "first"}),
    ('{USD, 2026-01-02, "first"}', {"number": None, "currency": "USD", "date": "2026-01-02", "label": "first"}),
    ("{10 USD}", {"number": "10", "currency": "USD", "date": None, "label": None}),
]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _sell(tmp_path: Path, stock: dict[str, object]) -> tuple[subprocess.CompletedProcess[str], Path]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    rows = tmp_path / "sale.json"
    row = {
        "date": "2026-01-03",
        "narration": "sale",
        "postings": [
            {"account": "Assets:Stock", **stock},
            {"account": "Assets:Cash", "amount": "60 USD"},
            {"account": "Income:Gain", "amount": "-20 USD"},
        ],
    }
    rows.write_text(json.dumps([row]), encoding="utf-8")
    return _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows)), ledger


def _appended(ledger: Path) -> str:
    return ledger.read_text(encoding="utf-8")[len(LEDGER) :]


@pytest.mark.parametrize(("selector", "cost"), SELECTORS, ids=[selector for selector, _ in SELECTORS])
def test_shorthand_selector_sells_from_the_existing_lot(tmp_path: Path, selector: str, cost: dict[str, object]) -> None:
    result, ledger = _sell(tmp_path, {"amount": f"-4 HOOL {selector} @ 15 USD"})

    assert result.returncode == 0, result.stderr or result.stdout
    shorthand = _appended(ledger)
    assert shorthand.count('* "sale"') == 1
    assert f"-4 HOOL {selector} @ 15 USD" in shorthand

    check = _bea(tmp_path, "--json", "--file", str(ledger), "check")
    assert check.returncode == 0, check.stderr or check.stdout
    held = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT sum(number) WHERE account='Assets:Stock'")
    assert held.returncode == 0, held.stderr or held.stdout
    assert json.loads(held.stdout)["data"]["rows"] == [["6"]]

    # The structured spelling of the same constraint writes the same text.
    structured, ledger = _sell(
        tmp_path,
        {
            "units": {"number": "-4", "currency": "HOOL"},
            "cost": {key: value for key, value in cost.items() if value is not None},
            "price": {"number": "15", "currency": "USD"},
        },
    )
    assert structured.returncode == 0, structured.stderr or structured.stdout
    assert _appended(ledger) == shorthand


@pytest.mark.parametrize(
    ("fragment", "reason"),
    [
        ("-4 HOOL {{40 USD}}", "total cost"),
        ("-4 HOOL {*}", "Cost merging is not supported"),
        ("-4 HOOL {10 USD", "Could not parse amount"),
    ],
    ids=["total-cost", "merge", "malformed"],
)
def test_fragments_the_shorthand_cannot_express_are_still_refused(tmp_path: Path, fragment: str, reason: str) -> None:
    result, ledger = _sell(tmp_path, {"amount": fragment})

    assert result.returncode == 1, result.stderr or result.stdout
    error = json.loads(result.stderr)["error"]
    assert error["result"]["rejected_rows"] == [0]
    assert any("Row 1, postings.0" in detail and reason in detail for detail in error["details"])
    assert _appended(ledger) == ""
