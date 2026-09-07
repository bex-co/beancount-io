from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from cli import context, output


def format_beans(
    directory: Annotated[Path, typer.Argument(help="Directory to search for .bean files recursively")] = Path("."),
    dry_run: Annotated[
        bool, typer.Option("--dry-run", help="Show files that would change without modifying them")
    ] = False,
) -> None:
    """Format all .bean files under a directory (equivalent to bean-format --in-place)."""
    ctx = context.current()
    try:
        from beancount.scripts.format import align_beancount

        bean_files = sorted(directory.rglob("*.bean"))
        formatted_files: list[str] = []
        for f in bean_files:
            original = f.read_text(encoding="utf-8")
            aligned = align_beancount(original)  # type: ignore[no-untyped-call]
            if aligned != original:
                formatted_files.append(str(f))
                if not dry_run:
                    f.write_text(aligned, encoding="utf-8")

        if ctx.json_output:
            output.emit(
                {"scanned": len(bean_files), "formatted": formatted_files, "dry_run": dry_run},
                target={"directory": str(directory.resolve())},
            )
            return

        if not bean_files:
            output.success("No .bean files found.")
            return
        for fname in formatted_files:
            typer.echo(f"{'would format' if dry_run else 'formatted'}: {fname}")
        suffix = " (dry run)" if dry_run else ""
        output.success(f"{len(formatted_files)}/{len(bean_files)} file(s) formatted{suffix}.")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)
