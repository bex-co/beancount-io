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

# Table names that are also BQL keywords: unquoted FROM binds wrongly (accounts →
# postings) or is a syntax error (balances). Quote them before execute.
_RESERVED_TABLE_FROM = re.compile(r'(?i)\b(FROM|JOIN)\s+(?<!")(accounts|balances)\b(?!")')


def _quote_reserved_tables(query_string: str) -> str:
    """Rewrite `FROM accounts|balances` to the quoted form discovery documents."""
    return _RESERVED_TABLE_FROM.sub(r'\1 "\2"', query_string)


def load(file: Path) -> dict[str, Any]:
    """Load exactly this ledger file, for attaching to a pathless connection."""
    from beancount import loader

    entries, errors, options = loader.load_file(str(file))
    return {"entries": entries, "errors": errors, "options": options}


def connect(file: Path) -> Any:
    """A beanquery connection on the exact ledger file, includes and load errors intact."""
    import beanquery

    return beanquery.connect(LEDGER_DSN, **load(file))


def rows_answer(
    file: Path, query_string: str, *, allow_errors: bool = False, numberify: bool = False
) -> dict[str, Any]:
    """Columns, rows and load errors for one query, as JSON the frontend renders.

    The rows are JSON-ready: amounts as strings, a lot keeping the acquisition
    date and label that tell it from another lot at the same price.
    """
    conn = connect(file)
    errors = _gate([format_error(error) for error in conn.errors], allow_errors)
    cursor = _executed(conn, query_string, conn.execute, errors)
    rows = cursor.fetchall() if cursor.description is not None else []
    description = cursor.description
    if numberify and description is not None:
        from beanquery.numberify import numberify_results

        description, rows = numberify_results(description, rows, result_context(rows).build())
    return {
        "columns": columns(description),
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

    # The destination opens only after the ledger has loaded: opening it first
    # would truncate a `-o` that names the ledger under read before the load
    # sees a byte of it. The shell renders into the buffer until then, and the
    # stream is swapped once the destination is known safe.
    buffer = io.StringIO()
    # `show_errors=False`: the load errors travel in the envelope, and
    # upstream printing them to stderr too would report each one twice.
    shell = build_shell(file, buffer, format=format, numberify=numberify, show_errors=False)
    # One-shot text tables must keep full headers. Upstream `narrow=True`
    # treats the boolean as width 1 (`max(..., True, ...)`), truncating
    # `count(*)` to `c`. Interactive users can still `.set narrow true`.
    shell.settings.narrow = False
    errors = _gate([format_error(error) for error in shell.context.errors], allow_errors)
    destination = None
    if output is not None:
        _refuse_alias(output, file, shell.context)
        destination = output.open("w")
        shell.outfile = destination
    try:
        _executed(shell.context, query_string, shell.onecmd, errors)
    finally:
        if destination is not None:
            destination.close()
    return {"text": buffer.getvalue(), "errors": errors}


def _loaded_files(root: Path, context: Any) -> list[Path]:
    """The root ledger plus every file the loaded entries were read from.

    The true include closure, straight from the loader rather than from
    re-reading `include` lines: anything in this set is a file the query
    reads, so none of them may be a query destination.
    """
    files = [root]
    table = context.tables.get("entries")
    entries = getattr(table, "entries", None) or ()
    for entry in entries:
        name = (getattr(entry, "meta", None) or {}).get("filename")
        if name:
            files.append(Path(name))
    return files


def _same_file(left: Path, right: Path) -> bool:
    """True when two paths name one file, through symlinks and hard links alike."""
    try:
        first, second = left.stat(), right.stat()
        return (first.st_ino, first.st_dev) == (second.st_ino, second.st_dev)
    except OSError:
        pass
    try:
        return left.resolve() == right.resolve()
    except OSError:
        return False


def _find_alias(destination: Path, root: Path, context: Any) -> Path | None:
    """The ledger file a destination would overwrite, or None when it is safe."""
    for member in _loaded_files(root, context):
        if _same_file(destination, member):
            return member
    return None


def _refuse_alias(destination: Path, root: Path, context: Any) -> None:
    """Fail a destination that is one of the files this query reads."""
    member = _find_alias(destination, root, context)
    if member is not None:
        raise protocol.UsageError(
            f"--output {destination} would overwrite the ledger it reads ({member}); choose a different destination."
        )


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


def interactive(
    file: Path, *, format: str = "text", output: Path | None = None, numberify: bool = False, show_errors: bool = True
) -> None:
    """Upstream's interactive shell, on this process's terminal.

    `bea` runs this command with the streams inherited, so stdin really is the
    customer's terminal: readline, the pager and Ctrl-C behave as they do under
    `bean-query` itself.
    """
    import warnings

    warnings.filterwarnings("always")
    shell = build_shell(file, sys.stdout, interactive=True, format=format, numberify=numberify, show_errors=show_errors)
    destination = None
    if output is not None:
        _refuse_alias(output, file, shell.context)
        destination = output.open("w")
        shell.outfile = destination
    try:
        shell.cmdloop()
    finally:
        if destination is not None:
            destination.close()


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
        outfile: TextIO

        def do_output(self, arg: str) -> None:
            """Send output to FILE or restore the original output stream."""
            # Beanquery 0.2.0 calls open(sys.stdout) on reset and closes the old
            # stream before opening its replacement. Remove this override when
            # upstream supports reset and failed redirection without losing output.
            if arg:
                member = _find_alias(Path(arg), file, self.context)
                if member is not None:
                    protocol.note(
                        f"Refusing to write query output to {arg}: "
                        f"it is one of the ledger files under query ({member})."
                    )
                    return
            try:
                destination = open(arg, "w", encoding="utf-8") if arg else stream
            except OSError as exc:
                protocol.note(f"Cannot write to {arg}: {exc.strerror or exc}.")
                return
            if self.outfile is not stream:
                self.outfile.close()
            self.outfile = destination

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

        def do_help(self, arg: str) -> None:
            """List commands, writing to outfile so one-shot JSON stays clean."""
            # Upstream `cmd.Cmd.do_help` writes to `self.stdout`, which starts as
            # process stdout. Point it at outfile for the duration so `bea query
            # '.help'` keeps a single JSON object on the engine's stdout.
            previous: TextIO = self.stdout  # type: ignore[has-type]
            self.stdout = self.outfile
            try:
                super().do_help(arg)
            finally:
                self.stdout = previous

        def do_parse(self, arg: str) -> None:
            """Print the parsed sexp to outfile (not process stdout)."""
            print(self.parse(arg).tosexp(), file=self.outfile)

        def do_run(self, arg: str) -> None:
            """Run a named stored query, or list them; missing names are usage errors."""
            import shlex

            cleaned = arg.rstrip("; \t")
            if not cleaned:
                if self.queries:
                    print("\n".join(name for name in sorted(self.queries)), file=self.outfile)
                return
            if cleaned == "*":
                for name, query in sorted(self.queries.items()):
                    print(f"{name}:", file=self.outfile)
                    self.execute(query.query_string, default_close_date=query.date)
                    print(file=self.outfile)
                    print(file=self.outfile)
                return
            parts = shlex.split(cleaned)
            if len(parts) != 1:
                raise protocol.UsageError('too many arguments for "run" command')
            name = parts[0]
            query = self.queries.get(name)
            if query is None:
                known = ", ".join(sorted(self.queries)) or "(none)"
                raise protocol.UsageError(
                    f'query "{name}" not found.',
                    details=[f"Stored queries in this ledger: {known}."],
                )
            self.execute(query.query_string, default_close_date=query.date)

        def onecmd(self, line: str) -> Any:
            # A query that opens with a comment (`/* … */`, `;`) has no leading
            # identifier, so `cmd.Cmd.parseline` finds no command and upstream
            # returns without running it: empty output, exit 0. Hand any such
            # non-blank line to the parser, which runs it or reports why not.
            command_name, _, parsed = self.parseline(line)
            if parsed and not command_name:
                return self.execute(parsed)
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
            if self.settings.format == "beancount":
                _require_entries(description, rows)
            if not rows:
                protocol.note("(no rows)")
            dcontext = result_context(rows)
            if self.settings.numberify:
                description, rows = numberify_results(description, rows, dcontext.build())
            with self.output as out:
                if self.settings.format == "csv":
                    # Upstream CSV reuses text DecimalRenderer padding. Emit
                    # unpadded machine cells so spreadsheets and Decimal() parse.
                    return _render_csv(description, rows, out)
                renderer = FORMATS[self.settings.format]
                return renderer(description, rows, out, dcontext=dcontext, **self.settings.todict())

        def on_Print(self, statement: Any) -> Any:  # noqa: N802 - beanquery dispatch name
            # Upstream PRINT forces the beancount renderer, silently ignoring
            # `--format csv`. Refuse that combination so agents do not get
            # directive text labeled as CSV.
            if self.settings.format == "csv":
                raise protocol.UsageError(
                    "PRINT renders Beancount directives; --format csv cannot represent them. "
                    "Use --format text or --format beancount, or SELECT for a CSV table."
                )
            return super().on_Print(statement)

    # The override above drops upstream's SELECT help; without it, `help
    # select` crashes formatting a missing docstring.
    PreciseShell.on_Select.__doc__ = BQLShell.on_Select.__doc__
    return PreciseShell(LEDGER_DSN, stream, interactive, True, format, numberify, show_errors)


def _require_entries(description: Any, rows: Any) -> None:
    """Refuse a column result under the beancount format before upstream's renderer sees it.

    Upstream's renderer unpacks every row as a single directive, so a column
    `SELECT` fails inside it with 'too many values to unpack' or a missing
    `meta` attribute. `PRINT` answers one directive per row and still goes to
    upstream unchanged; the ledger is fine either way, so this is a usage
    failure rather than a validation one.

    An empty result keys on the cursor, not the rows: `SELECT entry` types its
    lone column as the directive, while a column `SELECT` types it scalar, so
    emptiness can no longer hide an incompatible format behind "(no rows)".
    """
    from beancount.core.data import ALL_DIRECTIVES

    columns = tuple(description or ())
    entries_column = len(columns) == 1 and (
        columns[0].datatype in ALL_DIRECTIVES
        or (rows and all(len(row) == 1 and isinstance(row[0], ALL_DIRECTIVES) for row in rows))
    )
    if entries_column:
        return
    raise protocol.UsageError(
        "--format beancount prints directives, so the query must return entries; "
        "use PRINT, or --format text or csv for a column result."
    )


def _render_csv(description: Any, rows: Any, out: TextIO) -> None:
    """Write CSV without text-table decimal alignment padding."""
    import csv

    writer = csv.writer(out)
    writer.writerow([column.name for column in description or ()])
    for row in rows:
        writer.writerow([_csv_cell(value) for value in row])


def _csv_cell(value: Any) -> str:
    """One unpadded CSV field from a BQL cell."""
    if value is None:
        return ""
    rendered = protocol._jsonable(value)
    return _csv_from_jsonable(rendered)


def _csv_from_jsonable(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, str | int):
        return str(value)
    if isinstance(value, dict):
        if "units" in value:
            units = _csv_from_jsonable(value["units"])
            cost = value.get("cost")
            if cost:
                return f"{units} {{{_csv_from_jsonable(cost)}}}"
            return units
        if "number" in value and "currency" in value:
            return f"{value['number']} {value['currency']}"
        return str(value)
    if isinstance(value, list):
        return ", ".join(_csv_from_jsonable(item) for item in value)
    return str(value)


def _executed(conn: Any, query_string: str, run: Any, ledger_errors: list[str]) -> Any:
    """Run a query, turning beanquery's terse complaint into one that names the problem."""
    from beanquery import Error as BeanqueryError

    statement = _quote_reserved_tables(query_string)
    _refuse_empty_window(statement, ledger_errors)
    try:
        return run(statement)
    except BeanqueryError as exc:
        raise _usage_error(exc, query_string, conn, ledger_errors) from None
    except SyntaxError as exc:
        # Beanquery compiles a query to Python. `SELECT DISTINCT tags` makes it
        # emit code it cannot parse, and the SyntaxError that escapes says only
        # "cannot use starred expression here" — nothing about the query, or the
        # column, or what would work instead.
        columns = _set_columns(statement)
        if not columns:
            raise protocol.UsageError(
                f"Beanquery could not compile this BQL query: {exc}.",
                details=_SET_COLUMN_ADVICE,
                ledger_errors=ledger_errors,
            ) from None
        named = ", ".join(columns)
        raise protocol.UsageError(
            f"BQL cannot use DISTINCT or GROUP BY on {named}: a set is not a value it can compare.",
            details=_SET_COLUMN_ADVICE,
            ledger_errors=ledger_errors,
        ) from None
    except TypeError as exc:
        # The hashability check calls `issubclass(dtype, Hashable)`, which
        # raises TypeError on the parameterized `set[str]` behind `accounts` —
        # the GROUP BY equivalent of the non-hashable error tags and links get.
        # Anything else is a genuine bug and propagates untouched.
        grouped = [column for column in _grouped_columns(statement) if column in _SET_COLUMNS_PLUS_ACCOUNTS]
        if "issubclass" in str(exc) and grouped:
            named = ", ".join(grouped)
            raise protocol.UsageError(
                f"BQL cannot use DISTINCT or GROUP BY on {named}: a set is not a value it can compare.",
                details=_SET_COLUMN_ADVICE,
                ledger_errors=ledger_errors,
            ) from None
        raise
    except AttributeError as exc:
        # A scalar subquery in the SELECT list reaches scalar evaluation as an
        # EvalQuery node, which has no childnodes to evaluate.
        if "childnodes" in str(exc):
            raise protocol.UsageError(
                "BQL cannot use a subquery in the SELECT list.",
                details=["Filter with it instead: SELECT ... WHERE column IN (SELECT ...)"],
                ledger_errors=ledger_errors,
            ) from None
        raise


_SET_COLUMNS = ("tags", "links")

_SET_COLUMNS_PLUS_ACCOUNTS = ("tags", "links", "accounts")

_SET_COLUMN_ADVICE = [
    "`tags` and `links` hold a whole set per entry, so BQL cannot hash them.",
    "Distinct combinations: SELECT DISTINCT joinstr(tags) — one string per row; the order inside it is not stable.",
    "Counts per combination: SELECT joinstr(tags), count(*) GROUP BY joinstr(tags)",
    "One tag at a time: SELECT date, narration WHERE 'grocery' IN tags",
]


def _set_columns(query_string: str) -> list[str]:
    """The bare set-valued columns this query selects, which is what cannot be compared.

    Only a bare column is a problem — `joinstr(tags)` is a string and behaves
    like any other, which is why it is the recipe we point at.
    """
    try:
        from beanquery.parser import parse

        parsed = parse(query_string)
    except Exception:  # noqa: BLE001 - the query already failed; advice is best effort
        return []
    found: list[str] = []
    for target in getattr(parsed, "targets", None) or []:
        name = getattr(getattr(target, "expression", None), "name", None)
        if name in _SET_COLUMNS and name not in found:
            found.append(name)
    return found


def _grouped_columns(query_string: str) -> list[str]:
    """The columns this query groups by, for naming the set GROUP BY cannot hash."""
    try:
        from beanquery.parser import parse

        parsed = parse(query_string)
    except Exception:  # noqa: BLE001 - the query already failed; advice is best effort
        return []
    group_by = getattr(parsed, "group_by", None)
    return [column.name for column in getattr(group_by, "columns", None) or []]


def _refuse_empty_window(query_string: str, ledger_errors: list[str]) -> None:
    """Refuse a `FROM OPEN ON … CLOSE ON …` window that can hold no entries.

    `CLOSE ON D` is exclusive, so `OPEN ON D CLOSE ON D` spans zero days while
    the `--from-date D --to-date D` filters everywhere else in `bea` span one.
    Answering `(no rows)` reads as "that day is empty" rather than "you asked
    for no days", so say which it is and how to ask for the day.
    """
    from datetime import date, timedelta

    try:
        from beanquery.parser import parse

        parsed = parse(query_string)
    except Exception:  # noqa: BLE001 - a dot command or a broken query; beanquery reports it
        return
    clause = getattr(parsed, "from_clause", None)
    begin, end = getattr(clause, "open", None), getattr(clause, "close", None)
    # A bare `CLOSE` is `True`, not a date, and closes at the end of the ledger.
    if not isinstance(begin, date) or not isinstance(end, date) or begin < end:
        return
    if begin == end:
        message = (
            f"This BQL window covers no days: CLOSE ON {end} is exclusive, so it ends where OPEN ON {begin} starts."
        )
        details = [
            f"Use CLOSE ON {end + timedelta(days=1)} to cover {begin}.",
            f"Or run: bea list transaction --from-date {begin} --to-date {begin} — those dates are inclusive.",
        ]
    else:
        message = f"This BQL window covers no days: OPEN ON {begin} starts after the exclusive CLOSE ON {end}."
        details = [f"Did you mean OPEN ON {end} CLOSE ON {begin + timedelta(days=1)}?"]
    raise protocol.UsageError(message, details=details, ledger_errors=ledger_errors)


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
    if "non-hashable" in str(exc) and _set_columns(query_string):
        details.extend(_SET_COLUMN_ADVICE)
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
