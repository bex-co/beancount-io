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
from decimal import Context, Decimal, localcontext
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
    "budget",
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
    if kind == "budget" and conversion is not None:
        # A budget is declared in one currency per line, so each row stays in
        # the currencies its postings and its budget name.
        raise protocol.UsageError("budget compares in each budget's own currency and takes no --conversion.")
    if kind == "cash-flow" and conversion is not None:
        # Rows must sum to the change in cash balances, and any valuation
        # difference would break that identity; the report always runs at cost.
        raise protocol.UsageError("cash-flow reports at cost so rows tie to cash balances and takes no --conversion.")
    filtered, resolved_conversion, ledger_errors = _load(file, account, time, conversion, allow_errors)
    if time is not None:
        _refuse_window_outside_time(filtered.period, bounds, ledger_errors)
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
        # Summing at-cost positions rounds at the default 28 digits, so two
        # purchases whose own residuals were accepted no longer added up to
        # the rounding the reconciliation expects (w5/1077).
        with localcontext() as wide:
            cash_context = wide.copy()
            wide.prec = 100
            return _cash_flow(filtered, bounds, ledger_errors, cash_context)
    if kind == "budget":
        return _budget(filtered, interval, ledger_errors)
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
        # Closed by the report's as-of date: with no `--time` the entries are
        # the whole ledger while the period ends at its last dated fact, so a
        # later close must not hide an account that is still open (w1/250).
        end = filtered.period[1]
        closed: set[str] = {
            entry.account
            for entry in filtered.entries
            if isinstance(entry, Close) and (end is None or entry.date < end)
        }
        # Emptiness is the account's inventory, not its value in this
        # conversion: 10 EUR against -10 USD is worth 0 USD at par and still
        # held (w5/947).
        closed -= _holding_accounts(filtered.entries, closed)
        matches = _substring_match(accounts)
        pruned = {name: _prune_tree(tree, matches, closed) for name, tree in sections.items()}
    # Valuation covers only the accounts being shown: an unrelated unpriced
    # holding must not make a USD checking balance fail.
    previous = _summary_pair(filtered.ledger)
    balances = [balance for tree in pruned.values() if tree is not None for balance in _tree_balances(tree, previous)]
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
            ((filtered.end_date, balance) for balance in balances),
            allow_errors,
            filtered.ledger,
            ledger_errors,
            _tree_accounts(pruned.values()),
        )
    )
    return metadata | {
        "display_precision": _display_precision(filtered),
        **{name: (_tree_json(tree) if tree is not None else None) for name, tree in pruned.items()},
        # With no terms this is the trial balance, adjustment lines included.
        **_trial_lines(filtered, resolved_conversion, data, balances, scoped=bool(accounts)),
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
    # Zero-filled like the trees: assets worth a known 0 USD are a net worth
    # of 0 USD, not an empty one (w5/1055).
    from fava.core.tree import zero_filled

    worth = _headline(zero_filled(_sum(assets, liabilities), [assets, liabilities]), conversion)
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


def _budget(filtered: Any, interval: str, ledger_errors: list[str]) -> dict[str, Any]:
    """Budget, actual and variance per interval for every account that declares a budget.

    The declarations are Fava's `custom "budget" ACCOUNT "monthly" 300 USD`,
    prorated by day for a partial period (`fava.modules.budgets`). Actual is
    the account's whole subtree in the currencies it posted (income reads as
    earned, positive); variance is actual minus budget, so a positive expense
    variance is overspending. A currency without a budget keeps `budget` null
    and no variance — absent is not zero. Spending under Income and Expenses
    accounts no budget covers is listed as `unbudgeted`.
    """
    from collections import defaultdict

    from fava.beans.helpers import slice_entry_dates
    from fava.core.conversion import cost_or_value
    from fava.core.filters import account_predicate
    from fava.core.inventory import CounterInventory

    ledger = filtered.ledger
    module = ledger.budget
    budgeted = module.accounts
    income_root, expenses_root = ledger.options["name_income"], ledger.options["name_expenses"]
    in_scope = account_predicate(filtered.account, ledger.root_accounts)
    precision = _display_precision(filtered)
    calculation_precision = dict(precision)
    for currency, digits in module.precision.items():
        calculation_precision[currency] = max(digits, precision.get(currency, 2))
        # Budget amounts are money too. Explicit display choices still win
        # for the human table, without discarding declared budget subunits.
        if currency not in (ledger.options.get("display_precision") or {}):
            precision[currency] = calculation_precision[currency]

    def actual_of(per_account: Mapping[str, Any], accounts: Iterable[str], end: date) -> dict[str, Decimal]:
        total = CounterInventory()
        for name in accounts:
            total.add_inventory(per_account[name])
        return {c: Decimal(n) for c, n in cost_or_value(total, "units", ledger.prices, end).items()}

    def kind_of(account: str) -> str:
        root = account.partition(":")[0]
        return "income" if root == income_root else "expenses" if root == expenses_root else "other"

    periods: list[dict[str, Any]] = []
    for span in filtered.interval_ranges(_interval(interval)):
        per_account: dict[str, CounterInventory] = defaultdict(CounterInventory)
        for entry in slice_entry_dates(filtered.entries, span.begin, span.end):
            for posting in getattr(entry, "postings", []):
                if in_scope(posting.account):
                    per_account[posting.account].add_position(posting)

        rows: list[dict[str, Any]] = []
        for account in budgeted:
            if not in_scope(account):
                continue
            kind = kind_of(account)
            sign = -1 if kind == "income" else 1
            # Round the exact calendar shares only after summing the period;
            # repeated daily Decimal division can put a true half-cent below
            # the threshold. Actuals retain their original units.
            declared = module.calculate(account, span.begin, span.end, precision=calculation_precision)
            subtree = [name for name in per_account if name == account or name.startswith(account + ":")]
            actual = {c: sign * n for c, n in actual_of(per_account, subtree, span.end_inclusive).items()}
            for currency in sorted(set(declared) | set(actual)):
                budget = declared.get(currency)
                spent = actual.get(currency, Decimal(0))
                rows.append(
                    {
                        "account": account,
                        "account_type": kind,
                        "currency": currency,
                        "budget": budget,
                        "actual": spent,
                        "variance": None if budget is None else spent - budget,
                        "status": "budgeted",
                    }
                )
        for account in sorted(per_account):
            kind = kind_of(account)
            if kind == "other" or any(account == name or account.startswith(name + ":") for name in budgeted):
                continue
            sign = -1 if kind == "income" else 1
            for currency, number in sorted(actual_of(per_account, [account], span.end_inclusive).items()):
                rows.append(
                    {
                        "account": account,
                        "account_type": kind,
                        "currency": currency,
                        "budget": None,
                        "actual": sign * number,
                        "variance": None,
                        "status": "unbudgeted",
                    }
                )
        periods.append({"begin": span.begin, "end": span.end_inclusive, "rows": rows})
    metadata = _metadata(filtered, "units", ledger_errors, interval)
    # A custom budget can produce a row without an open or any postings.
    # This report's emptiness follows its rows, rather than balance trees.
    empty = bool(filtered.account) and not any(period["rows"] for period in periods)
    metadata["account_filter_empty"] = empty
    metadata["account_filter_periods"] = (
        _period_terms([filtered.account], ledger.fava_options.fiscal_year_end) if empty else []
    )
    return metadata | {
        "display_precision": precision,
        "variance_signs": "actual_minus_budget",
        "has_budgets": bool(budgeted),
        "budget_errors": [_budget_error(error) for error in module.errors],
        "periods": periods,
        "missing_prices": [],
        "missing_price_dates": [],
        "missing_price_summary": [],
    }


def _budget_error(error: Any) -> str:
    """One ignored budget line as `file:line: Budget for ACCOUNT ignored: why` (w1/297).

    Fava's messages name neither the line nor what it refused, so two bad
    lines read as one repeated message and a typo or a trailing space in the
    interval stays invisible. The location prints as a ledger error's does;
    the account and the refused value come from the directive itself.
    """
    values = getattr(error.entry, "values", None) or []
    subject = f"Budget for {values[0].value}" if values else "Budget"
    if error.message == "Invalid account for budget entry":
        # No account to name: the refused first value is the subject (w1/301).
        subject = "Budget"
        shape = 'custom "budget" ACCOUNT INTERVAL NUMBER CURRENCY'
        why = f"first value {_as_written(values[0])} is not an account ({shape})"
    elif error.message == "Invalid interval for budget entry":
        why = f"unknown interval {_as_written(values[1])} (use daily, weekly, monthly, quarterly or yearly)"
    elif error.message.startswith("Invalid amount for budget entry"):
        why = f"amount {_as_written(values[2])} is not NUMBER CURRENCY"
    elif error.message == "Failed to parse budget entry":
        why = "expected ACCOUNT INTERVAL NUMBER CURRENCY"
    else:
        why = error.message
    return format_error(error._replace(message=f"{subject} ignored: {why}"))


def _as_written(value: Any) -> str:
    """A `custom` directive's value as the ledger spells it: a string quoted, so its spaces show."""
    if value.dtype is str:
        import json

        return json.dumps(value.value, ensure_ascii=False)
    if value.dtype is bool:
        return "TRUE" if value.value else "FALSE"
    return str(value.value)


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
    # Zero-filled like the trees: assets worth a known 0 USD are a net worth
    # of 0 USD, not an empty one (w5/1055).
    from fava.core.tree import zero_filled

    worth = _headline(zero_filled(_sum(assets, liabilities), [assets, liabilities]), conversion)
    # `at_cost` leaves cost-less holdings (foreign cash) in their own units, so
    # an "adjustment" across unlike commodities was just the FX trade, claimed
    # as reconciled (w5/505): only a single-commodity view reconciles.
    single = len(_sum(assets, liabilities)) <= 1 and len(_sum(data.valuation_adjustment, data.rounding_residual)) <= 1
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
        # What the ledger's tolerance accepted, kept out of the valuation line (w1/304).
        "rounding_residual": _headline(data.rounding_residual, conversion) if reconciled else None,
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
    balances = [balance for tree in sections.values() if tree is not None for balance in _tree_balances(tree, previous)]
    metadata = _metadata(filtered, conversion, ledger_errors) | _valuation(
        conversion,
        ((filtered.end_date, balance) for balance in balances),
        allow_errors,
        filtered.ledger,
        ledger_errors,
        _tree_accounts(sections.values()),
    )
    return metadata | {
        "display_precision": _display_precision(filtered),
        **{name: (_tree_json(tree) if tree is not None else None) for name, tree in sections.items()},
        **_trial_lines(filtered, conversion, data, balances, scoped=bool(filtered.account)),
    }


def _trial_lines(
    filtered: Any, conversion: str, data: Any, balances: Iterable[Mapping[str, Decimal]], *, scoped: bool
) -> dict[str, dict[str, Decimal | None] | None]:
    """The trial balance's valuation adjustment and rounding lines, None where they reconcile nothing (w1/287).

    The five valued trees leave a holding's unrealized gain and a currency's
    translation unbalanced; the valuation line carries them, and the rounding
    line what the ledger's tolerance accepted (w1/304), so the sections sum
    to zero. Withheld as the balance sheet's are: under `units` (no residual
    is computed), for an account filter (the residual is the whole ledger's),
    with loader errors (they would absorb an unbalanced entry), and while a
    balance holds a commodity the report could not value. Unlike the sheet's,
    the valuation line may span commodities: at cost it is the conversions a
    priced exchange leaves, which a trial balance must show to net.
    """
    withheld = (
        data.valuation_adjustment is None
        or scoped
        or filtered.ledger.load_errors
        or any(_unvalued(balance, conversion) for balance in balances)
    )
    return {
        name: None if withheld else _headline(getattr(data, name), conversion)
        for name in ("valuation_adjustment", "rounding_residual")
    }


@dataclasses.dataclass
class _ValuedHolding:
    """One held group's market value and converted cost basis at the period end.

    `market`/`currency` is the value and the currency it is in; `price`/
    `price_date`/`quoted` is the quote behind it. `basis`/`basis_currency` is
    the cost basis converted toward the requested currency as far as its leg
    has a rate. `leg_date` is the conversion-leg quote date behind the group's
    `conversion_source`, None when no conversion was read. `missing` names
    each unquotable leg for the strict/partial contract.
    """

    market: Decimal
    currency: str
    price: Decimal | None
    price_date: date | None
    quoted: tuple[str, str | None]
    basis: Decimal
    basis_currency: str
    leg_date: date | None
    missing: list[tuple[str, str]]


def _value_holding(
    prices: Any,
    end: date | None,
    *,
    units: Decimal,
    basis: Decimal,
    basis_known: bool,
    commodity: str,
    held: str,
    target: str | None,
) -> _ValuedHolding:
    """Value one held group at the period end, in the requested currency when asked.

    A quote in the requested currency values the lot directly, as Beancount's
    own conversion does; routed through the cost currency, an older quote
    misvalued the lot, or its absence refused the report (w5/1033). The basis
    still converts through the cost currency, and without that rate it stays
    in it beside the market value, with the rate reported missing (w5/1117).
    Without any quote into the requested currency the group values through
    its own cost currency instead. `held` is never empty here: groups with no
    cost currency to value into are resolved or left out before this runs.
    """
    quoted: tuple[str, str | None] = (commodity, held)
    direct_date, direct = (None, None)
    leg_date, rate = (None, None)
    if target is not None and target != held:
        leg_date, rate = prices.get_price_point((held, target), end)
        direct_date, direct = prices.get_price_point((commodity, target), end)
    # `direct` only comes from the fetch above, so a direct quote already
    # implies a requested currency; the `target` check stays to narrow the
    # type for the branch below.
    if direct is None or target is None:
        # No quote straight into the requested currency: value through the
        # cost currency, converting into the target when its leg has a rate.
        quote_date, price = prices.get_price_point((commodity, held), end)
        # Unquoted, a group values at cost; a group that also holds
        # uncosted units counts only its costed part (named missing).
        market = units * price if price is not None else basis
        missing = [] if price is not None else [(commodity, held)]
        currency = held
        if target is not None and target != held:
            if rate is not None:
                basis, market = basis * rate, market * rate
                price = price * rate if price is not None else None
                currency = target
            else:
                missing.append((held, target))
        return _ValuedHolding(market, currency, price, quote_date, quoted, basis, currency, leg_date, missing)
    quote_date, price, quoted = direct_date, direct, (commodity, target)
    market, currency = units * direct, target
    # The currency the basis is in; the market value has its own above, since
    # a direct quote in the requested currency needs no basis rate.
    basis_currency = held
    missing = []
    if rate is not None:
        basis, basis_currency = basis * rate, target
    elif basis_known:
        missing.append((held, target))
    return _ValuedHolding(market, currency, price, quote_date, quoted, basis, basis_currency, leg_date, missing)


def _holdings(
    filtered: Any, conversion: str, group_by: str, allow_errors: bool, ledger_errors: list[str]
) -> dict[str, Any]:
    """One row per held lot-group: units, average cost, cost basis, market value.

    Upstream Fava renders holdings client-side from balances, so there is no
    holdings module to wrap; this composes the same primitives instead. The
    account tree aggregates postings into per-account costed inventories, each
    lot is valued through the ledger's price map at the period end, and a
    currency conversion re-expresses the money columns through one more quote.
    A group none of whose lots is still held is fully sold and left out
    (w22/m3/t001). Net units are not that test: +2 HOOL long and -2 HOOL
    short net to 0 HOOL while both lots, and their -40 USD of basis, are
    still held (w5/947); such a group has no average cost. A commodity's lots
    costed in different currencies are one group once a currency conversion
    has valued them all into one currency (w1/288); under `units`, `at_cost`
    and `at_value`, or when a leg has no rate, each cost currency keeps its
    own row, which its average cost's currency tells apart.

    Cash is told apart by its commodity, not by a missing cost (w1/253): an
    uncosted position is cash when its commodity is money in this ledger
    (`_money_currencies`: operating and cost currencies, w1/255). Any other uncosted position (`3 AAPL @ 200 USD`)
    is a holding with an unknown basis: it joins the costed group of the
    same commodity when there is exactly one, else forms its own, and its
    group reports `cost_basis` and `average_cost` as null. Only a balance
    sheet position counts: an uncosted balance under Income, Expenses or
    Equity (`Expenses:Travel 100 EUR @ 1.1 USD`) is a flow, not a holding
    (w1/256).
    """
    from fava.core.tree import Tree

    prices = filtered.ledger.prices
    end = filtered.end_date
    target = None if conversion in CONVERSIONS else conversion
    sources = _price_source_index(filtered.ledger.options.get("bea_managed_price_sources", []))
    # The entry filter keeps whole transactions, so a counterparty's lots
    # survive it; every report prunes its tree by the same matcher instead.
    matches = _report_filter_match(filtered.account, filtered.ledger.root_accounts) if filtered.account else None
    money = _money_currencies(filtered.ledger)
    positions = {
        root for root, kind in _root_type_map(filtered.ledger.options).items() if kind in ("Assets", "Liabilities")
    }
    # (scope..., commodity, cost currency) -> [units, cost basis, accounts,
    # basis known, finest lot-cost fractional digits]. An uncosted group's
    # cost currency is "" until valued.
    lots: dict[tuple[str, ...], list[Any]] = {}
    # (scope..., commodity) -> [units, accounts] for uncosted non-cash units.
    uncosted: dict[tuple[str, ...], list[Any]] = {}
    for name, node in sorted(Tree(filtered.entries).items()):
        if not name or (matches is not None and not matches(name)):
            continue
        scope = (name,) if group_by == "account" else ()
        for (commodity, cost), number in node.balance.items():
            if number == 0:
                continue
            if cost is None:
                if commodity in money or name.split(":", 1)[0] not in positions:
                    continue
                pending = uncosted.get((*scope, commodity))
                if pending is None:
                    uncosted[(*scope, commodity)] = [number, {name}]
                else:
                    pending[0] += number
                    pending[1].add(name)
                continue
            key: tuple[str, ...] = (*scope, commodity, cost.currency)
            found = lots.get(key)
            if found is None:
                # The first lot as booked: `0 + x` rounded a 29-digit token
                # quantity to 28 digits before any real sum (w5/1074).
                lots[key] = [number, number * cost.number, {name}, True, _fraction_digits(cost.number)]
                continue
            found[0] += number
            found[1] += number * cost.number
            found[2].add(name)
            found[4] = max(found[4], _fraction_digits(cost.number))
    for prefix, (number, names) in uncosted.items():
        costed = [key for key in lots if key[:-1] == prefix]
        if len(costed) == 1:
            found = lots[costed[0]]
            found[0] += number
            found[2] |= names
            found[3] = False
        else:
            lots[(*prefix, "")] = [number, Decimal(0), names, False, 0]
    operating = list(prices.operating_currencies)
    # Valued groups by the row they show in, each with the fractional digits
    # the text table shows its average cost in: at least those of the finest
    # lot cost (w1/267), since a per-unit figure rounded to the posting
    # precision read a 0.0042 USD lot as 0.00 USD. Under a currency
    # conversion the row is the scope, the commodity, and the currencies its
    # market value and basis came out in, so lots costed in USD and in EUR
    # that both value into USD are one holding (w1/288); otherwise it is the
    # lot-group's own key, one row per cost currency.
    rows: dict[tuple[str, ...], list[tuple[dict[str, Any], int]]] = {}
    missing: list[tuple[str, str]] = []
    # Legs of uncosted positions no quote values: shown in units, not at cost.
    in_units: set[tuple[str, str]] = set()
    for key, (units, basis, accounts, basis_known, digits) in sorted(lots.items()):
        commodity, held = key[-2], key[-1]
        if not held:
            # No cost currency to value into: the first operating currency
            # (or other currency the commodity is quoted in) with a quote,
            # as Fava's `at_value` values cost-less positions.
            candidates = [target] if target is not None else []
            candidates += [*operating, *sorted(_quote_currencies(prices, commodity))]
            candidates = [c for c in dict.fromkeys(candidates) if c != commodity]
            held = next((c for c in candidates if prices.get_price((commodity, c), end) is not None), "")
            if not held:
                if candidates:
                    in_units.add((commodity, candidates[0]))
                # Nothing to value into: the position stays in its units.
                rows[key] = [(_uncosted_unvalued(key, group_by, accounts, commodity, units), digits)]
                continue
        valued = _value_holding(
            prices,
            end,
            units=units,
            basis=basis,
            basis_known=basis_known,
            commodity=commodity,
            held=held,
            target=target,
        )
        basis = valued.basis
        missing.extend(valued.missing)
        average = basis / units if units and basis_known else None
        group: dict[str, Any] = {"account": key[0]} if group_by == "account" else {"accounts": sorted(accounts)}
        group |= {
            "commodity": commodity,
            "units": {"number": units, "currency": commodity},
            "average_cost": {"number": average, "currency": valued.basis_currency} if average is not None else None,
            "cost_basis": {"number": valued.basis, "currency": valued.basis_currency} if basis_known else None,
            "market_value": {"number": valued.market, "currency": valued.currency},
            "price": {"number": valued.price, "currency": valued.currency} if valued.price is not None else None,
            "price_date": valued.price_date,
            "price_source": _quote_source(sources, *valued.quoted, valued.price_date),
            "conversion_source": (
                _quote_source(sources, held, target, valued.leg_date) if valued.leg_date is not None else None
            ),
        }
        row = key if target is None else (*key[:-1], valued.currency, valued.basis_currency)
        rows.setdefault(row, []).append((group, digits))
    groups = [_merged_holding([group for group, _ in parts], group_by) for parts in rows.values()]
    # Frontend-only, like `display_precision`: one entry per group, in order.
    cost_digits = [max(digits for _, digits in parts) for parts in rows.values()]
    valuation = _holdings_valuation(missing, in_units, end, allow_errors, filtered.ledger, ledger_errors)
    totals: dict[str, dict[str, Decimal]] = {"cost_basis": {}, "market_value": {}}
    for group in groups:
        for column in ("cost_basis", "market_value"):
            amount = group[column]
            if amount is None:
                continue
            total = totals[column]
            total[amount["currency"]] = total.get(amount["currency"], Decimal(0)) + amount["number"]
    metadata = _metadata(filtered, conversion, ledger_errors) | valuation
    return metadata | {
        "display_precision": _display_precision(filtered),
        "average_cost_precision": cost_digits,
        "group_by": group_by,
        "groups": groups,
        "totals": totals,
        # False when a group's basis is unknown: the cost-basis total then
        # leaves those positions out instead of counting them as zero.
        "cost_basis_complete": all(group["cost_basis"] is not None for group in groups),
    }


def _merged_holding(parts: list[dict[str, Any]], group_by: str) -> dict[str, Any]:
    """One holding from groups of one commodity valued into the same currencies (w1/288).

    Lots costed in USD and EUR, both valued into USD, listed as two identical
    `10 VT` rows. The merged group sums units, cost basis and market value
    and unions the accounts; its average cost and basis are null when any
    part's basis is unknown, as an uncosted position makes its group's. It
    keeps the latest quote, and a stale source behind any part, so the
    market value still reads stale when one of its legs is.
    """
    first, *rest = parts
    if not rest:
        return first
    # Summed from the first part, not from 0: `0 + x` rounds a 29-digit
    # token quantity before any real sum does (w5/1074).
    units: Decimal = first["units"]["number"]
    market: Decimal = first["market_value"]["number"]
    basis: Decimal | None = first["cost_basis"]["number"] if first["cost_basis"] is not None else None
    for part in rest:
        units += part["units"]["number"]
        market += part["market_value"]["number"]
        basis = basis + part["cost_basis"]["number"] if basis is not None and part["cost_basis"] is not None else None
    basis_currency = first["cost_basis"]["currency"] if basis is not None else None
    quoted = max(parts, key=lambda part: part["price_date"] or date.min)
    group: dict[str, Any] = (
        {"account": first["account"]}
        if group_by == "account"
        else {"accounts": sorted({name for part in parts for name in part["accounts"]})}
    )
    group |= {
        "commodity": first["commodity"],
        "units": {"number": units, "currency": first["commodity"]},
        "average_cost": {"number": basis / units, "currency": basis_currency} if basis is not None and units else None,
        "cost_basis": {"number": basis, "currency": basis_currency} if basis is not None else None,
        "market_value": {"number": market, "currency": first["market_value"]["currency"]},
        "price": quoted["price"],
        "price_date": quoted["price_date"],
    }
    for field in ("price_source", "conversion_source"):
        known = [source for part in (quoted, *parts) if (source := part[field]) is not None]
        stale = [source for source in known if source.get("freshness") == "stale"]
        group[field] = (stale or known or [None])[0]
    return group


def _fraction_digits(number: Decimal) -> int:
    """The fractional digits `number` is written with: 2 for `0.30`, 0 for `5`."""
    exponent = number.as_tuple().exponent
    return max(0, -exponent) if isinstance(exponent, int) else 0


def _money_currencies(ledger: Any) -> set[str]:
    """Currencies this ledger uses as money: an uncosted balance in one is cash.

    The operating currencies and every currency a lot is costed in: the
    currency paid for holdings settles them (EUR beside `{140 EUR}` lots).
    Being quoted in does not make a commodity money: a USD ledger pricing
    `ETH` in `BTC`, by a `price` directive or a posting price, still holds
    BTC as an investment (w1/255). Only a ledger that declares no operating
    currency also counts every posting-price and price-directive quote
    currency (w1/253). The set spans the whole ledger, so neither the account
    filter nor the time window changes what counts as cash. The hosted
    holdings composer applies the same rule.
    """
    from beancount.core.data import Price, Transaction

    operating = set(ledger.options.get("operating_currency") or ())
    money = set(operating)
    for entry in ledger.all_entries:
        if isinstance(entry, Price):
            if not operating:
                money.add(entry.amount.currency)
        elif isinstance(entry, Transaction):
            for posting in entry.postings:
                if posting.cost is not None and posting.cost.currency:
                    money.add(posting.cost.currency)
                if not operating and posting.price is not None and posting.price.currency:
                    money.add(posting.price.currency)
    return money


def _quote_currencies(prices: Any, commodity: str) -> set[str]:
    """Currencies `commodity` has a quote in, directly or by inversion."""
    return {quote for base, quote in prices.commodity_pairs(()) if base == commodity} | {
        base for base, quote in prices.commodity_pairs(()) if quote == commodity
    }


def _uncosted_unvalued(
    key: tuple[str, ...], group_by: str, accounts: set[str], commodity: str, units: Decimal
) -> dict[str, Any]:
    """An uncosted holding with no quote at all: units only, value in its units."""
    group: dict[str, Any] = {"account": key[0]} if group_by == "account" else {"accounts": sorted(accounts)}
    return group | {
        "commodity": commodity,
        "units": {"number": units, "currency": commodity},
        "average_cost": None,
        "cost_basis": None,
        "market_value": {"number": units, "currency": commodity},
        "price": None,
        "price_date": None,
        "price_source": None,
        "conversion_source": None,
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
                "latest_price_date": record.get("latest_price_date"),
                "revision": record.get("revision"),
            }
    return None


def _holdings_valuation(
    missing: list[tuple[str, str]],
    in_units: set[tuple[str, str]],
    end: date | None,
    allow_errors: bool,
    ledger: Any,
    ledger_errors: list[str],
) -> dict[str, Any]:
    """The strict/partial contract for holdings prices, in `_valuation`'s shape.

    `_valuation` judges leftovers against a report-wide conversion; a holding
    is already unvalued when its own commodity has no quote in its cost
    currency, whatever the conversion, so the legs are named explicitly. Under
    `--allow-errors` a `missing` leg values at cost, while an `in_units` leg,
    an uncosted position no quote values, has no cost and stays in its units
    (w1/266); strict reads fail on either, the same policy as every report.
    """
    at_cost = set(missing)
    legs = sorted(at_cost | in_units)
    pairs = [{"from": base, "to": quote} for base, quote in legs]
    dated = [{"from": base, "to": quote, "date": end} for base, quote in legs]
    summary = []
    for leg in legs:
        base, quote = leg
        if leg not in in_units:
            shown = "valued at cost"
        elif leg not in at_cost:
            shown = "shown in units"
        else:
            shown = "costed lots valued at cost, the rest shown in units"
        all_prices = ledger.prices.get_all_prices(leg)
        if not all_prices:
            summary.append(f"{base} has no {quote} price at any date; {shown}")
            continue
        earliest = min(point[0] for point in all_prices)
        summary.append(f"{base} → {quote} has no price before {earliest}; earlier holdings {shown}")
    if pairs and not allow_errors:
        if not in_units:
            hint = "for cost-basis values"
        elif not at_cost:
            hint = "to show them in their own units"
        else:
            hint = "to value the costed lots at cost and show the rest in units"
        raise protocol.LedgerError(
            f"Missing prices for {', '.join(sorted({base for base, _ in legs}))}. "
            "Each holding is valued at the period end. Add prices covering the dates below "
            f"or pass --allow-errors {hint}.",
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
    its balance assertions, which move nothing: no `amount`, the figure in
    `asserted`), oldest first, each naming its own account. Each row's
    running balance is valued at that row's date (w1/252); when a later
    quote moves the value, a closing row dated the as-of date carries the
    end-date valuation, so the last row is still the trial-balance total
    (w22/m3/t002).
    """
    from beancount.core.data import Balance

    from fava.core.group_entries import TransactionPosting, group_entries_by_account
    from fava.core.inventory import CounterInventory
    from fava.core.tree import _converted

    if not filtered.account:
        raise protocol.UsageError(
            "Register needs --account. Name the account to list, such as --account Assets:Checking.",
            ledger_errors=ledger_errors,
        )
    matches = _report_filter_match(filtered.account, filtered.ledger.root_accounts)
    # The rows come from the period's entries before the account filter: it
    # keeps whole transactions that touch a matched account, so a child-only
    # transaction was gone before the root's subtree was collected, and
    # `^Assets:Bank$` listed only the parent's own postings (w5/1034).
    period_entries = filtered.ledger.get_filtered(time=filtered.time).entries
    by_account = group_entries_by_account(period_entries)
    active = sorted(
        name
        for name, rows in by_account.items()
        if matches(name) and any(isinstance(row, TransactionPosting) or isinstance(row, Balance) for row in rows)
    )
    # A matched parent counts as a root even with no posting of its own.
    matched = sorted(name for name in by_account if matches(name))
    # A pattern that literally names an account path selects it — including a
    # parent with no postings of its own — while a true regex only resolves
    # when its matched accounts collapse under one of themselves. Regex
    # metacharacters can never spell a real account path, so the literal test
    # cannot mistake one for the other.
    root = _register_root(filtered.account, active or matched, matched)
    if active and root is None:
        several = ", ".join(active)
        raise protocol.UsageError(
            f"Register needs one account; {filtered.account!r} matches several: {several}. Name one account to list.",
            ledger_errors=ledger_errors,
        )
    # The pattern selects the root; the register shows the whole subtree, so a
    # regex that matches a parent but not its children still ends at the total.
    wanted = {name for name in by_account if root is not None and (name == root or name.startswith(root + ":"))}
    # In the loaded order, each transaction's postings in theirs: grouped by
    # account and then sorted by date, same-day rows came out in account-name
    # order and the running balance passed through amounts the parent never
    # held (w5/1056).
    from fava.beans import abc
    from fava.beans.flags import FLAG_SUMMARIZE

    ordered: list[tuple[Any, str]] = []
    for entry in period_entries:
        if isinstance(entry, abc.Transaction):
            # A period clamp's `<summarize>` transaction pairs each position of
            # the summarized account with a plug on `Opening-Balances`. Only
            # the account's own legs (the even ones) are its opening balance;
            # listing the plugs ran an equity register through amounts it
            # never held and named an account never opened (w1/279).
            postings = entry.postings
            if entry.flag == FLAG_SUMMARIZE and (entry.meta or {}).get("filename") == "<summarize>":
                postings = postings[::2]
            ordered += [
                (TransactionPosting(entry, posting), posting.account)
                for posting in postings
                if posting.account in wanted
            ]
        elif isinstance(entry, Balance) and entry.account in wanted:
            ordered.append((entry, entry.account))
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
                    "asserted": None,
                    "difference": None,
                }
            )
        elif isinstance(row, Balance):
            # An assertion moves nothing, so it has no amount: the asserted
            # figure in `amount` read as a deposit and made the column stop
            # summing to the balance. A failed one carries Beancount's
            # `diff_amount`, accumulated minus asserted (w1/289).
            diff = row.diff_amount
            rows.append(
                {
                    "date": row.date,
                    "entry": "balance",
                    "account": name,
                    "payee": None,
                    "narration": None,
                    "amount": None,
                    "cost": None,
                    "asserted": {"number": row.amount.number, "currency": row.amount.currency},
                    "difference": {"number": diff.number, "currency": diff.currency} if diff is not None else None,
                }
            )
        else:
            continue
        # Each row is valued at its own date, as Fava's journal and BQL's
        # `convert(balance, 'USD', date)` value it: a quote from weeks later
        # must not value an earlier balance (w1/252). A running position
        # worth exactly zero is `0 USD`, not empty (w5/1055).
        when = rows[-1]["date"]
        balance = _balance_map(_converted(running, conversion, prices, when))
        rows[-1]["balance"] = balance
        balances.append((when, balance))
    metadata = _metadata(filtered, conversion, ledger_errors)
    if not rows:
        balances.append((filtered.end_date, {}))
    elif conversion not in ("units", "at_cost"):
        # A quote that moved after the last posting leaves the last row short
        # of the trial-balance total, which values at the report's end. One
        # closing row, dated the as-of date and moving nothing, carries that
        # total, so the register still ends where the trial balance does.
        closing = _balance_map(_converted(running, conversion, prices, filtered.end_date))
        if closing != rows[-1]["balance"]:
            rows.append(
                {
                    "date": metadata["as_of"] or rows[-1]["date"],
                    "entry": "closing",
                    "account": root,
                    "payee": None,
                    "narration": None,
                    "amount": None,
                    "cost": None,
                    "asserted": None,
                    "difference": None,
                    "balance": closing,
                }
            )
            balances.append((filtered.end_date, closing))
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger, ledger_errors, wanted)
    return (
        metadata
        | valuation
        | {
            "display_precision": _display_precision(filtered),
            "account": root,
            "rows": rows,
        }
    )


def _register_root(pattern: str, active: list[str], matched: list[str]) -> str | None:
    """The one subtree `pattern` names, or None when it spans several.

    Its root is the outermost matched account holding every active one, so a
    parent the pattern names but whose period holds only its children's
    postings is still the root (w5/1034).
    """
    if active:
        candidate = ":".join(active[0].split(":")[: len(pattern.split(":"))])
        # Folded as account filters fold them, so a Turkish `İzmir` parent
        # typed in lowercase is the one parent, not a false ambiguity (w5/1034).
        if fold_account(candidate) == fold_account(pattern) and all(
            name == candidate or name.startswith(candidate + ":") for name in active
        ):
            return candidate
        roots = [name for name in matched if all(other == name or other.startswith(name + ":") for other in active)]
        if roots:
            return min(roots, key=lambda name: name.count(":"))
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


def _refuse_window_outside_time(
    period: tuple[date | None, date | None], bounds: tuple[date | None, date | None], ledger_errors: list[str]
) -> None:
    """Refuse a `--from-date / --to-date` window that shares no day with `--time`.

    Intersected with a period it misses, the window was empty yet still stated:
    a heading reading `2026-01-01 through 2025-06-01` and opening cash from the
    wrong side of it, exit 0 (w1/248). Like a reversed `--from/--to`, it is a
    usage error, and nothing is computed.
    """
    first, after = period
    start, end = bounds
    if first is None and after is None:
        return
    stated = (
        f"{first.isoformat() if first else 'the start'} through "
        f"{(after - timedelta(days=1)).isoformat() if after else 'the end'}"
    )
    if end is not None and first is not None and end < first:
        raise protocol.UsageError(
            f"--to-date {end.isoformat()} is before the --time period {stated}.", ledger_errors=ledger_errors
        )
    if start is not None and after is not None and start >= after:
        raise protocol.UsageError(
            f"--from-date {start.isoformat()} is after the --time period {stated}.", ledger_errors=ledger_errors
        )


def _capital_gains(filtered: Any, bounds: tuple[date | None, date | None], ledger_errors: list[str]) -> dict[str, Any]:
    """Realized gain/loss per reduction, from the booked cost and price.

    A closed lot is a reducing posting that carries both: splits and
    own-account transfers reduce without a price, so they are movements,
    not sales. FIFO vs specific-lot is the ledger's own booking —
    Beancount matched the lot at load, and the posting's cost names it,
    acquisition date included. Proceeds and basis stay in their own
    currencies, and totals never sum across currencies. The one-year boundary
    is the acquisition date's anniversary, a calendar date with no
    jurisdiction rules attached (w22/m4/t001, w1/249).
    """
    from beancount.core.data import Transaction
    from beancount.core.inventory import Inventory
    from beancount.core.position import Cost

    matches = _report_filter_match(filtered.account, filtered.ledger.root_accounts) if filtered.account else None
    start, end = bounds
    rows: list[dict[str, Any]] = []
    # A reduction is a posting that shrinks a lot the account already holds,
    # in either direction: a sale out of a long lot, or a cover (a payment
    # settling a costed payable) into a short one. Reading only negative
    # postings dropped every cover and reported each short opening as a sale
    # (w5/1035), so the lots are tracked from the first entry, whatever the
    # date bounds, and only what a posting actually closed is reported.
    held_lots: dict[str, Any] = {}
    for entry in filtered.entries:
        if not isinstance(entry, Transaction):
            continue
        for posting in entry.postings:
            units = posting.units
            cost = posting.cost
            if (
                units is None
                or not isinstance(units.number, Decimal)
                or not isinstance(cost, Cost)
                or not isinstance(cost.number, Decimal)
            ):
                continue
            lots = held_lots.setdefault(posting.account, Inventory())
            existing = lots.get((units.currency, cost))
            before = existing.units.number if existing is not None else Decimal(0)
            lots.add_position(posting)
            if before == 0 or (before > 0) == (units.number > 0):
                continue
            price = posting.price
            # Splits and own-account transfers reduce without a price: they
            # are movements, not sales. Nor does an unfinished `@ USD` in a
            # partial read, whose number is the parser's MISSING sentinel and
            # crashed the multiplication (w5/1043).
            if price is None or not isinstance(price.number, Decimal):
                continue
            # A partial read keeps a posting whose price currency the parser
            # refused against its cost; its gain would subtract 100 USD from
            # 150 EUR and call the difference USD (w5/1046).
            if price.currency != cost.currency:
                continue
            if (start is not None and entry.date < start) or (end is not None and entry.date > end):
                continue
            if matches is not None and not matches(posting.account):
                continue
            # `abs()` rounds to the 28-digit context; `copy_abs()` keeps the
            # exact posted magnitudes so the clamp cannot overstate a close.
            quantity = min(before.copy_abs(), units.number.copy_abs())
            proceeds: dict[str, Any]
            basis: dict[str, Any]
            if before > 0:
                proceeds = {"number": quantity * price.number, "currency": price.currency}
                basis = {"number": quantity * cost.number, "currency": cost.currency}
            else:
                proceeds = {"number": quantity * cost.number, "currency": cost.currency}
                basis = {"number": quantity * price.number, "currency": price.currency}
            acquired = cost.date
            held = (entry.date - acquired).days if acquired is not None else None
            # "More than one year" is by calendar date, not `held > 365`: a
            # year spanning 29 February has 366 days, so a lot held exactly
            # one year passed the day count (w1/249). Comparing (year, month,
            # day) treats 29 February plus a year as 28 February.
            long_held = (
                (entry.date.year, entry.date.month, entry.date.day) > (acquired.year + 1, acquired.month, acquired.day)
                if acquired is not None
                else None
            )
            gain = {"number": proceeds["number"] - basis["number"], "currency": cost.currency}
            rows.append(
                {
                    "account": posting.account,
                    "commodity": units.currency,
                    "acquired": acquired,
                    "sold": entry.date,
                    "held_days": held,
                    "long_held": long_held,
                    "quantity": {"number": quantity, "currency": units.currency},
                    "proceeds": proceeds,
                    "basis": basis,
                    "gain": gain,
                }
            )
    totals: dict[str, dict[str, Decimal]] = {"one_year_or_less": {}, "more_than_one_year": {}, "holding_unknown": {}}
    for row in rows:
        if row["long_held"] is None:
            bucket = totals["holding_unknown"]
        elif row["long_held"]:
            bucket = totals["more_than_one_year"]
        else:
            bucket = totals["one_year_or_less"]
        currency = row["gain"]["currency"]
        bucket[currency] = bucket.get(currency, Decimal(0)) + row["gain"]["number"]
    # No quotes are read — every figure comes from booked postings — so
    # valuation is trivially complete; the keys stay for the shared heading.
    metadata = _bounded(_metadata(filtered, "units", ledger_errors), bounds) | {
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
    The name patterns only ever match Assets, but a declared `cash` is
    trusted under any of the five roots — an overdraft declared cash was
    left out of both the cash set and the rows, inventing an opening
    (w5/1057). Accounts outside the five roots stay out. Returns
    account -> source.
    """
    members: dict[str, str] = {}
    for account in sorted(opens):
        if root_types.get(account.split(":", 1)[0]) is None:
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


def _cash_flow(
    filtered: Any, bounds: tuple[date | None, date | None], ledger_errors: list[str], cash_context: Context
) -> dict[str, Any]:
    """Direct-method cash flow: inverted non-cash flows explain the CCE change.

    Flows and closing accumulate posting inventories over their windows and
    convert at cost — the conversion the dashboard statement reconciles
    under (`at_cost` reads booked costs only, so lots collapse to the cash
    they moved and cost-less cash stays in its own units). Flows cover
    `--time` intersected with the inclusive `--from-date`/`--to-date`
    bounds; cash boundaries independently accumulate postings before the
    window's start and exclusive end, using native inventory arithmetic.
    The wider context is only for cost-flow reconciliation and discloses
    accepted booking and cash accumulation rounding. `--account` narrows
    rows and the CCE set together, and is refused when it keeps only some
    legs of a window transaction, omitting part of its cash movement.
    A transaction with no cash leg moves no cash and is not activity.
    Accounts outside the five roots are
    excluded from rows and surface via the shared unrooted-accounts note.
    Membership — not the direct role — gates rows, so an inherited-cash
    leaf is never double-counted.
    """
    from beancount.core.data import Open, Transaction

    from fava.core.conversion import cost_or_value
    from fava.core.inventory import CounterInventory
    from fava.modules.financial_statements import priced_exchange

    matches = _report_filter_match(filtered.account, filtered.ledger.root_accounts) if filtered.account else None
    root_types = _root_type_map(filtered.ledger.options)
    opens: dict[str, Any] = {}
    for entry in filtered.ledger.all_entries:
        if isinstance(entry, Open):
            opens[entry.account] = (entry.meta or {}).get(_CASH_FLOW_ROLE_KEY)
    members = _cash_accounts(opens, root_types)
    prices = filtered.ledger.prices

    start, end = bounds
    first, period_end = filtered.period
    if start is not None:
        first = start if first is None else max(first, start)
    cutoff = period_end
    # The calendar's last day has no exclusive end after it, and as an
    # inclusive bound it restricts nothing: it must not replace the period's
    # own finite end with "none", which skipped every closing posting
    # (w5/1049). A cutoff still None means no end at all, not no history.
    if end is not None and end != date.max:
        bound_end = end + timedelta(days=1)
        cutoff = bound_end if cutoff is None else min(cutoff, bound_end)

    # Flows read the loaded transactions, not `filtered.entries`: a `--time`
    # filter clamps those for the balance reports, summarizing everything
    # before the period into `<summarize>` transactions dated the day before
    # it. Counted as activity, that carried-in cash read as current financing
    # and a quiet month as one full of inflows (w5/1048). The window is the
    # half-open [first, cutoff) — the period intersected with the bounds.
    flow_books: dict[str, CounterInventory] = {}
    split: list[tuple[Any, list[str], list[str]]] = []
    priced: list[Any] = []
    residuals: list[dict[str, Decimal]] = []
    for entry in filtered.ledger.all_entries:
        if not isinstance(entry, Transaction):
            continue
        if first is not None and entry.date < first:
            continue
        if cutoff is not None and entry.date >= cutoff:
            continue
        # Only a transaction with a cash leg is cash activity: a purchase
        # charged wholly to a card balances against the card and moves no
        # cash, so it is neither a row nor a split under `--account`. The
        # membership is the unfiltered one, as the dashboard's
        # cashAccountMembership (w4/m56, w1/268).
        if not any(
            posting.units is not None and posting.units.number is not None and posting.account in members
            for posting in entry.postings
        ):
            continue
        if matches is not None:
            # Every leg the statement reads — a cash member or a rooted
            # account that becomes a row — must be kept or left out together.
            legs = [
                posting.account
                for posting in entry.postings
                if posting.units is not None
                and posting.units.number is not None
                and (
                    posting.account in members
                    or root_types.get(posting.account.split(":", 1)[0]) in _CASH_FLOW_ACTIVITY_BY_ROOT
                )
            ]
            kept = sorted({account for account in legs if matches(account)})
            dropped = sorted({account for account in legs if not matches(account)})
            if kept and dropped:
                split.append((entry, kept, dropped))
        is_priced = priced_exchange(entry)
        if is_priced:
            priced.append(entry)
        own = CounterInventory()
        for posting in entry.postings:
            if posting.units is None or posting.units.number is None:
                continue
            if matches is not None and not matches(posting.account):
                continue
            if not is_priced:
                own.add_position(posting)  # type: ignore[arg-type]
            # Fava's inventory reads units/cost duck-typed; beancount postings
            # flow through the same call in interval_totals at runtime.
            flow_books.setdefault(posting.account, CounterInventory()).add_position(posting)  # type: ignore[arg-type]
        # What a price-free transaction leaves at cost is the rounding its
        # own tolerance accepted (a {{1000.00 USD}} lot over three shares
        # weighs 999.99…), not a basis mismatch (w5/1071).
        if not is_priced:
            residuals.append(_balance_map(cost_or_value(own, "at_cost", prices)))
    if split:
        _refuse_split_cash_flow(filtered.account, split, ledger_errors)
    flows = {account: _balance_map(cost_or_value(book, "at_cost", prices)) for account, book in flow_books.items()}

    # Cash balances must match native Beancount and the sibling reports. The
    # wide context used by the cost-flow proof otherwise retains digits that
    # native inventory accumulation rounds (w5/1118). Opening is independently
    # accumulated too: subtracting a wide movement from a rounded closing can
    # invent an opening balance, even when the closing itself is correct.
    with localcontext(cash_context):
        opening_books: dict[str, CounterInventory] = {}
        closing_books: dict[str, CounterInventory] = {}
        for entry in filtered.ledger.all_entries:
            if not isinstance(entry, Transaction) or (cutoff is not None and entry.date >= cutoff):
                continue
            for posting in entry.postings:
                if posting.units is None or posting.units.number is None:
                    continue
                if posting.account not in members:
                    continue
                if matches is not None and not matches(posting.account):
                    continue
                closing_books.setdefault(posting.account, CounterInventory()).add_position(posting)  # type: ignore[arg-type]
                if first is not None and entry.date < first:
                    opening_books.setdefault(posting.account, CounterInventory()).add_position(posting)  # type: ignore[arg-type]
        closing = {
            account: _balance_map(cost_or_value(book, "at_cost", prices)) for account, book in closing_books.items()
        }
        closing_total = _sum_amounts(closing.values())
        opening_total = _sum_amounts(
            _balance_map(cost_or_value(book, "at_cost", prices)) for book in opening_books.values()
        )

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
    # The rows explain the cash only when every transaction conserves each
    # currency at cost. A priced exchange (`100 EUR @ 1.10 USD`) balances by
    # its price weight instead, so its legs vanished from the rows or became
    # an invented foreign opening balance (w5/1068): checked against the cash
    # accounts' own movement, and refused rather than published.
    moved = _sum_amounts(flows[account] for account in flows if account in members)
    rounding = {currency: total for currency, total in _sum_amounts(residuals).items() if total}
    unexplained = sorted(
        currency
        for currency in set(moved) | set(net_change) | set(rounding)
        if moved.get(currency, Decimal(0)) - net_change.get(currency, Decimal(0)) != rounding.get(currency, Decimal(0))
    )
    if unexplained:
        examples = ", ".join(
            f"{_where_entry(entry)} ({entry.narration or entry.payee or 'transaction'})" for entry in priced[:5]
        )
        cause = (
            f"priced currency exchanges ({examples}) move cash in {', '.join(unexplained)} by a price, not by cost"
            if priced
            else f"its transactions do not conserve {', '.join(unexplained)} at cost"
        )
        raise protocol.UsageError(
            f"Cash Flow cannot reconcile this period: {cause}, so the activity rows would not explain the cash "
            "accounts' actual change. The report reads every amount at cost; narrow the period to exclude them, "
            "or read the balance sheet.",
            ledger_errors=ledger_errors,
        )
    opening = {
        # An absent position is zero; retain the closing currency's scale in
        # its JSON spelling (0.00 USD), without deriving a nonzero opening.
        currency: opening_total.get(currency, closing_total.get(currency, Decimal(0)).copy_abs() * 0)
        for currency in set(opening_total) | set(closing_total) | set(moved) | set(net_change)
    }
    # The conservation proof above still uses the booked postings at wide
    # precision, so native accumulation cannot hide an unexplained FX flow.
    # Once proved, disclose the difference between that booked movement and
    # native cash boundaries alongside the accepted cost-booking residual.
    # Cancel the cash boundaries before adding a potentially tiny residual.
    rounding = {
        currency: residual
        for currency in set(opening) | set(closing_total) | set(rounding) | set(moved)
        if (
            residual := rounding.get(currency, Decimal(0))
            + (
                closing_total.get(currency, Decimal(0))
                - opening.get(currency, Decimal(0))
                - moved.get(currency, Decimal(0))
            )
        )
    }
    invalid_role_values = [
        {"account": account, "value": _jsonable_role_value(value)}
        for account in sorted(opens)
        if (value := opens[account]) is not None and not (isinstance(value, str) and value in _CASH_FLOW_ROLES)
    ]
    # No quotes are read — at_cost converts lots from booked costs, and
    # cost-less positions stay in their own units — so valuation is trivially
    # complete; the keys stay for the shared heading.
    metadata = _bounded(_metadata(filtered, "at_cost", ledger_errors), bounds) | {
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
        "rounding_residual": rounding,
        "closing": closing_total,
        "cash_accounts": [
            {"account": account, "balance": closing.get(account, {}), "role_source": members[account]}
            for account in sorted(members)
            if matches is None or matches(account)
        ],
        "invalid_role_values": invalid_role_values,
    }


_SPLIT_EXAMPLES = 5


def _where_entry(entry: Any) -> str:
    meta = entry.meta or {}
    return f"{entry.date} at {Path(str(meta.get('filename', '?'))).name}:{meta.get('lineno', '?')}"


def _refuse_split_cash_flow(
    account: str, split: list[tuple[Any, list[str], list[str]]], ledger_errors: list[str]
) -> None:
    """Refuse an `--account` statement that keeps only some legs of a transaction (w5/1050).

    The filter is per posting, so it can keep a cash leg and drop the income
    that paid it, or keep one side of a transfer. The rows then no longer
    explain the cash the kept accounts moved, and the opening derived from
    them is invented. That is a property of the filter, not of the ledger,
    so `--allow-errors` does not report it anyway.
    """
    details = [
        f"{entry.date.isoformat()} {entry.narration or entry.payee or 'transaction'!r}: keeps "
        f"{', '.join(kept)} but leaves out {', '.join(dropped)}"
        for entry, kept, dropped in split[:_SPLIT_EXAMPLES]
    ]
    if len(split) > _SPLIT_EXAMPLES:
        details.append(f"... and {len(split) - _SPLIT_EXAMPLES} more.")
    missing = sorted({name for _, _, dropped in split for name in dropped})
    details.append(
        "Remove --account to report every cash account, or pass a filter that also matches "
        f"{', '.join(missing)}, so each transaction it selects is kept whole."
    )
    raise protocol.UsageError(
        f"Cash flow cannot be narrowed by --account {account!r}: the filter keeps only some legs of "
        f"{len(split)} transaction(s) in the period, so its opening cash and net change would not be "
        "the cash those accounts actually moved.",
        details=details,
        ledger_errors=ledger_errors,
    )


def _sum_amounts(maps: Iterable[Mapping[str, Decimal]]) -> dict[str, Decimal]:
    """Add per-currency maps, keeping zero keys (unlike inventory `add`).

    A first amount is taken as given: `0 + x` rounds a 29-digit token amount
    to the context's 28 digits, which made merged cash disagree with its own
    accounts (w5/1072).
    """
    totals: dict[str, Decimal] = {}
    for amounts in maps:
        for currency, total in amounts.items():
            totals[currency] = totals[currency] + total if currency in totals else total
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


def _bounded(metadata: dict[str, Any], bounds: tuple[date | None, date | None]) -> dict[str, Any]:
    """The report's period narrowed to its `--from-date / --to-date` window.

    The bounds filtered the rows but the heading and `period` still described
    the whole ledger, so an empty selected day read `No sales.` under months
    that held sales (w5/1036). The window is intersected with the period the
    time filter chose, and stated as `bounds` too.
    """
    start, end = bounds
    if start is None and end is None:
        return metadata
    period = metadata["period"]
    first, after = period["start"], period["end_exclusive"]
    if start is not None:
        first = max(first, start) if first is not None else start
    # The calendar's last day restricts nothing and has no day after it to
    # end on, so as a to-date it leaves the period's end alone (w5/1049).
    if end is not None and end != date.max:
        after = min(after, end + timedelta(days=1)) if after is not None else end + timedelta(days=1)
    if first is not None and after is not None and first >= after:
        # A window with no dated activity at all is stated as asked: a lone
        # `--to-date` before the first entry is that day, not a reversed
        # range from the period's own start (w1/248).
        first = start or (end if end is not None and end != date.max else first)
        after = end + timedelta(days=1) if end is not None and end != date.max else first + timedelta(days=1)
    return metadata | {
        "period": {"start": first, "end_exclusive": after},
        "as_of": after - timedelta(days=1) if after is not None else None,
        "bounds": {"from_date": start, "to_date": end},
    }


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
