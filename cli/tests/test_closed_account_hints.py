"""Closed-account hints name the close and the right remedy (w5/773).

`add open` on a closed account said only "an account opens once"; `doctor
missing-open` said to "reopen the account", which Beancount cannot do; and a
duplicate `add close` got upstream's bare message, or blamed the close
already in the file. A funded account closed again got the balance refusal
instead, whose move-out and --force remedies both fail (w1/293).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CLOSED = """2026-01-01 open Assets:Old USD
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD

2026-01-05 * "Fund"
  Assets:Old  100 USD
  Equity:Opening

2026-01-20 * "Move out"
  Assets:Cash  100 USD
  Assets:Old  -100 USD

2026-02-01 close Assets:Old
"""
BROKEN = (
    CLOSED
    + """
2026-03-05 * "Late"
  Assets:Old  5 USD
  Assets:Cash
"""
)


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        cwd=ROOT,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def _flat(result: subprocess.CompletedProcess[str]) -> str:
    return " ".join((result.stdout + result.stderr).split())


def test_missing_open_says_to_move_the_close_later(tmp_path: Path) -> None:
    ledger = tmp_path / "broken.bean"
    ledger.write_text(BROKEN)
    result = _bea(tmp_path, "doctor", "missing-open", str(ledger))

    assert result.returncode == 1, result.stderr
    flat = _flat(result)
    assert "move the open earlier, move the close later, or fix the postings" in flat
    assert "reopen" not in flat


def test_duplicate_open_on_a_closed_account_names_the_close(tmp_path: Path) -> None:
    ledger = tmp_path / "broken.bean"
    ledger.write_text(BROKEN)
    result = _bea(
        tmp_path,
        "-f",
        str(ledger),
        "add",
        "open",
        "--date",
        "2026-03-01",
        "-a",
        "Assets:Old",
        "-c",
        "USD",
        "--allow-errors",
    )

    assert result.returncode == 1, result.stderr
    flat = _flat(result)
    assert "an account opens once" in flat
    assert f"It is closed 2026-02-01 at {ledger}:13; remove that close or date it later" in flat


def test_widening_open_on_a_closed_account_names_the_close(tmp_path: Path) -> None:
    ledger = tmp_path / "broken.bean"
    ledger.write_text(BROKEN)
    result = _bea(
        tmp_path,
        "-f",
        str(ledger),
        "add",
        "open",
        "--date",
        "2026-03-01",
        "-a",
        "Assets:Old",
        "-c",
        "EUR",
        "--allow-errors",
    )

    assert result.returncode == 1, result.stderr
    flat = _flat(result)
    assert "To allow EUR too" in flat
    assert f"It is closed 2026-02-01 at {ledger}:13; remove that close or date it later" in flat


def test_duplicate_close_names_the_existing_close(tmp_path: Path) -> None:
    ledger = tmp_path / "b.bean"
    ledger.write_text(CLOSED)
    later = _bea(tmp_path, "-f", str(ledger), "add", "close", "--date", "2026-03-01", "-a", "Assets:Old")
    earlier = _bea(tmp_path, "-f", str(ledger), "add", "close", "--date", "2026-01-25", "-a", "Assets:Old")

    assert later.returncode == 1, later.stderr
    assert earlier.returncode == 1, earlier.stderr
    assert "Proposed append (not written): Duplicate close directive for Assets:Old" in _flat(later)
    for result, date in ((later, "2026-03-01"), (earlier, "2026-01-25")):
        flat = _flat(result)
        assert f"The proposed close would close Assets:Old on {date}, but it is already closed" in flat
        assert f"2026-02-01 at {ledger}:13; an account closes once" in flat
        assert "edit that close's date" in flat


FUNDED_OPEN = """option "operating_currency" "USD"
2024-01-01 open Assets:Wallet USD
2024-01-01 open Equity:Open

2024-01-02 * "fund"
  Assets:Wallet  20.00 USD
  Equity:Open
"""
FUNDED_CLOSED = FUNDED_OPEN + "\n2024-02-01 close Assets:Wallet\n"
FUNDED_CHILD_CLOSED = """option "operating_currency" "USD"
plugin "beancount.plugins.close_tree"
2024-01-01 open Assets:Wallet USD
2024-01-01 open Assets:Wallet:Coins USD
2024-01-01 open Equity:Open

2024-01-02 * "fund"
  Assets:Wallet:Coins  5.00 USD
  Equity:Open

2024-02-01 close Assets:Wallet
"""


def _no_funded_advice(text: str) -> None:
    assert "still holds" not in text
    assert "Move that balance out" not in text
    assert "--force" not in text


@pytest.mark.parametrize("date", ["2024-03-01", "2024-01-15"])
def test_closing_a_funded_account_again_names_the_close_not_the_balance(tmp_path: Path, date: str) -> None:
    # The balance refusal ran before validation, so it offered a move-out the
    # close refuses and a --force that only reached the duplicate (w1/293).
    ledger = tmp_path / "main.bean"
    ledger.write_text(FUNDED_CLOSED)
    result = _bea(tmp_path, "-f", str(ledger), "add", "close", "--date", date, "-a", "Assets:Wallet")

    assert result.returncode == 1, result.stderr
    flat = _flat(result)
    assert "Duplicate close directive for Assets:Wallet" in flat
    assert f"The proposed close would close Assets:Wallet on {date}, but it is already closed" in flat
    assert f"2024-02-01 at {ledger}:9; an account closes once" in flat
    assert "edit that close's date" in flat
    _no_funded_advice(flat)
    assert ledger.read_text() == FUNDED_CLOSED


@pytest.mark.parametrize("date", ["2024-03-01", "2024-01-15"])
def test_closing_a_funded_account_again_answers_json_with_the_close(tmp_path: Path, date: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(FUNDED_CLOSED)
    result = _bea(tmp_path, "--json", "-f", str(ledger), "add", "close", "--date", date, "-a", "Assets:Wallet")

    assert result.returncode == 1, result.stderr
    error = json.loads(result.stdout or result.stderr)["error"]
    assert error["category"] == "validation"
    details = " ".join(error["details"])
    assert f"The proposed close would close Assets:Wallet on {date}, but it is already closed 2024-02-01" in details
    assert "edit that close's date" in details
    _no_funded_advice(error["message"] + " " + details)
    assert ledger.read_text() == FUNDED_CLOSED


def test_closing_a_parent_again_ignores_the_funded_child_it_would_move(tmp_path: Path) -> None:
    # An earlier second close would move close_tree's close of the funded
    # child earlier too; the duplicate is still the refusal that holds.
    ledger = tmp_path / "main.bean"
    ledger.write_text(FUNDED_CHILD_CLOSED)
    result = _bea(tmp_path, "-f", str(ledger), "add", "close", "--date", "2024-01-15", "-a", "Assets:Wallet")

    assert result.returncode == 1, result.stderr
    flat = _flat(result)
    assert "The proposed close would close Assets:Wallet on 2024-01-15, but it is already closed 2024-02-01" in flat
    _no_funded_advice(flat)
    assert ledger.read_text() == FUNDED_CHILD_CLOSED


def test_a_child_closed_only_by_close_tree_is_still_judged_on_its_balance(tmp_path: Path) -> None:
    # close_tree's generated close is not one the ledger declares: an explicit
    # close replaces it, so the funded child is refused as before and --force
    # writes the close.
    ledger = tmp_path / "main.bean"
    ledger.write_text(FUNDED_CHILD_CLOSED)
    args = ("-f", str(ledger), "add", "close", "--date", "2024-03-01", "-a", "Assets:Wallet:Coins")
    refused = _bea(tmp_path, *args)

    assert refused.returncode == 1, refused.stderr
    assert "Assets:Wallet:Coins still holds 5.00 USD on 2024-03-01" in _flat(refused)
    assert ledger.read_text() == FUNDED_CHILD_CLOSED
    forced = _bea(tmp_path, *args, "--force")
    assert forced.returncode == 0, forced.stderr
    assert ledger.read_text().endswith("2024-03-01 close Assets:Wallet:Coins\n")


def test_a_funded_open_account_keeps_the_move_out_advice(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(FUNDED_OPEN)
    result = _bea(tmp_path, "-f", str(ledger), "add", "close", "--date", "2024-03-01", "-a", "Assets:Wallet")

    assert result.returncode == 1, result.stderr
    flat = _flat(result)
    assert "Assets:Wallet still holds 20.00 USD on 2024-03-01." in flat
    assert "Move that balance out of Assets:Wallet with a transaction dated on or before 2024-03-01" in flat
    assert "or pass --force to close it with the balance" in flat
    assert "Duplicate close" not in flat
    assert ledger.read_text() == FUNDED_OPEN
