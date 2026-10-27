"""The currency advice works when the amount column is named after the currency (w5/1021).

An amount column `EUR` holding `-€12.50` on a USD/EUR account is refused as
USD, with the advice `--csv currency=EUR`. Following it read the amount column
as the currency column and failed with "'-€12.50' is not one commodity".
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD,EUR,INR
2024-01-01 open Expenses:Food
"""


@pytest.mark.parametrize(("symbol", "code"), [("€", "EUR"), ("₹", "INR")])
def test_following_the_currency_advice_books_the_real_currency(tmp_path: Path, symbol: str, code: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "bank.csv").write_text(f"Date,Description,{code}\n2024-02-01,Coffee,-{symbol}12.50\n", encoding="utf-8")
    mapping = f"date=Date,narration=Description,amount={code}"
    run = ["import", "bank.csv", "--account", "Assets:Bank", "--default-account", "Expenses:Food"]

    refused = _bea(tmp_path, *run, "--csv", mapping)
    message = json.loads(refused.stderr)["error"]["message"]
    assert refused.returncode == 2
    assert f"--csv currency={code}" in message

    followed = _bea(tmp_path, *run, "--csv", f"{mapping},currency={code}", "--apply")
    assert followed.returncode == 0, followed.stderr
    assert f"Assets:Bank    -12.50 {code}" in (tmp_path / "main.bean").read_text()
    assert _bea(tmp_path, "check").returncode == 0
    repeat = _bea(tmp_path, *run, "--csv", f"{mapping},currency={code}", "--apply")
    assert json.loads(repeat.stdout)["data"]["written"] == 0


def test_a_real_currency_column_is_still_read_as_a_column(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "bank.csv").write_text("Date,Description,Amount,EUR\n2024-02-01,Coffee,-12.50,INR\n")

    applied = _bea(
        tmp_path,
        "import",
        "bank.csv",
        "--account",
        "Assets:Bank",
        "--default-account",
        "Expenses:Food",
        "--csv",
        "date=Date,narration=Description,amount=Amount,currency=EUR",
        "--apply",
    )

    assert applied.returncode == 0, applied.stderr
    assert "Assets:Bank    -12.50 INR" in (tmp_path / "main.bean").read_text()
