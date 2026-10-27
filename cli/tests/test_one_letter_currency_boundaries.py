"""A one-letter currency keeps the space Beancount needs before `,` or `}` (w5/1019).

Beancount's lexer reads `X,` and `X}` as one invalid token. The shared printer
wrote `{5 X, 2024-01-02, "A"}`, `{5 X}` and `open … X,USD`, so valid adds and
imports were refused and `PRINT` exported ledgers that failed `check`.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea
from tests.test_price_export_plugin_siblings import _bea as _bea_plain

BASE = """option "operating_currency" "USD"
2024-01-01 commodity X
2024-01-01 commodity Q
2024-01-01 open Assets:Broker HOOL
2024-01-01 open Assets:Cash X,Q,XX
2024-01-01 open Equity:Opening X,Q,XX
2024-01-01 * "Capital"
  Assets:Cash 100 X
  Assets:Cash 100 Q
  Assets:Cash 100 XX
  Equity:Opening -100 X
  Equity:Opening -100 Q
  Equity:Opening -100 XX
""".replace("X,Q,XX", "X , Q , XX")


@pytest.mark.parametrize("currency", ["X", "Q", "XX"])
@pytest.mark.parametrize("cost", ['{{5 {c} , 2024-01-02, "A"}}', "{{5 {c} }}"], ids=["dated", "simple"])
def test_a_cost_in_a_one_letter_currency_is_added_and_exported(tmp_path: Path, currency: str, cost: str) -> None:
    (tmp_path / "main.bean").write_text(BASE)
    lot = cost.format(c=currency)

    added = _bea(
        tmp_path,
        "add",
        "transaction",
        "--date",
        "2024-01-02",
        "--narration",
        "Buy",
        "--posting",
        f"Assets:Broker 2 HOOL {lot}",
        "--posting",
        f"Assets:Cash -10 {currency}",
    )

    assert added.returncode == 0, added.stderr
    assert _bea(tmp_path, "check").returncode == 0
    out = tmp_path / "out.bean"
    exported = _bea_plain(
        tmp_path, "--file", str(tmp_path / "main.bean"), "query", "PRINT", "-f", "beancount", "-o", str(out)
    )
    assert exported.returncode == 0, exported.stderr
    assert _bea_plain(tmp_path, "--file", str(out), "check").returncode == 0
    held = _bea_plain(
        tmp_path,
        "--json",
        "--file",
        str(out),
        "query",
        "SELECT cost_number, cost_currency WHERE account = 'Assets:Broker'",
    )
    assert json.loads(held.stdout)["data"]["rows"] == [["5", currency]]


@pytest.mark.parametrize("currencies", [["X", "USD"], ["X", "Q"], ["USD", "X"], ["XX", "USD"]])
def test_an_open_listing_a_one_letter_currency_first_is_written(tmp_path: Path, currencies: list[str]) -> None:
    (tmp_path / "main.bean").write_text(BASE)
    flags = [arg for currency in currencies for arg in ("--currency", currency)]

    added = _bea(tmp_path, "add", "open", "--date", "2024-01-01", "--account", "Assets:Reserve", *flags)

    assert added.returncode == 0, added.stderr
    assert _bea(tmp_path, "check").returncode == 0
    listed = _bea(tmp_path, "list", "open", "--account", "Assets:Reserve")
    (opening,) = json.loads(listed.stdout)["data"]
    assert opening["currencies"] == currencies
