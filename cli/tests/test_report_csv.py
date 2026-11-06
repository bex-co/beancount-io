"""`bea report --format csv` (w21/m6): the CSV carries the --json figures.

The CSV contract (see `cli/report_csv.py`): exact decimal strings, one row
per currency, a tree account's own balance so a section sums to its total,
formula-like text neutralized only under `--spreadsheet-safe`, an empty
period as a header alone.
"""

from __future__ import annotations

import csv
import io
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Brokerage VTI
2026-01-01 open Income:Salary USD
2026-01-01 open Income:Gains USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD
2026-01-01 price VTI 100 USD
2026-01-05 * "Opening"
  Assets:Bank:Checking  4000.00 USD
  Equity:Opening
2026-01-06 * "=Salary"
  Assets:Bank:Checking  3000.00 USD
  Income:Salary        -3000.00 USD
2026-01-10 * "Groceries"
  Assets:Bank:Checking  -78.20 USD
  Expenses:Food           78.20 USD
2026-01-12 * "Buy"
  Assets:Brokerage  10 VTI {100 USD}
  Assets:Bank:Checking  -1000 USD
2026-02-12 * "Sell"
  Assets:Brokerage  -4 VTI {100 USD} @ 120 USD
  Assets:Bank:Checking  480 USD
  Income:Gains
2026-02-20 price VTI 125 USD
"""

REPORTS = [
    ["overview"],
    ["income-statement"],
    ["balance-sheet"],
    ["trial-balance"],
    ["holdings"],
    ["register", "Assets:Bank:Checking"],
    ["capital-gains"],
    ["cash-flow"],
]


def _csv(argv: list[str], tmp_path: Path) -> list[dict[str, str]]:
    run = bea(["-f", str(tmp_path / "main.beancount"), "report", *argv, "--format", "csv"], tmp_path)
    assert run.returncode == 0, run.stderr
    return list(csv.DictReader(io.StringIO(run.stdout)))


def _json(argv: list[str], tmp_path: Path) -> dict:
    run = bea(["--json", "-f", str(tmp_path / "main.beancount"), "report", *argv], tmp_path)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)["data"]


def _sum(rows: list[dict[str, str]], column: str = "amount", currency: str = "currency") -> dict[str, Decimal]:
    totals: dict[str, Decimal] = defaultdict(Decimal)
    for row in rows:
        if row[column]:
            totals[row[currency]] += Decimal(row[column])
    return dict(totals)


def _as_decimals(balance: dict[str, str]) -> dict[str, Decimal]:
    return {currency: Decimal(number) for currency, number in balance.items()}


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    return write_ledger(tmp_path, LEDGER)


@pytest.mark.parametrize("argv", REPORTS, ids=lambda argv: argv[0])
def test_every_report_prints_a_csv_with_a_header_and_rows(argv: list[str], ledger: Path, tmp_path: Path) -> None:
    rows = _csv(argv, tmp_path)
    assert rows, "the fixture ledger has activity in every report"


def test_trial_balance_sections_sum_to_the_json_totals(ledger: Path, tmp_path: Path) -> None:
    data = _json(["trial-balance"], tmp_path)
    rows = _csv(["trial-balance"], tmp_path)
    for section in ("assets", "liabilities", "equity", "income", "expenses"):
        mine = [row for row in rows if row["section"] == section]
        expected = {c: n for c, n in _as_decimals(data[section]["balance_children"]).items()}
        assert _sum(mine) == expected, section


def test_income_statement_net_profit_and_trees_agree_with_json(ledger: Path, tmp_path: Path) -> None:
    data = _json(["income-statement"], tmp_path)
    rows = _csv(["income-statement"], tmp_path)
    assert _sum([r for r in rows if r["section"] == "net_profit"]) == _as_decimals(data["net_profit"])
    assert _sum([r for r in rows if r["section"] == "income"]) == _as_decimals(data["income"]["balance_children"])
    # The monthly rows are one row per period and currency.
    dates = {r["date"] for r in rows if r["section"] == "period_net_profit"}
    assert dates == {period["date"] for period in data["periods"]}


def test_balance_sheet_and_overview_carry_net_worth(ledger: Path, tmp_path: Path) -> None:
    sheet = _csv(["balance-sheet"], tmp_path)
    expected = _as_decimals(_json(["balance-sheet"], tmp_path)["net_worth"])
    assert _sum([r for r in sheet if r["section"] == "net_worth"]) == expected
    overview = _csv(["overview"], tmp_path)
    assert _sum([r for r in overview if r["section"] == "total" and r["item"] == "net_worth"]) == expected


def test_cash_flow_net_change_and_sections_tie_to_json(ledger: Path, tmp_path: Path) -> None:
    data = _json(["cash-flow"], tmp_path)
    rows = _csv(["cash-flow"], tmp_path)
    assert _sum([r for r in rows if r["section"] == "net_change"]) == _as_decimals(data["net_change"])
    activities = [r for r in rows if r["section"] in {"operating", "investing", "financing"}]
    assert _sum(activities) == _as_decimals(data["net_change"])


def test_holdings_and_capital_gains_amounts_match_json(ledger: Path, tmp_path: Path) -> None:
    holdings = _csv(["holdings"], tmp_path)
    totals = _json(["holdings"], tmp_path)["totals"]
    assert _sum(holdings, "cost_basis", "cost_basis_currency") == _as_decimals(totals["cost_basis"])
    assert _sum(holdings, "market_value", "market_value_currency") == _as_decimals(totals["market_value"])
    gains = _csv(["capital-gains"], tmp_path)
    assert [r["term"] for r in gains] == ["short"]
    short_term = _json(["capital-gains"], tmp_path)["totals"]["one_year_or_less"]
    assert _sum(gains, "gain", "gain_currency") == _as_decimals(short_term)


def test_register_rows_follow_the_json_rows(ledger: Path, tmp_path: Path) -> None:
    data = _json(["register", "Assets:Bank:Checking"], tmp_path)
    rows = _csv(["register", "Assets:Bank:Checking"], tmp_path)
    assert [r["date"] for r in rows] == [row["date"] for row in data["rows"]]
    assert [r["balance"] for r in rows] == [row["balance"]["USD"] for row in data["rows"]]
    assert [r["line"] for r in rows] == [str(i) for i in range(1, len(rows) + 1)]


def test_a_formula_looking_narration_is_neutralized_only_when_asked(ledger: Path, tmp_path: Path) -> None:
    argv = ["-f", str(ledger), "report", "register", "Assets:Bank:Checking", "--format", "csv"]
    plain = bea(argv, tmp_path)
    safe = bea([*argv, "--spreadsheet-safe"], tmp_path)
    assert ",=Salary," in plain.stdout
    assert ",'=Salary," in safe.stdout
    # Amounts keep their sign: only text columns are touched.
    assert ",-78.20," in safe.stdout


def test_an_empty_period_is_a_header_alone(ledger: Path, tmp_path: Path) -> None:
    run = bea(["-f", str(ledger), "report", "capital-gains", "-t", "2026-01", "--format", "csv"], tmp_path)
    assert run.returncode == 0, run.stderr
    lines = run.stdout.strip().splitlines()
    assert len(lines) == 1 and lines[0].startswith("sold,account,")


def test_output_file_is_written_and_stdout_stays_empty(ledger: Path, tmp_path: Path) -> None:
    destination = tmp_path / "out.csv"
    run = bea(["-f", str(ledger), "report", "trial-balance", "-o", str(destination)], tmp_path)
    assert run.returncode == 0, run.stderr
    assert run.stdout == ""
    assert destination.read_text().startswith("section,item,date,currency,amount\n")


def test_output_may_not_overwrite_the_ledger(ledger: Path, tmp_path: Path) -> None:
    before = ledger.read_text()
    run = bea(["-f", str(ledger), "report", "trial-balance", "--format", "csv", "-o", str(ledger)], tmp_path)
    assert run.returncode != 0
    assert ledger.read_text() == before


@pytest.mark.parametrize(
    "extra",
    [["-o", "x.txt"], ["--spreadsheet-safe"]],
    ids=["output-without-csv", "safe-without-csv"],
)
def test_csv_only_options_are_refused_without_csv(extra: list[str], ledger: Path, tmp_path: Path) -> None:
    run = bea(["-f", str(ledger), "report", "trial-balance", *extra], tmp_path)
    assert run.returncode == 2
    assert "csv" in run.stderr


def test_json_and_csv_cannot_be_combined(ledger: Path, tmp_path: Path) -> None:
    run = bea(["--json", "-f", str(ledger), "report", "trial-balance", "--format", "csv"], tmp_path)
    assert run.returncode == 2
    assert "cannot be combined" in run.stderr


def test_notes_go_to_stderr_not_the_table(ledger: Path, tmp_path: Path) -> None:
    run = bea(["-f", str(ledger), "report", "holdings", "--format", "csv"], tmp_path)
    assert run.stdout.splitlines()[0].startswith("account,commodity,")
    assert "Holdings —" not in run.stdout


UNPRICED = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Brokerage VTI
2026-01-01 open Equity:Opening USD
2026-01-05 * "Opening"
  Assets:Bank  1000.00 USD
  Equity:Opening
2026-01-12 * "Buy"
  Assets:Brokerage  10 VTI {100 USD}
  Assets:Bank  -1000 USD
"""


def test_a_balance_that_cannot_be_valued_keeps_its_row_with_an_empty_amount(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, UNPRICED)
    run = bea(["-f", str(ledger), "report", "overview", "--allow-errors", "--format", "csv"], tmp_path)
    assert run.returncode == 0, run.stderr
    rows = list(csv.DictReader(io.StringIO(run.stdout)))
    worth = [r for r in rows if (r["section"], r["item"]) == ("total", "net_worth")]
    assert [(r["currency"], r["amount"]) for r in worth] == [("USD", "")], "an unvalued total is empty, never zero"
    # What can be shown stays shown, in its own units.
    assets = [(r["currency"], r["amount"]) for r in rows if (r["section"], r["item"]) == ("total", "assets")]
    assert assets == [("VTI", "10")]
    assert "Partial valuation" in run.stderr
    assert "Partial valuation" not in run.stdout


def test_a_running_balance_in_two_currencies_repeats_the_posting_once_per_currency(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, UNPRICED)
    argv = ["-f", str(ledger), "report", "register", "Assets", "-x", "units", "--format", "csv"]
    run = bea(argv, tmp_path)
    assert run.returncode == 0, run.stderr
    rows = list(csv.DictReader(io.StringIO(run.stdout)))
    by_line: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        by_line[row["line"]].append(row["balance_currency"])
    assert any(len(currencies) == 2 and set(currencies) == {"USD", "VTI"} for currencies in by_line.values())
    # A repeated posting carries the same amount on each of its rows.
    for line in by_line:
        assert len({r["amount"] for r in rows if r["line"] == line}) == 1
