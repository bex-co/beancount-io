"""Text totals are footed from the figures printed above them (w1/358).

Each text figure rounds on its own, half up, so where an exact figure ends in
a half cent and a total built from it has the opposite sign, the total and
its parts rounded in opposite directions: the trial balance netted to 0.01,
`Net Worth` read -10.00 under `10.01` and `-20.00`, and `Net Profit` read
-10.00 under `-10.01` and `20.00`. Every derived text line is now the sum of
the printed lines it is defined from; `--json` and CSV keep the exact figures.
"""

from __future__ import annotations

import json
import re
from decimal import Decimal
from pathlib import Path
from typing import Any

from tests.report_helpers import bea, write_ledger

# Half a share at a two-decimal price: 2.5 VTI at 95.45 is 238.625 USD.
BOOKS = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Broker VTI
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Cash 10000.00 USD
  Equity:Opening
2026-01-10 * "Buy"
  Assets:Broker 2.5 VTI {100.00 USD}
  Assets:Cash
2026-01-31 price VTI 95.45 USD
"""
# A EUR amount at a one-decimal rate: 6.67 EUR at 1.5 is 10.005 USD.
FX = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Euro EUR
2026-01-01 open Liabilities:Card USD
2026-01-01 open Income:Refund EUR
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening
2026-01-01 price EUR 1.5 USD
2026-01-05 * "Refund"
  Assets:Euro 6.67 EUR
  Income:Refund
2026-01-06 * "Food"
  Expenses:Food 20.00 USD
  Liabilities:Card
"""
# Two investing rows at a half cent each: 2.5 and 0.5 VTI at 10.01 USD.
CASH = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Broker VTI
2026-01-01 open Assets:Other VTI
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Cash 100.00 USD
  Equity:Opening
2026-01-10 * "Buy"
  Assets:Broker 2.5 VTI {10.01 USD}
  Assets:Cash -25.02 USD
2026-01-11 * "Buy"
  Assets:Other 0.5 VTI {10.01 USD}
  Assets:Cash -5.01 USD
"""
AMOUNT = r"(-?[\d,]+\.\d+) USD"


def _run(tmp_path: Path, ledger: str, *args: str) -> str:
    path = write_ledger(tmp_path, ledger)
    proc = bea(["--file", str(path), *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return proc.stdout


def _json(tmp_path: Path, ledger: str, *args: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads(_run(tmp_path, ledger, "--json", *args))["data"]
    return data


def _line(out: str, label: str) -> Decimal:
    """The USD figure on the one line that starts with `label`."""
    found = re.findall(rf"^\s*{re.escape(label)}\s+{AMOUNT}\s*$", out, re.MULTILINE)
    assert len(found) == 1, (label, out)
    return Decimal(found[0].replace(",", ""))


def _trial_lines(out: str) -> Decimal:
    roots = [_line(out, root) for root in ("Assets", "Equity")]
    return sum(roots, Decimal(0)) + _line(out, "Valuation/translation adjustment:")


def test_trial_balance_and_bea_balance_net_to_zero_in_text(tmp_path: Path) -> None:
    for args in (("report", "trial-balance"), ("balance",)):
        out = _run(tmp_path, BOOKS, *args)
        assert _line(out, "Assets") == Decimal("9988.63")
        assert _line(out, "Valuation/translation adjustment:") == Decimal("11.37")
        assert _trial_lines(out) == 0


def test_balance_sheet_equity_lines_add_to_total_equity(tmp_path: Path) -> None:
    out = _run(tmp_path, BOOKS, "report", "balance-sheet")
    lines = ("Equity", "Current-period earnings (credit):", "Valuation/translation adjustment (credit):")
    total = _line(out, "Total equity (credit):")
    assert sum((_line(out, label) for label in lines), Decimal(0)) == total == Decimal("-9988.63")
    worth = Decimal(re.findall(rf"^Net Worth: {AMOUNT}$", out, re.MULTILINE)[0].replace(",", ""))
    assert worth == -total == _line(out, "Assets")


def test_income_statement_net_profit_is_minus_income_plus_expenses_as_printed(tmp_path: Path) -> None:
    out = _run(tmp_path, FX, "report", "income-statement")
    assert _line(out, "Income") == Decimal("-10.01")
    assert _line(out, "Expenses") == Decimal("20.00")
    assert "Net Profit: -9.99 USD" in out
    assert re.search(r"^2026-01-06\s+-10\.01 USD\s+20\.00 USD\s+-9\.99 USD\s*$", out, re.MULTILINE), out


def test_overview_net_worth_is_assets_plus_liabilities_as_printed(tmp_path: Path) -> None:
    out = _run(tmp_path, FX, "report", "overview")
    assert _line(out, "Assets:") + _line(out, "Liabilities:") == _line(out, "Net Worth:") == Decimal("-9.99")


def test_balance_sheet_agrees_with_income_statement_and_its_own_series(tmp_path: Path) -> None:
    """Earnings is income plus expenses as the income statement prints them."""
    out = _run(tmp_path, FX, "report", "balance-sheet")
    assert _line(out, "Current-period earnings (credit):") == Decimal("9.99")
    assert _line(out, "Valuation/translation adjustment (credit):") == 0
    assert _line(out, "Total equity (credit):") == Decimal("9.99")
    assert "the same period's Net Profit is -9.99 USD." in out
    assert "Net Worth: -9.99 USD" in out
    assert re.search(r"^2026-01-06\s+-9\.99 USD\s*$", out, re.MULTILINE), out


def test_cash_flow_totals_foot_and_reach_the_closing_cash(tmp_path: Path) -> None:
    out = _run(tmp_path, CASH, "report", "cash-flow")
    rows = [_line(out, account) for account in ("Assets:Broker", "Assets:Other")]
    investing = _line(out, "Total investing:")
    assert sum(rows, Decimal(0)) == investing == Decimal("-30.04")
    net = _line(out, "Net change in cash:")
    assert investing + _line(out, "Total financing:") == net
    assert _line(out, "Opening cash:") + net + _line(out, "Rounding residual:") == _line(out, "Closing cash:")


def test_json_keeps_the_exact_figures(tmp_path: Path) -> None:
    trial = _json(tmp_path, BOOKS, "report", "trial-balance")
    assert trial["assets"]["balance_children"] == {"USD": "9988.625"}
    assert trial["valuation_adjustment"] == {"USD": "11.375"}
    sheet = _json(tmp_path, BOOKS, "report", "balance-sheet")
    assert sheet["valuation_adjustment"] == {"USD": "11.375"}
    assert sheet["equity_total"] == {"USD": "-9988.625"}
    assert "earnings_parts" not in sheet
    income = _json(tmp_path, FX, "report", "income-statement")
    assert income["income"]["balance_children"] == {"USD": "-10.005"}
    assert income["net_profit"] == {"USD": "-9.995"}
    assert income["periods"][0]["net_profit"] == {"USD": "-9.995"}
    assert _json(tmp_path, FX, "report", "overview")["totals"]["net_worth"] == {"USD": "-9.995"}
    assert _json(tmp_path, FX, "report", "balance-sheet")["current_earnings"] == {"USD": "9.995"}
    flows = _json(tmp_path, CASH, "report", "cash-flow")
    assert flows["totals"]["investing"] == {"USD": "-30.030"}
    assert flows["rounding_residual"] == {}


def test_csv_keeps_the_exact_figures(tmp_path: Path) -> None:
    out = _run(tmp_path, FX, "report", "income-statement", "--format", "csv")
    assert "net_profit,net_profit,,USD,-9.995\n" in out
    assert "period_net_profit,net_profit,2026-01-06,USD,-9.995\n" in out


def test_a_ledger_without_ties_prints_as_before(tmp_path: Path) -> None:
    control = BOOKS.replace("95.45", "95.44")
    assert _run(tmp_path, control, "report", "trial-balance") == (
        "Trial Balance — 2026-01-02 through 2026-01-31\n"
        "Valuation: USD; account: all\n"
        "Account balances use Beancount signs (credits negative).\n"
        "\n"
        "  Assets                                          9,988.60 USD\n"
        "    Broker                                        238.60 USD\n"
        "    Cash                                          9,750.00 USD\n"
        "\n"
        "  Liabilities                                     —\n"
        "\n"
        "  Equity                                          -10,000.00 USD\n"
        "    Opening                                       -10,000.00 USD\n"
        "  Valuation/translation adjustment:               11.40 USD\n"
        "\n"
        "  Income                                          —\n"
        "\n"
        "  Expenses                                        —\n"
    )
    assert _run(tmp_path, control, "report", "balance-sheet") == (
        "Balance Sheet — 2026-01-02 through 2026-01-31\n"
        "Valuation: USD; account: all\n"
        "Account balances use Beancount signs (credits negative).\n"
        "\n"
        "  Assets                                          9,988.60 USD\n"
        "    Broker                                        238.60 USD\n"
        "    Cash                                          9,750.00 USD\n"
        "\n"
        "  Liabilities                                     —\n"
        "\n"
        "  Equity                                          -10,000.00 USD\n"
        "    Opening                                       -10,000.00 USD\n"
        "  Current-period earnings (credit):               0.00 USD\n"
        "  Valuation/translation adjustment (credit):      11.40 USD\n"
        "  Total equity (credit):                          -9,988.60 USD\n"
        "\n"
        "Credit lines above are negative for a gain; the same period's Net Profit is 0.00 USD.\n"
        "Net Worth: 9,988.60 USD\n"
        "\n"
        "Monthly net worth\n"
        "DATE        NET WORTH   \n"
        "----------  ------------\n"
        "2026-01-31  9,988.60 USD\n"
    )
