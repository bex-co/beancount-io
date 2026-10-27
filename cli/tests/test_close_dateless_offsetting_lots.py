"""Stranded-lot advice handles a lot with no date (w5/1024).

Inferred quantities book their lots without a date, and the advice that names
offsetting lots called `.isoformat()` on it: `add close` crashed with an
AttributeError instead of refusing, and a closing statement's import preview
and apply failed, blocking the refund it carried.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_funded_close_warning import IMPORTER
from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Stock HOOL "NONE"
2024-01-01 open Equity:Opening USD
2024-01-01 open Income:Refund USD
2024-01-01 * "Capital"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
2024-01-02 * "Long"
  Assets:Stock HOOL {{5 USD}}
  Assets:Cash -10 USD
2024-01-03 * "Short"
  Assets:Stock {short}HOOL {{10 USD}}
  Assets:Cash 20 USD
"""
STATEMENT = """2024-01-04 close Assets:Stock
2024-01-04 * "Refund"
  bank_id: "refund-001"
  Assets:Cash 4.50 USD
  Income:Refund -4.50 USD
"""


@pytest.mark.parametrize("short", ["", "-2 "], ids=["inferred", "mixed"])
def test_a_direct_close_names_the_dateless_lots(tmp_path: Path, short: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER.format(short=short))
    before = (tmp_path / "main.bean").read_bytes()

    refused = _bea(tmp_path, "add", "close", "--account", "Assets:Stock", "--date", "2024-01-04")

    assert refused.returncode == 1, refused.stdout
    message = " ".join(json.loads(refused.stderr)["error"]["message"].split())
    assert "AttributeError" not in message
    assert "2 HOOL {5 USD}" in message and "-2 HOOL {10 USD" in message and "--force" in message
    assert (tmp_path / "main.bean").read_bytes() == before
    forced = _bea(tmp_path, "add", "close", "--account", "Assets:Stock", "--date", "2024-01-04", "--force")
    assert forced.returncode == 0, forced.stderr


def test_a_closing_statement_with_dateless_lots_imports_its_refund(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER.format(short=""))
    (tmp_path / "importers.py").write_text(IMPORTER.replace("{text!r}", repr(STATEMENT)))
    (tmp_path / "bank.txt").write_text("synthetic\n")
    run = ["import", "bank.txt", "--config", "importers.py"]

    preview = _bea(tmp_path, *run)
    assert preview.returncode == 0, preview.stderr
    (warning,) = json.loads(preview.stdout)["data"]["validation_warnings"]
    assert "Assets:Stock" in warning and "2 HOOL {5 USD}" in warning

    applied = _bea(tmp_path, *run, "--apply")
    assert applied.returncode == 0, applied.stderr
    cash = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Cash'")
    assert json.loads(cash.stdout)["data"]["rows"] == [["114.50"]]
    assert json.loads(_bea(tmp_path, *run, "--apply").stdout)["data"]["written"] == 0
