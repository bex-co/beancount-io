"""Alternative implementation of Beancount's Inventory."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, NamedTuple

from ..beans.protocols import Cost
from ..beans.str import cost_to_string


if TYPE_CHECKING:  # pragma: no cover
    import datetime
    from collections.abc import Callable, Iterator
    from typing import Concatenate, ParamSpec

    from ..beans.protocols import Amount, Position

    P = ParamSpec("P")


ZERO = Decimal()
InventoryKey = tuple[str, Cost | None]


class _Amount(NamedTuple):
    number: Decimal
    currency: str


class _Cost(NamedTuple):
    number: Decimal
    currency: str
    date: datetime.date
    label: str | None


class _Position(NamedTuple):
    units: Amount
    cost: Cost | None


class SimpleCounterInventory(dict[str, Decimal]):
    """A simple inventory mapping just strings to numbers."""

    def is_empty(self) -> bool:
        """Check if the inventory is empty."""
        return not bool(self)

    def add(self, key: str, number: Decimal) -> None:
        """Add a number to key."""
        # Beancount.io change: no arithmetic for a first position or a zero,
        # as Beancount's own inventory does; `0 + x` rounds a 29-digit token
        # quantity to the context's 28 digits before any real sum (w5/1054).
        if not number:
            return
        held = self.get(key)
        new_num = number if held is None else number + held
        if new_num == ZERO:
            self.pop(key, None)
        else:
            self[key] = new_num

    def __iter__(self) -> Iterator[str]:
        raise NotImplementedError

    def __neg__(self) -> SimpleCounterInventory:
        return SimpleCounterInventory({key: -num for key, num in self.items()})

    def _empty_result(self) -> SimpleCounterInventory:
        """The inventory a reduction accumulates into."""
        return SimpleCounterInventory()

    def reduce(
        self,
        reducer: Callable[Concatenate[Position, P], Amount],
        *args: P.args,
        **_kwargs: P.kwargs,
    ) -> SimpleCounterInventory:
        """Reduce inventory."""
        counter = self._empty_result()
        for currency, number in self.items():
            pos = _Position(_Amount(number, currency), None)
            amount = reducer(pos, *args)  # type: ignore[call-arg]
            counter.add(amount.currency, amount.number)
        return counter


class KeptZeroInventory(SimpleCounterInventory):
    """A converted inventory that keeps a net of exactly zero as a known zero.

    An inventory drops a position the moment it nets to zero. A conversion's
    result for one nonzero position that is worth zero (a zero quote, a zero
    cost) is a known value in a named currency, not an empty account; reducing
    into this type keeps the currency so the display can say `0 USD` (w5/908).
    """

    def add(self, key: str, number: Decimal) -> None:
        """Add a number to key, keeping the key at zero."""
        self[key] = number + self.get(key, ZERO)

    def _empty_result(self) -> SimpleCounterInventory:
        return KeptZeroInventory()


class CounterInventory(dict[InventoryKey, Decimal]):
    """A lightweight inventory.

    This is intended as a faster alternative to Beancount's Inventory class.
    Due to not using a list, for inventories with a lot of different positions,
    inserting is much faster.

    The keys should be tuples ``(currency, cost)``.
    """

    def is_empty(self) -> bool:
        """Check if the inventory is empty."""
        return not bool(self)

    def add(self, key: InventoryKey, number: Decimal) -> None:
        """Add a number to key."""
        # Beancount.io change: no arithmetic for a first position or a zero,
        # as Beancount's own inventory does; `0 + x` rounds a 29-digit token
        # quantity to the context's 28 digits before any real sum (w5/1054).
        if not number:
            return
        held = self.get(key)
        new_num = number if held is None else number + held
        if new_num == ZERO:
            self.pop(key, None)
        else:
            self[key] = new_num

    def __iter__(self) -> Iterator[InventoryKey]:
        raise NotImplementedError

    def _empty_result(self) -> SimpleCounterInventory:
        """The inventory a reduction accumulates into."""
        return SimpleCounterInventory()

    def to_strings(self) -> list[str]:
        """Print as a list of strings (e.g. for snapshot tests)."""
        strings = []
        for (currency, cost), number in self.items():
            if cost is None:
                strings.append(f"{number} {currency}")
            else:
                cost_str = cost_to_string(cost)
                strings.append(f"{number} {currency} {{{cost_str}}}")
        return strings

    def reduce(
        self,
        reducer: Callable[Concatenate[Position, P], Amount],
        *args: P.args,
        **_kwargs: P.kwargs,
    ) -> SimpleCounterInventory:
        """Reduce inventory.

        Note that this returns a simple :class:`CounterInventory` with just
        currencies as keys.
        """
        counter = self._empty_result()
        for (currency, cost), number in self.items():
            pos = _Position(_Amount(number, currency), cost)
            amount = reducer(pos, *args)  # type: ignore[call-arg]
            counter.add(amount.currency, amount.number)
        return counter

    def add_amount(self, amount: Amount, cost: Cost | None = None) -> None:
        """Add an Amount to the inventory."""
        key = (amount.currency, cost)
        self.add(key, amount.number)

    def add_position(self, pos: Position) -> None:
        """Add a Position or Posting to the inventory."""
        self.add_amount(pos.units, pos.cost)

    def __neg__(self) -> CounterInventory:
        return CounterInventory({key: -num for key, num in self.items()})

    def __add__(self, other: CounterInventory) -> CounterInventory:
        counter = CounterInventory(self)
        counter.add_inventory(other)
        return counter

    def add_inventory(self, counter: CounterInventory) -> None:
        """Add another :class:`CounterInventory`."""
        if not self:
            self.update(counter)
        else:
            self_get = self.get
            for key, num in counter.items():
                held = self_get(key)
                if held is None:
                    # Beancount.io change: copied, not added to zero (w5/1054).
                    self[key] = num
                    continue
                new_num = num + held
                if new_num == ZERO:
                    self.pop(key, None)
                else:
                    self[key] = new_num


class KeptZeroSource(CounterInventory):
    """One position to convert, whose result keeps a known zero (see `KeptZeroInventory`)."""

    def _empty_result(self) -> SimpleCounterInventory:
        return KeptZeroInventory()
