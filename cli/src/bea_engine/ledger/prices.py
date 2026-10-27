"""One reciprocal-collision rule for every price map.

A price quoted both ways on one day is a conflict with two rates for the
day: reports (Fava's map) and BQL (Beancount's) settled it differently, and
each moved with line order (w5/556). Settling it once, whole-ledger, left
three gaps (w5/740): quotes after the day changed its settlement, a tie
fell back on line numbers, and the double inversion left residue.

The rule, applied per day and shared by `FavaPriceMap` and the map BQL
reads: a day quoted in one direction keeps its quote. A day quoted in both
is won by the direction quoted less often up to that day — later quotes
cannot value an earlier interval — inverted into the pair's alphabetical
order. A tie is broken in favor of the quote from the alphabetically later
currency, so the answer never depends on line or file order. The winning
quote stays exact in its own direction; only the derived direction divides.
Within one direction and day the last line still wins, as it always has.
"""

from __future__ import annotations

from bisect import bisect_right
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterable

ONE = Decimal(1)
ZERO = Decimal()


def reciprocal_agrees(typed: Decimal | None, other: Decimal | None) -> bool:
    """Whether a new quote agrees with a same-day reciprocal, at the typed precision.

    Two quotes name the same rate when the inverse of one rounds to the
    other at the other's typed precision: `0.3333` agrees with `3`, as
    `0.9211` agrees with `1.0857`, though neither product is exactly 1
    (w5/741). Shared by `add price` and import, which must refuse the same
    pairs.
    """
    from decimal import InvalidOperation, localcontext

    if not typed or not other:
        return False
    digits = typed.as_tuple().digits
    exponent = typed.as_tuple().exponent
    if not isinstance(exponent, int):
        return False
    quantum = Decimal((0, (1,), exponent))
    with localcontext() as context:
        context.prec = max(28, len(digits) + len(other.as_tuple().digits) + 12)
        try:
            return (ONE / other).quantize(quantum) == typed
        except InvalidOperation:
            return False


Quote = tuple[date, str, str, Decimal]
"""One price point in entry order: day, base, quote, rate."""

DayRates = tuple[date, Decimal | None, Decimal | None]
"""One settled day: the date, the canonical rate, the reverse rate.

A side is `None` when it would divide by a zero quote; a zero quote itself
is kept in its own direction, as upstream keeps it.
"""

Pair = tuple[str, str]


def settle_price_days(quotes: Iterable[Quote]) -> dict[Pair, list[DayRates]]:
    """Each pair's days in alphabetical direction order, collisions settled.

    `quotes` arrives in entry order, which decides only same-direction
    same-day duplicates (the last line wins). Everything else — which day,
    which direction, a tie — is order-free.
    """
    grouped: dict[frozenset[str], list[tuple[date, str, str, Decimal, int]]] = defaultdict(list)
    for seq, (day, base, quote, rate) in enumerate(quotes):
        grouped[frozenset((base, quote))].append((day, base, quote, rate, seq))
    settled: dict[Pair, list[DayRates]] = {}
    for key in sorted(grouped, key=lambda pair: sorted(pair)):
        first, *rest = sorted(key)
        second = rest[0] if rest else first
        days = _settle_pair(first, second, grouped[key])
        if days:
            settled[first, second] = days
    return settled


def _settle_pair(first: str, second: str, quotes: list[tuple[date, str, str, Decimal, int]]) -> list[DayRates]:
    """One pair's days: the (first, second) rate beside its reverse."""
    forward = sorted(day for day, base, quote, _, _ in quotes if (base, quote) == (first, second))
    reverse = sorted(day for day, base, quote, _, _ in quotes if (base, quote) == (second, first))
    last: dict[Pair, dict[date, Decimal]] = {(first, second): {}, (second, first): {}}
    for day, base, quote, rate, _ in quotes:
        last[base, quote][day] = rate
    settled: list[DayRates] = []
    for day in sorted(set(forward) | set(reverse)):
        own = last[first, second].get(day)
        other = last[second, first].get(day)
        if own is not None and other is not None and first != second:
            # Both ways quoted: the direction quoted less often up to this
            # day wins, inverted into alphabetical order; a tie favors the
            # quote from the later currency (w5/740).
            if bisect_right(reverse, day) <= bisect_right(forward, day):
                settled.append((day, None if other == ZERO else ONE / other, other))
            else:
                settled.append((day, own, None if own == ZERO else ONE / own))
        elif own is not None:
            settled.append((day, own, None if own == ZERO else ONE / own))
        elif other is not None:
            settled.append((day, None if other == ZERO else ONE / other, other))
    return settled


def settled_bql_price_map(entries: Iterable[Any]) -> Any:
    """Upstream's price-map shape with the shared settlement rule.

    `beanquery` builds its map with Beancount's whole-ledger counts, so a
    later quote valued an earlier conversion there even once the reports
    stopped doing it (w5/740). The connection's prices table keeps its raw
    entries — `FROM prices` still lists every quote — and only this map is
    replaced, at the two places bea attaches a ledger.
    """
    from beancount.core.data import Price
    from beancount.core.prices import PriceMap

    quotes: list[Quote] = []
    for entry in entries:
        if not isinstance(entry, Price) or entry.amount.number is None:
            continue
        quotes.append((entry.date, entry.currency, entry.amount.currency, entry.amount.number))
    settled = settle_price_days(quotes)
    price_map: dict[Pair, list[tuple[date, Decimal]]] = {}
    forward_pairs = []
    for (base, quote), days in settled.items():
        forward = [(day, rate) for day, rate, _ in days if rate is not None]
        reverse = [(day, original) for day, _, original in days if original is not None]
        if forward:
            price_map[base, quote] = forward
            forward_pairs.append((base, quote))
        if reverse:
            price_map[quote, base] = reverse
    settled_map = PriceMap(price_map)
    # Upstream sets this the same way, past its own stubs.
    settled_map.forward_pairs = forward_pairs  # type: ignore[attr-defined]
    return settled_map


def unused_quote_advisories(
    candidate: Iterable[Any], existing: Iterable[Any], wanted: Iterable[tuple[date, str, str, Decimal]]
) -> list[str]:
    """A sentence for each new quote that no read of the written ledger will use (w5/903).

    `candidate` is the ledger as it would load with the quotes written, in the
    order every read sees it: it decides the day with the rule above, so a
    generated reciprocal, a same-direction quote that sorts later (an included
    file's line number beats the root's) and a quote the ledger already wrote
    all count. `existing` names the winner at its real location; a quote
    implied by another row of the same import has none yet and is described
    as that import's.
    """
    from beancount.core.data import Price

    from bea_engine.ledger.reader import entry_generated

    quotes = [
        (item.date, item.currency, item.amount.currency, item.amount.number)
        for item in candidate
        if isinstance(item, Price) and item.amount.number is not None
    ]
    settled = settle_price_days(quotes)
    prior = [item for item in existing if isinstance(item, Price) and item.amount.number is not None]
    advisories: list[str] = []
    for day, base, quote, number in wanted:
        canonical = (base, quote) if base < quote else (quote, base)
        point = next(((fwd, rev) for d, fwd, rev in settled.get(canonical, []) if d == day), (None, None))
        mine = point[0] if (base, quote) == canonical else point[1]
        if mine is None or mine == number:
            continue
        same_day = [item for item in prior if item.date == day]
        same = [item for item in same_day if (item.currency, item.amount.currency) == (base, quote)]
        reverse = [item for item in same_day if (item.currency, item.amount.currency) == (quote, base)]
        winner = next((item for item in reversed(same) if item.amount.number == mine), None)
        if winner is None and reverse:
            winner = reverse[-1]
        if winner is None:
            # The winner is a quote another row of this import implies — an
            # FX transaction under `implicit_prices` — which has no written
            # location yet; it went unnamed, and the import said nothing
            # (w5/1052).
            incoming = [
                item
                for item in candidate
                if isinstance(item, Price)
                and item.date == day
                and item.amount.number is not None
                and {item.currency, item.amount.currency} == {base, quote}
                and entry_generated(item, "price")
            ]
            implying = next(
                (item for item in reversed(incoming) if (item.currency, item.amount.currency) == (base, quote)),
                incoming[-1] if incoming else None,
            )
            if implying is not None:
                advisories.append(
                    f"A transaction this import writes implies a {day.isoformat()} price of "
                    f"{format(implying.amount.number, 'f')} {implying.amount.currency} for {implying.currency}; "
                    "every read values the pair by it, so the new quote is never used."
                )
            continue
        implied = "implied " if entry_generated(winner, "price") else ""
        advisories.append(
            f"{winner.currency} already has a {day.isoformat()} price of {format(winner.amount.number, 'f')} "
            f"{winner.amount.currency} {implied}at {winner.meta.get('filename')}:{winner.meta.get('lineno')}; "
            "every read keeps valuing the pair by it, so the new quote is never used."
        )
    return advisories
