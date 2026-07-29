"""For using the Beancount shell from Fava."""

from __future__ import annotations

import io
import shlex
import textwrap
from typing import TYPE_CHECKING

from beancount.core.display_context import DisplayContext
from beanquery import CompilationError, Cursor, ParseError, connect
from beanquery.numberify import numberify_results
from beanquery.render.text import render as render_text
from beanquery.shell import BQLShell

from ..core.query import COLUMNS, ObjectColumn, QueryResultTable, QueryResultText
from ..helpers import FavaAPIError
from ..util.excel import HAVE_EXCEL, to_csv, to_excel


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Sequence
    from typing import TypeVar

    from ..beans.abc import Directive
    from ..ledger import FavaLedger

    T = TypeVar("T")


class FavaShellError(FavaAPIError):
    """An error in the Fava BQL shell, will be turned into a string."""


class QueryNotFoundError(FavaShellError):
    """Query '{name}' not found."""

    def __init__(self, name: str) -> None:
        super().__init__(f"Query '{name}' not found.")


class TooManyRunArgsError(FavaShellError):
    """Too many args to run: '{args}'."""

    def __init__(self, args: str) -> None:
        super().__init__(f"Too many args to run: '{args}'.")


class QueryCompilationError(FavaShellError):
    """Query compilation error."""

    def __init__(self, err: CompilationError) -> None:
        super().__init__(f"Query compilation error: {err!s}.")


class QueryParseError(FavaShellError):
    """Query parse error."""

    def __init__(self, err: ParseError) -> None:
        super().__init__(f"Query parse error: {err!s}.")


class NonExportableQueryError(FavaShellError):
    """Only queries that return a table can be printed to a file."""

    def __init__(self) -> None:
        super().__init__("Only queries that return a table can be printed to a file.")


class FavaBQLShell(BQLShell):
    """A light wrapper around Beancount's shell."""

    outfile: io.StringIO

    def __init__(self, ledger: FavaLedger) -> None:
        super().__init__("", io.StringIO(), interactive=False)
        self.ledger = ledger
        self.stdout = self.outfile

    def run(self, entries: Sequence[Directive], query: str) -> Cursor | str:
        """Run a query, capturing output as string or returning the result."""
        self.context = connect(
            "beancount:",
            entries=entries,
            errors=self.ledger.errors,
            options=self.ledger.options,
        )
        try:
            result = self.onecmd(query)
        except ParseError as exc:
            raise QueryParseError(exc) from exc
        except CompilationError as exc:
            raise QueryCompilationError(exc) from exc

        if isinstance(result, Cursor):
            return result
        contents = self.outfile.getvalue().strip()
        self.outfile.truncate(0)
        return contents.strip().strip("\x00")

    def add_help(self) -> None:
        """Attach help functions for each of the parsed token handlers."""
        for attrname, func in BQLShell.__dict__.items():
            if attrname[:3] != "on_":
                continue
            command_name = attrname[3:]
            setattr(
                self.__class__,
                f"help_{command_name.lower()}",
                lambda _, fun=func: print(
                    textwrap.dedent(fun.__doc__).strip(),
                    file=self.outfile,
                ),
            )

    def noop(self, _: T) -> None:
        """Doesn't do anything in Fava's query shell."""
        print(self.noop.__doc__, file=self.outfile)

    on_Reload = noop
    do_exit = noop
    do_quit = noop
    do_EOF = noop

    def on_Select(self, statement: str) -> Cursor:
        return self.context.execute(statement)

    def do_run(self, arg: str) -> Cursor | None:
        """Run a custom query."""
        queries = self.ledger.all_entries_by_type.Query
        stripped_arg = arg.rstrip("; \t")
        if not stripped_arg:
            # List the available queries.
            for q in queries:
                print(q.name, file=self.outfile)
            return None

        name, *more = shlex.split(stripped_arg)
        if more:
            raise TooManyRunArgsError(stripped_arg)

        query = next((q for q in queries if q.name == name), None)
        if query is None:
            raise QueryNotFoundError(name)
        return self.execute(query.query_string)


FavaBQLShell.on_Select.__doc__ = BQLShell.on_Select.__doc__


class QueryShellModule:
    """A Fava module to run BQL queries."""

    def __init__(self, ledger: FavaLedger) -> None:
        self.shell = FavaBQLShell(ledger)

    def execute_query_serialised(self, entries: Sequence[Directive], query: str) -> QueryResultTable | QueryResultText:
        """Run a query and returns its serialised result.

        Arguments:
            entries: The entries to run the query on.
            query: A query string.

        Returns:
            Either a table or a text result (depending on the query).

        Raises:
            FavaAPIError: If the query response is an error.
        """
        res = self.shell.run(entries, query)
        return QueryResultText(res) if isinstance(res, str) else _serialise(res)

    def execute_query_as_text(self, entries: Sequence[Directive], query: str) -> str:
        """Run a query and return the result as formatted text, like bean-query CLI output."""
        res = self.shell.run(entries, query)
        if isinstance(res, str):
            return res
        buf = io.StringIO()
        rows = res.fetchall()
        render_text(res.description, rows, buf, dcontext=self.shell.ledger.options["dcontext"])
        return buf.getvalue()

    def query_to_file(
        self,
        entries: Sequence[Directive],
        query_string: str,
        result_format: str,
    ) -> tuple[str, io.BytesIO]:
        """Get query result as file.

        Arguments:
            entries: The entries to run the query on.
            query_string: A string, the query to run.
            result_format: The file format to save to.

        Returns:
            A tuple (name, data), where name is either 'query_result' or the
            name of a custom query if the query string is 'run name_of_query'.
            ``data`` contains the file contents.

        Raises:
            FavaAPIError: If the result format is not supported or the
            query failed.
        """
        name = "query_result"

        if query_string.startswith((".run", "run")):
            _run, name, *more = shlex.split(query_string)
            if more:
                raise TooManyRunArgsError(query_string)
            queries = self.shell.ledger.all_entries_by_type.Query
            query = next((q for q in queries if q.name == name), None)
            if query is None:
                raise QueryNotFoundError(name)
            query_string = query.query_string

        res = self.shell.run(entries, query_string)
        if isinstance(res, str):
            raise NonExportableQueryError

        rrows = res.fetchall()
        rtypes = res.description
        dcontext = self.shell.ledger.options["dcontext"]
        assert isinstance(dcontext, DisplayContext)
        dformat = dcontext.build()
        types, rows = numberify_results(rtypes, rrows, dformat)

        if result_format == "csv":
            data = to_csv(types, rows)
        else:
            if not HAVE_EXCEL:  # pragma: no cover
                msg = "Result format not supported."
                raise FavaAPIError(msg)
            data = to_excel(types, rows, result_format, query_string)
        return name, data


def _serialise(cursor: Cursor) -> QueryResultTable:
    """Serialise the query result."""
    dtypes = [COLUMNS.get(c.datatype, ObjectColumn)(c.name) for c in cursor.description]
    mappers = [d.serialise for d in dtypes]
    mapped_rows = [tuple(mapper(row[i]) for i, mapper in enumerate(mappers)) for row in cursor]
    return QueryResultTable(dtypes, mapped_rows)
