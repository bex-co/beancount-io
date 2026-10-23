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
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from bea_engine import protocol


def run(op: str, argv: list[str]) -> int:
    """Run `bean-doctor <op>` in this process, formatting balances in scope."""
    from beancount.scripts import doctor

    from bea_engine.ledger.write import keep_load_cache_private

    keep_load_cache_private()
    upstream: Any = doctor
    plain_loader = upstream.loader
    upstream.loader = _ManagedLoader(plain_loader, argv)
    try:
        original = getattr(upstream, "render_mini_balances", None)
        if original is None:  # pragma: no cover - upstream renamed it; run unchanged
            return _invoke(upstream, op, argv)

        def in_scope(entries: Any, options_map: Any, conversion: Any = None, price_map: Any = None) -> Any:
            scoped = {**options_map, "dcontext": _context_of(entries, options_map, conversion, price_map)}
            return original(entries, scoped, conversion, price_map)

        upstream.render_mini_balances = in_scope
        named = _named_search(upstream, argv)
        try:
            return _invoke(upstream, op, argv)
        finally:
            upstream.render_mini_balances = original
            for attribute, original_fn in named:
                setattr(upstream, attribute, original_fn)
    finally:
        upstream.loader = plain_loader


def _named_search(upstream: Any, argv: list[str]) -> list[tuple[str, Any]]:
    """Search locations under the ledger path as the command line named it.

    The loader reads the named path (a symlink stays a symlink), so entries
    carry it — but `context` and `region` build a bare line's location from
    click's resolved FILENAME, the real path, and the text compare fails
    (w5/767). `linked` never broke: it searches `options_map["filename"]`,
    which is the named path already. Each search is remapped the way the
    load was; an explicit `file:line` passes through remapped too, which can
    only help it agree with the entries.
    """
    import functools

    patched: list[tuple[str, Any]] = []
    render = getattr(upstream, "render_file_context", None)
    if render is not None:

        @functools.wraps(render)
        def render_named(entries: Any, options_map: Any, search_filename: Any, lineno: Any) -> Any:
            return render(entries, options_map, _as_named(search_filename, argv), lineno)

        upstream.render_file_context = render_named
        patched.append(("render_file_context", render))
    resolve = getattr(upstream, "resolve_region_to_entries", None)
    if resolve is not None:

        @functools.wraps(resolve)
        def resolve_named(entries: Any, filename: Any, region: Any) -> Any:
            search_filename, first_lineno, last_lineno = region
            if search_filename is None:
                region = (_as_named(filename, argv), first_lineno, last_lineno)
            return resolve(entries, filename, region)

        upstream.resolve_region_to_entries = resolve_named
        patched.append(("resolve_region_to_entries", resolve))
    return patched


class _ManagedLoader:
    """`beancount.loader` as upstream's doctor uses it, with managed price includes resolved.

    Upstream loads the ledger itself, and its loader reads a managed include
    as a file glob that matches nothing: `region --conversion value` left a
    holding `balance` valued at market unvalued, and `roundtrip` congratulated
    over the glob error (w5/286). A ledger naming a managed source loads the
    way every other command loads it; any other keeps upstream's own load.
    """

    def __init__(self, plain: Any, argv: list[str]) -> None:
        self._plain = plain
        self._argv = argv

    def __getattr__(self, name: str) -> Any:
        return getattr(self._plain, name)

    def load_file(self, filename: Any, *args: Any, **kwargs: Any) -> Any:
        from bea_engine import managed_load

        filename = _as_named(filename, self._argv)
        entry = Path(filename)
        if not managed_load.names_managed_source(entry):
            return self._plain.load_file(filename, *args, **kwargs)
        loaded = managed_load.load_with_sources(entry)
        return loaded.entries, loaded.errors, loaded.options


def _as_named(filename: Any, argv: list[str]) -> Any:
    """The ledger path as the command line named it, where upstream resolved its symlinks.

    Upstream's doctor declares its ledger argument with `resolve_path=True`, so
    the load read `real/books/main.bean` for `link/books/main.bean`: entries
    carried the real path and missed every location under the link, and a
    linked root file read the includes beside its target (w5/568). The named
    path loads the ledger `check` and `list` read.
    """
    import os

    if not isinstance(filename, str):
        return filename
    real = os.path.realpath(filename)
    for arg in argv:
        if arg.startswith("-"):
            continue
        named = os.path.abspath(os.path.expanduser(arg))
        if named != filename and os.path.isfile(named) and os.path.realpath(named) == real:
            return named
    return filename


def _invoke(upstream: Any, op: str, argv: list[str]) -> int:
    """Upstream's own command line, so its usage errors and status are its own."""
    from bea_engine import protocol

    try:
        # Its usage errors name the command the user typed (w5/846).
        upstream.doctor.main(args=[op, *argv], prog_name="bea doctor")
    except SystemExit as exit_status:
        return _status(exit_status.code)
    except protocol.EngineError as exc:
        # Only the managed load raises one: strict prices, or a directory it cannot stage in.
        protocol.note(f"error: {exc}")
        return exc.exit_code
    except Exception as exc:
        # Upstream's roundtrip cleans up in a `finally` that calls
        # `os.path.exists(None)` when its load failed, so the strict-prices
        # error arrived as a 200-line TypeError traceback (w5/643).
        behind = _engine_error_behind(exc)
        if behind is None:
            raise
        protocol.note(f"error: {behind}")
        return behind.exit_code
    return 0


def _engine_error_behind(exc: BaseException) -> protocol.EngineError | None:
    """The managed load's error an upstream exception was raised while handling, or None."""
    from bea_engine import protocol

    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        if isinstance(current, protocol.EngineError):
            return current
        seen.add(id(current))
        current = current.__cause__ or current.__context__
    return None


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


def _context_of(entries: Any, options_map: Any, conversion: Any = None, price_map: Any = None) -> Any:
    """A display context holding only these entries' amounts, as the tree will show them.

    Falls back to the ledger's own context when the scope carries no amount to
    learn from, so an empty selection renders exactly as it did before.

    A `--conversion` tree shows each balance converted the way upstream
    converts it, at cost or at market value from prices the postings never
    carried: `10 HOOL` at 101.55 printed `1016 USD` over `Net Income:
    (15.50 USD)` (w5/498). Those converted balances are learned too.

    An interpolated leg is not learned: it carries Beancount's whole division
    result, and its 26 digits became the column's precision (`-112.50000…
    USD` over `Net Income: (-12.50 USD)`). A `display_precision` the ledger
    fixes is kept (w5/571).
    """
    from beancount.core import convert, data, display_context, interpolate, realization

    class _ExactInScope(display_context.DisplayContext):
        """Formats at each currency's finest in-scope precision.

        Upstream renders the tree with this context's default `build()`, which
        picks the *most common* precision. With two whole-number postings and
        one in cents, the tree dropped the cents and disagreed with the
        `Net Income` line beneath it: `Checking 1755 USD` over
        `Net Income: (1754.75 USD)` (w5/101). No scoped amount is rounded.
        """

        def build(self, *args: Any, **kwargs: Any) -> Any:
            kwargs["precision"] = display_context.Precision.MAXIMUM
            return super().build(*args, **kwargs)

    context = _ExactInScope()
    seen = False
    inferred: set[str] = set()
    for entry in data.filter_txns(entries):
        for posting in entry.postings:
            if posting.units is None or posting.units.number is None:
                continue
            if (posting.meta or {}).get(interpolate.AUTOMATIC_META):
                inferred.add(posting.units.currency)
                if not _is_division_artifact(posting.units.number):
                    # An amount the scope determines exactly (2 x 5.25 = 10.50)
                    # is shown whole, even where every typed amount is a whole
                    # number (w5/997).
                    context.update(posting.units.number, posting.units.currency)
                    seen = True
                continue
            context.update(posting.units.number, posting.units.currency)
            seen = True
    ledger_context = options_map.get("dcontext")
    if conversion in ("cost", "value"):
        root = realization.realize(entries)  # type: ignore[no-untyped-call]
        for real_account in realization.iter_children(root):  # type: ignore[no-untyped-call]
            converted = [real_account.balance.reduce(convert.get_cost)]
            if conversion == "value" and price_map is not None:
                converted.append(real_account.balance.reduce(convert.get_value, price_map))
            for balance in converted:
                for position in balance:
                    number = position.units.number
                    if number is None:
                        continue
                    if _is_division_artifact(number):
                        # A total-cost split or an interpolation divided here:
                        # learn the rounded value at the ledger's usual
                        # precision, not the 26 artifact digits (w5/768).
                        rounded = _at_ledger_precision(number, position.units.currency, ledger_context)
                        if rounded is not None:
                            number = rounded
                    context.update(number, position.units.currency)
                    seen = True
    if not seen:
        return options_map["dcontext"]
    if ledger_context is not None:
        context.set_commas(ledger_context.commas)
        for currency, known in ledger_context.ccontexts.items():
            fixed = getattr(known, "fractional_digits", None)
            if isinstance(fixed, int):
                context.set_fixed_precision(currency, fixed)
            elif currency in inferred and currency not in context.ccontexts:
                # Only an inferred leg carries it here: the ledger's usual
                # precision, not its maximum (a price's 4 places became the
                # column's in w5/768's fixture).
                context.set_fixed_precision(currency, known.get_fractional_digits_common())
    return context


#: Significant digits at which a converted balance stops being a typed number.
#: Beancount computes with the default 28-digit decimal context, so a number
#: using all of it came out of a division — a total-cost split or an
#: interpolation — not out of the ledger text.
_DIVISION_DIGITS = 28


def _is_division_artifact(number: Any) -> bool:
    """Whether this converted balance is division output rather than a typed number."""
    digits = getattr(number.as_tuple(), "digits", None)
    return isinstance(digits, tuple) and len(digits) >= _DIVISION_DIGITS


def _at_ledger_precision(number: Any, currency: str, ledger_context: Any) -> Any | None:
    """This number rounded to the ledger's usual precision for its currency, if known."""
    from decimal import Decimal

    known = (getattr(ledger_context, "ccontexts", None) or {}).get(currency)
    if known is None:
        return None
    return number.quantize(Decimal(1).scaleb(-known.get_fractional_digits_common()))
