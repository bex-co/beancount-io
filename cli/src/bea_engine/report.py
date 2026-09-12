"""Balances and Fava financial reports — the accounting `bea report` / `bea balance` used to do in-process.

ADR014 w1/m19 t020 moved this code here from `cli.commands.report`. It is the
same calculation path, not a rewrite: load the ledger through Fava, build the
four statements plus filtered balances, and answer with ordinary business JSON
(decimals as `Decimal` for the protocol to stringify, dates as `date`). The
frontend keeps Typer options and human/JSON rendering; it imports neither
Beancount nor Fava for these workflows.
"""

from __future__ import annotations

import dataclasses
import re
from collections.abc import Iterable, Mapping
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.query import format_error

KINDS = ("overview", "income-statement", "balance-sheet", "trial-balance")
INTERVALS = ("monthly", "quarterly", "yearly", "weekly", "daily")


def answer(
    file: Path,
    kind: str,
    *,
    conversion: str | None = None,
    time: str | None = None,
    account: str | None = None,
    interval: str = "monthly",
    accounts: list[str] | None = None,
    allow_errors: bool = False,
) -> dict[str, Any]:
    """Compute one report or a filtered balance tree and return its JSON-ready payload."""
    if kind == "balances":
        return _balances(file, accounts or [], conversion=conversion, time=time, allow_errors=allow_errors)
    if kind not in KINDS:
        raise protocol.UsageError(f"Unknown report kind {kind!r}. Choose one of: {', '.join(KINDS)}.")
    if interval not in INTERVALS:
        raise protocol.UsageError(f"Unknown interval {interval!r}. Choose one of: {', '.join(INTERVALS)}.")

    filtered, resolved_conversion, ledger_errors = _load(file, account, time, conversion, allow_errors)
    if kind == "overview":
        return _overview(filtered, resolved_conversion, interval, allow_errors, ledger_errors)
    if kind == "income-statement":
        return _income_statement(filtered, resolved_conversion, interval, allow_errors, ledger_errors)
    if kind == "balance-sheet":
        return _balance_sheet(filtered, resolved_conversion, interval, allow_errors, ledger_errors)
    return _trial_balance(filtered, resolved_conversion, allow_errors, ledger_errors)


def _balances(
    file: Path,
    accounts: list[str],
    *,
    conversion: str | None,
    time: str | None,
    allow_errors: bool,
) -> dict[str, Any]:
    """Balances for matching accounts; with no filter, the trial balance."""
    from beancount.core.data import Close

    from fava.modules.financial_statements import FinancialStatementsModule

    filtered, resolved_conversion, ledger_errors = _load(file, None, time, conversion, allow_errors)
    data = FinancialStatementsModule().trial_balance(filtered, resolved_conversion)
    sections = {
        name: getattr(data, f"{name}_hierarchy") for name in ("assets", "liabilities", "equity", "income", "expenses")
    }
    terms = [(term or "").casefold() for term in accounts]
    if not terms:
        pruned = {name: tree for name, tree in sections.items()}
    else:
        closed: set[str] = set()
        for entry in filtered.entries:
            if isinstance(entry, Close):
                closed.add(entry.account)
        pruned = {name: _prune_tree(tree, terms, closed) for name, tree in sections.items()}
    # Valuation covers only the accounts being shown: an unrelated unpriced
    # holding must not make a USD checking balance fail.
    metadata = (
        _metadata(filtered, resolved_conversion, ledger_errors)
        | {"account_filter": " ".join(accounts) if accounts else None}
        | _valuation(
            resolved_conversion,
            (
                (filtered.end_date, balance)
                for tree in pruned.values()
                if tree is not None
                for balance in _tree_balances(tree)
            ),
            allow_errors,
            filtered.ledger.prices,
            ledger_errors,
        )
    )
    return metadata | {
        "display_precision": _display_precision(filtered),
        **{name: (_tree_json(tree) if tree is not None else None) for name, tree in pruned.items()},
    }


def _overview(
    filtered: Any, conversion: str, interval: str, allow_errors: bool, ledger_errors: list[str]
) -> dict[str, Any]:
    from fava.modules.financial_statements import FinancialStatementsModule

    data = FinancialStatementsModule().overview(filtered, _interval(interval), conversion)
    trees = (data.assets_hierarchy, data.liabilities_hierarchy, data.income_hierarchy, data.expenses_hierarchy)
    balances = [(filtered.end_date, balance) for tree in trees for balance in _tree_balances(tree)]
    for series in (data.assets_data, data.liabilities_data, data.income_interval_data, data.expenses_interval_data):
        balances.extend((point.date, point.balance) for point in series)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices, ledger_errors)
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    assets, liabilities, income, expenses = (tree.balance_children for tree in trees)
    worth = _summary(_sum(assets, liabilities), conversion, incomplete=bool(valuation["missing_prices"]))
    return metadata | {
        "display_precision": _display_precision(filtered),
        "totals": {
            "assets": assets,
            "liabilities": liabilities,
            "income": income,
            "expenses": expenses,
            "net_worth": worth,
        },
        "series": {
            "assets": _series_json(data.assets_data),
            "liabilities": _series_json(data.liabilities_data),
            "income": _series_json(data.income_interval_data),
            "expenses": _series_json(data.expenses_interval_data),
        },
    }


def _income_statement(
    filtered: Any, conversion: str, interval: str, allow_errors: bool, ledger_errors: list[str]
) -> dict[str, Any]:
    from fava.modules.financial_statements import FinancialStatementsModule

    data = FinancialStatementsModule().income_statement(filtered, _interval(interval), conversion)
    trees = (data.income_hierarchy, data.expenses_hierarchy)
    balances = [(filtered.end_date, balance) for tree in trees for balance in _tree_balances(tree)]
    for series in (data.income_data, data.expenses_data):
        balances.extend((point.date, point.balance) for point in series)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices, ledger_errors)
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    net = _summary(
        -_sum(*(tree.balance_children for tree in trees)), conversion, incomplete=bool(valuation["missing_prices"])
    )
    periods: list[dict[str, Any]] = [
        {
            "date": profit.date,
            "income": income.balance,
            "expenses": expenses.balance,
            "net_profit": _summary(
                -profit.balance,
                conversion,
                incomplete=bool(
                    _valuation(
                        conversion,
                        [(income.date, income.balance), (expenses.date, expenses.balance)],
                        True,
                        None,
                        ledger_errors,
                    )["missing_prices"]
                ),
            ),
        }
        for income, expenses, profit in zip(data.income_data, data.expenses_data, data.net_profit_data, strict=True)
    ]
    return metadata | {
        "display_precision": _display_precision(filtered),
        "net_profit_signs": "positive_for_gain",
        "income": _tree_json(trees[0]),
        "expenses": _tree_json(trees[1]),
        "net_profit": net,
        "periods": periods,
    }


def _balance_sheet(
    filtered: Any, conversion: str, interval: str, allow_errors: bool, ledger_errors: list[str]
) -> dict[str, Any]:
    from fava.modules.financial_statements import FinancialStatementsModule

    data = FinancialStatementsModule().balance_sheet(filtered, _interval(interval), conversion)
    trees = (data.assets_hierarchy, data.liabilities_hierarchy, data.equity_hierarchy)
    balances = [(filtered.end_date, balance) for tree in trees for balance in _tree_balances(tree)]
    balances.append((filtered.end_date, data.current_earnings))
    balances.extend((point.date, point.balance) for point in data.net_worth_data)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices, ledger_errors)
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    incomplete = bool(valuation["missing_prices"])
    worth = _summary(_sum(trees[0].balance_children, trees[1].balance_children), conversion, incomplete=incomplete)
    reconciled = not incomplete and not filtered.ledger.load_errors and conversion != "units"
    return metadata | {
        "display_precision": _display_precision(filtered),
        "assets": _tree_json(trees[0]),
        "liabilities": _tree_json(trees[1]),
        "equity": _tree_json(trees[2]),
        "current_earnings": data.current_earnings,
        "current_earnings_signs": "negative_for_gain",
        "net_profit": _negated(data.current_earnings),
        "valuation_adjustment": data.valuation_adjustment if reconciled else None,
        "equity_total": data.equity_total if reconciled else None,
        "equity_reconciled": reconciled,
        "net_worth": worth,
        "net_worth_series": _series_json(data.net_worth_data),
    }


def _trial_balance(filtered: Any, conversion: str, allow_errors: bool, ledger_errors: list[str]) -> dict[str, Any]:
    from fava.modules.financial_statements import FinancialStatementsModule

    data = FinancialStatementsModule().trial_balance(filtered, conversion)
    sections = {
        name: getattr(data, f"{name}_hierarchy") for name in ("assets", "liabilities", "equity", "income", "expenses")
    }
    metadata = _metadata(filtered, conversion, ledger_errors) | _valuation(
        conversion,
        ((filtered.end_date, balance) for tree in sections.values() for balance in _tree_balances(tree)),
        allow_errors,
        filtered.ledger.prices,
        ledger_errors,
    )
    return metadata | {
        "display_precision": _display_precision(filtered),
        **{name: _tree_json(tree) for name, tree in sections.items()},
    }


def _load(
    file: Path, account: str | None, time: str | None, conversion: str | None, allow_errors: bool
) -> tuple[Any, str, list[str]]:
    from fava.core.filters import FilterError
    from fava.core.loader import load_file
    from fava.ledger import FavaLedger

    entries, errors, options = load_file(str(file))
    ledger_errors = [format_error(error) for error in errors]
    if ledger_errors and not allow_errors:
        raise protocol.LedgerError(
            f"Ledger has {len(ledger_errors)} error(s). Pass --allow-errors to report anyway.",
            details=ledger_errors,
        )
    ledger = FavaLedger(entries, errors, options)
    try:
        filtered = ledger.get_filtered(account=account, time=time)
    except re.error as exc:
        # The account filter is matched as a regular expression (and as a
        # whole account component); only that input can fail to compile.
        raise protocol.UsageError(
            f"Invalid account filter {account!r}: {exc}. "
            "Pass a parent account such as Expenses:Food, or a regular expression such as 'Expenses:(Food|Rent)'.",
            ledger_errors=ledger_errors,
        ) from exc
    except (ValueError, OverflowError, FilterError) as exc:
        raise protocol.UsageError(
            f"Invalid time filter {time!r}. Use month, year, YYYY, YYYY-MM, "
            f"or a date range such as '2026-01 - 2026-06'. {exc}",
            ledger_errors=ledger_errors,
        ) from exc
    currencies = options["operating_currency"]
    return filtered, conversion or (currencies[0] if len(currencies) == 1 else "units"), ledger_errors


def _interval(value: str) -> Any:
    from fava.util.date import INTERVALS as FAVA_INTERVALS

    return FAVA_INTERVALS[value]


def _metadata(filtered: Any, conversion: str, ledger_errors: list[str], interval: str | None = None) -> dict[str, Any]:
    from fava.beans.abc import Close, Commodity, Open

    # Every dated fact the report covers sets the period, not transactions
    # alone: a period-end balance assertion is the last thing a close writes,
    # and a report that stopped before it would omit its own evidence. Opens,
    # closes and commodities are declarations — a commodity conventionally
    # carries a placeholder date decades before any activity.
    start: date | None
    end: date | None
    if filtered.date_range:
        start, end = filtered.date_range.begin, filtered.date_range.end
    else:
        dates = [entry.date for entry in filtered.entries if not isinstance(entry, Open | Close | Commodity)]
        start = min(dates) if dates else None
        end = max(dates) + timedelta(days=1) if dates else None
    data: dict[str, Any] = {
        "conversion": conversion,
        "period": {"start": start, "end_exclusive": end},
        "as_of": end - timedelta(days=1) if end else None,
        "account_filter": filtered.account,
        "balance_signs": "beancount",
        "ledger_valid": not filtered.ledger.load_errors,
        "ledger_errors": ledger_errors,
    }
    if interval:
        data["interval"] = interval
    return data


def _price_summary_lines(
    missing: list[str], dated: list[dict[str, Any]], conversion: str, prices: Any | None
) -> list[str]:
    """One line per unconverted commodity: never one line per interval date."""
    lines = []
    for currency in missing:
        if prices is not None:
            all_prices = prices.get_all_prices((currency, conversion))
            if not all_prices:
                lines.append(f"{currency} has no {conversion} price at any date; shown in units")
                continue
            earliest = min(point[0] for point in all_prices)
            lines.append(f"{currency} → {conversion} has no price before {earliest}; earlier rows shown in {currency}")
            continue
        dates = [item["date"] for item in dated if item["from"] == currency and item["date"]]
        if dates:
            lines.append(
                f"{currency} → {conversion} has no price before {min(dates)}; earlier rows shown in {currency}"
            )
        else:
            lines.append(f"{currency} has no {conversion} price at any date; shown in units")
    return lines


def _valuation(
    conversion: str,
    balances: Iterable[tuple[date | None, Mapping[str, Decimal]]],
    allow_errors: bool,
    prices: Any | None,
    ledger_errors: list[str],
) -> dict[str, Any]:
    missing_dates = {
        (currency, when)
        for when, balance in balances
        for currency, amount in balance.items()
        if amount and currency != conversion and conversion not in {"units", "at_cost", "at_value"}
    }
    missing = sorted({currency for currency, _ in missing_dates})
    pairs = [{"from": currency, "to": conversion} for currency in missing]
    dated = [
        {"from": currency, "to": conversion, "date": when}
        for currency, when in sorted(missing_dates, key=lambda item: (item[1] or date.min, item[0]))
    ]
    summary = _price_summary_lines(missing, dated, conversion, prices)
    if pairs and not allow_errors:
        raise protocol.LedgerError(
            f"Missing prices for {', '.join(missing)} → {conversion}. "
            "Each report row uses its own valuation date. Add prices covering the dates below "
            "or pass --allow-errors for partial balances.",
            details=summary,
            result={"missing_prices": pairs, "missing_price_dates": dated},
            ledger_errors=ledger_errors,
        )
    return {
        "valuation": "partial" if pairs else "complete",
        "missing_prices": pairs,
        "missing_price_dates": dated,
        "missing_price_summary": summary,
    }


def _balance_map(balance: Mapping[str, Decimal]) -> dict[str, Decimal]:
    # SimpleCounterInventory rejects bare iteration; read through items().
    return {currency: amount for currency, amount in balance.items()}


def _tree_json(node: Any) -> dict[str, Any]:
    return {
        "account": node.account,
        "balance": _balance_map(node.balance),
        "balance_children": _balance_map(node.balance_children),
        "has_txns": node.has_txns,
        "children": [_tree_json(child) for child in node.children],
    }


def _series_json(series: Iterable[Any]) -> list[dict[str, Any]]:
    return [{"date": point.date, "balance": _balance_map(point.balance)} for point in series]


def _negated(balance: Mapping[str, Decimal]) -> dict[str, Decimal | None]:
    """The same balance in the opposite sign convention, for translating a credit."""
    return {currency: -number for currency, number in balance.items()}


def _tree_balances(node: Any) -> Iterable[Mapping[str, Decimal]]:
    yield node.balance
    for child in node.children:
        yield from _tree_balances(child)


def _sum(*balances: Mapping[str, Decimal]) -> Any:
    from fava.core.inventory import SimpleCounterInventory

    result = SimpleCounterInventory()
    for balance in balances:
        for currency, amount in balance.items():
            result.add(currency, amount)
    return result


def _summary(balance: Mapping[str, Decimal], conversion: str, *, incomplete: bool = False) -> dict[str, Decimal | None]:
    if conversion in {"units", "at_cost", "at_value"}:
        return dict(balance.items())
    return {conversion: None if incomplete else balance.get(conversion, Decimal(0))}


def _display_precision(filtered: Any) -> dict[str, int]:
    """Fractional digits per currency, for the frontend's human amount rounding.

    Honors `option "display_precision"` the way the old in-process path did via
    Beancount's DisplayContext.MAXIMUM — without shipping that object across
    the process boundary.
    """
    from beancount.core.display_context import Precision

    dcontext = filtered.ledger.options["dcontext"]
    precision: dict[str, int] = {}
    for currency, ccontext in getattr(dcontext, "ccontexts", {}).items():
        fractional = ccontext.get_fractional(Precision.MAXIMUM)
        if fractional is not None:
            precision[str(currency)] = int(fractional)
    return precision


def _prune_tree(node: Any, terms: list[str], closed: set[str] | None = None) -> Any | None:
    """Keep nodes matching any term plus their ancestors for structure.

    In a filtered view, closed accounts drop out unless a still-open
    descendant was kept; ancestors stay for structure. Every retained node's
    subtree total is recomputed from what was kept, so a parent never reports
    the balance of a sibling the filter excluded.
    """
    kept = []
    for child in node.children:
        pruned = _prune_tree(child, terms, closed)
        if pruned is not None:
            kept.append(pruned)
    is_closed = bool(closed) and node.account in (closed or ())
    matches = not is_closed and any(term in node.account.casefold() for term in terms)
    if not (matches or kept):
        return None
    return dataclasses.replace(
        node,
        children=kept,
        balance_children=_sum(node.balance, *(child.balance_children for child in kept)),
    )
