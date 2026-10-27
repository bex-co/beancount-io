"""Funded-close checks read wide token balances as Beancount holds them (w5/1073).

The fold added the first 29-digit receipt to zero, rounding it: a wallet a
whole and a fractional return emptied read as +2e-18 SHIB and its close was
refused, while one genuinely holding -2e-18 SHIB read as empty and closed.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Wallet SHIB
2024-01-01 open Equity:Opening USD
2024-01-02 * "Receive"
  Assets:Wallet 12345678901.123456789012345678 SHIB @ 0 USD
  Equity:Opening 0 USD
2024-01-03 * "Return whole"
  Assets:Wallet -12345678901 SHIB @ 0 USD
  Equity:Opening 0 USD
2024-01-04 * "Return fraction"
  Assets:Wallet -{fraction} SHIB @ 0 USD
  Equity:Opening 0 USD
"""


@pytest.mark.parametrize(
    ("fraction", "funded"), [("0.123456789012345678", False), ("0.123456789012345680", True)], ids=["empty", "short"]
)
def test_the_close_follows_the_native_balance(tmp_path: Path, fraction: str, funded: bool) -> None:
    (tmp_path / "main.bean").write_text(LEDGER.format(fraction=fraction))

    result = _bea(tmp_path, "add", "close", "--account", "Assets:Wallet", "--date", "2024-01-31")

    if funded:
        assert result.returncode == 1, result.stdout
        assert "0.000000000000000002" in json.loads(result.stderr)["error"]["message"]
    else:
        assert result.returncode == 0, result.stderr
