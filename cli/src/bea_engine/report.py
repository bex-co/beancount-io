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
from collections.abc import Callable, Collection, Iterable, Iterator, Mapping, Sequence
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.ledger.text import checked_operating_currencies, fold_account, regex_reads_otherwise
from bea_engine.query import format_error

KINDS = (
    "overview",
    "income-statement",
    "balance-sheet",
    "trial-balance",
    "holdings",
    "register",
    "capital-gains",
    "cash-flow",
)
GROUPINGS = ("account", "commodity")
INTERVALS = ("monthly", "quarterly", "yearly", "weekly", "daily")
CONVERSIONS = ("units", "at_cost", "at_value")
# Words people reach for that name a conversion mode rather than a currency;
# upper-casing them, as the hint used to, made a fake currency (w5/364).
_CONVERSION_WORDS = {"cost": "at_cost", "value": "at_value", "market": "at_value", "at_market": "at_value"}


def _conversion_hint(value: str) -> str:
    """The keyword a refused `--conversion` most likely meant, else its upper case."""
    folded = value.strip().lower().replace("-", "_")
    if folded in CONVERSIONS:
        return folded
    if folded in _CONVERSION_WORDS:
        return _CONVERSION_WORDS[folded]
    import difflib

    close = difflib.get_close_matches(folded, CONVERSIONS, n=1, cutoff=0.75)
    return close[0] if close else value.strip().upper()


def _valid_conversion(value: str) -> bool:
    """Use the ledger's currency grammar without accepting trailing text."""
    if value in CONVERSIONS:
        return True
    if not value.isascii():
        return False
    from beancount.parser.lexer import lex_iter_string

    lex: Callable[[str], Iterator[tuple[str, int, bytes, object]]] = lex_iter_string
    # Single-letter symbols are CAPITAL tokens in Beancount's currency grammar;
    # terminate the line so the lexer can distinguish them at end of input.
    tokens = list(lex(value + "\n"))
    return (
        len(tokens) == 2
        and tokens[0][0] in {"CURRENCY", "CAPITAL"}
        and tokens[0][2] == value.encode("utf-8")
        and tokens[1][0] == "EOL"
    )


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
    group_by: str = "account",
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict[str, Any]:
    """Compute one report or a filtered balance tree and return its JSON-ready payload."""
    # `AT_COST` lexes as a currency, so a keyword in another case is refused
    # before the currency grammar is consulted (w5/364).
    folded = None if conversion is None else conversion.strip().lower().replace("-", "_")
    if conversion is not None and (
        (folded in CONVERSIONS and conversion not in CONVERSIONS) or not _valid_conversion(conversion)
    ):
        suggestion = _conversion_hint(conversion)
        hint = f" Did you mean {suggestion!r}?" if _valid_conversion(suggestion) else ""
        raise protocol.UsageError(
            f"Invalid --conversion {conversion!r}. Use units, at_cost, at_value, "
            f"or an uppercase Beancount currency such as USD.{hint}"
        )
    if kind == "balances":
        return _balances(file, accounts or [], conversion=conversion, time=time, allow_errors=allow_errors)
    if kind not in KINDS:
        raise protocol.UsageError(f"Unknown report kind {kind!r}. Choose one of: {', '.join(KINDS)}.")
    if interval not in INTERVALS:
        raise protocol.UsageError(f"Unknown interval {interval!r}. Choose one of: {', '.join(INTERVALS)}.")
    # Validated for every kind, like the interval, but only holdings reads it.
    if group_by not in GROUPINGS:
        raise protocol.UsageError(f"Unknown grouping {group_by!r}. Choose one of: {', '.join(GROUPINGS)}.")
    bounds = _date_bounds(from_date, to_date)

    if kind == "capital-gains" and conversion is not None:
        # Gains stay in each lot's own currencies so the rows tie to the
        # booked gain postings; converting them would break that tie.
        raise protocol.UsageError("capital-gains reports in each lot's cost currency and takes no --conversion.")
    if kind == "cash-flow" and conversion is not None:
        # Rows must sum to the change in cash balances, and any valuation
        # difference would break that identity; the report always runs at cost.
        raise protocol.UsageError("cash-flow reports at cost so rows tie to cash balances and takes no --conversion.")
    filtered, resolved_conversion, ledger_errors = _load(file, account, time, conversion, allow_errors)
    if kind == "overview":
        return _overview(filtered, resolved_conversion, interval, allow_errors, ledger_errors)
    if kind == "income-statement":
        return _income_statement(filtered, resolved_conversion, interval, allow_errors, ledger_errors)
    if kind == "balance-sheet":
        return _balance_sheet(filtered, resolved_conversion, interval, allow_errors, ledger_errors)
    if kind == "holdings":
        return _holdings(filtered, resolved_conversion, group_by, allow_errors, ledger_errors)
    if kind == "register":
        return _register(filtered, resolved_conversion, allow_errors, ledger_errors)
    if kind == "capital-gains":
        return _capital_gains(filtered, bounds, ledger_errors)
    if kind == "cash-flow":
        return _cash_flow(filtered, bounds, ledger_errors)
    return _trial_balance(filtered, resolved_conversion, allow_errors, ledger_errors)


# Below this depth the tree cannot have overrun the recursion limit: encoding
# spends two frames per level and first overruns at 600 (w5/209), so a
# RecursionError beside shallower accounts came from elsewhere — a
# pathological regex, say — and must not be reported as deep nesting (w5/806).
_TOO_DEEP_LEVELS = 100


def too_deep(file: Path) -> protocol.LedgerError | None:
    """The refusal for a ledger whose account tree outruns Python's recursion limit.

    A report nests one level per account component, and building the tree and
    encoding the answer both walk it recursively, so an account several
    hundred components deep cannot be reported. Loading does not recurse, which
    is how the deepest account can still be named. None when no account is
    deep enough to blame: the recursion came from elsewhere.
    """
    from beancount.core.getters import get_accounts

    from fava.core.loader import load_file

    entries: Any = load_file(str(file))[0]
    deepest = max(sorted(get_accounts(entries)), key=lambda name: name.count(":"), default="")
    parts = deepest.split(":")
    if len(parts) < _TOO_DEEP_LEVELS:
        return None
    shown = deepest if len(parts) <= 4 else f"{':'.join(parts[:3])}:…:{parts[-1]}"
    return protocol.LedgerError(f"Account nesting is too deep to report: '{shown}' is {len(parts)} levels deep.")


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
        # Emptiness is the account's inventory, not its value in this
        # conversion: 10 EUR against -10 USD is worth 0 USD at par and still
        # held (w5/947).
        closed -= _holding_accounts(filtered.entries, closed)
        matches = _substring_match(accounts)
        pruned = {name: _prune_tree(tree, matches, closed) for name, tree in sections.items()}
    # Valuation covers only the accounts being shown: an unrelated unpriced
    # holding must not make a USD checking balance fail.
    previous = _summary_pair(filtered.ledger)
    metadata = (
        _metadata(filtered, resolved_conversion, ledger_errors)
        # `_metadata` judges emptiness by a report `--account`, which balance
        # never sets; here the filter is the substring terms.
        | {
            "account_filter": " ".join(accounts) if accounts else None,
            # The terms themselves: joined, `food cash` (two terms) and
            # `"food cash"` (one, matching nothing) read the same (w5/341).
            "account_filters": list(accounts) if accounts else None,
            "account_filter_empty": (empty := bool(accounts) and all(tree is None for tree in pruned.values())),
            "account_filter_periods": (
                _period_terms(accounts, filtered.ledger.fava_options.fiscal_year_end) if empty else []
            ),
        }
        | _valuation(
            resolved_conversion,
            (
                (filtered.end_date, balance)
                for tree in pruned.values()
                if tree is not None
                for balance in _tree_balances(tree, previous)
            ),
            allow_errors,
            filtered.ledger,
            ledger_errors,
            _tree_accounts(pruned.values()),
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
        filtered.ledger.root_accounts,
    )
    trees = tuple(sections[name] for name in ("assets", "liabilities", "income", "expenses"))
    previous = _summary_pair(filtered.ledger)
    balances = [
        (filtered.end_date, balance) for tree in trees if tree is not None for balance in _tree_balances(tree, previous)
    ]
    for series in (data.assets_data, data.liabilities_data, data.income_interval_data, data.expenses_interval_data):
        balances.extend((point.date, point.balance) for point in series)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger, ledger_errors, _tree_accounts(trees))
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    empty = type(data.assets_hierarchy.balance_children)()
    assets = trees[0].balance_children if trees[0] is not None else empty
    liabilities = trees[1].balance_children if trees[1] is not None else empty
    income = trees[2].balance_children if trees[2] is not None else empty
    expenses = trees[3].balance_children if trees[3] is not None else empty
    worth = _headline(_sum(assets, liabilities), conversion)
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
            "assets": _series_json(data.assets_data, conversion),
            "liabilities": _series_json(data.liabilities_data, conversion),
            "income": _series_json(data.income_interval_data, conversion),
            "expenses": _series_json(data.expenses_interval_data, conversion),
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
        filtered.ledger.root_accounts,
    )
    trees = (sections["income"], sections["expenses"])
    previous = _summary_pair(filtered.ledger)
    balances = [
        (filtered.end_date, balance) for tree in trees if tree is not None for balance in _tree_balances(tree, previous)
    ]
    for series in (data.income_data, data.expenses_data):
        balances.extend((point.date, point.balance) for point in series)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger, ledger_errors, _tree_accounts(trees))
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    empty = type(data.income_hierarchy.balance_children)()
    kept = [tree.balance_children if tree is not None else empty for tree in trees]
    net = _headline(-_sum(*kept), conversion)
    periods: list[dict[str, Any]] = [
        {
            "date": profit.date,
            "income": _cell(income.balance, conversion),
            "expenses": _cell(expenses.balance, conversion),
            "net_profit": _summary(
                -profit.balance,
                conversion,
                # Its own combined balance, as the headline judges: unpriced income
                # and expense that cancel leave a known profit (w5/940).
                incomplete=_unvalued(profit.balance, conversion),
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
        filtered.ledger.root_accounts,
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
        filtered.ledger.root_accounts,
    )
    trees = (sections["assets"], sections["liabilities"], sections["equity"])
    previous = _summary_pair(filtered.ledger)
    balances = [
        (filtered.end_date, balance) for tree in trees if tree is not None for balance in _tree_balances(tree, previous)
    ]
    balances.append((filtered.end_date, earnings))
    # The equity lines are as-of figures like the headline: only a commodity
    # still unvalued at the report date withholds them, not an earlier row's gap.
    incomplete = any(_unvalued(balance, conversion) for _, balance in balances)
    balances.extend((point.date, point.balance) for point in data.net_worth_data)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger, ledger_errors, _tree_accounts(trees))
    metadata = _metadata(filtered, conversion, ledger_errors, interval) | valuation
    empty = type(data.assets_hierarchy.balance_children)()
    assets = trees[0].balance_children if trees[0] is not None else empty
    liabilities = trees[1].balance_children if trees[1] is not None else empty
    worth = _headline(_sum(assets, liabilities), conversion)
    # `at_cost` leaves cost-less holdings (foreign cash) in their own units, so
    # an "adjustment" across unlike commodities was just the FX trade, claimed
    # as reconciled (w5/505): only a single-commodity view reconciles.
    single = len(_sum(assets, liabilities)) <= 1 and len(data.valuation_adjustment) <= 1
    reconciled = (
        not incomplete and not filtered.ledger.load_errors and conversion != "units" and single and not filtered.account
    )
    return metadata | {
        "display_precision": _display_precision(filtered),
        "assets": _tree_json(trees[0]) if trees[0] is not None else None,
        "liabilities": _tree_json(trees[1]) if trees[1] is not None else None,
        "equity": _tree_json(trees[2]) if trees[2] is not None else None,
        # The income statement's `net_profit` rule, so both reports agree.
        "current_earnings": _headline(earnings, conversion),
        "current_earnings_signs": "negative_for_gain",
        "net_profit": _headline(-earnings, conversion),
        # Named in the conversion currency, as the headlines are: an empty
        # inventory printed "—" beside `Net Worth: 0.00 USD` (w5/506).
        "valuation_adjustment": _headline(data.valuation_adjustment, conversion) if reconciled else None,
        "equity_total": _headline(data.equity_total, conversion) if reconciled else None,
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
    sections = _prune_sections(sections, filtered.account, filtered.ledger.root_accounts)
    previous = _summary_pair(filtered.ledger)
    metadata = _metadata(filtered, conversion, ledger_errors) | _valuation(
        conversion,
        (
            (filtered.end_date, balance)
            for tree in sections.values()
            if tree is not None
            for balance in _tree_balances(tree, previous)
        ),
        allow_errors,
        filtered.ledger,
        ledger_errors,
        _tree_accounts(sections.values()),
    )
    return metadata | {
        "display_precision": _display_precision(filtered),
        **{name: (_tree_json(tree) if tree is not None else None) for name, tree in sections.items()},
    }


def _holdings(
    filtered: Any, conversion: str, group_by: str, allow_errors: bool, ledger_errors: list[str]
) -> dict[str, Any]:
    """One row per held lot-group: units, average cost, cost basis, market value.

    Upstream Fava renders holdings client-side from balances, so there is no
    holdings module to wrap; this composes the same primitives instead. The
    account tree aggregates postings into per-account costed inventories, each
    lot is valued through the ledger's price map at the period end, and a
    currency conversion re-expresses the money columns through one more quote.
    Lots without cost are cash, not holdings, and a group none of whose lots
    is still held is fully sold — both are left out (w22/m3/t001). Net units
    are not that test: +2 HOOL long and -2 HOOL short net to 0 HOOL while both
    lots, and their -40 USD of basis, are still held (w5/947); such a group
    has no average cost.
    """
    from fava.core.tree import Tree

    prices = filtered.ledger.prices
    end = filtered.end_date
    target = None if conversion in CONVERSIONS else conversion
    sources = _price_source_index(filtered.ledger.options.get("bea_managed_price_sources", []))
    # The entry filter keeps whole transactions, so a counterparty's lots
    # survive it; every report prunes its tree by the same matcher instead.
    matches = _report_filter_match(filtered.account, filtered.ledger.root_accounts) if filtered.account else None
    # (scope..., commodity, cost currency) -> [units, cost basis, accounts].
    lots: dict[tuple[str, ...], list[Any]] = {}
    for name, node in sorted(Tree(filtered.entries).items()):
        if not name or (matches is not None and not matches(name)):
            continue
        for (commodity, cost), number in node.balance.items():
            if cost is None or number == 0:
                continue
            key: tuple[str, ...] = (
                (name, commodity, cost.currency) if group_by == "account" else (commodity, cost.currency)
            )
            found = lots.setdefault(key, [Decimal(0), Decimal(0), set()])
            found[0] += number
            found[1] += number * cost.number
            found[2].add(name)
    groups = []
    missing: list[tuple[str, str]] = []
    for key, (units, basis, accounts) in sorted(lots.items()):
        commodity, held = key[-2], key[-1]
        quote_date, price = prices.get_price_point((commodity, held), end)
        market = units * price if price is not None else basis
        if price is None:
            missing.append((commodity, held))
        currency = held
        leg_date = None
        if target is not None and target != held:
            leg_date, rate = prices.get_price_point((held, target), end)
            if rate is not None:
                basis, market = basis * rate, market * rate
                price = price * rate if price is not None else None
                currency = target
            else:
                missing.append((held, target))
        average = basis / units if units else None
        group: dict[str, Any] = {"account": key[0]} if group_by == "account" else {"accounts": sorted(accounts)}
        group |= {
            "commodity": commodity,
            "units": {"number": units, "currency": commodity},
            "average_cost": {"number": average, "currency": currency} if average is not None else None,
            "cost_basis": {"number": basis, "currency": currency},
            "market_value": {"number": market, "currency": currency},
            "price": {"number": price, "currency": currency} if price is not None else None,
            "price_date": quote_date,
            "price_source": _quote_source(sources, commodity, held, quote_date),
            "conversion_source": (_quote_source(sources, held, target, leg_date) if leg_date is not None else None),
        }
        groups.append(group)
    valuation = _holdings_valuation(missing, end, allow_errors, filtered.ledger, ledger_errors)
    totals: dict[str, dict[str, Decimal]] = {"cost_basis": {}, "market_value": {}}
    for group in groups:
        for column in ("cost_basis", "market_value"):
            amount = group[column]
            total = totals[column]
            total[amount["currency"]] = total.get(amount["currency"], Decimal(0)) + amount["number"]
    metadata = _metadata(filtered, conversion, ledger_errors) | valuation
    return metadata | {
        "display_precision": _display_precision(filtered),
        "group_by": group_by,
        "groups": groups,
        "totals": totals,
    }


def _price_source_index(records: list[dict[str, Any]]) -> dict[tuple[str, str], list[dict[str, Any]]]:
    """Managed sources by the pair they quote, in include order."""
    index: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for record in records:
        pair = (str(record.get("commodity")), str(record.get("quote")))
        index.setdefault(pair, []).append(record)
    return index


def _quote_source(
    sources: dict[tuple[str, str], list[dict[str, Any]]], base: str, quote: str | None, when: date | None
) -> dict[str, Any] | None:
    """The managed source behind one quote, reusing the w5/m7 provenance fields.

    A source claims the quote when the pair matches and the quote date is one
    of its effective dates — the points that survived shadowing into the
    ledger. A ledger-authored quote matches no source and answers None: it is
    not a live price at all, stale or otherwise (w22/m3/t004).
    """
    if when is None or quote is None:
        return None
    day = when.isoformat()
    for record in sources.get((base, quote), []):
        if day in (record.get("effective_dates") or []):
            return {
                "alias": record.get("alias"),
                "freshness": record.get("freshness"),
                "observed_at": record.get("observed_at"),
                "revision": record.get("revision"),
            }
    return None


def _holdings_valuation(
    missing: list[tuple[str, str]],
    end: date | None,
    allow_errors: bool,
    ledger: Any,
    ledger_errors: list[str],
) -> dict[str, Any]:
    """The strict/partial contract for holdings prices, in `_valuation`'s shape.

    `_valuation` judges leftovers against a report-wide conversion; a holding
    is already unvalued when its own commodity has no quote in its cost
    currency, whatever the conversion, so the legs are named explicitly. Each
    missing leg values at cost (or stays in its own currency) under
    `--allow-errors` and fails strict reads, the same policy as every report.
    """
    legs = sorted(set(missing))
    pairs = [{"from": base, "to": quote} for base, quote in legs]
    dated = [{"from": base, "to": quote, "date": end} for base, quote in legs]
    summary = []
    for base, quote in legs:
        all_prices = ledger.prices.get_all_prices((base, quote))
        if not all_prices:
            summary.append(f"{base} has no {quote} price at any date; valued at cost")
            continue
        earliest = min(point[0] for point in all_prices)
        summary.append(f"{base} → {quote} has no price before {earliest}; earlier holdings valued at cost")
    if pairs and not allow_errors:
        raise protocol.LedgerError(
            f"Missing prices for {', '.join(sorted({base for base, _ in legs}))}. "
            "Each holding is valued at the period end. Add prices covering the dates below "
            "or pass --allow-errors for cost-basis values.",
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


def _register(filtered: Any, conversion: str, allow_errors: bool, ledger_errors: list[str]) -> dict[str, Any]:
    """One account's dated postings with a running balance, oldest first.

    The `--account` pattern selects the register's root: the one matched
    account every other matched posting account sits under, refused when the
    pattern spans several trees. The rows are that subtree's postings (plus
    its balance assertions, which move nothing), oldest first, each naming
    its own account. The running balance converts through the same call the
    statement trees use, so the last row is the trial-balance total
    (w22/m3/t002).
    """
    from beancount.core.data import Balance

    from fava.core.conversion import cost_or_value
    from fava.core.group_entries import TransactionPosting, group_entries_by_account
    from fava.core.inventory import CounterInventory

    if not filtered.account:
        raise protocol.UsageError(
            "Register needs --account. Name the account to list, such as --account Assets:Checking.",
            ledger_errors=ledger_errors,
        )
    matches = _report_filter_match(filtered.account, filtered.ledger.root_accounts)
    by_account = group_entries_by_account(filtered.entries)
    active = sorted(
        name
        for name, rows in by_account.items()
        if matches(name) and any(isinstance(row, TransactionPosting) or isinstance(row, Balance) for row in rows)
    )
    # A pattern that literally names an account path selects it — including a
    # parent with no postings of its own — while a true regex only resolves
    # when its matched accounts collapse under one of themselves. Regex
    # metacharacters can never spell a real account path, so the literal test
    # cannot mistake one for the other.
    root = _register_root(filtered.account, active)
    if active and root is None:
        matched = ", ".join(active)
        raise protocol.UsageError(
            f"Register needs one account; {filtered.account!r} matches several: {matched}. Name one account to list.",
            ledger_errors=ledger_errors,
        )
    # The pattern selects the root; the register shows the whole subtree, so a
    # regex that matches a parent but not its children still ends at the total.
    wanted = {name for name in by_account if root is not None and (name == root or name.startswith(root + ":"))}
    ordered: list[tuple[Any, str]] = [(row, name) for name in by_account for row in by_account[name] if name in wanted]

    def _row_date(row: Any) -> Any:
        return row.transaction.date if isinstance(row, TransactionPosting) else row.date

    ordered.sort(key=lambda item: _row_date(item[0]))
    rows: list[dict[str, Any]] = []
    running = CounterInventory()
    balances: list[tuple[date | None, Mapping[str, Decimal]]] = []
    prices = filtered.ledger.prices
    for row, name in ordered:
        if isinstance(row, TransactionPosting):
            posting = row.posting
            running.add_position(posting)
            cost = posting.cost
            rows.append(
                {
                    "date": row.transaction.date,
                    "entry": "transaction",
                    "account": name,
                    "payee": row.transaction.payee,
                    "narration": row.transaction.narration,
                    "amount": {"number": posting.units.number, "currency": posting.units.currency},
                    "cost": (
                        {"number": cost.number, "currency": cost.currency, "date": cost.date}
                        if cost is not None
                        else None
                    ),
                }
            )
        elif isinstance(row, Balance):
            rows.append(
                {
                    "date": row.date,
                    "entry": "balance",
                    "account": name,
                    "payee": None,
                    "narration": None,
                    "amount": {"number": row.amount.number, "currency": row.amount.currency},
                    "cost": None,
                }
            )
        else:
            continue
        balance = _balance_map(cost_or_value(running, conversion, prices, filtered.end_date))
        rows[-1]["balance"] = balance
        balances.append((filtered.end_date, balance))
    if not rows:
        balances.append((filtered.end_date, {}))
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger, ledger_errors, wanted)
    metadata = _metadata(filtered, conversion, ledger_errors) | valuation
    return metadata | {
        "display_precision": _display_precision(filtered),
        "account": root,
        "rows": rows,
    }


def _register_root(pattern: str, active: list[str]) -> str | None:
    """The one subtree `pattern` names, or None when it spans several."""
    if active:
        candidate = ":".join(active[0].split(":")[: len(pattern.split(":"))])
        if candidate.lower() == pattern.lower() and all(
            name == candidate or name.startswith(candidate + ":") for name in active
        ):
            return candidate
        roots = [name for name in active if all(other == name or other.startswith(name + ":") for other in active)]
        if len(roots) == 1:
            return roots[0]
    return None


def _date_bounds(from_date: str | None, to_date: str | None) -> tuple[date | None, date | None]:
    """Inclusive sale-date bounds for capital-gains; malformed input is refused."""
    start = end = None
    if from_date is not None:
        try:
            start = date.fromisoformat(from_date)
        except ValueError as exc:
            raise protocol.UsageError(f"Invalid --from-date {from_date!r}. Use YYYY-MM-DD.") from exc
    if to_date is not None:
        try:
            end = date.fromisoformat(to_date)
        except ValueError as exc:
            raise protocol.UsageError(f"Invalid --to-date {to_date!r}. Use YYYY-MM-DD.") from exc
    if start is not None and end is not None and start > end:
        raise protocol.UsageError(f"--from-date {from_date!r} is after --to-date {to_date!r}.")
    return start, end


def _capital_gains(filtered: Any, bounds: tuple[date | None, date | None], ledger_errors: list[str]) -> dict[str, Any]:
    """Realized gain/loss per reduction, from the booked cost and price.

    A closed lot is a reducing posting that carries both: splits and
    own-account transfers reduce without a price, so they are movements,
    not sales. FIFO vs specific-lot is the ledger's own booking —
    Beancount matched the lot at load, and the posting's cost names it,
    acquisition date included. Proceeds and basis stay in their own
    currencies, and totals never sum across currencies. The one-year boundary
    (`held_days > 365`) is a bare day count with no jurisdiction rules
    attached (w22/m4/t001).
    """
    from beancount.core.data import Transaction
    from beancount.core.position import Cost

    matches = _report_filter_match(filtered.account, filtered.ledger.root_accounts) if filtered.account else None
    start, end = bounds
    rows: list[dict[str, Any]] = []
    for entry in filtered.entries:
        if not isinstance(entry, Transaction):
            continue
        if start is not None and entry.date < start:
            continue
        if end is not None and entry.date > end:
            continue
        for posting in entry.postings:
            units = posting.units
            cost = posting.cost
            price = posting.price
            # A booked sale: negative units with a resolved cost and price.
            # Anything less (an unmatched cost spec, an incomplete posting)
            # is not a lot the books closed.
            if (
                units is None
                or units.number is None
                or units.number >= 0
                or not isinstance(cost, Cost)
                or cost.number is None
                or price is None
                or price.number is None
            ):
                continue
            if matches is not None and not matches(posting.account):
                continue
            quantity = -units.number
            proceeds = quantity * price.number
            basis = quantity * cost.number
            acquired = cost.date
            held = (entry.date - acquired).days if acquired is not None else None
            # Cost and price currencies always match: the loader refuses a
            # mixed posting before any report sees it (w22/m4/t001).
            gain = {"number": proceeds - basis, "currency": cost.currency}
            rows.append(
                {
                    "account": posting.account,
                    "commodity": units.currency,
                    "acquired": acquired,
                    "sold": entry.date,
                    "held_days": held,
                    "long_held": (held > 365) if held is not None else None,
                    "quantity": {"number": quantity, "currency": units.currency},
                    "proceeds": {"number": proceeds, "currency": price.currency},
                    "basis": {"number": basis, "currency": cost.currency},
                    "gain": gain,
                }
            )
    totals: dict[str, dict[str, Decimal]] = {"one_year_or_less": {}, "more_than_one_year": {}, "holding_unknown": {}}
    for row in rows:
        if row["held_days"] is None:
            bucket = totals["holding_unknown"]
        elif row["held_days"] > 365:
            bucket = totals["more_than_one_year"]
        else:
            bucket = totals["one_year_or_less"]
        currency = row["gain"]["currency"]
        bucket[currency] = bucket.get(currency, Decimal(0)) + row["gain"]["number"]
    # No quotes are read — every figure comes from booked postings — so
    # valuation is trivially complete; the keys stay for the shared heading.
    metadata = _metadata(filtered, "units", ledger_errors) | {
        "valuation": "complete",
        "missing_prices": [],
        "missing_price_dates": [],
        "missing_price_summary": [],
    }
    return metadata | {
        "display_precision": _display_precision(filtered),
        "rows": rows,
        "totals": totals,
    }


# Cash-flow classification mirrors the dashboard statement (ADR003/ADR023):
# `cash-flow-role` open metadata wins, else these name patterns mark cash and
# the root maps to an activity. Same patterns, same order, same roots.
_CASH_EQUIVALENT_PATTERNS = (
    re.compile(r"^Assets:.*Cash$", re.IGNORECASE),
    re.compile(r"^Assets:.*Checking$", re.IGNORECASE),
    re.compile(r"^Assets:.*Savings$", re.IGNORECASE),
    re.compile(r"^Assets:.*Bank", re.IGNORECASE),
)
_CASH_FLOW_ACTIVITY_BY_ROOT = {
    "Income": "operating",
    "Expenses": "operating",
    "Assets": "investing",
    "Liabilities": "financing",
    "Equity": "financing",
}
_CASH_FLOW_ROLES = ("cash", "operating", "investing", "financing")
_CASH_FLOW_ROLE_KEY = "cash-flow-role"
_CASH_FLOW_ACTIVITIES = ("operating", "investing", "financing")


def _root_type_map(options: Any) -> dict[str, str]:
    """Ledger root names read as their Beancount type (w4/1022 on the dashboard)."""
    names = (
        ("name_assets", "Assets"),
        ("name_liabilities", "Liabilities"),
        ("name_equity", "Equity"),
        ("name_income", "Income"),
        ("name_expenses", "Expenses"),
    )
    return {str(options.get(key, canonical)): canonical for key, canonical in names}


def _resolve_cash_flow_role(account: str, declared: Any, root_types: Mapping[str, str]) -> tuple[str, str, Any]:
    """Role, source, and invalid declared value for one account (ADR003).

    A declared `cash-flow-role` decides both axes at once; anything else —
    missing key, typo, wrong case, non-string — falls through to the name
    heuristics, and the raw value comes back for flagging. Never raises.
    """
    first, _, rest = account.partition(":")
    typed = root_types.get(first, first) + (f":{rest}" if rest else "")
    if isinstance(declared, str) and declared in _CASH_FLOW_ROLES:
        return declared, "declared", None
    if any(pattern.search(typed) for pattern in _CASH_EQUIVALENT_PATTERNS):
        role: str = "cash"
    else:
        role = _CASH_FLOW_ACTIVITY_BY_ROOT.get(typed.split(":", 1)[0], "financing")
    return role, "heuristic", declared


def _cash_accounts(opens: Mapping[str, Any], root_types: Mapping[str, str]) -> dict[str, str]:
    """CCE membership with heuristic inheritance down subtrees (model.ts).

    A declared role decides its own account; otherwise a cash-matching
    ancestor's membership carries down, else the account's own name decides.
    Only Assets-rooted accounts can be cash. Returns account -> source.
    """
    members: dict[str, str] = {}
    for account in sorted(opens):
        if root_types.get(account.split(":", 1)[0]) != "Assets":
            continue
        parts = account.split(":")
        source: str | None = None
        for depth in range(2, len(parts) + 1):
            name = ":".join(parts[:depth])
            role, resolved, _ = _resolve_cash_flow_role(name, opens.get(name), root_types)
            if resolved == "declared":
                source = "declared" if role == "cash" else None
            elif source is not None or role == "cash":
                source = source if source is not None else "heuristic"
            else:
                source = None
        if source is not None:
            members[account] = source
    return members


def _cash_flow(filtered: Any, bounds: tuple[date | None, date | None], ledger_errors: list[str]) -> dict[str, Any]:
    """Direct-method cash flow: inverted non-cash flows explain the CCE change.

    Flows and closing accumulate posting inventories over their windows and
    convert at cost — the conversion the dashboard statement reconciles
    under (`at_cost` reads booked costs only, so lots collapse to the cash
    they moved and cost-less cash stays in its own units). Flows cover
    `--time` intersected with the inclusive `--from-date`/`--to-date`
    bounds; closing covers cash postings before its exclusive end; opening
    is closing minus net change, the double-entry identity the dashboard
    statement is built on. `--account` narrows rows and the CCE set together
    so the statement still reconciles. Accounts outside the five roots are
    excluded from rows and surface via the shared unrooted-accounts note.
    Membership — not the direct role — gates rows, so an inherited-cash
    leaf is never double-counted.
    """
    from beancount.core.data import Open, Transaction

    from fava.core.conversion import cost_or_value
    from fava.core.inventory import CounterInventory

    matches = _report_filter_match(filtered.account, filtered.ledger.root_accounts) if filtered.account else None
    root_types = _root_type_map(filtered.ledger.options)
    opens: dict[str, Any] = {}
    for entry in filtered.ledger.all_entries:
        if isinstance(entry, Open):
            opens[entry.account] = (entry.meta or {}).get(_CASH_FLOW_ROLE_KEY)
    members = _cash_accounts(opens, root_types)
    prices = filtered.ledger.prices

    start, end = bounds
    _, period_end = filtered.period
    cutoff = period_end
    if end is not None:
        bound_end = None if end == date.max else end + timedelta(days=1)
        cutoff = bound_end if cutoff is None or bound_end is None else min(cutoff, bound_end)

    flow_books: dict[str, CounterInventory] = {}
    for entry in filtered.entries:
        if not isinstance(entry, Transaction):
            continue
        if start is not None and entry.date < start:
            continue
        if end is not None and entry.date > end:
            continue
        for posting in entry.postings:
            if posting.units is None or posting.units.number is None:
                continue
            if matches is not None and not matches(posting.account):
                continue
            # Fava's inventory reads units/cost duck-typed; beancount postings
            # flow through the same call in interval_totals at runtime.
            flow_books.setdefault(posting.account, CounterInventory()).add_position(posting)  # type: ignore[arg-type]
    flows = {account: _balance_map(cost_or_value(book, "at_cost", prices)) for account, book in flow_books.items()}

    closing_books: dict[str, CounterInventory] = {}
    if cutoff is not None:
        for entry in filtered.ledger.all_entries:
            if not isinstance(entry, Transaction) or entry.date >= cutoff:
                continue
            for posting in entry.postings:
                if posting.units is None or posting.units.number is None:
                    continue
                if posting.account not in members:
                    continue
                if matches is not None and not matches(posting.account):
                    continue
                # Same duck-typed call as the flows loop above.
                closing_books.setdefault(posting.account, CounterInventory()).add_position(posting)  # type: ignore[arg-type]
    closing = {account: _balance_map(cost_or_value(book, "at_cost", prices)) for account, book in closing_books.items()}

    sections: dict[str, list[dict[str, Any]]] = {activity: [] for activity in _CASH_FLOW_ACTIVITIES}
    for account in sorted(flows):
        if account in members:
            continue
        if root_types.get(account.split(":", 1)[0]) not in _CASH_FLOW_ACTIVITY_BY_ROOT:
            continue
        role, source, _ = _resolve_cash_flow_role(account, opens.get(account), root_types)
        if role == "cash":
            continue
        amounts = {currency: -total for currency, total in flows[account].items()}
        if all(total == 0 for total in amounts.values()):
            continue
        sections[role].append({"account": account, "amounts": amounts, "role_source": source})

    totals = {activity: _sum_amounts(row["amounts"] for row in rows) for activity, rows in sections.items()}
    net_change = _sum_amounts(totals.values())
    closing_total = _sum_amounts(closing.values())
    opening = {
        currency: closing_total.get(currency, Decimal(0)) - net_change.get(currency, Decimal(0))
        for currency in set(closing_total) | set(net_change)
    }
    invalid_role_values = [
        {"account": account, "value": _jsonable_role_value(value)}
        for account in sorted(opens)
        if (value := opens[account]) is not None and not (isinstance(value, str) and value in _CASH_FLOW_ROLES)
    ]
    # No quotes are read — at_cost converts lots from booked costs, and
    # cost-less positions stay in their own units — so valuation is trivially
    # complete; the keys stay for the shared heading.
    metadata = _metadata(filtered, "at_cost", ledger_errors) | {
        "valuation": "complete",
        "missing_prices": [],
        "missing_price_dates": [],
        "missing_price_summary": [],
    }
    return metadata | {
        "display_precision": _display_precision(filtered),
        "row_signs": "positive_for_inflow",
        "sections": sections,
        "totals": totals,
        "net_change": net_change,
        "opening": opening,
        "closing": closing_total,
        "cash_accounts": [
            {"account": account, "balance": closing.get(account, {}), "role_source": members[account]}
            for account in sorted(members)
            if matches is None or matches(account)
        ],
        "invalid_role_values": invalid_role_values,
    }


def _sum_amounts(maps: Iterable[Mapping[str, Decimal]]) -> dict[str, Decimal]:
    """Add per-currency maps, keeping zero keys (unlike inventory `add`)."""
    totals: dict[str, Decimal] = {}
    for amounts in maps:
        for currency, total in amounts.items():
            totals[currency] = totals.get(currency, Decimal(0)) + total
    return totals


def _jsonable_role_value(value: Any) -> Any:
    """A declared role value safe for the JSON envelope."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


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
        from bea_engine.ledger.write import root_read_hint

        hint = root_read_hint(file)
        raise protocol.LedgerError(
            f"Ledger has {len(ledger_errors)} error(s). Pass --allow-errors to report anyway.",
            details=[*ledger_errors, *([hint] if hint else [])],
        )
    ledger = FavaLedger(entries, errors, options)
    otherwise = regex_reads_otherwise(account, re.IGNORECASE) if account is not None else None
    if otherwise is not None:
        # Before the filter compiles it, which would only warn (w5/429).
        raise protocol.UsageError(f"Invalid account filter {account!r}: {otherwise}.", ledger_errors=ledger_errors)
    if account is not None and (problem := _invalid_pattern(account)) is not None:
        raise protocol.UsageError(
            f"Invalid account filter {account!r}: {problem}. Pass a parent account such as Expenses:Food, or a "
            "regular expression such as 'Expenses:(Food|Rent)' or '.*Food.*'.",
            ledger_errors=ledger_errors,
        )
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
        boundary = _unreportable_boundary(entries)
        if time is None and boundary is not None:
            # Not a filter problem at all: there is no filter. Name the fact
            # that cannot be bounded, and the option that gets an answer.
            raise protocol.UsageError(
                f"This ledger's latest dated entry is {boundary.isoformat()}, and a report has to look one "
                f"day past the period it covers — which {date.max.isoformat()} has no room for.",
                details=[
                    f"Name the period explicitly, as in --time {boundary.year}, and it reports everything before "
                    f"{boundary.isoformat()}, noting that entries dated {boundary.isoformat()} itself are left out.",
                    "`bea check`, `bea list` and `bea query` read this ledger without a period and are unaffected.",
                ],
                ledger_errors=ledger_errors,
            ) from exc
        if time is not None and _FISCAL_QUARTER_RE.search(time):
            _refuse_quarter_without_quarters(ledger, entries, time, ledger_errors)
        raise protocol.UsageError(
            f"Invalid time filter {time!r}. Use month, year, YYYY, YYYY-MM, "
            f"or a date range such as '2026-01 - 2026-06'. {exc}",
            ledger_errors=ledger_errors,
        ) from exc
    if time is not None and _FISCAL_FILTER_RE.search(time):
        _require_fiscal_year_end(ledger, file, time, ledger_errors)
    if conversion is not None:
        return filtered, conversion, ledger_errors
    currencies = checked_operating_currencies(options)
    return filtered, currencies[0] if len(currencies) == 1 else "units", ledger_errors


# Fava's fiscal spellings: `FY2026`, `FY2026-Q1`, and the relative
# `fiscal_year` / `fiscal_quarter`, alone or inside a range.
_FISCAL_FILTER_RE = re.compile(r"\bfy\d{4}|fiscal_(?:year|quarter)", re.IGNORECASE)


_FISCAL_QUARTER_RE = re.compile(r"\bfy\d{4}-q\d|fiscal_quarter", re.IGNORECASE)


def _period_terms(terms: Iterable[str], fiscal_year_end: Any) -> list[str]:
    """The account filter terms `--time` reads as a period.

    `bea balance 2026-01` matched no account and said only so, with exit 0,
    to a user used to another tool's period argument (w5/445). Read with the
    ledger's fiscal year end, as `--time` reads them: a fiscal quarter of a
    year without quarters was suggested, then refused (w5/808).
    """
    from fava.util.date import parse_date

    periods = []
    for term in terms:
        try:
            start, end = parse_date(term, fiscal_year_end)
        except (ValueError, OverflowError):
            continue
        if start is not None or end is not None:
            periods.append(term)
    return periods


def _refuse_quarter_without_quarters(ledger: Any, entries: Any, time: str, ledger_errors: list[str]) -> None:
    """Refuse a fiscal quarter, in any spelling, on a fiscal year that does not start on the 1st.

    Fava defines no quarters then. `fiscal_quarter` said so, but Fava's
    explicit `FY2027-Q2` came back as `Failed to parse date`, which blamed
    the spelling of a period that does not exist (w5/329).
    """
    from fava.util.date import parse_fye_string

    end = ledger.fava_options.fiscal_year_end
    if end.has_quarters():
        return
    # The declaration in effect is the last valid one, as Fava reads them;
    # the first was cited, and could name another year end (w5/808).
    declared = next(
        (
            entry
            for entry in reversed(_fiscal_year_end_declarations(entries))
            if len(entry.values) > 1 and parse_fye_string(str(entry.values[1].value)) == end
        ),
        None,
    )
    where = f" at {declared.meta.get('filename')}:{declared.meta.get('lineno')}" if declared is not None else ""
    value = f"{end.month_of_year:02d}-{end.day:02d}"
    year = re.search(r"\bfy(\d{4})", time, re.IGNORECASE)
    whole = f"FY{year.group(1)}" if year is not None else "fiscal_year"
    raise protocol.UsageError(
        f"--time {time!r} names a fiscal quarter, but this ledger's fiscal year ends on {value} "
        f'(custom "fava-option" "fiscal-year-end"{where}), so it does not start on the first of a month and '
        "has no fiscal quarters.",
        details=[f"Report the whole fiscal year ({whole}), or name the months by calendar dates."],
        ledger_errors=ledger_errors,
    )


def _near_fiscal_year_end(name: str) -> bool:
    """Whether an option name is a misspelling of `fiscal-year-end`."""
    from difflib import SequenceMatcher

    letters = re.sub(r"[^a-z0-9]", "", name.casefold())
    return SequenceMatcher(None, letters, "fiscalyearend").ratio() >= 0.8


def _fiscal_year_end_declarations(entries: Iterable[Any]) -> list[Any]:
    """The ledger's `fiscal-year-end` Fava options, in file order."""
    return [
        entry
        for entry in entries
        if type(entry).__name__ == "Custom"
        and entry.type == "fava-option"
        and entry.values
        and str(entry.values[0].value).replace("_", "-") == "fiscal-year-end"
    ]


def _require_fiscal_year_end(ledger: Any, file: Path, time: str, ledger_errors: list[str]) -> None:
    """Refuse a fiscal period when the ledger's `fiscal-year-end` did not parse.

    Option parsing collects a bad value rather than raising and leaves the
    calendar-year default in place, so `FY2026` would report January through
    December with nothing saying the declared year end was dropped. Only a
    fiscal filter reads the option; every other report is unaffected.
    """
    # Only the last declaration states the year end in force: Fava keeps the
    # last valid value, so an invalid line before a valid one refused a
    # period the later line defined (w5/808). An invalid last line is still
    # refused rather than silently falling back to an earlier one.
    declarations = _fiscal_year_end_declarations(ledger.all_entries_by_type.Custom)
    last = declarations[-1] if declarations else None
    invalid = [format_error(error, ledger_file=file) for error in ledger.fava_options_errors if error.entry is last]
    problem = "is invalid"
    if not declarations:
        # bea reads no other Fava option, so a misspelled name is the usual
        # way this one goes missing: `fiscal-year-ends` silently made FY2026
        # the calendar year, though Fava flags the unknown option (w5/807).
        problem = "looks misspelled"
        invalid = [
            f"{format_error(error, ledger_file=file).rstrip('.')}. It looks like fiscal-year-end, the only Fava "
            "option bea reads."
            for error in ledger.fava_options_errors
            if error.entry.values and _near_fiscal_year_end(str(error.entry.values[0].value))
        ]
    # Fava reads months 13-24 as a year end in the following calendar year,
    # but its parser takes any month modulo 12: "00-31" made FY2026 calendar
    # 2025, and "99-31" moved it to 2033-34 (w5/809).
    end = ledger.fava_options.fiscal_year_end
    if not invalid and not 1 <= end.month <= 24:
        invalid = [
            f'"{end.month:02d}-{end.day:02d}" names month {end.month}; a fiscal year end is MM-DD with a month '
            "from 01 to 12, or 13 to 24 for one that falls in the following calendar year."
        ]
    if invalid:
        raise protocol.LedgerError(
            f"The ledger's fiscal-year-end option {problem}, so the fiscal period in --time {time!r} is undefined.",
            details=[
                *invalid,
                'Declare the year end as MM-DD, such as "06-30", or name the period by calendar dates.',
            ],
            ledger_errors=ledger_errors,
        )


def _invalid_pattern(value: str) -> str | None:
    """Why `value` is neither an account name nor a regular expression, or None.

    The filter fell back to plain equality for a pattern that does not
    compile, so `*Food*` (a shell-glob habit) reported with exit 0 and missed
    accounts, and a wrapper's compile error quoted positions the user never
    typed (w5/502). Python's message is for the user's own pattern.
    """
    from beancount.core import account

    if account.is_valid(value):
        return None
    try:
        re.compile(value, re.IGNORECASE)
    except (re.error, OverflowError, RecursionError, MemoryError) as exc:
        # A repetition too large or nesting too deep to compile is an invalid
        # pattern like any other (w5/806); MemoryError carries no message.
        return str(exc) or "cannot be compiled"
    return None


def _unreportable_boundary(entries: Any) -> date | None:
    """The dated fact whose period a report cannot bound, if the ledger has one.

    A report's period is exclusive at the end, so building one adds a day to
    the last dated entry. `datetime.date` has no day after 9999-12-31, so a
    ledger reaching that boundary cannot be given a period at all — and the
    overflow used to surface as `Invalid time filter None`, naming an option
    the caller never passed and no ledger fact at all.

    Declarations (Open, Close, Commodity, Custom, Query) are skipped for the
    same reason the period bounds skip them: they do not date activity.

    Returning None means the failure was something else, and the caller falls
    back to its ordinary filter diagnostic rather than inventing a date story.
    """
    from fava.ledger import PERIOD_DECLARATIONS

    for entry in reversed(entries or ()):
        if isinstance(entry, PERIOD_DECLARATIONS):
            continue
        return entry.date if entry.date >= date.max else None
    return None


def _interval(value: str) -> Any:
    from fava.util.date import INTERVALS as FAVA_INTERVALS

    return FAVA_INTERVALS[value]


def _metadata(filtered: Any, conversion: str, ledger_errors: list[str], interval: str | None = None) -> dict[str, Any]:
    from beancount.core.data import Custom

    # Every dated fact the report covers sets the period, not transactions
    # alone: a period-end balance assertion is the last thing a close writes,
    # and a report that stopped before it would omit its own evidence. Opens,
    # closes, commodities, customs and stored queries are declarations — they
    # conventionally carry a placeholder date decades before any activity
    # (`1970-01-01 custom "fava-option" …`). Account filters
    # narrow balances, not the calendar: an over-narrow `--account` that
    # matches nothing must not read as "no dated activity". The interval
    # series are cut from the same bounds, so they cover exactly this period.
    start: date | None
    end: date | None
    start, end = filtered.period
    data: dict[str, Any] = {
        "conversion": conversion,
        "period": {"start": start, "end_exclusive": end},
        "as_of": end - timedelta(days=1) if end else None,
        "account_filter": filtered.account,
        "account_filters": [filtered.account] if filtered.account else None,
        # A `custom` directive naming the account (a budget line) passes the
        # account filter but makes no tree: the report printed only its
        # heading and said the filter matched (w5/504).
        "account_filter_empty": (
            empty := bool(filtered.account) and all(isinstance(entry, Custom) for entry in filtered.entries)
        ),
        "account_filter_periods": (
            _period_terms([filtered.account], filtered.ledger.fava_options.fiscal_year_end) if empty else []
        ),
        "balance_signs": "beancount",
        "ledger_valid": not filtered.ledger.load_errors,
        "ledger_errors": ledger_errors,
        "price_sources": filtered.ledger.options.get("bea_managed_price_sources", []),
        "unrooted_accounts": _unrooted_accounts(filtered),
    }
    if interval:
        data["interval"] = interval
    # The exclusive end cannot pass the calendar's last day, so a period that
    # reaches it (`--time 9999` clamps there) stops one day short. Say so when
    # the ledger has activity on that day instead of reporting without it.
    if end == date.max and _unreportable_boundary(filtered.ledger.all_entries):
        data["excluded_date"] = end
    return data


def _unrooted_accounts(filtered: Any) -> list[str]:
    """Posted accounts outside the root ledger's five roots, which no report section can show.

    Beancount applies `option "name_assets"` and its siblings only while it
    parses the file that sets them, so an include can open and post to
    `Aktiva:Bank` with the ledger loading cleanly. The report trees are cut
    from the root file's roots and dropped that balance without a word, and
    the trial balance and balance sheet stopped summing to zero (w5/463).
    """
    from beancount.core.data import Transaction

    from bea_engine.ledger.text import ledger_roots

    roots = set(ledger_roots(filtered.ledger.options))
    posted = {
        posting.account for entry in filtered.entries if isinstance(entry, Transaction) for posting in entry.postings
    }
    return sorted(account for account in posted if account.split(":", 1)[0] not in roots)


def _routed_since(
    currency: str, conversion: str, prices: Any, unvalued: list[date | None], costs: set[str]
) -> tuple[date, set[str]] | None:
    """The first date a holding with no direct quote is valued through its cost currency, and the routes that value it.

    A lot held at cost converts in two hops (ACME → USD → EUR) once both legs
    are quoted, so "no price at any date" would sit above a report that values
    it. Only a lot held at a cost in the route's middle currency (`costs`) takes
    it: cost-less cash, or a lot already at a cost in the target, never does,
    and was told a quote from the route's first date would do (w5/557). The
    route counts only when every row the report left in units precedes it; a
    row still unvalued on or after that date means it is not the one in use.
    The middle currencies come back too, so the caller can tell whether a lot
    outside them is left over (w5/905).
    """
    firsts: dict[str, date] = {}
    for pair in prices.commodity_pairs(()):
        if currency not in pair:
            continue
        via = pair[1] if pair[0] == currency else pair[0]
        if via == conversion or via not in costs:
            continue
        legs = [prices.get_all_prices((currency, via)), prices.get_all_prices((via, conversion))]
        if all(legs):
            firsts[via] = max(min(point[0] for point in leg) for leg in legs)
    if not firsts:
        return None
    first: date = min(firsts.values())
    if not all(when is not None and when < first for when in unvalued):
        return None
    return first, set(firsts)


def _held_lots(
    entries: Iterable[Any], currency: str, when: date | None, accounts: Collection[str] | None
) -> dict[str | None, Decimal]:
    """The `currency` lots held at `when` in the given accounts, netted per cost currency (None: held at no cost).

    Netted per cost currency over postings dated then or earlier: a lot sold
    before the row, or bought after it, is not one the row values, so its
    cost currency routes nothing (w5/748). Only the accounts a filtered report
    shows count: an unrelated account's lot says nothing about the rows on
    screen (w5/905).
    """
    from beancount.core.data import Transaction

    nets: dict[str | None, Decimal] = {}
    for entry in entries:
        if not isinstance(entry, Transaction):
            continue
        if when is not None and entry.date > when:
            continue
        for posting in entry.postings:
            if posting.units is None or posting.units.currency != currency or posting.units.number is None:
                continue
            if accounts is not None and posting.account not in accounts:
                continue
            cost = getattr(posting.cost, "currency", None)
            key = cost if isinstance(cost, str) else None
            nets[key] = nets.get(key, Decimal(0)) + posting.units.number
    return {key: net for key, net in nets.items() if net != 0}


def _price_summary_lines(
    missing: list[str],
    dated: list[dict[str, Any]],
    conversion: str,
    ledger: Any | None,
    accounts: Collection[str] | None = None,
) -> list[str]:
    """One line per unconverted commodity: never one line per interval date."""
    lines = []
    for currency in missing:
        if ledger is not None:
            prices = ledger.prices
            all_prices = prices.get_all_prices((currency, conversion))
            routed: tuple[date, set[str]] | None = None
            leftover = False
            if all_prices:
                earliest: date | None = min(point[0] for point in all_prices)
            else:
                unvalued = [item["date"] for item in dated if item["from"] == currency]
                lots = [_held_lots(ledger.all_entries, currency, when, accounts) for when in unvalued]
                held = {key for found in lots for key in found if key is not None}
                routed = _routed_since(currency, conversion, prices, unvalued, held)
                earliest = routed[0] if routed else None
                # A lot outside the route's middle currencies — held at no cost,
                # or at a cost in another currency — keeps its price gap whatever
                # quote the route has (w5/905).
                leftover = routed is not None and any(key not in routed[1] for found in lots for key in found)
            if earliest is None:
                lines.append(f"{currency} has no {conversion} price at any date; shown in units")
                continue
            line = f"{currency} → {conversion} has no price before {earliest}; earlier rows shown in {currency}"
            if leftover and routed is not None:
                vias = ", ".join(sorted(routed[1]))
                line += (
                    f"; from then only lots held at a cost in {vias} are valued, "
                    f"the others still need a direct {currency} → {conversion} price"
                )
            lines.append(line)
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
    ledger: Any | None,
    ledger_errors: list[str],
    accounts: Collection[str] | None = None,
) -> dict[str, Any]:
    missing_dates = {
        (currency, when)
        for when, balance in balances
        for currency, amount in balance.items()
        if amount and currency != conversion and conversion not in CONVERSIONS
    }
    missing = sorted({currency for currency, _ in missing_dates})
    pairs = [{"from": currency, "to": conversion} for currency in missing]
    dated = [
        {"from": currency, "to": conversion, "date": when}
        for currency, when in sorted(missing_dates, key=lambda item: (item[1] or date.min, item[0]))
    ]
    summary = _price_summary_lines(missing, dated, conversion, ledger, accounts)
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


def _cell(balance: Mapping[str, Decimal], conversion: str) -> dict[str, Decimal]:
    """One interval row's amounts, a quiet row spelled the way its conversion spells zero.

    A currency conversion names that currency in every row, so a row holding
    nothing reads zero in it, as the net profit and net worth beside it do. A
    row that holds anything keeps exactly what it holds: amounts the report
    could not value stay in their source commodity. A per-unit conversion names
    only the commodities a row actually holds, so a quiet row there stays empty.
    """
    amounts = _balance_map(balance)
    if not amounts and conversion not in CONVERSIONS:
        return {conversion: Decimal(0)}
    return amounts


def _series_json(series: Iterable[Any], conversion: str) -> list[dict[str, Any]]:
    return [{"date": point.date, "balance": _cell(point.balance, conversion)} for point in series]


def _unvalued(balance: Mapping[str, Decimal], conversion: str) -> bool:
    """Whether this balance kept a commodity the report could not value.

    Conversion leaves what it has no price for in its own commodity, so a
    balance still holding a currency other than the one asked for is a partial
    valuation. Per-unit conversions ask for no valuation and are never partial.
    """
    if conversion in CONVERSIONS:
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
            "balance": _headline(point.balance, conversion),
        }
        for point in series
    ]


def _summary_pair(ledger: Any) -> frozenset[str]:
    """The clamp's summary accounts, judged by their combined balance (w5/790).

    Only the transfer pair: previous conversions are never clamp-written,
    and current conversions stay judged alone as a displayed row.
    """
    from beancount.parser.options import get_previous_accounts

    earnings, balances, _conversions = get_previous_accounts(ledger.options)  # type: ignore[no-untyped-call]
    return frozenset({earnings, balances})


def _tree_accounts(trees: Iterable[Any]) -> set[str]:
    """The accounts a report shows with a balance of their own: the ones whose lots its rows value.

    An ancestor kept only for structure holds nothing in the view, so it is
    left out (w5/905).
    """
    found: set[str] = set()
    for tree in trees:
        if tree is None:
            continue
        stack = [tree]
        while stack:
            node = stack.pop()
            if _balance_map(node.balance):
                found.add(node.account)
            stack.extend(node.children)
    return found


def _tree_balances(node: Any, previous: Collection[str] = ()) -> Iterable[Mapping[str, Decimal]]:
    """Per-node own balances, except the clamp's summary pair judged combined.

    A time clamp summarizes pre-period activity into the previous-earnings
    and previous-balances accounts as offsetting legs of its transfers, so
    each leg alone can hold a foreign currency nothing still holds. Judging
    the legs one by one refused a period that values cleanly in total; their
    combined balance is judged instead (w5/790).
    """
    if not previous:
        yield node.balance
        for child in node.children:
            yield from _tree_balances(child)
        return
    net: dict[str, Decimal] = {}
    stack = [node]
    while stack:
        current = stack.pop()
        if current.account in previous:
            for currency, amount in current.balance.items():
                net[currency] = net.get(currency, Decimal(0)) + amount
        else:
            yield current.balance
        stack.extend(current.children)
    yield net


def _sum(*balances: Mapping[str, Decimal]) -> Any:
    from fava.core.inventory import SimpleCounterInventory

    result = SimpleCounterInventory()
    for balance in balances:
        for currency, amount in balance.items():
            result.add(currency, amount)
    return result


def _summary(balance: Mapping[str, Decimal], conversion: str, *, incomplete: bool = False) -> dict[str, Decimal | None]:
    if conversion in CONVERSIONS:
        return dict(balance.items())
    return {conversion: None if incomplete else balance.get(conversion, Decimal(0))}


def _headline(balance: Mapping[str, Decimal], conversion: str) -> dict[str, Decimal | None]:
    """A combined total, `null` only when this balance itself kept an unvalued commodity.

    Judged on the total being shown, at its own date — not on whether any
    report row lacked a price. Holding a commodity before its first quote is
    common: the January row of a ledger first priced in February reads null,
    but that gap says nothing about the as-of headline, where the quote
    exists. `valuation: "partial"` and `missing_price_dates` still describe
    the rows.
    """
    return _summary(balance, conversion, incomplete=_unvalued(balance, conversion))


def _display_precision(filtered: Any) -> dict[str, int]:
    """Fractional digits per currency, for the frontend's human amount rounding.

    The finest precision the ledger's own money is written in: posting units
    and balance assertions. Beancount's display context (MAXIMUM) also learns
    from price directives and `@`/`{}` numbers, so one long quote such as
    `price AAPL 191.559998 USD` made every USD total in a cents ledger print
    six decimals. A quote is a rate, not an amount anyone holds.

    `option "display_precision"` still wins for the currencies it names.
    """
    from beancount.core.data import Balance, Transaction

    from bea_engine.ledger.reader import forget_source_lines

    forget_source_lines()
    precision: dict[str, int] = {}
    # A leg Beancount interpolated holds units times cost or price, with that
    # rate's digits: an amount nobody wrote. Once the ledger writes fractional
    # amounts in a currency, those are its precision and such a leg adds
    # nothing — one `{191.559998 USD}` purchase with an omitted cash leg made
    # every USD figure print seven decimals (w5/093). Where the ledger writes
    # that currency only in whole numbers, or not at all, the inferred amount
    # is the one evidence of its subunits: rounding a 31.5 cash leg to 32
    # would misstate the balance, so it still counts.
    inferred: dict[str, int] = {}
    pending: list[tuple[Any, Any]] = []

    def learn(number: Any, currency: Any, into: dict[str, int], limit: int | None = None) -> None:
        if not isinstance(number, Decimal) or not number.is_finite() or not isinstance(currency, str):
            return
        exponent = number.as_tuple().exponent
        digits = max(0, -exponent) if isinstance(exponent, int) else 0
        if limit is not None:
            digits = min(digits, limit)
        into[currency] = max(digits, into.get(currency, 0))

    typed: dict[tuple[str, int], dict[str, int]] = {}
    for entry in filtered.ledger.all_entries:
        if isinstance(entry, Transaction):
            for posting in entry.postings:
                if posting.units is not None:
                    if (posting.meta or {}).get("__automatic__"):
                        pending.append((entry, posting))
                    else:
                        # A plugin that divides or rewrites a posting leaves it
                        # at its source line with digits nobody wrote: capped
                        # at what that transaction's own postings spell (w5/946).
                        spelled = _typed_precision(entry, typed)
                        learn(
                            posting.units.number, posting.units.currency, precision, spelled.get(posting.units.currency)
                        )
        elif isinstance(entry, Balance):
            learn(entry.amount.number, entry.amount.currency, precision)
    # Only a fractional inferred amount in a currency without written
    # subunits needs source evidence. The parser records the written @@ total
    # in its display context before dividing it into a repeating unit price.
    sources: dict[str, tuple[tuple[str, ...], list[int]]] = {}
    limits: dict[tuple[str, int], dict[str, int] | None] = {}
    for entry, posting in pending:
        if precision.get(posting.units.currency):
            continue
        number = posting.units.number
        limit = None
        exponent = number.as_tuple().exponent if isinstance(number, Decimal) else 0
        meta = entry.meta or {}
        filename, lineno = meta.get("filename"), meta.get("lineno")
        if (
            isinstance(number, Decimal)
            and number.is_finite()
            and isinstance(exponent, int)
            and exponent < 0
            and isinstance(filename, str)
            and isinstance(lineno, int)
            and lineno > 0
        ):
            key = (filename, lineno)
            if key not in limits:
                limits[key] = _written_transaction_precision(*key, sources)
            written = limits[key]
            limit = written.get(posting.units.currency) if written is not None else None
        learn(number, posting.units.currency, inferred, limit)
    for currency, digits in inferred.items():
        if not precision.get(currency):
            precision[currency] = digits
    for currency, example in (filtered.ledger.options.get("display_precision") or {}).items():
        exponent = example.as_tuple().exponent
        precision[str(currency)] = max(0, -exponent) if isinstance(exponent, int) else 0
    return precision


def _typed_precision(entry: Any, cache: dict[tuple[str, int], dict[str, int]]) -> dict[str, int]:
    """Fractional digits per currency that this entry's source transaction spells in its postings.

    Empty when the entry has no readable source transaction (a plugin's own
    entry, a file that cannot be read) or spells no amount in a currency, so
    those postings keep counting as written.
    """
    from beancount.core.data import Transaction

    from bea_engine.ledger.reader import _spelled_entries

    meta = entry.meta or {}
    filename, lineno = meta.get("filename"), meta.get("lineno")
    if not isinstance(filename, str) or not isinstance(lineno, int) or lineno < 1:
        return {}
    key = (filename, lineno)
    if key not in cache:
        spelled = _spelled_entries(filename).get(lineno)
        digits: dict[str, int] = {}
        if isinstance(spelled, Transaction):
            for posting in spelled.postings:
                number = getattr(posting.units, "number", None)
                currency = getattr(posting.units, "currency", None)
                if not isinstance(number, Decimal) or not isinstance(currency, str):
                    continue
                exponent = number.as_tuple().exponent
                places = max(0, -exponent) if isinstance(exponent, int) else 0
                digits[currency] = max(places, digits.get(currency, 0))
        cache[key] = digits
    return cache[key]


def _written_transaction_precision(
    filename: str, lineno: int, sources: dict[str, tuple[tuple[str, ...], list[int]]]
) -> dict[str, int] | None:
    """Precision supported by written totals or by units times per-unit rates."""
    from bisect import bisect_left, bisect_right

    from beancount.core.data import Transaction
    from beancount.core.display_context import Precision
    from beancount.core.position import CostSpec
    from beancount.parser import lexer, parser

    from bea_engine.ledger.reader import _source_lines, _spelled_entries

    if filename not in sources:
        lines = _source_lines(filename)
        if lines is None:
            return None
        sources[filename] = (lines, sorted(_spelled_entries(filename)))
    lines, starts = sources[filename]
    if not 1 <= lineno <= len(lines) or not isinstance(_spelled_entries(filename).get(lineno), Transaction):
        return None
    index = bisect_right(starts, lineno)
    end = starts[index] - 1 if index < len(starts) else len(lines)
    text = "\n".join(lines[lineno - 1 : end]) + "\n"
    entries, _, options = parser.parse_string(text)
    written = {
        currency: digits
        for currency, context in options["dcontext"].ccontexts.items()
        if (digits := context.get_fractional(Precision.MAXIMUM)) is not None
    }
    # @@ has already become a per-unit price in the parser's Posting. The
    # lexer preserves which original posting carried a total price, without
    # mistaking a quoted/commented @@ for notation.
    lex: Callable[[str], Iterator[tuple[str, int, bytes, object]]] = lexer.lex_iter_string
    totals = sorted(line for kind, line, _, _ in lex(text) if kind == "ATAT")

    def places(number: Any) -> int:
        exponent = number.as_tuple().exponent if isinstance(number, Decimal) else 0
        return max(0, -exponent) if isinstance(exponent, int) else 0

    for transaction in entries:
        if not isinstance(transaction, Transaction):
            continue
        for index, posting in enumerate(transaction.postings):
            if posting.units is None:
                continue
            if isinstance(posting.cost, CostSpec):
                cost = posting.cost
                if isinstance(cost.number_per, Decimal) and (cost.number_per or cost.number_total is None):
                    written[cost.currency] = max(
                        written.get(cost.currency, 0), places(posting.units.number) + places(cost.number_per)
                    )
            elif posting.price is not None:
                start = (posting.meta or {}).get("lineno", 0)
                stop = (
                    (transaction.postings[index + 1].meta or {}).get("lineno", 0)
                    if index + 1 < len(transaction.postings)
                    else end + 1
                )
                total = bisect_left(totals, start)
                if total == len(totals) or totals[total] >= stop:
                    currency = posting.price.currency
                    written[currency] = max(
                        written.get(currency, 0), places(posting.units.number) + places(posting.price.number)
                    )
    return written


def _substring_match(accounts: Iterable[str]) -> Callable[[str], bool]:
    """`bea balance`'s documented matcher: a case-folded substring of the account name."""
    terms = [fold_account(term or "") for term in accounts]
    return lambda account: any(term in fold_account(account) for term in terms)


def _report_filter_match(account: str, roots: Sequence[str]) -> Callable[[str], bool]:
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

    return account_predicate(account, roots)


def _prune_sections(sections: dict[str, Any], account: str | None, roots: Sequence[str]) -> dict[str, Any]:
    """When `--account` is set, keep the subtrees the entry filter already kept."""
    if not account:
        return sections
    matches = _report_filter_match(account, roots)
    return {name: _prune_tree(tree, matches) for name, tree in sections.items()}


def _holding_accounts(entries: Any, among: set[str]) -> set[str]:
    """Which of these accounts still hold a position in the entries' own inventories.

    Summed units forget what tells lots apart: +2 HOOL bought as `Long` and
    -2 HOOL as `Short` net to 0 HOOL, yet both lots are still held, and the
    closed account vanished from a filtered balance (w5/947).
    """
    from beancount.core.data import Transaction
    from beancount.core.inventory import Inventory

    inventories: dict[str, Any] = {}
    for entry in entries:
        if isinstance(entry, Transaction):
            for posting in entry.postings:
                if posting.account in among:
                    inventories.setdefault(posting.account, Inventory()).add_position(posting)
    return {account for account, inventory in inventories.items() if not inventory.is_empty()}


def _prune_tree(node: Any, matches: Callable[[str], bool], closed: set[str] | None = None) -> Any | None:
    """Keep matching nodes plus their ancestors for structure.

    `matches` is the caller's account matcher, because `bea balance` and `bea
    report` document different ones — substrings there, parent-or-regex here —
    and a shared matcher can only honor one of them.

    In a filtered view, closed accounts that hold nothing drop out unless a
    still-open descendant was kept; ancestors stay for structure. A closed
    account still holding a balance stays, so totals agree with the trial
    balance. Every retained node's
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
    # Beancount lets a non-empty account be closed; hiding one would silently
    # understate every parent total, so only a closed account that holds
    # nothing drops out.
    is_closed = (
        bool(closed) and node.account in (closed or ()) and not any(number for _, number in node.balance.items())
    )
    in_scope = not is_closed and matches(node.account)
    if not (in_scope or kept):
        return None
    from fava.core.tree import zero_filled

    own = node.balance if in_scope else type(node.balance)()
    parts = [own, *(child.balance_children for child in kept)]
    return dataclasses.replace(
        node,
        balance=own,
        has_txns=node.has_txns if in_scope else False,
        children=kept,
        balance_children=zero_filled(_sum(*parts), parts),
    )
