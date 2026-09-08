from __future__ import annotations

import sys
from typing import Annotated, Any

import typer

from cli import context, output
from cli.errors import UsageError


def query(
    query_string: Annotated[str | None, typer.Argument(help="BQL query (omit for interactive mode)")] = None,
    allow_errors: Annotated[
        bool, typer.Option("--allow-errors", help="Answer the query even if the ledger has errors")
    ] = False,
) -> None:
    """Run BQL queries against a local .bean file (print or interactive mode)."""
    ctx = context.current()
    file = ctx.entry_file()
    source = "beancount:" + str(file.resolve())

    from beanquery import connect

    if not query_string and ctx.no_input:
        raise UsageError("A query is required without a terminal. Pass it as an argument.")
    conn = connect(source)
    output.render_ledger_errors(list(conn.errors), allow=allow_errors)

    if not query_string:
        from beanquery.shell import BQLShell

        BQLShell(source, sys.stdout, interactive=True, runinit=True).cmdloop()
        return

    from beanquery.render.text import render as render_text

    # A query answers with totals, which read as authoritative whether or not
    # the ledger loaded — so it is gated exactly like `list` and `report`.
    cursor = conn.execute(query_string)
    rows = cursor.fetchall()

    if ctx.json_output:
        output.emit(
            {"columns": _columns(cursor.description), "rows": rows},
            target=output.file_target(file),
        )
    else:
        render_text(cursor.description, rows, sys.stdout, dcontext=conn.options.get("dcontext"))


def _columns(description: Any) -> list[dict[str, str]]:
    """Name and declared type of each result column, so a caller can parse the rows."""
    if not description:
        return []
    return [{"name": column.name, "type": _type_name(column)} for column in description]


def _type_name(column: Any) -> str:
    datatype = getattr(column, "datatype", None)
    return getattr(datatype, "__name__", None) or str(datatype)
