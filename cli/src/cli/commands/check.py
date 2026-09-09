from __future__ import annotations

import typer

from cli import context, output


def check() -> None:
    """Parse, check and realize a beancount ledger."""
    ctx = context.current()
    file = ctx.entry_file()
    from fava.core.loader import load_file

    _entries, errors, _options = load_file(str(file))

    # `bea check` has no --allow-errors: reporting the errors is the whole job.
    output.render_ledger_errors(
        list(errors), allow=False, message=f"{file}: {len(errors)} error(s).", always_strict=True
    )

    if ctx.json_output:
        output.emit({"valid": True, "errors": []}, target=output.file_target(file))
    else:
        typer.echo(f"{file}: no errors")
