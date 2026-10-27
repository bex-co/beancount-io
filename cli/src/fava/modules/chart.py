"""Provide data suitable for Fava's charts."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

from ..beans.abc import Transaction
from ..beans.account import account_tester
from ..beans.helpers import slice_entry_dates
from ..core.conversion import cost_or_value
from ..core.filters import account_predicate
from ..core.inventory import CounterInventory
from ..core.tree import Tree, _converted
from ..util import listify


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterable, Mapping, Sequence

    from ..beans.abc import Directive

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
    options = filtered.ledger.options
    flows = (options["name_income"], options["name_expenses"])
    in_scope = account_predicate(filtered.account, filtered.ledger.root_accounts)

    def busy(entry: Directive) -> bool:
        return (
            isinstance(entry, Transaction)
            and entry.meta.get("filename") not in _CLAMP_SOURCES
            and any(_under_roots(posting.account, flows) and in_scope(posting.account) for posting in entry.postings)
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
        """Render an account tree."""
        if begin is not None and end is not None:
            tree = Tree(slice_entry_dates(filtered.entries, begin, end))
        else:
            tree = Tree(filtered.entries)
        node = tree.get(account_name).serialise(
            conversion,
            filtered.ledger.prices,
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
            inventory = CounterInventory()
            entries = slice_entry_dates(filtered.entries, date_range.begin, date_range.end)
            account_inventories: dict[str, CounterInventory] = defaultdict(
                CounterInventory,
            )
            for entry in entries:
                for posting in getattr(entry, "postings", []):
                    if _under_roots(posting.account, accounts) and in_scope(posting.account):
                        account_inventories[posting.account].add_position(
                            posting,
                        )
                        inventory.add_position(posting)
            balance = cost_or_value(
                inventory,
                conversion,
                prices,
                date_range.end_inclusive,
            )
            account_balances = {
                account: cost_or_value(
                    acct_value,
                    conversion,
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
