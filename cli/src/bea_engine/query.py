"""BQL, engine-side: upstream's dispatch and renderers, plus bea's two fixes.

This is where `bea query` runs after ADR014 t005. The frontend has no Beanquery
and no shell subclass; it passes a ledger path and a query string across the
process boundary and renders whatever comes back.

Upstream owns everything that makes a query a query: parsing, the statement
dispatch that makes `PRINT` print directives rather than a `ROW(*)` table,
`.run` and the rest of the dot commands, the text/CSV/Beancount renderers, and
the interactive shell. Two things are ours, both of them fixes for behavior
customers reported, and both of them needing Beancount objects — which is why
they live here and not in `bea`:

- **Exact paths.** Beanquery attaches a ledger through a `beancount:<path>` DSN
  that it hands to `urlparse`, so a `#` or `?` in a filename reads as a
  fragment or query marker and a *different* file gets loaded, silently. We
  load the resolved path ourselves and attach the entries to a pathless DSN.
- **Result precision.** Beanquery formats a column with the ledger's display
  context, which rounds a computed value to the precision of the inputs
  (`convert()` of eight decimal places came back with five) and raises
  `decimal.InvalidOperation` outright on a balance wider than twelve integer
  digits. `result_context` derives the precision from the values being
  rendered instead.
"""

from __future__ import annotations

import difflib
import re
import sys
from collections.abc import Mapping
from decimal import Decimal, localcontext
from pathlib import Path
from typing import Any, TextIO

from bea_engine import protocol

LEDGER_DSN = "beancount:"
"""A pathless beanquery DSN: the source attaches the entries handed to it instead of loading a file."""


def load(file: Path) -> dict[str, Any]:
    """Load exactly this ledger file, for attaching to a pathless connection."""
    from beancount import loader

    entries, errors, options = loader.load_file(str(file))
    return {"entries": entries, "errors": errors, "options": options}


def connect(file: Path) -> Any:
    """A beanquery connection on the exact ledger file, includes and load errors intact."""
    import beanquery

    return beanquery.connect(LEDGER_DSN, **load(file))


def rows_answer(file: Path, query_string: str, *, allow_errors: bool = False) -> dict[str, Any]:
    """Columns, rows and load errors for one query, as JSON the frontend renders.

    The rows are JSON-ready: amounts as strings, a lot keeping the acquisition
    date and label that tell it from another lot at the same price.
    """
    conn = connect(file)
    errors = _gate([format_error(error) for error in conn.errors], allow_errors)
    cursor = _executed(conn, query_string, conn.execute, errors)
    rows = cursor.fetchall() if cursor.description is not None else []
    return {
        "columns": columns(cursor.description),
        "rows": [[protocol._jsonable(value) for value in row] for row in rows],
        "errors": errors,
    }


def text_answer(
    file: Path,
    query_string: str,
    *,
    output: Path | None = None,
    format: str = "text",
    numberify: bool = False,
    allow_errors: bool = False,
) -> dict[str, Any]:
    """Upstream's own rendering of one query, plus the ledger's load errors.

    Dispatched through the shell rather than through a bare `execute`, which is
    what makes `PRINT` print directives and `.run NAME` run a stored query
    instead of both arriving as a `ROW(*)` table. The text comes back in the
    envelope rather than on stdout so that the frontend stays the only place
    that renders: `bea` decides whether a ledger with errors may answer at all,
    and it cannot unprint a table.
    """
    import io

    buffer = io.StringIO()
    destination = output.open("w") if output is not None else buffer
    try:
        # `show_errors=False`: the load errors travel in the envelope, and
        # upstream printing them to stderr too would report each one twice.
        shell = build_shell(file, destination, format=format, numberify=numberify, show_errors=False)
        errors = _gate([format_error(error) for error in shell.context.errors], allow_errors)
        _executed(shell.context, query_string, shell.onecmd, errors)
    finally:
        if output is not None:
            destination.close()
    return {"text": buffer.getvalue(), "errors": errors}


def _gate(errors: list[str], allow_errors: bool) -> list[str]:
    """Refuse to answer from a ledger that does not load, unless told otherwise.

    A total computed from a ledger with errors reads as authoritative and is
    not, so the refusal happens here — before the query runs — and the caller
    opts into a partial answer. `bea` decides which it wants from whether
    stdout is a terminal and whether `--allow-errors` was passed.
    """
    if errors and not allow_errors:
        raise protocol.LedgerError(
            f"Ledger has {len(errors)} error(s). Pass --allow-errors to report anyway.", details=errors
        )
    return errors


def interactive(file: Path, *, format: str = "text", numberify: bool = False, show_errors: bool = True) -> None:
    """Upstream's interactive shell, on this process's terminal.

    `bea` runs this command with the streams inherited, so stdin really is the
    customer's terminal: readline, the pager and Ctrl-C behave as they do under
    `bean-query` itself.
    """
    import warnings

    warnings.filterwarnings("always")
    shell = build_shell(file, sys.stdout, interactive=True, format=format, numberify=numberify, show_errors=show_errors)
    shell.cmdloop()


def build_shell(
    file: Path,
    stream: TextIO,
    *,
    interactive: bool = False,
    format: str = "text",
    numberify: bool = False,
    show_errors: bool = True,
) -> Any:
    """Upstream's `BQLShell`, attached to the exact file and rendering at result precision."""
    from beanquery.numberify import numberify_results
    from beanquery.shell import FORMATS, BQLShell

    class PreciseShell(BQLShell):  # type: ignore[misc]  # beanquery does not ship type annotations
        def do_reload(self, arg: Any = None) -> None:
            """Reload the Beancount input file."""
            # Upstream attaches by DSN and therefore inherits its urlparse()
            # path mangling; attach the freshly loaded entries instead.
            from beancount.parser import printer

            self.context.errors.clear()
            self.context.options.clear()
            self.context.attach(LEDGER_DSN, **load(file))
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
            cursor = self.context.execute(statement)
            description, rows = cursor.description, cursor.fetchall()
            if not rows:
                protocol.note("(no rows)")
            dcontext = result_context(rows)
            if self.settings.numberify:
                description, rows = numberify_results(description, rows, dcontext.build())
            with self.output as out:
                renderer = FORMATS[self.settings.format]
                return renderer(description, rows, out, dcontext=dcontext, **self.settings.todict())

    return PreciseShell(LEDGER_DSN, stream, interactive, True, format, numberify, show_errors)


def _executed(conn: Any, query_string: str, run: Any, ledger_errors: list[str]) -> Any:
    """Run a query, turning beanquery's terse complaint into one that names the problem."""
    from beanquery import Error as BeanqueryError

    try:
        return run(query_string)
    except BeanqueryError as exc:
        raise _usage_error(exc, query_string, conn, ledger_errors) from None


def _usage_error(exc: Exception, query_string: str, conn: Any, ledger_errors: list[str]) -> protocol.UsageError:
    """Point at the offending token, and name the columns that do exist.

    Beanquery reports 'syntax error' with a byte offset and nothing else, which
    for a long query says only that one of its characters is wrong.
    """
    details = []
    position = getattr(getattr(exc, "parseinfo", None), "pos", None)
    if isinstance(position, int) and 0 <= position <= len(query_string):
        details.append(f"  {query_string}")
        details.append(f"  {' ' * position}^")
    details.extend(_column_suggestions(str(exc), conn))
    details.append("Run bea query with no argument for the interactive shell, where .tables lists what you can query.")
    return protocol.UsageError(f"Cannot run this BQL query: {exc}.", details=details, ledger_errors=ledger_errors)


def _column_suggestions(message: str, conn: Any) -> list[str]:
    """Close matches for an unknown column, read from the table it was sought in."""
    match = re.search(r'column "([^"]+)" not found in table "([^"]+)"', message)
    if not match:
        return []
    unknown, table_name = match.groups()
    table = conn.tables.get(table_name)
    names = sorted(getattr(table, "columns", None) or ())
    if not names:
        return []
    close = difflib.get_close_matches(unknown, names, n=3, cutoff=0.6)
    if close:
        return [f"Did you mean {', '.join(close)}?"]
    return [f"Columns in {table_name}: {', '.join(names)}."]


def columns(description: Any) -> list[dict[str, str]]:
    """Name and declared type of each result column, so a caller can parse the rows."""
    if not description:
        return []
    return [{"name": column.name, "type": _type_name(column)} for column in description]


def _type_name(column: Any) -> str:
    datatype = getattr(column, "datatype", None)
    return getattr(datatype, "__name__", None) or str(datatype)


def format_error(error: Any) -> str:
    """One loader error as `file:line: message` — the frontend's detail line."""
    source = getattr(error, "source", None) or {}
    return f"{source.get('filename', '<ledger>')}:{source.get('lineno', 0)}: {getattr(error, 'message', error)}"


def result_context(rows: Any) -> Any:
    """A display context sized to these results rather than to the ledger's inputs."""
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
