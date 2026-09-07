from __future__ import annotations

import typer

from cli import context, output
from cli.errors import LedgerError


def check() -> None:
    """Parse, check and realize a beancount ledger."""
    ctx = context.current()
    try:
        file = ctx.entry_file()
        from fava.core.loader import load_file

        _entries, errors, _options = load_file(str(file))

        if errors:
            raise LedgerError(
                f"{file}: {len(errors)} error(s).",
                details=[output.format_ledger_error(err) for err in errors],
            )

        if ctx.json_output:
            output.emit({"valid": True, "errors": []}, target=output.file_target(file))
        else:
            typer.echo(f"{file}: no errors")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)
