"""Provide data suitable for Fava's charts."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

from ..beans.abc import Open, Transaction
from ..beans.account import account_tester
from ..beans.helpers import slice_entry_dates
from ..core.conversion import AT_COST, UNITS, cost_or_value
from ..core.filters import account_predicate
from ..core.inventory import CounterInventory
from ..core.tree import Tree, _converted
from ..util import listify


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Callable, Collection, Iterable, Mapping, Sequence

    from ..beans.abc import Directive
    from ..beans.prices import FavaPriceMap

    from ..core.conversion import Conversion
    from ..core.inventory import SimpleCounterInventory
    from ..core.tree import SerialisedTreeNode
    from ..ledger import FilteredLedger
    from ..util.date import DateRange, Interval


ONE_DAY = timedelta(days=1)
ZERO = Decimal()


#: The sources of the entries clamping to a time filter synthesizes (beancount.ops.summarize).
_CLAMP_SOURCES = frozenset({"<summarize>", "<transfer_balances>", "<conversions>"})


def _under_roots(account: str, roots: str | tuple[str, ...]) -> bool:
    """Whether `account` sits under one of the account roots, by its root component.

    A text prefix put `EarningsCapital` under the income root `Earnings`, and
    `CapitalEquity` under the asset root `Capital`: valid renamed roots that
    share a prefix were classified as each other's accounts (w5/921).
    """
    return account.partition(":")[0] in ((roots,) if isinstance(roots, str) else roots)


def _flow_roots(filtered: FilteredLedger) -> tuple[str, str]:
    """The ledger's income and expenses roots: the accounts whose postings are flows."""
    options = filtered.ledger.options
    return options["name_income"], options["name_expenses"]


def _in_scope_flows(filtered: FilteredLedger) -> Callable[[str], bool]:
    """Whether an account is one of the statement's income or expenses accounts in scope."""
    flows = _flow_roots(filtered)
    in_scope = account_predicate(filtered.account, filtered.ledger.root_accounts)
    return lambda account: _under_roots(account, flows) and in_scope(account)


def _reads_prices(conversion: str | Conversion) -> bool:
    """Whether `conversion` reads prices, so a flow's value depends on its day."""
    return conversion not in ("units", "at_cost", UNITS, AT_COST)


def _valued_days(
    entries: Iterable[Directive],
    include: Callable[[str], bool],
    conversion: str | Conversion,
    prices: FavaPriceMap,
) -> Iterable[tuple[str, date, SimpleCounterInventory]]:
    """The included accounts' postings, netted per account and day, each day valued at its own price."""
    days: dict[tuple[str, date], CounterInventory] = defaultdict(CounterInventory)
    for entry in entries:
        for posting in getattr(entry, "postings", []):
            if include(posting.account):
                days[posting.account, entry.date].add_position(posting)
    for (account, day), inventory in days.items():
        yield account, day, cost_or_value(inventory, conversion, prices, day)


def _flow_inventories(
    entries: Iterable[Directive],
    include: Callable[[str], bool],
    conversion: str | Conversion,
    prices: FavaPriceMap,
) -> tuple[dict[str, CounterInventory], str | Conversion]:
    """Each included account's postings in `entries`, and the conversion that reads them.

    Beancount.io change: income and expenses are flows, worth what they were
    on the day they happened. A tree valued the whole period at the as-of
    date while each interval row used its own end, so once a rate moved the
    rows no longer added up to the headline above them, and the same days
    totalled differently by month and by year (w1/m49). Under a conversion
    that reads prices, an account's postings of one day are valued at that
    day's price, as `convert(position, 'USD', date)` does; what the
    conversion cannot value that day stays in its own commodity, and nothing
    later revalues it. Those values are read back as `units`. `units` and
    `at_cost` read no price, so they keep the positions and the conversion.
    """
    inventories: dict[str, CounterInventory] = defaultdict(CounterInventory)
    if not _reads_prices(conversion):
        for entry in entries:
            for posting in getattr(entry, "postings", []):
                if include(posting.account):
                    inventories[posting.account].add_position(posting)
        return inventories, conversion
    for account, _, value in _valued_days(entries, include, conversion, prices):
        valued = inventories[account]
        for currency, number in value.items():
            valued.add((currency, None), number)
    return inventories, UNITS


def _flow_ranges(
    filtered: FilteredLedger,
    interval: Interval,
) -> Sequence[DateRange]:
    """The interval ranges a flow series should report.

    A time filter clips the first and last ranges to whatever part of their
    interval falls inside the filter: `-t 2020-03 -i weekly` starts on the
    Sunday that ends an ISO week and ends on the Mon-Tue tail of one that runs
    into April. With no entries in it, such a fragment reads as one more quiet
    week rather than the boundary it is, so it is dropped —
    but a fragment that carries entries (a transaction on 2020-12-31) is a real
    period and stays, as does the sole range of a short filter.

    Only flow series do this. A cumulative series reports a balance that is
    real whether or not the fragment saw activity, and must keep reaching the
    end of the filtered period.
    """
    ranges = filtered.interval_ranges(interval)
    # Without a time filter the last range ends at the report's as-of date, not
    # at a boundary the user chose, so it is the current period and stays.
    if len(ranges) < 2 or not filtered.date_range:
        return ranges
    # Beancount.io change: a fragment is busy only when a transaction in it
    # posts to the statement's flow accounts in scope. Clamping to the time
    # filter synthesizes summarize, transfer and conversion entries — a
    # `C "Conversion for (…)"` on the period's last day whenever the period
    # holds a currency exchange — which made every such fragment look busy.
    # Excluding every `<…>` source also dropped a plugin's own transaction
    # (its rows no longer summed to the headline), while a lone balance
    # assertion kept an empty one-day row (w5/617). The flow roots are the
    # statement's, not one series', so the income, expense and net-profit
    # series keep the same rows.
    flow = _in_scope_flows(filtered)

    def busy(entry: Directive) -> bool:
        return (
            isinstance(entry, Transaction)
            and entry.meta.get("filename") not in _CLAMP_SOURCES
            and any(flow(posting.account) for posting in entry.postings)
        )

    def quiet_fragment(period: DateRange) -> bool:
        whole = interval.get_prev(period.begin) == period.begin and interval.get_next(period.begin) == period.end
        return not whole and not any(
            busy(entry) for entry in slice_entry_dates(filtered.entries, period.begin, period.end)
        )

    kept = list(ranges)
    if quiet_fragment(kept[-1]):
        kept.pop()
    # A filter that starts partway through an interval clips the first range
    # the same way: `-t 2026-03 -i weekly` opened with a one-day Sunday "week"
    # (w5/365). It goes too, unless it is all that is left.
    if len(kept) > 1 and quiet_fragment(kept[0]):
        kept.pop(0)
    return kept


def _omit_empty_clamp_phantoms(
    node: SerialisedTreeNode,
    filtered: FilteredLedger,
) -> SerialisedTreeNode:
    """Drop zero clamp-transfer accounts that were never opened in the ledger.

    Mid-period TimeFilter clamping invents Equity:Opening-Balances (and related
    previous-* accounts) for the pre-period transfer. Those often net to empty
    inventories; leave them out of the rendered tree unless the books actually
    opened them.
    """
    from dataclasses import replace

    from beancount.core.data import Open
    from beancount.parser import options as optmod

    opened = {entry.account for entry in filtered.ledger.all_entries if isinstance(entry, Open)}
    hide = set(optmod.get_previous_accounts(filtered.ledger.options))

    def walk(current: SerialisedTreeNode) -> SerialisedTreeNode:
        children = []
        for child in current.children:
            walked = walk(child)
            if (
                walked.account in hide
                and walked.account not in opened
                and walked.balance.is_empty()
                and walked.balance_children.is_empty()
                and not walked.children
            ):
                continue
            children.append(walked)
        return replace(current, children=children)

    return walk(node)


@dataclass(frozen=True)
class DateAndBalance:
    """Balance at a date."""

    date: date
    balance: SimpleCounterInventory


@dataclass(frozen=True)
class DateAndBalanceWithAccountBalance:
    """Balance at a date with per-account breakdown."""

    date: date
    balance: SimpleCounterInventory
    account_balances: Mapping[str, SimpleCounterInventory]


class ChartModule:
    """Return data for the various charts in Fava."""

    def hierarchy(
        self,
        filtered: FilteredLedger,
        account_name: str,
        conversion: str | Conversion,
        begin: date | None = None,
        end: date | None = None,
    ) -> SerialisedTreeNode:
        """Render an account tree.

        Beancount.io change: an income or expenses tree values each posting
        on its own date (:func:`_flow_inventories`), as its interval rows do.
        """
        entries = (
            slice_entry_dates(filtered.entries, begin, end)
            if begin is not None and end is not None
            else filtered.entries
        )
        prices = filtered.ledger.prices
        if account_name and _under_roots(account_name, _flow_roots(filtered)):
            subtree = account_tester(account_name, with_children=True)
            flows, conversion = _flow_inventories(entries, subtree, conversion, prices)
            tree = Tree([entry for entry in entries if isinstance(entry, Open)])
            for account, balance in sorted(flows.items()):
                tree.insert(account, balance)
        else:
            tree = Tree(entries)
        node = tree.get(account_name).serialise(
            conversion,
            prices,
            end - ONE_DAY if end is not None else filtered.end_date,
        )
        return _omit_empty_clamp_phantoms(node, filtered)

    @listify
    def interval_totals(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        accounts: str | tuple[str, ...],
        conversion: str | Conversion,
    ) -> Iterable[DateAndBalanceWithAccountBalance]:
        """Render per-interval totals (flow) for one or more accounts.

        This computes totals within each interval (not cumulative balances),
        returning both the aggregated total across the provided accounts and a
        per-account breakdown for the same interval. Useful for bar charts like
        monthly income/expenses. Covers every interval in the filtered period,
        except an empty leading or trailing fragment of one (see :func:`_flow_ranges`).

        Args:
            filtered: The filtered ledger.
            interval: An interval (e.g., month, quarter, year).
            accounts: A single account (str) or a tuple of account prefixes.
            conversion: The conversion to use.

        Yields:
            DateAndBalanceWithAccountBalance containing the interval end date,
            the aggregated total for the interval, and a per-account map for
            that interval.
        """
        prices = filtered.ledger.prices
        # The entry filter keeps whole transactions, so a filtered report would
        # otherwise total the counterparty legs here while its headline tree
        # correctly excludes them — one report, two answers for one account.
        in_scope = account_predicate(filtered.account, filtered.ledger.root_accounts)

        intervals = _flow_ranges(filtered, interval)

        for date_range in intervals:
            # Each posting valued on its own date, as the account trees are.
            account_inventories, read_as = _flow_inventories(
                slice_entry_dates(filtered.entries, date_range.begin, date_range.end),
                lambda account: _under_roots(account, accounts) and in_scope(account),
                conversion,
                prices,
            )
            inventory = CounterInventory()
            for acct_value in account_inventories.values():
                inventory.add_inventory(acct_value)
            balance = cost_or_value(
                inventory,
                read_as,
                prices,
                date_range.end_inclusive,
            )
            account_balances = {
                account: cost_or_value(
                    acct_value,
                    read_as,
                    prices,
                    date_range.end_inclusive,
                )
                for account, acct_value in account_inventories.items()
            }
            yield DateAndBalanceWithAccountBalance(
                date_range.end_inclusive,
                balance,
                account_balances,
            )

    @listify
    def flow_days(
        self,
        filtered: FilteredLedger,
        conversion: str | Conversion,
        accounts: Collection[str] | None = None,
    ) -> Iterable[DateAndBalance]:
        """Each day's income or expenses of one account, valued on that day.

        A flow is valued on its own date (:func:`_flow_inventories`), so a
        price missing for it is missing on that date, not on the report's
        as-of date or a row's end: a report names these dates as the ones that
        need a price (w1/m49). `accounts` limits the days to the accounts a
        report shows; by default they are the in-scope income and expenses.
        """
        include = _in_scope_flows(filtered) if accounts is None else accounts.__contains__
        for _, day, value in _valued_days(filtered.entries, include, conversion, filtered.ledger.prices):
            yield DateAndBalance(day, value)

    @listify
    def account_balance(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        account_name: str,
        conversion: str | Conversion,
    ) -> Iterable[DateAndBalance]:
        """Get cumulative end-of-interval balance (stock) for an account.

        Computes the running balance for ``account_name`` (including child
        accounts) and yields the value at each interval end. Use this for line
        charts of account balances over time. In contrast, :meth:`interval_totals` returns per-interval
        totals (flows), not cumulative balances.
        """
        transactions = (
            # Beancount.io change: upstream Fava skipped `U`-flagged entries here,
            # which Beancount v2's `unrealized` plugin synthesized. The managed
            # engine has no such plugin, so a `U` flag is a transaction the user
            # wrote; dropping it made the series disagree with the headline.
            entry
            for entry in filtered.entries
            if isinstance(entry, Transaction)
        )

        is_child_account = account_tester(account_name, with_children=True)
        in_scope = account_predicate(filtered.account, filtered.ledger.root_accounts)

        txn = next(transactions, None)
        inventory = CounterInventory()

        prices = filtered.ledger.prices
        for date_range in filtered.interval_ranges(interval):
            while txn and txn.date < date_range.end:
                for posting in txn.postings:
                    if is_child_account(posting.account) and in_scope(posting.account):
                        inventory.add_position(posting)
                txn = next(transactions, None)
            # Beancount.io change: a holding worth exactly zero keeps its
            # currency at zero, as the trees do (w5/1055).
            yield DateAndBalance(
                date_range.end_inclusive,
                _converted(
                    inventory,
                    conversion,
                    prices,
                    date_range.end_inclusive,
                ),
            )

    @listify
    def linechart(
        self,
        filtered: FilteredLedger,
        account_name: str,
        conversion: str | Conversion,
    ) -> Iterable[DateAndBalance]:
        """Get the balance of an account as a line chart.

        Args:
            filtered: The filtered ledger.
            account_name: A string.
            conversion: The conversion to use.

        Yields:
            Dicts for all dates on which the balance of the given
            account has changed containing the balance (in units) of the
            account at that date.
        """

        def _balances() -> Iterable[tuple[date, CounterInventory]]:
            last_date = None
            running_balance = CounterInventory()
            is_child_account = account_tester(account_name, with_children=True)

            for entry in filtered.entries:
                for posting in getattr(entry, "postings", []):
                    if is_child_account(posting.account):
                        new_date = entry.date
                        if last_date is not None and new_date > last_date:
                            yield (last_date, running_balance)
                        running_balance.add_position(posting)
                        last_date = new_date

            if last_date is not None:
                yield (last_date, running_balance)

        # When the balance for a commodity just went to zero, it will be
        # missing from the 'balance' so keep track of currencies that last had
        # a balance.
        last_currencies = None
        prices = filtered.ledger.prices

        for d, running_bal in _balances():
            balance = cost_or_value(running_bal, conversion, prices, d)
            currencies = set(balance.keys())
            if last_currencies:
                for currency in last_currencies - currencies:
                    balance[currency] = ZERO
            last_currencies = currencies
            yield DateAndBalance(d, balance)

    @listify
    def net_worth(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> Iterable[DateAndBalance]:
        """Compute net worth.

        Args:
            filtered: The filtered ledger.
            interval: A string for the interval.
            conversion: The conversion to use.

        Yields:
            Dicts for all ends of the given interval containing the
            net worth (Assets + Liabilities) separately converted to all
            operating currencies.
        """
        transactions = (
            # Beancount.io change: upstream Fava skipped `U`-flagged entries here,
            # which Beancount v2's `unrealized` plugin synthesized. The managed
            # engine has no such plugin, so a `U` flag is a transaction the user
            # wrote; dropping it made the series disagree with the headline.
            entry
            for entry in filtered.entries
            if isinstance(entry, Transaction)
        )

        types = (
            filtered.ledger.options["name_assets"],
            filtered.ledger.options["name_liabilities"],
        )

        in_scope = account_predicate(filtered.account, filtered.ledger.root_accounts)

        txn = next(transactions, None)
        inventory = CounterInventory()

        prices = filtered.ledger.prices
        for date_range in filtered.interval_ranges(interval):
            while txn and txn.date < date_range.end:
                for posting in txn.postings:
                    if _under_roots(posting.account, types) and in_scope(posting.account):
                        inventory.add_position(posting)
                txn = next(transactions, None)
            # Beancount.io change: net worth that is a known zero says so (w5/1055).
            yield DateAndBalance(
                date_range.end_inclusive,
                _converted(
                    inventory,
                    conversion,
                    prices,
                    date_range.end_inclusive,
                ),
            )
