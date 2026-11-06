"""CSV tables for `bea report --format csv` (w21/m6).

The contract, one place for every report:

- The numbers are the ``--json`` numbers, written as exact decimal strings:
  no rounding, no thousands separators, no currency symbol in the cell.
  Spreadsheets parse them; sums of rows can be checked against the JSON.
- A value that holds several currencies becomes one row per currency, each
  with its own ``currency`` cell. A balance the ledger cannot value (a
  missing price) keeps its row with an empty ``amount``: the gap is visible,
  never zero. An empty balance is one row with empty ``currency`` and
  ``amount``, so the account still appears.
- Tree reports (income statement, balance sheet, trial balance) write each
  account's *own* balance, not the subtree total, so the rows of a section
  add up to that section's total instead of double counting parents.
- An empty period is a header and no rows, exit 0.

Nothing here imports Beancount: it reshapes the engine's JSON payload.
"""

from __future__ import annotations

import csv
import io
from collections.abc import Callable, Mapping
from typing import Any

Row = list[str]
Table = tuple[list[str], list[Row]]

#: What a spreadsheet reads as the start of a formula (OWASP's list). The
#: engine's query renderer holds the same set (`bea_engine.query`); the two
#: processes cannot share code, so the tuples must agree.
FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")

#: Columns of the date/currency/amount layout shared by five reports.
BALANCE_COLUMNS = ["section", "item", "date", "currency", "amount"]


def _inert(cell: str) -> str:
    """A text cell a spreadsheet shows as text: a leading `'` when it would start a formula."""
    return "'" + cell if cell.startswith(FORMULA_TRIGGERS) else cell


def _text(value: Any) -> str:
    return "" if value is None else str(value)


def _amount_rows(prefix: Row, balance: Mapping[str, Any] | None) -> list[Row]:
    """One row per currency of a `{currency: number|null}` balance."""
    if not balance:
        return [[*prefix, "", ""]]
    return [[*prefix, currency, _text(balance[currency])] for currency in sorted(balance)]


def _one_amount(amount: Mapping[str, Any] | None) -> Row:
    """A `{number, currency}` pair as ``[number, currency]``; blanks when absent."""
    if amount is None:
        return ["", ""]
    return [_text(amount.get("number")), _text(amount.get("currency"))]


def _tree_rows(section: str, tree: Mapping[str, Any] | None) -> list[Row]:
    if tree is None:
        return []
    rows: list[Row] = []

    def walk(node: Mapping[str, Any]) -> None:
        rows.extend(_amount_rows([section, _text(node["account"]), ""], node["balance"]))
        for child in node["children"]:
            walk(child)

    walk(tree)
    return rows


def _overview(data: Mapping[str, Any]) -> Table:
    rows: list[Row] = []
    for item, balance in data["totals"].items():
        rows += _amount_rows(["total", item, ""], balance)
    for item, series in data["series"].items():
        for point in series:
            rows += _amount_rows(["series", item, _text(point["date"])], point["balance"])
    return BALANCE_COLUMNS, rows


def _income_statement(data: Mapping[str, Any]) -> Table:
    rows = _tree_rows("income", data["income"]) + _tree_rows("expenses", data["expenses"])
    rows += _amount_rows(["net_profit", "net_profit", ""], data["net_profit"])
    for period in data["periods"]:
        for name in ("income", "expenses", "net_profit"):
            rows += _amount_rows([f"period_{name}", name, _text(period["date"])], period[name])
    return BALANCE_COLUMNS, rows


def _balance_sheet(data: Mapping[str, Any]) -> Table:
    rows = [row for name in ("assets", "liabilities", "equity") for row in _tree_rows(name, data[name])]
    rows += _amount_rows(["current_earnings", "current_earnings", ""], data["current_earnings"])
    if data.get("equity_reconciled"):
        rows += _amount_rows(["valuation_adjustment", "valuation_adjustment", ""], data["valuation_adjustment"])
        rows += _amount_rows(["equity_total", "equity_total", ""], data["equity_total"])
    rows += _amount_rows(["net_worth", "net_worth", ""], data["net_worth"])
    for point in data["net_worth_series"]:
        rows += _amount_rows(["net_worth_series", "net_worth", _text(point["date"])], point["balance"])
    return BALANCE_COLUMNS, rows


def _trial_balance(data: Mapping[str, Any]) -> Table:
    names = ("assets", "liabilities", "equity", "income", "expenses")
    return BALANCE_COLUMNS, [row for name in names for row in _tree_rows(name, data[name])]


def _cash_flow(data: Mapping[str, Any]) -> Table:
    rows: list[Row] = []
    for activity in ("operating", "investing", "financing"):
        for entry in data["sections"][activity]:
            rows += _amount_rows([activity, _text(entry["account"]), ""], entry["amounts"])
    for activity in ("operating", "investing", "financing"):
        if data["sections"][activity]:
            rows += _amount_rows(["total", activity, ""], data["totals"][activity])
    for name in ("net_change", "rounding_residual", "opening", "closing"):
        # Cost rounding the ledger's tolerances accepted: absent unless there was some.
        if name != "rounding_residual" or data.get(name):
            rows += _amount_rows([name, name, ""], data[name])
    return BALANCE_COLUMNS, rows


def _holdings(data: Mapping[str, Any]) -> Table:
    header = [
        "account",
        "commodity",
        "units",
        "average_cost",
        "average_cost_currency",
        "cost_basis",
        "cost_basis_currency",
        "market_value",
        "market_value_currency",
        "price_date",
        "stale",
    ]
    by_account = data["group_by"] == "account"
    rows: list[Row] = []
    for group in data["groups"]:
        legs = [group.get("price_source"), group.get("conversion_source")]
        stale = any(isinstance(leg, dict) and leg.get("freshness") == "stale" for leg in legs)
        units = group["units"]
        rows.append(
            [
                group["account"] if by_account else "; ".join(group["accounts"]),
                _text(group["commodity"]),
                _text(units["number"]) if units else "",
                *_one_amount(group["average_cost"]),
                *_one_amount(group["cost_basis"]),
                *_one_amount(group["market_value"]),
                _text(group.get("price_date")),
                "true" if stale else "false",
            ]
        )
    return header, rows


def _register(data: Mapping[str, Any]) -> Table:
    header = [
        "line",
        "date",
        "account",
        "entry",
        "payee",
        "narration",
        "amount",
        "currency",
        "cost",
        "cost_currency",
        "cost_date",
        "balance_currency",
        "balance",
    ]
    rows: list[Row] = []
    for line, row in enumerate(data["rows"], start=1):
        amount = _one_amount(row["amount"])
        cost = row["cost"]
        cost_cells = [*_one_amount(cost), _text(cost.get("date")) if cost else ""]
        head = [
            str(line),
            _text(row["date"]),
            _text(row["account"]),
            _text(row["entry"]),
            _text(row["payee"]),
            _text(row["narration"]),
            *amount,
            *cost_cells,
        ]
        # The running balance may hold several currencies: the row repeats
        # once per currency, and `line` says they are one posting.
        balance = row["balance"] or {}
        for currency in sorted(balance) or [""]:
            rows.append([*head, currency, _text(balance.get(currency))])
    return header, rows


def _capital_gains(data: Mapping[str, Any]) -> Table:
    header = [
        "sold",
        "account",
        "commodity",
        "acquired",
        "held_days",
        "term",
        "quantity",
        "proceeds",
        "proceeds_currency",
        "basis",
        "basis_currency",
        "gain",
        "gain_currency",
    ]
    rows: list[Row] = []
    for row in data["rows"]:
        term = "unknown" if row["held_days"] is None else ("long" if row["long_held"] else "short")
        rows.append(
            [
                _text(row["sold"]),
                _text(row["account"]),
                _text(row["commodity"]),
                _text(row["acquired"]),
                _text(row["held_days"]),
                term,
                _text(row["quantity"]["number"]),
                *_one_amount(row["proceeds"]),
                *_one_amount(row["basis"]),
                *_one_amount(row["gain"]),
            ]
        )
    return header, rows


#: Columns holding user text, which `--spreadsheet-safe` neutralizes.
_TEXT_COLUMNS = frozenset({"item", "account", "commodity", "payee", "narration"})

_TABLES: dict[str, Callable[[Mapping[str, Any]], Table]] = {
    "overview": _overview,
    "income-statement": _income_statement,
    "balance-sheet": _balance_sheet,
    "trial-balance": _trial_balance,
    "holdings": _holdings,
    "register": _register,
    "capital-gains": _capital_gains,
    "cash-flow": _cash_flow,
}


def table_for(kind: str, data: Mapping[str, Any]) -> Table:
    """The CSV header and rows for one report payload."""
    return _TABLES[kind](data)


def render(kind: str, data: Mapping[str, Any], *, spreadsheet_safe: bool = False) -> str:
    """The report as CSV text with `\\n` row endings."""
    header, rows = table_for(kind, data)
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(header)
    text_positions = [index for index, name in enumerate(header) if name in _TEXT_COLUMNS]
    for row in rows:
        if spreadsheet_safe:
            row = list(row)
            for index in text_positions:
                row[index] = _inert(row[index])
        writer.writerow(row)
    return out.getvalue()
