from __future__ import annotations

import sys
from typing import Annotated, Any

import typer

from cli import context, output
from cli.errors import UsageError


def query(
    query_string: Annotated[str | None, typer.Argument(help="BQL query (omit for interactive mode)")] = None,
    allow_errors: Annotated[
        bool,
        typer.Option("--allow-errors", help="Answer with errors on stderr; opts strict reads into partial answers"),
    ] = False,
) -> None:
    """Run BQL queries against a local ledger.

    With a query string, print the table; without one, open the interactive
    shell (needs a terminal).
    """
    ctx = context.current()
    file = ctx.entry_file()
    source = "beancount:" + str(file.resolve())

    from beanquery import connect

    if not query_string and ctx.no_input:
        raise UsageError("A query is required without a terminal. Pass it as an argument.")
    conn = connect(source)
    output.render_ledger_errors(list(conn.errors), allow=allow_errors)

    if not query_string:
        from cli.query_render import query_shell

        query_shell(source, sys.stdout).cmdloop()
        return

    from beanquery import Error as BeanqueryError

    from cli.query_render import render_query

    # A query answers with totals, which read as authoritative whether or not
    # the ledger loaded — so it is gated exactly like `list` and `report`.
    try:
        cursor = conn.execute(query_string)
    except BeanqueryError as exc:
        raise _query_error(exc, query_string, conn) from exc
    rows = cursor.fetchall()

    if ctx.json_output:
        output.emit(
            {"columns": _columns(cursor.description), "rows": rows},
            target=output.file_target(file),
        )
    else:
        if not rows:
            output.note("(no rows)")
        render_query(cursor.description, rows, sys.stdout)


def _query_error(exc: Exception, query_string: str, conn: Any) -> UsageError:
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
    return UsageError(f"Cannot run this BQL query: {exc}.", details=details)


def _column_suggestions(message: str, conn: Any) -> list[str]:
    """Close matches for an unknown column, read from the table it was sought in."""
    import difflib
    import re

    match = re.search(r'column "([^"]+)" not found in table "([^"]+)"', message)
    if not match:
        return []
    unknown, table_name = match.groups()
    table = conn.tables.get(table_name)
    columns = sorted(getattr(table, "columns", None) or ())
    if not columns:
        return []
    close = difflib.get_close_matches(unknown, columns, n=3, cutoff=0.6)
    if close:
        return [f"Did you mean {', '.join(close)}?"]
    return [f"Columns in {table_name}: {', '.join(columns)}."]


def _columns(description: Any) -> list[dict[str, str]]:
    """Name and declared type of each result column, so a caller can parse the rows."""
    if not description:
        return []
    return [{"name": column.name, "type": _type_name(column)} for column in description]


def _type_name(column: Any) -> str:
    datatype = getattr(column, "datatype", None)
    return getattr(datatype, "__name__", None) or str(datatype)
