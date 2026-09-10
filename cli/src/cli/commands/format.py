from __future__ import annotations

import shlex
from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.errors import LedgerError, UsageError
from cli.ledger_write import candidate_file, lock_file, replace_checked


def format_beans(
    directory: Annotated[Path | None, typer.Argument(help="Ledger file or directory to format recursively")] = None,
    dry_run: Annotated[
        bool, typer.Option("--dry-run", help="Show files that would change without modifying them")
    ] = False,
    check: Annotated[
        bool, typer.Option("--check", help="Check formatting without writing; exit 1 if files need formatting")
    ] = False,
) -> None:
    """Format a file or every .bean/.beancount file under a directory."""
    ctx = context.current()
    from beancount.parser import parser
    from beancount.parser.grammar import ParserError
    from beancount.scripts.format import align_beancount

    dry_run = dry_run or check
    # An explicit path wins; otherwise the global --file selects the file and
    # a bare `bea format` keeps formatting the working directory tree.
    directory = (directory or ctx.file or Path(".")).resolve()
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
    skipped_files: list[str] = []
    diagnostics: list[str] = []
    for f in bean_files:
        original_stat = f.stat()
        original_bytes = f.read_bytes()
        original = original_bytes.decode("utf-8")
        # Parse each file independently: formatting an include must not need
        # account opens, execute plugins, or require root-ledger options.
        _, errors, _ = parser.parse_string(original, report_filename=str(f))
        errors = [
            error
            for error in errors
            if not (isinstance(error, ParserError) and error.message.startswith("Invalid account name:"))
        ]
        if errors:
            skipped_files.append(str(f))
            diagnostics.extend(
                f"{f}:{error.source.get('lineno', 0)}: skipped: syntax error: {error.message}" for error in errors
            )
            continue
        # The upstream aligner assumes LF in its whitespace safety check.
        normalized = original.replace("\r\n", "\n").replace("\r", "\n")
        aligned = align_beancount(normalized)  # type: ignore[no-untyped-call]
        if aligned != original:
            formatted_files.append(str(f))
            if not dry_run:
                with lock_file(f), candidate_file(f, aligned) as candidate:
                    replace_checked(f, candidate, original_bytes, original_stat)

    result = {
        "scanned": len(bean_files),
        "formatted": formatted_files,
        "dry_run": dry_run,
        "check": check,
        "skipped": skipped_files,
    }
    if skipped_files or (check and formatted_files):
        action = "would format" if dry_run else "formatted"
        for name in formatted_files:
            output.note(f"{action}: {name}")
        message = (
            f"Skipped {len(skipped_files)} file(s) with syntax errors."
            if skipped_files
            else f"{len(formatted_files)} file(s) need formatting. "
            f"Run bea format {shlex.quote(str(directory))} to apply."
        )
        raise LedgerError(message, details=diagnostics, result=result)

    if ctx.json_output:
        output.emit(result, target={"file" if directory.is_file() else "directory": str(directory)})
        return

    if not bean_files:
        output.success("No .bean or .beancount files found.")
        return
    for fname in formatted_files:
        typer.echo(f"{'would format' if dry_run else 'formatted'}: {fname}")
    if check:
        output.success(f"All {len(bean_files)} file(s) are formatted.")
    elif dry_run:
        output.success(f"Would format {len(formatted_files)}/{len(bean_files)} file(s) (dry run).")
    else:
        output.success(f"{len(formatted_files)}/{len(bean_files)} file(s) formatted.")
