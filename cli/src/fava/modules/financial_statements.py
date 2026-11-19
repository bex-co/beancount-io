"""Financial statements data assembly."""

from __future__ import annotations

from collections import defaultdict
from copy import copy
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING, TypeGuard

from beancount.core import flags
from beancount.core.data import Directive, Transaction
from beancount.parser.options import get_previous_accounts

from .chart import ChartModule, DateAndBalance, DateAndBalanceWithAccountBalance
from ..core.conversion import UNITS, cost_or_value
from ..core.inventory import CounterInventory, SimpleCounterInventory


if TYPE_CHECKING:  # pragma: no cover
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


def _period_equity_view(filtered: FilteredLedger, conversion: str | Conversion) -> FilteredLedger:
    """The filtered ledger as a period's equity tree reads it, without the clamp's plugs.

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
    every other plug back (w1/298).
    """
    if filtered.time is None:
        return filtered
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
    return view


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
    #: Beancount.io change: what the five trees leave unbalanced once valued;
    #: None under `units`, where lots at cost cannot net (w1/287).
    valuation_adjustment: SimpleCounterInventory | None


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
    valuation_adjustment: SimpleCounterInventory
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
        adjustment. The period clamp's conversion booking and opening plugs
        fold into it, as on the balance sheet, so a `-t` report splits equity
        as the unclamped one does (w1/287, w1/296). `units` keeps those
        bookings and has no residual.
        """
        chart = ChartModule()
        options = filtered.ledger.options
        valued = conversion not in ("units", UNITS)
        trees = {
            name: chart.hierarchy(
                _period_equity_view(filtered, conversion) if valued and name == "equity" else filtered,
                options[f"name_{name}"],
                conversion,
            )
            for name in ("assets", "liabilities", "equity", "income", "expenses")
        }
        adjustment = None
        if valued:
            adjustment = SimpleCounterInventory()
            for tree in trees.values():
                for currency, amount in tree.balance_children.items():
                    adjustment.add(currency, -amount)
        return TrialBalanceData(
            income_hierarchy=trees["income"],
            liabilities_hierarchy=trees["liabilities"],
            equity_hierarchy=trees["equity"],
            expenses_hierarchy=trees["expenses"],
            assets_hierarchy=trees["assets"],
            valuation_adjustment=adjustment,
        )

    def balance_sheet(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> BalanceSheetData:
        """Compute balance sheet data."""
        chart = ChartModule()
        options = filtered.ledger.options
        assets = chart.hierarchy(filtered, options["name_assets"], conversion)
        liabilities = chart.hierarchy(filtered, options["name_liabilities"], conversion)
        equity = chart.hierarchy(_period_equity_view(filtered, conversion), options["name_equity"], conversion)
        earnings = SimpleCounterInventory()
        for name in (options["name_income"], options["name_expenses"]):
            for currency, amount in chart.hierarchy(filtered, name, conversion).balance_children.items():
                earnings.add(currency, amount)
        # Valid books balance at their booking weights. The difference after
        # market conversion is separate from the period's booked P&L.
        adjustment = SimpleCounterInventory()
        for balance in (assets.balance_children, liabilities.balance_children, equity.balance_children, earnings):
            for currency, amount in balance.items():
                adjustment.add(currency, -amount)
        equity_total = SimpleCounterInventory(equity.balance_children)
        for balance in (earnings, adjustment):
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
            valuation_adjustment=adjustment,
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
