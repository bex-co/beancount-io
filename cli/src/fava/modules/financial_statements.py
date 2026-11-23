"""Financial statements data assembly."""

from __future__ import annotations

from collections import defaultdict
from copy import copy
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING, TypeGuard

from beancount.core import flags
from beancount.core.data import Directive, Posting, Transaction
from beancount.parser.options import get_previous_accounts

from .chart import ChartModule, DateAndBalance, DateAndBalanceWithAccountBalance
from ..core.conversion import AT_COST, UNITS, cost_or_value
from ..core.inventory import CounterInventory, SimpleCounterInventory


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterable

    from ..core.conversion import Conversion
    from ..core.tree import SerialisedTreeNode
    from ..ledger import FilteredLedger
    from ..util.date import Interval


def _is_clamp_booking(entry: Directive, flag: str, filename: str) -> TypeGuard[Transaction]:
    """Whether an entry is one of the period clamp's synthetic transactions.

    A booking a user wrote themselves carries their own flag and file.
    """
    return isinstance(entry, Transaction) and entry.flag == flag and entry.meta.get("filename") == filename


def _valued(currency: str, number: Decimal, filtered: FilteredLedger, conversion: str | Conversion) -> bool:
    """Whether the report's conversion values `number currency` at the period's as-of date.

    A conversion leaves what it has no price for in its own commodity; the
    currency a report converts into is valued as it stands.
    """
    if isinstance(conversion, str) and currency in conversion.split(","):
        return True
    balance = CounterInventory({(currency, None): number})
    return currency not in cost_or_value(balance, conversion, filtered.ledger.prices, filtered.end_date)


def _period_equity_view(filtered: FilteredLedger, conversion: str | Conversion) -> tuple[FilteredLedger, bool]:
    """The filtered ledger as a period's equity tree reads it, and whether it kept the clamp's plugs.

    `TimeFilter` closes the period with a conversion transaction that books
    the cost residual into the conversions account (w5/789). It opens the
    period with one `<summarize>` transaction per account: the account's own
    position, then a plug on `Opening-Balances` at that position's cost. A lot
    at cost plugs in its cost currency, but foreign cash or shares bought with
    `@` plug in their own units, so `Opening-Balances` held them at the closing
    rate: it read a balance the ledger never had, and the period's translation
    never reached the adjustment (w1/296). Both bookings stay out of the equity
    tree. Each account keeps its own opening leg, as the register does (w1/279),
    and the residual valuation adjustment absorbs the rest, as it does without
    `--time`. Plugs in one currency net to zero, so a single-currency ledger
    reads the same either way.

    One case keeps the plugs: pre-period earnings in a commodity no other
    account held at the start, such as foreign cash spent abroad, that the
    report cannot value at its as-of date. Only the plug nets them, so the
    period values without a price for that commodity (w5/790). A spent
    commodity the report can value needs no netting, so it no longer brings
    every other plug back (w1/298). Kept plugs net the earlier transactions
    at cost, so their rounding is not in the trees (`_split_residual`).
    """
    if filtered.time is None:
        return filtered, False
    previous = set(get_previous_accounts(filtered.ledger.options)[:2])
    paired: dict[str, Decimal] = defaultdict(Decimal)
    held: set[str] = set()
    for entry in filtered.entries:
        if _is_clamp_booking(entry, flags.FLAG_SUMMARIZE, "<summarize>"):
            for posting in entry.postings[::2]:
                if posting.account in previous:
                    paired[posting.units.currency] += posting.units.number or 0
                else:
                    held.add(posting.units.currency)
    keep_plugs = any(
        number and currency not in held and not _valued(currency, number, filtered, conversion)
        for currency, number in paired.items()
    )
    view = copy(filtered)
    view.entries = []
    for entry in filtered.entries:
        if _is_clamp_booking(entry, flags.FLAG_CONVERSIONS, "<conversions>"):
            continue
        if not keep_plugs and _is_clamp_booking(entry, flags.FLAG_SUMMARIZE, "<summarize>"):
            entry = entry._replace(postings=entry.postings[::2])
        view.entries.append(entry)
    return view, keep_plugs


def price_weighted(posting: Posting) -> bool:
    """Whether a price, not a booked cost, weighs this posting.

    A price on a costed posting does not set its weight (the booked cost
    does), so only a price-weighted leg counts (w5/1078).
    """
    return (
        posting.price is not None
        and posting.cost is None
        and posting.units is not None
        and posting.price.currency != posting.units.currency
    )


def priced_exchange(entry: Transaction) -> bool:
    """Whether a price, not a booked cost, weighs one of a transaction's legs: a currency exchange."""
    return any(price_weighted(posting) for posting in entry.postings)


def _residual(balances: Iterable[SimpleCounterInventory]) -> SimpleCounterInventory:
    """What `balances` leave unbalanced, signed so that adding it nets them to zero."""
    residual = SimpleCounterInventory()
    for balance in balances:
        for currency, amount in balance.items():
            residual.add(currency, -amount)
    return residual


def _split_residual(
    filtered: FilteredLedger,
    conversion: str | Conversion,
    residual: SimpleCounterInventory,
    at_cost: SimpleCounterInventory,
    kept_plugs: bool,
) -> tuple[SimpleCounterInventory, SimpleCounterInventory]:
    """The valued trees' `residual` as (valuation and translation, accepted rounding) (w1/304).

    A transaction balances when its weights net within the tolerance its own
    numbers imply: two `3.333 USD` legs against `-6.67 USD` leave 0.004 USD.
    Valued, the trees' residual holds that rounding beside a holding's
    unrealized gain and a currency's translation, and printed it all as
    valuation. `at_cost` is the same residual with the same trees read at
    cost, where no holding is revalued. A priced exchange (`90 EUR @ 1.10
    USD`) still leaves its legs unlike there, which is translation, so it is
    taken back out. What remains is what each price-free transaction's
    tolerance accepted, the cash flow's `rounding_residual` (w5/1071),
    converted at the as-of date. Read from the same trees, a ledger with
    nothing to value gives the whole residual to rounding, digit for digit.

    The trees hold every transaction through the period's end: the opening
    legs carry the earlier ones, unless the clamp's plugs were kept and net
    them at cost, in which case they start at the period's first day.
    """
    since = filtered.date_range.begin if kept_plugs and filtered.date_range else None
    end = filtered.date_range.end if filtered.date_range else None
    priced = CounterInventory()
    for entry in filtered.ledger.all_entries:
        if not isinstance(entry, Transaction) or not priced_exchange(entry):
            continue
        if (since is not None and entry.date < since) or (end is not None and entry.date >= end):
            continue
        for posting in entry.postings:
            if posting.units is not None and posting.units.number is not None:
                priced.add_position(posting)  # type: ignore[arg-type]
    left = SimpleCounterInventory(at_cost)
    for currency, number in cost_or_value(priced, AT_COST, filtered.ledger.prices).items():
        left.add(currency, number)
    rounding = cost_or_value(
        CounterInventory({(currency, None): number for currency, number in left.items()}),
        conversion,
        filtered.ledger.prices,
        filtered.end_date,
    )
    valuation = SimpleCounterInventory(residual)
    for currency, number in rounding.items():
        valuation.add(currency, -number)
    return valuation, rounding


@dataclass(frozen=True)
class IncomeStatementData:
    """Data for the income statement report."""

    net_profit_data: list[DateAndBalanceWithAccountBalance]
    income_data: list[DateAndBalanceWithAccountBalance]
    expenses_data: list[DateAndBalanceWithAccountBalance]
    income_hierarchy: SerialisedTreeNode
    expenses_hierarchy: SerialisedTreeNode


@dataclass(frozen=True)
class TrialBalanceData:
    """Data for the trial balance report."""

    income_hierarchy: SerialisedTreeNode
    liabilities_hierarchy: SerialisedTreeNode
    equity_hierarchy: SerialisedTreeNode
    expenses_hierarchy: SerialisedTreeNode
    assets_hierarchy: SerialisedTreeNode
    #: Beancount.io change: what valuing leaves the five trees unbalanced by;
    #: None under `units`, where lots at cost cannot net (w1/287).
    valuation_adjustment: SimpleCounterInventory | None
    #: The rest of that residual, the rounding the ledger's tolerance
    #: accepted (w1/304); None under `units`.
    rounding_residual: SimpleCounterInventory | None


@dataclass(frozen=True)
class BalanceSheetData:
    """Data for the balance sheet report."""

    net_worth_data: list[DateAndBalance]
    assets_data: list[DateAndBalance]
    liabilities_data: list[DateAndBalance]
    equity_data: list[DateAndBalance]
    assets_hierarchy: SerialisedTreeNode
    liabilities_hierarchy: SerialisedTreeNode
    equity_hierarchy: SerialisedTreeNode
    current_earnings: SimpleCounterInventory
    #: Beancount.io change: the income and expenses roots `current_earnings`
    #: sums, so a text report can print it from the figures the income
    #: statement prints for them (w1/358).
    earnings_parts: tuple[SimpleCounterInventory, ...]
    valuation_adjustment: SimpleCounterInventory
    rounding_residual: SimpleCounterInventory
    equity_total: SimpleCounterInventory


@dataclass(frozen=True)
class OverviewData:
    """Data for the overview report."""

    net_worth_data: list[DateAndBalance]
    assets_data: list[DateAndBalance]
    assets_hierarchy: SerialisedTreeNode
    liabilities_data: list[DateAndBalance]
    liabilities_hierarchy: SerialisedTreeNode
    income_data: list[DateAndBalance]
    income_interval_data: list[DateAndBalanceWithAccountBalance]
    income_hierarchy: SerialisedTreeNode
    expenses_data: list[DateAndBalance]
    expenses_interval_data: list[DateAndBalanceWithAccountBalance]
    expenses_hierarchy: SerialisedTreeNode


class FinancialStatementsModule:
    """Assemble data for financial statement reports."""

    def income_statement(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> IncomeStatementData:
        """Compute income statement data."""
        chart = ChartModule()
        options = filtered.ledger.options
        return IncomeStatementData(
            net_profit_data=chart.interval_totals(
                filtered,
                interval,
                (options["name_income"], options["name_expenses"]),
                conversion,
            ),
            income_data=chart.interval_totals(filtered, interval, options["name_income"], conversion),
            expenses_data=chart.interval_totals(filtered, interval, options["name_expenses"], conversion),
            income_hierarchy=chart.hierarchy(filtered, options["name_income"], conversion),
            expenses_hierarchy=chart.hierarchy(filtered, options["name_expenses"], conversion),
        )

    def trial_balance(
        self,
        filtered: FilteredLedger,
        conversion: str | Conversion,
    ) -> TrialBalanceData:
        """Compute trial balance data.

        Beancount.io change: valued at market, the five trees no longer net to
        zero (a holding's unrealized gain, a currency's translation), so their
        residual is returned as the balance sheet derives its valuation
        adjustment, less the rounding the ledger's tolerance accepted, which
        is returned on its own (w1/304). The period clamp's conversion booking
        and opening plugs fold into it, as on the balance sheet, so a `-t`
        report splits equity as the unclamped one does (w1/287, w1/296).
        `units` keeps those bookings and has no residual.
        """
        chart = ChartModule()
        options = filtered.ledger.options
        valued = conversion not in ("units", UNITS)
        view, kept = _period_equity_view(filtered, conversion) if valued else (filtered, False)

        def roots(valued_as: str | Conversion) -> dict[str, SerialisedTreeNode]:
            return {
                name: chart.hierarchy(view if name == "equity" else filtered, options[f"name_{name}"], valued_as)
                for name in ("assets", "liabilities", "equity", "income", "expenses")
            }

        trees = roots(conversion)
        adjustment = rounding = None
        if valued:
            at_cost = trees if conversion in ("at_cost", AT_COST) else roots(AT_COST)
            adjustment, rounding = _split_residual(
                filtered,
                conversion,
                _residual(tree.balance_children for tree in trees.values()),
                _residual(tree.balance_children for tree in at_cost.values()),
                kept,
            )
        return TrialBalanceData(
            income_hierarchy=trees["income"],
            liabilities_hierarchy=trees["liabilities"],
            equity_hierarchy=trees["equity"],
            expenses_hierarchy=trees["expenses"],
            assets_hierarchy=trees["assets"],
            valuation_adjustment=adjustment,
            rounding_residual=rounding,
        )

    def balance_sheet(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> BalanceSheetData:
        """Compute balance sheet data.

        Beancount.io change: the residual that nets assets, liabilities,
        equity and earnings is split into the valuation adjustment and the
        rounding the ledger's tolerance accepted (w1/304).
        """
        chart = ChartModule()
        options = filtered.ledger.options
        view, kept = _period_equity_view(filtered, conversion)

        def roots(valued_as: str | Conversion) -> tuple[SerialisedTreeNode, ...]:
            return tuple(
                chart.hierarchy(view if name == "name_equity" else filtered, options[name], valued_as)
                for name in ("name_assets", "name_liabilities", "name_equity", "name_income", "name_expenses")
            )

        def residual(trees: tuple[SerialisedTreeNode, ...]) -> tuple[SimpleCounterInventory, SimpleCounterInventory]:
            """The period's earnings, and what assets, liabilities, equity and earnings leave unbalanced."""
            earnings = SimpleCounterInventory()
            for tree in trees[3:]:
                for currency, amount in tree.balance_children.items():
                    earnings.add(currency, amount)
            return earnings, _residual((*(tree.balance_children for tree in trees[:3]), earnings))

        valued = roots(conversion)
        assets, liabilities, equity = valued[:3]
        # Valid books balance at their booking weights. The difference after
        # market conversion is separate from the period's booked P&L.
        earnings, total = residual(valued)
        adjustment, rounding = total, SimpleCounterInventory()
        if conversion not in ("units", UNITS):
            at_cost = total if conversion in ("at_cost", AT_COST) else residual(roots(AT_COST))[1]
            adjustment, rounding = _split_residual(filtered, conversion, total, at_cost, kept)
        equity_total = SimpleCounterInventory(equity.balance_children)
        for balance in (earnings, total):
            for currency, amount in balance.items():
                equity_total.add(currency, amount)
        return BalanceSheetData(
            net_worth_data=chart.net_worth(filtered, interval, conversion),
            assets_data=chart.account_balance(filtered, interval, options["name_assets"], conversion),
            liabilities_data=chart.account_balance(filtered, interval, options["name_liabilities"], conversion),
            equity_data=chart.account_balance(filtered, interval, options["name_equity"], conversion),
            assets_hierarchy=assets,
            liabilities_hierarchy=liabilities,
            equity_hierarchy=equity,
            current_earnings=earnings,
            earnings_parts=tuple(tree.balance_children for tree in valued[3:]),
            valuation_adjustment=adjustment,
            rounding_residual=rounding,
            equity_total=equity_total,
        )

    def overview(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> OverviewData:
        """Compute overview data."""
        chart = ChartModule()
        options = filtered.ledger.options
        return OverviewData(
            net_worth_data=chart.net_worth(filtered, interval, conversion),
            assets_data=chart.account_balance(filtered, interval, options["name_assets"], conversion),
            assets_hierarchy=chart.hierarchy(filtered, options["name_assets"], conversion),
            liabilities_data=chart.account_balance(filtered, interval, options["name_liabilities"], conversion),
            liabilities_hierarchy=chart.hierarchy(filtered, options["name_liabilities"], conversion),
            income_data=chart.account_balance(filtered, interval, options["name_income"], conversion),
            income_interval_data=chart.interval_totals(filtered, interval, (options["name_income"],), conversion),
            income_hierarchy=chart.hierarchy(filtered, options["name_income"], conversion),
            expenses_data=chart.account_balance(filtered, interval, options["name_expenses"], conversion),
            expenses_interval_data=chart.interval_totals(filtered, interval, (options["name_expenses"],), conversion),
            expenses_hierarchy=chart.hierarchy(filtered, options["name_expenses"], conversion),
        )
