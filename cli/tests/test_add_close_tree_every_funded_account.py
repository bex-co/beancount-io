"""`add close` under `close_tree` names every funded account the close takes with it (w1/312).

The refusal stopped at the first funded account: two funded children took two
refused attempts to discover, and a funded parent's advice offered `--force`
to close "it with the balance" while that closed every funded child as well,
their balances never shown.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from tests.test_add_close_drained_uncovered import _bea

LEDGER = """option "operating_currency" "USD"
plugin "beancount.plugins.close_tree"
2025-01-01 open Assets:Bank USD
2025-01-01 open Assets:Bank:Checking USD
2025-01-01 open Assets:Bank:Savings USD
2025-01-01 open Equity:Open USD
2025-01-02 * "Fund"
  Assets:Bank 10 USD
  Assets:Bank:Checking 100 USD
  Assets:Bank:Savings 50 USD
  Equity:Open
"""
EMPTY_PARENT = LEDGER.replace("  Assets:Bank 10 USD\n", "")
LOTS = """option "operating_currency" "USD"
plugin "beancount.plugins.close_tree"
2024-01-01 open Assets:Broker
2024-01-01 open Assets:Broker:Stock HOOL "NONE"
2024-01-01 open Assets:Broker:Cash USD
2024-02-01 * "Long"
  Assets:Broker:Stock 1 HOOL {100 USD}
  Assets:Broker:Cash -100 USD
2024-02-02 * "Short"
  Assets:Broker:Stock -1 HOOL {200 USD}
  Assets:Broker:Cash 200 USD
"""


def _close(
    tmp_path: Path,
    ledger: str,
    *flags: str,
    json_output: bool = True,
    account: str = "Assets:Bank",
    date: str = "2025-03-01",
) -> Any:
    path = tmp_path / "main.bean"
    if not path.exists():
        path.write_text(ledger)
    output = ["--json"] if json_output else []
    return _bea(tmp_path, *output, "-f", str(path), "add", "close", "--date", date, "--account", account, *flags)


def _message(result: Any, *, json_output: bool) -> str:
    text = json.loads(result.stderr)["error"]["message"] if json_output else result.stderr
    return " ".join(str(text).split())


@pytest.mark.parametrize("json_output", [True, False], ids=["json", "text"])
def test_a_funded_parent_names_every_funded_child_it_would_close(tmp_path: Path, json_output: bool) -> None:
    result = _close(tmp_path, LEDGER, json_output=json_output)

    assert result.returncode == 1, result.stdout
    message = _message(result, json_output=json_output)
    assert "Assets:Bank still holds 10 USD" in message
    assert "Assets:Bank:Checking still holds 100 USD" in message
    assert "Assets:Bank:Savings still holds 50 USD" in message
    assert "close_tree plugin closes Assets:Bank:Checking and Assets:Bank:Savings with Assets:Bank" in message
    assert "pass --force to close all three with their balances" in message
    assert "close it with the balance" not in message
    assert message.endswith("Nothing was written.")
    assert (tmp_path / "main.bean").read_text() == LEDGER


def test_an_empty_parent_names_both_funded_children_in_one_refusal(tmp_path: Path) -> None:
    result = _close(tmp_path, EMPTY_PARENT)

    assert result.returncode == 1, result.stdout
    message = _message(result, json_output=True)
    assert "Assets:Bank:Checking still holds 100 USD" in message
    assert "Assets:Bank:Savings still holds 50 USD" in message
    assert "Assets:Bank still holds" not in message
    assert "pass --force to close both with their balances" in message
    assert (tmp_path / "main.bean").read_text() == EMPTY_PARENT


def test_moving_out_every_named_balance_lets_the_next_close_through(tmp_path: Path) -> None:
    refused = _close(tmp_path, EMPTY_PARENT)
    assert refused.returncode == 1, refused.stdout

    # One refusal named both children, so one move clears what the close needs.
    moved = _bea(
        tmp_path, "--json", "-f", str(tmp_path / "main.bean"), "add", "transaction", "Move out",
        "--date", "2025-03-01", "-p", "Assets:Bank:Checking -100 USD", "-p", "Assets:Bank:Savings -50 USD",
        "-p", "Equity:Open 150 USD",
    )  # fmt: skip
    assert moved.returncode == 0, moved.stderr

    closed = _close(tmp_path, EMPTY_PARENT)
    assert closed.returncode == 0, closed.stderr


def test_stranded_lots_and_a_funded_sibling_are_named_together(tmp_path: Path) -> None:
    result = _close(tmp_path, LOTS, account="Assets:Broker", date="2024-02-03")

    assert result.returncode == 1, result.stdout
    message = _message(result, json_output=True)
    assert "Assets:Broker:Cash still holds 100 USD" in message
    assert "Assets:Broker:Stock still holds" in message
    assert "1 HOOL {100 USD, 2024-02-01}" in message and "-1 HOOL {200 USD, 2024-02-02}" in message
    assert "the units cancel but the lots do not" in message and "posting each stranded lot's cost" in message
    assert "pass --force to close both with their balances" in message
    assert (tmp_path / "main.bean").read_text() == LOTS


def test_force_still_closes_the_whole_tree(tmp_path: Path) -> None:
    result = _close(tmp_path, LEDGER, "--force")

    assert result.returncode == 0, result.stderr
    assert (tmp_path / "main.bean").read_text().endswith("2025-03-01 close Assets:Bank\n")
