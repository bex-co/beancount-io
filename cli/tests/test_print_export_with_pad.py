"""A `PRINT -f beancount` export of a ledger with a pad passes `bea check` (w5/085).

The export carried both the `pad` directive and the padding transaction
Beancount synthesized from it, so the reloaded file reported the pad unused.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

PADDED = """\
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Open
2024-01-09 pad Assets:Cash Equity:Open
2024-01-10 balance Assets:Cash  42.00 USD
"""
PLAIN = """\
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Open
2024-01-09 * "Seed"
  Assets:Cash  42.00 USD
  Equity:Open
2024-01-10 balance Assets:Cash  42.00 USD
"""


def _export(tmp_path: Path, text: str, query: str = "PRINT") -> str:
    ledger = tmp_path / "book.bean"
    ledger.write_text(text)
    out = tmp_path / "out.bean"
    result = runner.invoke(app, ["--file", str(ledger), "query", query, "-f", "beancount", "-o", str(out)])
    assert result.exit_code == 0, result.output
    return out.read_text()


def test_the_export_of_a_padded_ledger_reloads_cleanly(tmp_path: Path, bea_config_dir: Path) -> None:
    exported = _export(tmp_path, PADDED)

    assert exported.count(" pad ") == 1 and exported.count(" balance ") == 1
    assert "Padding inserted" not in exported
    check = runner.invoke(app, ["--file", str(tmp_path / "out.bean"), "check"])
    assert check.exit_code == 0, check.output
    total = runner.invoke(
        app, ["--file", str(tmp_path / "out.bean"), "query", "SELECT sum(position) AS t WHERE account = 'Assets:Cash'"]
    )
    assert "42.00 USD" in total.output


def test_a_padding_transaction_selected_without_its_pad_is_still_printed(tmp_path: Path, bea_config_dir: Path) -> None:
    exported = _export(tmp_path, PADDED, "PRINT FROM type = 'transaction'")

    assert "Padding inserted for Balance of 42.00 USD" in exported
    assert " pad " not in exported


def test_a_ledger_without_a_pad_exports_as_before(tmp_path: Path, bea_config_dir: Path) -> None:
    exported = _export(tmp_path, PLAIN)

    assert '2024-01-09 * "Seed"' in exported
    assert runner.invoke(app, ["--file", str(tmp_path / "out.bean"), "check"]).exit_code == 0


def _dual(first: str) -> str:
    second = "EUR" if first == "USD" else "USD"
    values = {"USD": "100.00", "EUR": "50.00"}
    return f"""\
2024-01-01 open Assets:Cash USD,EUR
2024-01-01 open Equity:Opening USD,EUR
2024-01-01 pad Assets:Cash Equity:Opening
2024-01-02 balance Assets:Cash {values[first]} {first}
2024-01-03 balance Assets:Cash {values[second]} {second}
"""


def _cash(tmp_path: Path) -> str:
    out = tmp_path / "out.bean"
    assert runner.invoke(app, ["--file", str(out), "check"]).exit_code == 0
    result = runner.invoke(
        app,
        [
            "--file",
            str(out),
            "query",
            "SELECT currency, sum(number) AS n WHERE account = 'Assets:Cash' GROUP BY currency ORDER BY currency",
            "-f",
            "csv",
        ],
    )
    assert result.exit_code == 0, result.output
    return result.output


@pytest.mark.parametrize("first", ["USD", "EUR"])
def test_a_cutoff_that_drops_one_currencys_assertion_keeps_its_padding(
    tmp_path: Path, bea_config_dir: Path, first: str
) -> None:
    # The cutoff keeps the pad and the first assertion; the second currency's
    # padding can no longer be derived on reload, so it is printed.
    exported = _export(tmp_path, _dual(first), "PRINT FROM CLOSE ON 2024-01-03")

    assert exported.count(" pad ") == 1 and exported.count("Padding inserted") == 1
    assert "currency,n\nEUR,50.00\nUSD,100.00\n" in _cash(tmp_path).replace("\r\n", "\n")


def test_a_pad_none_of_whose_padding_is_derived_again_is_left_out(tmp_path: Path, bea_config_dir: Path) -> None:
    exported = _export(tmp_path, _dual("USD"), "PRINT FROM type != 'balance'")

    assert " pad " not in exported and exported.count("Padding inserted") == 2
    assert "currency,n\nEUR,50.00\nUSD,100.00\n" in _cash(tmp_path).replace("\r\n", "\n")


def test_the_whole_dual_currency_ledger_still_exports_its_pad(tmp_path: Path, bea_config_dir: Path) -> None:
    exported = _export(tmp_path, _dual("EUR"))

    assert exported.count(" pad ") == 1 and "Padding inserted" not in exported
    assert "currency,n\nEUR,50.00\nUSD,100.00\n" in _cash(tmp_path).replace("\r\n", "\n")
