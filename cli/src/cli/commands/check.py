from __future__ import annotations

import sys

import typer

from cli import output
from cli.config import DEFAULT_ENTRY_FILE


def check() -> None:
    """Parse, check and realize a beancount ledger."""
    file = DEFAULT_ENTRY_FILE
    try:
        from fava.core.loader import load_file

        _entries, errors, _options = load_file(str(file))

        if not errors:
            typer.echo(f"{file}: no errors")
        else:
            for err in errors:
                f = err.source["filename"] if err.source else str(file)
                line = err.source["lineno"] if err.source else 0
                typer.echo(f"{f}:{line}: {err.message}", file=sys.stderr)
            raise typer.Exit(1)
    except typer.Exit:
        raise
    except Exception as e:
        output.error(str(e))
