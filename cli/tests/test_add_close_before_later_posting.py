"""`add close` dated before a later posting names that posting, not the balance (w1/338).

The funded-close refusal ran first, so an account still holding money on the
close date was told to move it out with a transaction dated on or before the
close, or to pass --force. Both failed: --force reached the later posting as an
inactive-account reference, and the move-out booked the transfer twice while
the close stayed refused. The later posting is the fact that matters, and
validation already dates the close past it (w5/772).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from tests.test_add_close_drained_uncovered import _bea

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Old USD
2026-01-01 open Assets:New USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Fund"
  Assets:Old 100.00 USD
  Equity:Opening
2026-03-01 * "Move"
  Assets:Old -100.00 USD
  Assets:New
"""
TREE = """option "operating_currency" "USD"
plugin "beancount.plugins.close_tree"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Bank:Old USD
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:New USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Fund"
  Assets:Bank:Old 100.00 USD
  Assets:Bank:Checking 50.00 USD
  Equity:Opening
2026-03-01 * "Move"
  Assets:Bank:Old -100.00 USD
  Assets:New
"""


def _close(tmp_path: Path, ledger: str, account: str, date: str, *, json_output: bool) -> tuple[Any, str]:
    path = tmp_path / "main.bean"
    path.write_text(ledger)
    output = ["--json"] if json_output else []
    result = _bea(tmp_path, *output, "-f", str(path), "add", "close", "--date", date, "--account", account)
    if json_output:
        error = json.loads(result.stdout or result.stderr)["error"]
        assert error["category"] == "validation"
        text = " ".join([error["message"], *error.get("details", [])])
    else:
        text = result.stderr
    return result, " ".join(text.split())


def _no_funded_advice(text: str) -> None:
    assert "still holds" not in text
    assert "on or before" not in text
    assert "--force" not in text


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
def test_a_close_before_a_later_posting_names_the_posting_and_the_date_it_needs(
    tmp_path: Path, json_output: bool
) -> None:
    result, message = _close(tmp_path, LEDGER, "Assets:Old", "2026-02-28", json_output=json_output)

    assert result.returncode == 1, result.stdout
    path = tmp_path / "main.bean"
    assert f"{path}:8: Invalid reference to inactive account 'Assets:Old'" in message
    assert "The proposed close would close Assets:Old on 2026-02-28; date it on or after 2026-03-01." in message
    assert "correct the proposed close date" in message
    _no_funded_advice(message)
    assert path.read_text() == LEDGER


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
def test_a_close_tree_parent_names_the_descendant_posting_after_it(tmp_path: Path, json_output: bool) -> None:
    # Assets:Bank:Checking is funded with nothing after the close, but the
    # close date itself is what fails: its balance on 2026-02-28 is not the
    # one a close on or after 2026-03-01 would have to move.
    result, message = _close(tmp_path, TREE, "Assets:Bank", "2026-02-28", json_output=json_output)

    assert result.returncode == 1, result.stdout
    path = tmp_path / "main.bean"
    assert f"{path}:12: Invalid reference to inactive account 'Assets:Bank:Old'" in message
    assert (
        "The proposed close would close Assets:Bank on 2026-02-28, and plugin beancount.plugins.close_tree "
        "closes Assets:Bank:Old with it; date that close on or after 2026-03-01."
    ) in message
    assert "correct the proposed close date" in message
    assert "change the ledger lines that plugin reads" not in message
    _no_funded_advice(message)
    assert path.read_text() == TREE


def test_a_close_tree_parent_dated_past_the_posting_still_names_the_funded_descendant(tmp_path: Path) -> None:
    result, message = _close(tmp_path, TREE, "Assets:Bank", "2026-03-01", json_output=False)

    assert result.returncode == 1, result.stdout
    assert "Assets:Bank:Checking still holds 50.00 USD on 2026-03-01" in message
    assert "Assets:Bank:Old" not in message
    assert (tmp_path / "main.bean").read_text() == TREE


@pytest.mark.parametrize(
    "later",
    [
        '2026-03-05 note Assets:Old "Statement closed"\n',
        "2026-03-05 balance Assets:Old 100.00 USD\n",
    ],
    ids=["note", "balance"],
)
def test_a_directive_allowed_after_a_close_keeps_the_funded_refusal(tmp_path: Path, later: str) -> None:
    # Validation lets a note or a balance follow a close, so the money still
    # held on the close date is the one thing standing in the way.
    ledger = LEDGER.replace('2026-03-01 * "Move"\n  Assets:Old -100.00 USD\n  Assets:New\n', later)
    result, message = _close(tmp_path, ledger, "Assets:Old", "2026-02-28", json_output=False)

    assert result.returncode == 1, result.stdout
    assert "Assets:Old still holds 100.00 USD on 2026-02-28" in message
    assert "pass --force to close it with the balance" in message
    assert (tmp_path / "main.bean").read_text() == ledger


def test_a_close_dated_on_the_later_posting_writes(tmp_path: Path) -> None:
    result, _ = _close(tmp_path, LEDGER, "Assets:Old", "2026-03-01", json_output=False)

    assert result.returncode == 0, result.stderr
    assert (tmp_path / "main.bean").read_text() == LEDGER + "\n2026-03-01 close Assets:Old\n"
