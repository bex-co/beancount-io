"""An omitted cash leg does not teach reports the cost's decimals (w5/093).

Display precision is learned from the amounts the ledger writes. A purchase
whose balancing leg is left to Beancount gets an interpolated amount — units
times cost — and every figure in that currency was printed with its digits.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = """\
option "operating_currency" "USD"

2026-01-01 open Assets:Checking USD
2026-01-01 open Assets:Brokerage
2026-01-01 open Expenses:Food
2026-01-01 open Equity:Opening

2026-01-02 * "Opening balance"
  Assets:Checking  5000.00 USD
  Equity:Opening  -5000.00 USD

2026-01-20 * "Grocer"
  Expenses:Food  {food} USD
  Assets:Checking  -{food} USD

2026-02-03 * "Buy AAPL"
  Assets:Brokerage  {lot}
  Assets:Checking{cash}

2026-02-10 price AAPL 200.00 USD
"""
LOTS = {
    "per-unit-cost": "1.5 AAPL {191.559998 USD}",
    "total-cost": "1.5 AAPL {{287.339997 USD}}",
    "price": "1.5 AAPL @ 191.559998 USD",
}


def _report(tmp_path: Path, *command: str, lot: str, cash: str = "", food: str = "45.25") -> str:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        LEDGER.replace("{food}", food).replace("{lot}", lot).replace("{cash}", f"  {cash}" if cash else "")
    )
    result = runner.invoke(app, ["--file", str(ledger), *command])
    assert result.exit_code == 0, result.output
    return " ".join(result.output.split())


@pytest.mark.parametrize("lot", sorted(LOTS))
@pytest.mark.parametrize("command", [["balance"], ["report", "balance-sheet"], ["report", "income-statement"]], ids=str)
def test_an_omitted_leg_prints_the_ledgers_own_precision(
    tmp_path: Path, bea_config_dir: Path, lot: str, command: list[str]
) -> None:
    text = _report(tmp_path, *command, lot=LOTS[lot])

    assert "45.25 USD" in text
    assert "45.250" not in text and "5,000.000" not in text


def test_the_omitted_leg_prints_what_the_written_leg_prints(tmp_path: Path, bea_config_dir: Path) -> None:
    omitted = _report(tmp_path, "balance", lot=LOTS["per-unit-cost"])
    written = _report(tmp_path, "balance", lot=LOTS["per-unit-cost"], cash="-287.34 USD")

    assert "4,967.41 USD" in written
    assert "-5,000.00 USD" in omitted and "45.25 USD" in omitted


def test_amounts_the_ledger_really_writes_keep_their_decimals(tmp_path: Path, bea_config_dir: Path) -> None:
    text = _report(tmp_path, "balance", lot=LOTS["per-unit-cost"], food="45.2575")

    assert "45.2575 USD" in text


def test_an_inferred_fraction_still_shows_when_the_ledger_writes_only_whole_numbers(
    tmp_path: Path, bea_config_dir: Path
) -> None:
    """Rounding a 31.5 cash leg to 32 would misstate the balance."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2024-01-01 open Assets:Bank USD\n2024-01-01 open Assets:HOOL HOOL\n2024-01-01 open Equity:Opening USD\n"
        '2024-01-01 * "seed"\n  Assets:Bank  100 USD\n  Equity:Opening\n'
        "2024-03-01 price HOOL 10 USD\n"
        '2024-03-03 * "buy"\n  Assets:HOOL  3 HOOL @ 10.5 USD\n  Assets:Bank\n'
    )

    result = runner.invoke(app, ["--file", str(ledger), "balance"])

    assert result.exit_code == 0, result.output
    assert "68.5 USD" in " ".join(result.output.split())


WHOLE_YEN = """\
option "operating_currency" "JPY"
2026-01-01 open Assets:Bank:Checking JPY
2026-01-01 open Assets:Broker
2026-01-01 open Expenses:Food JPY
2026-01-01 open Equity:Opening-Balances JPY
2026-01-01 * "Opening"
  Assets:Bank:Checking  1000000 JPY
  Equity:Opening-Balances
2026-01-05 * "Lunch"
  Expenses:Food  1200 JPY
  Assets:Bank:Checking
2026-02-01 * "Buy fund units"
  Assets:Broker  {lot}
  Assets:Bank:Checking{cash}
2026-03-01 price FUND 10400 JPY
"""
# Each buy's inferred cash leg is a whole number of yen that Beancount
# writes with the units' decimal place (`-25000.0`), and its written twin.
WHOLE_PRODUCTS = {
    "per-unit-cost": ("2.5 FUND {10000 JPY}", "-25000 JPY"),
    "price": ("2.5 FUND @ 10000 JPY", "-25000 JPY"),
    "half-unit": ("0.5 FUND {10000 JPY}", "-5000 JPY"),
}
REPORTS = [["balance"], ["report", "income-statement", "-i", "yearly"], ["report", "holdings"]]


def _whole_yen(tmp_path: Path, *command: str, lot: str, cash: str = "") -> str:
    ledger = tmp_path / "main.bean"
    ledger.write_text(WHOLE_YEN.replace("{lot}", lot).replace("{cash}", f"  {cash}" if cash else ""))
    result = runner.invoke(app, ["--file", str(ledger), *command])
    assert result.exit_code == 0, result.output
    return " ".join(result.output.split())


@pytest.mark.parametrize("lot", sorted(WHOLE_PRODUCTS))
@pytest.mark.parametrize("command", REPORTS, ids=str)
def test_a_whole_inferred_product_prints_what_the_written_leg_prints(
    tmp_path: Path, bea_config_dir: Path, lot: str, command: list[str]
) -> None:
    """`-25000.0` has no subunits: a whole-yen ledger stays in whole yen (w1/322)."""
    units, cash = WHOLE_PRODUCTS[lot]

    omitted = _whole_yen(tmp_path, *command, lot=units)

    assert ".0 JPY" not in omitted
    assert omitted == _whole_yen(tmp_path, *command, lot=units, cash=cash)


def test_a_whole_inferred_product_prints_whole_yen_in_every_report(tmp_path: Path, bea_config_dir: Path) -> None:
    lot = WHOLE_PRODUCTS["per-unit-cost"][0]

    assert "Equity -1,000,000 JPY" in _whole_yen(tmp_path, "balance", lot=lot)
    assert "Net Profit: -1,200 JPY" in _whole_yen(tmp_path, "report", "income-statement", lot=lot)
    assert "10,000 JPY 25,000 JPY 26,000 JPY" in _whole_yen(tmp_path, "report", "holdings", lot=lot)


def test_a_real_half_yen_inferred_amount_keeps_its_decimal(tmp_path: Path, bea_config_dir: Path) -> None:
    """`2.5 × 10001` is `25002.5`: that half yen is in the balance and must show."""
    text = _whole_yen(tmp_path, "balance", lot="2.5 FUND {10001 JPY}")

    assert "973,797.5 JPY" in text
