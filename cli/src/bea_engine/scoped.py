"""`doctor region` / `doctor linked`, numbered from the amounts actually in scope.

Upstream builds the balance tree's number format from the *whole* ledger's
display context, whose precision is the most common one it saw. A region holding
`5.50 USD` therefore prints `6 USD` in a book whose other amounts are whole
numbers — while the `Net Income` line directly below it, which does not go
through that format, still says `-5.50 USD`. One balance, two numbers, one
screen.

Upstream keeps every decision here: which entries the argument selects — link,
tag, location or region — the realization, the conversion, the rendering and the
exit status. All bea supplies is the display context, built from the entries
upstream itself chose, so the tree is numbered like the postings it is a tree of.
"""

from __future__ import annotations

import sys
from typing import Any


def run(op: str, argv: list[str]) -> int:
    """Run `bean-doctor <op>` in this process, formatting balances in scope."""
    from beancount.scripts import doctor as upstream

    original = getattr(upstream, "render_mini_balances", None)
    if original is None:  # pragma: no cover - upstream renamed it; run unchanged
        return _invoke(upstream, op, argv)

    def in_scope(entries: Any, options_map: Any, conversion: Any = None, price_map: Any = None) -> Any:
        return original(entries, {**options_map, "dcontext": _context_of(entries, options_map)}, conversion, price_map)

    upstream.render_mini_balances = in_scope
    try:
        return _invoke(upstream, op, argv)
    finally:
        upstream.render_mini_balances = original


def _invoke(upstream: Any, op: str, argv: list[str]) -> int:
    """Upstream's own command line, so its usage errors and status are its own."""
    try:
        upstream.doctor.main(args=[op, *argv], prog_name="bean-doctor")
    except SystemExit as exit_status:
        return _status(exit_status.code)
    return 0


def _status(code: object) -> int:
    """What CPython itself would do with this `SystemExit` code.

    `SystemExit.code` is not always int-or-None: `bean-doctor linked` validates
    the location itself and raises `SystemExit("Invalid line number or link
    format for location.")` — a *string* code, which CPython prints to stderr
    before exiting 1. Running upstream in-process instead of as a child put
    that string through `int()`, and the `ValueError` reached the engine's rich
    traceback handler: 118 lines of bea internals in place of upstream's one
    sentence. Reproducing CPython's rule here is exactly the passthrough the
    docstring above promises.
    """
    if code is None:
        return 0
    if isinstance(code, int):
        return code
    print(code, file=sys.stderr)
    return 1


def _context_of(entries: Any, options_map: Any) -> Any:
    """A display context holding only these entries' amounts.

    Falls back to the ledger's own context when the scope carries no amount to
    learn from, so an empty selection renders exactly as it did before.
    """
    from beancount.core import data, display_context

    context = display_context.DisplayContext()
    seen = False
    for entry in data.filter_txns(entries):
        for posting in entry.postings:
            if posting.units is not None and posting.units.number is not None:
                context.update(posting.units.number, posting.units.currency)
                seen = True
    if not seen:
        return options_map["dcontext"]
    ledger_context = options_map.get("dcontext")
    if ledger_context is not None:
        context.set_commas(ledger_context.commas)
    return context
