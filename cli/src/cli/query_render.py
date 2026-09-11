"""Render BQL results without quantizing them to the ledger's usual precision."""

from __future__ import annotations

from collections.abc import Mapping
from decimal import Decimal, localcontext
from pathlib import Path
from typing import Any, TextIO


def result_context(rows: Any) -> Any:
    from beancount.core.amount import Amount
    from beancount.core.display_context import DisplayContext
    from beancount.core.inventory import Inventory
    from beancount.core.position import Cost, Position

    digits_by_currency: dict[str, int] = {}

    def visit(value: Any) -> None:
        if isinstance(value, Amount | Cost):
            if isinstance(value.number, Decimal) and value.number.is_finite():
                digits_by_currency[value.currency] = max(
                    digits_by_currency.get(value.currency, 0), -int(value.number.as_tuple().exponent)
                )
        elif isinstance(value, Position):
            visit(value.units)
            visit(value.cost)
        elif isinstance(value, Mapping):
            for item in value.values():
                visit(item)
        elif isinstance(value, Inventory | list | tuple | set | frozenset):
            for item in value:
                visit(item)

    visit(rows)

    class ResultContext(DisplayContext):
        def quantize(self, number: Decimal, currency: str, precision: Any = None) -> Decimal:
            del precision  # Retain the upstream signature; result values determine display precision.
            # DisplayContext.quantize caps the integer portion at twelve
            # digits. Preserve large balances as well as fractional units.
            digits = -digits_by_currency.get(currency, 0)
            exponent = int(number.as_tuple().exponent)
            with localcontext() as arithmetic:
                arithmetic.prec = max(arithmetic.prec, len(number.as_tuple().digits) + max(0, exponent - digits))
                return number.quantize(Decimal(1).scaleb(digits))

    context = ResultContext()
    for currency, digits in digits_by_currency.items():
        # Every value in a currency receives the maximum precision present in
        # these results. Beanquery's per-column formatter can then neither
        # infer whole units from a majority nor discard calculated fractions.
        context.update(Decimal(1).scaleb(-digits), currency)
    return context


def render_query(description: Any, rows: Any, stream: TextIO) -> None:
    from beanquery.render.text import render

    render(description, rows, stream, dcontext=result_context(rows))


def load_for_bql(file: Path) -> dict[str, Any]:
    """Load exactly this ledger file for a beanquery connection.

    Beanquery's `beancount:<path>` DSN goes through `urlparse`, which reads
    `#` and `?` in a filename as fragment and query markers and silently loads
    a different file. Loading here and attaching the entries directly is the
    only way to honor the resolved path byte for byte.
    """
    from beancount import loader

    entries, errors, options = loader.load_file(str(file))
    return {"entries": entries, "errors": errors, "options": options}


LEDGER_DSN = "beancount:"
"""A pathless beanquery DSN: the source attaches the entries handed to it instead of loading a file."""


def connect_ledger(file: Path) -> Any:
    """A beanquery connection on the exact ledger file, includes and load errors intact."""
    from beanquery import connect

    return connect(LEDGER_DSN, **load_for_bql(file))


def query_shell(file: Path, stream: TextIO) -> Any:
    from beanquery.numberify import numberify_results
    from beanquery.shell import FORMATS, BQLShell

    class PreciseShell(BQLShell):  # type: ignore[misc]  # beanquery does not ship type annotations
        def do_reload(self, arg: Any = None) -> None:
            """Reload the Beancount input file."""
            # Upstream attaches by DSN and therefore inherits its urlparse()
            # path mangling; attach the freshly loaded entries instead.
            import sys

            from beancount.parser import printer

            self.context.errors.clear()
            self.context.options.clear()
            self.context.attach(LEDGER_DSN, **load_for_bql(file))
            self._extract_queries(self.context.tables["entries"].entries)
            if self.context.errors and self.show_load_errors:
                printer.print_errors(self.context.errors, file=sys.stderr)  # type: ignore[no-untyped-call]

        def onecmd(self, line: str) -> Any:
            # Keep familiar shell commands as quiet aliases for beanquery's
            # dot commands. SQL and genuine query warnings are unchanged.
            stripped = line.lstrip()
            command = stripped.split(maxsplit=1)[0].lower() if stripped else ""
            if command in {"clear", "errors", "exit", "help", "history", "parse", "quit", "run", "set"}:
                line = "." + command + stripped[len(command) :]
            return super().onecmd(line)

        def on_Select(self, statement: Any) -> Any:  # noqa: N802 - beanquery dispatch name
            from cli import output

            cursor = self.context.execute(statement)
            description, rows = cursor.description, cursor.fetchall()
            if not rows:
                output.note("(no rows)")
            dcontext = result_context(rows)
            if self.settings.numberify:
                description, rows = numberify_results(description, rows, dcontext.build())
            with self.output as out:
                render = FORMATS[self.settings.format]
                return render(description, rows, out, dcontext=dcontext, **self.settings.todict())

    return PreciseShell(LEDGER_DSN, stream, interactive=True, runinit=True)
