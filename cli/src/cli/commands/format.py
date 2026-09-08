from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.errors import UsageError
from cli.ledger_write import candidate_file, lock_file, replace_checked


def format_beans(
    directory: Annotated[Path, typer.Argument(help="Ledger file or directory to format recursively")] = Path("."),
    dry_run: Annotated[
        bool, typer.Option("--dry-run", help="Show files that would change without modifying them")
    ] = False,
) -> None:
    """Format a file or every .bean/.beancount file under a directory."""
    ctx = context.current()
    from beancount.scripts.format import align_beancount

    directory = directory.resolve()
    if not directory.exists():
        raise UsageError(f"Formatting target does not exist: {directory}")
    if directory.is_file():
        if directory.suffix not in {".bean", ".beancount"}:
            raise UsageError("Expected a .bean or .beancount file, or a directory.")
        bean_files = [directory]
    elif directory.is_dir():
        bean_files = sorted(
            {f.resolve() for pattern in ("*.bean", "*.beancount") for f in directory.rglob(pattern) if f.is_file()}
        )
    else:
        raise UsageError(f"Not a regular file or directory: {directory}")
    formatted_files: list[str] = []
    for f in bean_files:
        original_stat = f.stat()
        original_bytes = f.read_bytes()
        original = original_bytes.decode("utf-8")
        aligned = align_beancount(original)  # type: ignore[no-untyped-call]
        if aligned != original:
            formatted_files.append(str(f))
            if not dry_run:
                with lock_file(f), candidate_file(f, aligned) as candidate:
                    replace_checked(f, candidate, original_bytes, original_stat)

    if ctx.json_output:
        output.emit(
            {"scanned": len(bean_files), "formatted": formatted_files, "dry_run": dry_run},
            target={"file" if directory.is_file() else "directory": str(directory)},
        )
        return

    if not bean_files:
        output.success("No .bean or .beancount files found.")
        return
    for fname in formatted_files:
        typer.echo(f"{'would format' if dry_run else 'formatted'}: {fname}")
    suffix = " (dry run)" if dry_run else ""
    output.success(f"{len(formatted_files)}/{len(bean_files)} file(s) formatted{suffix}.")
