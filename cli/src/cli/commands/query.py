from __future__ import annotations

from typing import Annotated

import typer

from cli import output
from cli.config import DEFAULT_ENTRY_FILE


def query(
    query_string: Annotated[str | None, typer.Argument(help="BQL query (omit for interactive mode)")] = None,
) -> None:
    """Run BQL queries against a local .bean file (print or interactive mode)."""
    file = DEFAULT_ENTRY_FILE
    try:
        import sys

        source = "beancount:" + str(file.resolve())

        if query_string:
            from beanquery import connect
            from beanquery.render.text import render as render_text

            conn = connect(source)
            cursor = conn.execute(query_string)
            rows = cursor.fetchall()
            render_text(cursor.description, rows, sys.stdout, dcontext=conn.options.get("dcontext"))
        else:
            from beanquery.shell import BQLShell

            shell = BQLShell(source, sys.stdout, interactive=True, runinit=True)
            shell.cmdloop()
    except Exception as e:
        output.error(str(e))
