"""Pad decisions and reported pad amounts use the book's native units (w5/1075).

The book total added its first 29-digit receipt to zero, rounding it: a
matching assertion with `--pad-from` was refused as an unused pad, and a
needed pad reported 0.87654321098765432 instead of 0.876543210987654322 SHIB.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Wallet SHIB
2024-01-01 open Equity:Opening USD
2024-01-01 open Equity:Adjustments SHIB
2024-01-02 * "Token movement"
  Assets:Wallet 12345678901.123456789012345678 SHIB @ 0 USD
  Equity:Opening 0 USD
2024-01-03 * "Token movement"
  Assets:Wallet -12345678901 SHIB @ 0 USD
  Equity:Opening 0 USD
"""
ARGS = ["add", "balance", "--date", "2024-01-31", "--account", "Assets:Wallet", "--pad-from", "Equity:Adjustments"]


def test_a_matching_assertion_is_written_without_a_pad(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)

    added = _bea(tmp_path, *ARGS, "--amount", "0.123456789012345678 SHIB")

    assert added.returncode == 0, added.stderr
    text = (tmp_path / "main.bean").read_text()
    assert "balance Assets:Wallet" in text and " pad " not in text


def test_a_needed_pad_reports_the_native_adjustment(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)

    added = _bea(tmp_path, *ARGS, "--amount", "1 SHIB")

    assert added.returncode == 0, added.stderr
    pad = json.loads(added.stdout)["data"]["pad"]
    assert pad["amount"]["number"] == "0.876543210987654322"
