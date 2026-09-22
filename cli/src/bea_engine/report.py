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
import unicodedata
from collections.abc import Callable, Iterable, Mapping
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.ledger.text import fold_account
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
    if not accounts:
        pruned = {name: tree for name, tree in sections.items()}
    else:
        closed: set[str] = set()
        for entry in filtered.entries:
            if isinstance(entry, Close):
                closed.add(entry.account)
        matches = _substring_match(accounts)
        pruned = {name: _prune_tree(tree, matches, closed) for name, tree in sections.items()}
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
    sections = _prune_sections(
        {
            "assets": data.assets_hierarchy,
            "liabilities": data.liabilities_hierarchy,
            "income": data.income_hierarchy,
            "expenses": data.expenses_hierarchy,
        },
        filtered.account,
    )
    trees = tuple(sections[name] for name in ("assets", "liabilities", "income", "expenses"))
    balances = [(filtered.end_date, balance) for tree in trees if tree is not None for balance in _tree_balances(tree)]
    for series in (data.assets_data, data.liabilities_data, data.income_interval_data, data.expenses_interval_data):
        balances.extend((point.date, point.balance) for point in series)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices, ledger_errors)
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    empty = type(data.assets_hierarchy.balance_children)()
    assets = trees[0].balance_children if trees[0] is not None else empty
    liabilities = trees[1].balance_children if trees[1] is not None else empty
    income = trees[2].balance_children if trees[2] is not None else empty
    expenses = trees[3].balance_children if trees[3] is not None else empty
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
    sections = _prune_sections(
        {"income": data.income_hierarchy, "expenses": data.expenses_hierarchy},
        filtered.account,
    )
    trees = (sections["income"], sections["expenses"])
    balances = [(filtered.end_date, balance) for tree in trees if tree is not None for balance in _tree_balances(tree)]
    for series in (data.income_data, data.expenses_data):
        balances.extend((point.date, point.balance) for point in series)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices, ledger_errors)
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    empty = type(data.income_hierarchy.balance_children)()
    kept = [tree.balance_children if tree is not None else empty for tree in trees]
    net = _summary(-_sum(*kept), conversion, incomplete=bool(valuation["missing_prices"]))
    periods: list[dict[str, Any]] = [
        {
            "date": profit.date,
            "income": income.balance,
            "expenses": expenses.balance,
            "net_profit": _summary(
                -profit.balance,
                conversion,
                incomplete=_unvalued(income.balance, conversion) or _unvalued(expenses.balance, conversion),
            ),
        }
        for income, expenses, profit in zip(data.income_data, data.expenses_data, data.net_profit_data, strict=True)
    ]
    return metadata | {
        "display_precision": _display_precision(filtered),
        "net_profit_signs": "positive_for_gain",
        "income": _tree_json(trees[0]) if trees[0] is not None else None,
        "expenses": _tree_json(trees[1]) if trees[1] is not None else None,
        "net_profit": net,
        "periods": periods,
    }


def _scoped_earnings(filtered: Any, conversion: str, unfiltered: Any) -> Any:
    """Current earnings over the accounts `--account` actually selected.

    `balance_sheet` sums the income and expenses hierarchies before this module
    prunes anything, so a filtered balance sheet reported the whole period's
    P&L beside a net worth that had been narrowed — and disagreed with the
    income statement run under the same filter. Recomputed from the pruned
    trees so the two reports answer alike.

    Returned untouched when no filter is set, so an unfiltered balance sheet is
    byte-identical to before.
    """
    if not filtered.account:
        return unfiltered
    from fava.modules.chart import ChartModule

    chart = ChartModule()
    options = filtered.ledger.options
    trees = _prune_sections(
        {key: chart.hierarchy(filtered, options[key], conversion) for key in ("name_income", "name_expenses")},
        filtered.account,
    )
    earnings = type(unfiltered)()
    for tree in trees.values():
        if tree is None:
            continue
        for currency, amount in tree.balance_children.items():
            earnings.add(currency, amount)
    return earnings


def _balance_sheet(
    filtered: Any, conversion: str, interval: str, allow_errors: bool, ledger_errors: list[str]
) -> dict[str, Any]:
    from fava.modules.financial_statements import FinancialStatementsModule

    data = FinancialStatementsModule().balance_sheet(filtered, _interval(interval), conversion)
    earnings = _scoped_earnings(filtered, conversion, data.current_earnings)
    sections = _prune_sections(
        {
            "assets": data.assets_hierarchy,
            "liabilities": data.liabilities_hierarchy,
            "equity": data.equity_hierarchy,
        },
        filtered.account,
    )
    trees = (sections["assets"], sections["liabilities"], sections["equity"])
    balances = [(filtered.end_date, balance) for tree in trees if tree is not None for balance in _tree_balances(tree)]
    balances.append((filtered.end_date, earnings))
    balances.extend((point.date, point.balance) for point in data.net_worth_data)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices, ledger_errors)
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    incomplete = bool(valuation["missing_prices"])
    empty = type(data.assets_hierarchy.balance_children)()
    assets = trees[0].balance_children if trees[0] is not None else empty
    liabilities = trees[1].balance_children if trees[1] is not None else empty
    worth = _summary(_sum(assets, liabilities), conversion, incomplete=incomplete)
    reconciled = not incomplete and not filtered.ledger.load_errors and conversion != "units" and not filtered.account
    return metadata | {
        "display_precision": _display_precision(filtered),
        "assets": _tree_json(trees[0]) if trees[0] is not None else None,
        "liabilities": _tree_json(trees[1]) if trees[1] is not None else None,
        "equity": _tree_json(trees[2]) if trees[2] is not None else None,
        "current_earnings": earnings,
        "current_earnings_signs": "negative_for_gain",
        "net_profit": _negated(earnings),
        "valuation_adjustment": data.valuation_adjustment if reconciled else None,
        "equity_total": data.equity_total if reconciled else None,
        "equity_reconciled": reconciled,
        "net_worth": worth,
        "net_worth_series": _summary_series_json(data.net_worth_data, conversion),
    }


def _trial_balance(filtered: Any, conversion: str, allow_errors: bool, ledger_errors: list[str]) -> dict[str, Any]:
    from fava.modules.financial_statements import FinancialStatementsModule

    data = FinancialStatementsModule().trial_balance(filtered, conversion)
    sections = {
        name: getattr(data, f"{name}_hierarchy") for name in ("assets", "liabilities", "equity", "income", "expenses")
    }
    sections = _prune_sections(sections, filtered.account)
    metadata = _metadata(filtered, conversion, ledger_errors) | _valuation(
        conversion,
        (
            (filtered.end_date, balance)
            for tree in sections.values()
            if tree is not None
            for balance in _tree_balances(tree)
        ),
        allow_errors,
        filtered.ledger.prices,
        ledger_errors,
    )
    return metadata | {
        "display_precision": _display_precision(filtered),
        **{name: (_tree_json(tree) if tree is not None else None) for name, tree in sections.items()},
    }


def _load(
    file: Path, account: str | None, time: str | None, conversion: str | None, allow_errors: bool
) -> tuple[Any, str, list[str]]:
    from fava.core.filters import FilterError
    from fava.core.loader import load_file
    from fava.ledger import FavaLedger

    # Ledger text loads NFC-normalized, so the match inputs are too; a pattern
    # in another normalization would otherwise miss the identical account.
    # Regex metacharacters are ASCII and pass through.
    if account is not None:
        account = unicodedata.normalize("NFC", account)
    if conversion is not None:
        conversion = unicodedata.normalize("NFC", conversion)
    entries, errors, options = load_file(str(file))
    ledger_errors = [format_error(error, ledger_file=file) for error in errors]
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
        # Account filters narrow balances, not the calendar. An over-narrow
        # `--account` that matches nothing must not read as "no dated activity".
        period_entries = filtered.entries if not filtered.account else filtered.ledger.all_entries
        dates = [entry.date for entry in period_entries if not isinstance(entry, Open | Close | Commodity)]
        start = min(dates) if dates else None
        end = max(dates) + timedelta(days=1) if dates else None
    data: dict[str, Any] = {
        "conversion": conversion,
        "period": {"start": start, "end_exclusive": end},
        "as_of": end - timedelta(days=1) if end else None,
        "account_filter": filtered.account,
        "account_filter_empty": bool(filtered.account) and not filtered.entries,
        "balance_signs": "beancount",
        "ledger_valid": not filtered.ledger.load_errors,
        "ledger_errors": ledger_errors,
        "price_sources": filtered.ledger.options.get("bea_managed_price_sources", []),
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


def _unvalued(balance: Mapping[str, Decimal], conversion: str) -> bool:
    """Whether this balance kept a commodity the report could not value.

    Conversion leaves what it has no price for in its own commodity, so a
    balance still holding a currency other than the one asked for is a partial
    valuation. Per-unit conversions ask for no valuation and are never partial.
    """
    if conversion in {"units", "at_cost", "at_value"}:
        return False
    return any(amount and currency != conversion for currency, amount in balance.items())


def _summary_series_json(series: Iterable[Any], conversion: str) -> list[dict[str, Any]]:
    """A balance series under the same partial-valuation policy as its headline.

    A row that kept a commodity the report could not value reads `null` — the
    "Unavailable" the headline shows — rather than falling back to per-unit
    amounts and contradicting it on the same screen. Rows that did convert keep
    their number, and a quiet row reads zero in the requested currency, the way
    a quiet income-statement period does. A per-unit conversion names only the
    commodities a row actually holds, so a quiet row there carries no amounts.
    """
    return [
        {
            "date": point.date,
            "balance": _summary(point.balance, conversion, incomplete=_unvalued(point.balance, conversion)),
        }
        for point in series
    ]


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


def _substring_match(accounts: Iterable[str]) -> Callable[[str], bool]:
    """`bea balance`'s documented matcher: a case-folded substring of the account name."""
    terms = [fold_account(term or "") for term in accounts]
    return lambda account: any(term in fold_account(account) for term in terms)


def _report_filter_match(account: str) -> Callable[[str], bool]:
    """`bea report --account`'s documented matcher: a parent account or a regular expression.

    This has to be the matcher Fava's `AccountFilter` already applied to the
    entries (`has_component` OR a case-insensitive regex `search`). Pruning the
    statement trees by substring instead — which is what `bea balance`
    documents — silently disagreed with it for every true regex: entries for
    `Expenses:(Dining|Groceries)` survived the entry filter, then every tree
    node was pruned because the pattern is a substring of no account name, and
    the report answered with empty totals and exit 0.

    Delegated rather than restated, because the interval series now narrow by
    the same rule: three copies of "what `--account` means" is how a report
    starts contradicting itself again.
    """
    from fava.core.filters import account_predicate

    return account_predicate(account)


def _prune_sections(sections: dict[str, Any], account: str | None) -> dict[str, Any]:
    """When `--account` is set, keep the subtrees the entry filter already kept."""
    if not account:
        return sections
    matches = _report_filter_match(account)
    return {name: _prune_tree(tree, matches) for name, tree in sections.items()}


def _prune_tree(node: Any, matches: Callable[[str], bool], closed: set[str] | None = None) -> Any | None:
    """Keep matching nodes plus their ancestors for structure.

    `matches` is the caller's account matcher, because `bea balance` and `bea
    report` document different ones — substrings there, parent-or-regex here —
    and a shared matcher can only honor one of them.

    In a filtered view, closed accounts drop out unless a still-open
    descendant was kept; ancestors stay for structure. Every retained node's
    subtree total is recomputed from what was kept, so a parent never reports
    the balance of a sibling the filter excluded.

    An ancestor kept *only* for structure contributes nothing of its own.
    Rolling its direct postings into the total was what made `bea balance Fund`
    answer 125.00 USD for a fund holding 25.00: the extra 100.00 was the
    parent's own posting, and the parent is on screen only to show where the
    fund sits. Its `balance` and `has_txns` are emptied to match, so a consumer
    reading the node directly is told the same thing as the rollup.
    """
    kept = []
    for child in node.children:
        pruned = _prune_tree(child, matches, closed)
        if pruned is not None:
            kept.append(pruned)
    is_closed = bool(closed) and node.account in (closed or ())
    in_scope = not is_closed and matches(node.account)
    if not (in_scope or kept):
        return None
    own = node.balance if in_scope else type(node.balance)()
    return dataclasses.replace(
        node,
        balance=own,
        has_txns=node.has_txns if in_scope else False,
        children=kept,
        balance_children=_sum(own, *(child.balance_children for child in kept)),
    )
