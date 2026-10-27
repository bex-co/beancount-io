"""A refused `--allow-errors` write reports the ledger's errors as they stand (w5/1058).

The tolerated errors were read from the rejected proposal: a backdated payment
that would have moved a failing assertion made the warning vanish, or report
the proposal's 92 USD, while the unchanged books still hold 100 USD.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-01 * "Capital"
  Assets:Cash 100 USD
  Equity:Opening -100 USD
2026-01-20 balance Assets:Cash 80 USD
"""


@pytest.mark.parametrize("amount", ["20", "8"], ids=["resolves-it", "moves-it"])
@pytest.mark.parametrize("command", ["add", "bulk"])
def test_the_refusal_names_the_unchanged_assertion(tmp_path: Path, amount: str, command: str) -> None:
    args = {
        "add": [
            "add",
            "transaction",
            "X",
            "--date",
            "2026-01-10",
            "-p",
            f"Expenses:Nope {amount} USD",
            "-p",
            "Assets:Cash",
        ],
        "bulk": ["add", "transactions", "--from", "rows.json"],
    }[command]
    rows = [
        {
            "date": "2026-01-10",
            "narration": "X",
            "postings": [{"account": "Expenses:Nope", "amount": f"{amount} USD"}, {"account": "Assets:Cash"}],
        }
    ]

    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "rows.json").write_text(json.dumps(rows))
    result = _bea(tmp_path, *args, "--allow-errors")

    assert result.returncode == 1, result.stderr
    error = json.loads(result.stderr)["error"]
    warnings = " ".join(error.get("ledger_warnings") or [])
    assert "Balance failed for 'Assets:Cash'" in warnings and "100 USD" in warnings, error
    assert "92 USD" not in warnings
