"""`bea price` — managed price status and refresh, or upstream `bean-price`.

`status` and `refresh` report the ledger's managed price includes; anything
else forwards to bean-price exactly as before (requires `bea engine enable
beanprice`). Recording a supplied quote remains `bea add price` and does not
need Beanprice.
"""

from __future__ import annotations

from typing import Any

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import LedgerError, UsageError, refuse_json


def price(ctx: typer.Context) -> None:
    """Inspect managed price includes (status, refresh, export), or fetch quotes via bean-price.

    `status` lists every managed source with its freshness, revision, and
    errors; `refresh` re-resolves now and reports what changed; `export`
    snapshots a portable copy with local price files. Anything else forwards
    to bean-price (requires `bea engine enable beanprice`), so a quotes job
    file named `status` must be passed by path.
    """
    args = list(ctx.args)
    if args[:1] == ["status"]:
        _status(args[1:])
        return
    if args[:1] == ["refresh"]:
        _refresh(args[1:])
        return
    if args[:1] == ["export"]:
        _export(args[1:])
        return
    refuse_json("price", hint="Run without --json to print price directives.")
    code = launch.run_optional_native("beanprice", "bean-price", args)
    raise typer.Exit(code)


def _answer(argv: list[str]) -> dict[str, Any]:
    """The helper answer, with the load's own errors bannered, never raised."""
    data = launch.helper_json(argv)
    output.render_ledger_errors(data.get("errors") or [], allow=True)
    return data


def _status(extra: list[str]) -> None:
    if extra:
        raise UsageError(f"bea price status takes no arguments; got: {' '.join(extra)}.")
    current = context.current()
    file = current.entry_file()
    sources: list[dict[str, Any]] = _answer(["price-status", "--file", str(file)])["sources"]
    if current.json_output:
        output.emit({"sources": sources}, target=output.file_target(file))
        return
    if not sources:
        typer.echo("No managed price includes in this ledger.")
        return
    output.table(
        ["ALIAS", "FRESHNESS", "REVISION", "OBSERVED AT", "NEXT REFRESH", "SHADOWED", "ERROR"],
        [
            [
                str(source["alias"]),
                str(source["freshness"]),
                str(source["revision"] or "-"),
                str(source["observed_at"] or "-"),
                str(source["next_refresh_at"] or "-"),
                str(source["shadowed_count"]),
                str(source["error"] or ""),
            ]
            for source in sources
        ],
    )


def _refresh(extra: list[str]) -> None:
    if extra:
        raise UsageError(f"bea price refresh takes no arguments; got: {' '.join(extra)}.")
    current = context.current()
    file = current.entry_file()
    data = _answer(["price-refresh", "--file", str(file)])
    sources: list[dict[str, Any]] = data["sources"]
    failed = [
        source
        for source in sources
        if source["error"]
        or source["freshness"] == "unavailable"
        or (data.get("strict_prices") and source["freshness"] == "stale")
    ]
    if failed:
        raise LedgerError(
            "Price refresh failed for " + ", ".join(source["alias"] for source in failed) + ".",
            details=[
                f"{source['alias']}: {source['error'] or source['freshness']}; "
                f"serving revision {source['revision'] or 'none'}"
                for source in sources
            ],
            result={"sources": sources, "changed": data["changed"]},
        )
    if current.json_output:
        output.emit({"sources": sources, "changed": data["changed"]}, target=output.file_target(file))
        return
    if not sources:
        typer.echo("No managed price includes in this ledger.")
        return
    changed = {item["url"]: item for item in data["changed"]}
    for source in sources:
        if source["freshness"] == "unavailable":
            typer.echo(f"{source['alias']}: still unavailable ({source['error'] or 'no cached revision'})")
        elif source["url"] in changed:
            item = changed[source["url"]]
            before = item["previous_revision"] or "none"
            typer.echo(f"{source['alias']}: {before} → {item['revision']}")
        else:
            typer.echo(f"{source['alias']}: unchanged at {source['revision']}")


def _export(args: list[str]) -> None:
    output_dir: str | None = None
    allow_errors = False
    pending = list(args)
    while pending:
        arg = pending.pop(0)
        if arg in ("--output", "-o"):
            if not pending:
                raise UsageError("bea price export --output needs a directory.")
            output_dir = pending.pop(0)
        elif arg.startswith("--output="):
            output_dir = arg.split("=", 1)[1]
            if not output_dir:
                raise UsageError("bea price export --output needs a directory.")
        elif arg == "--allow-errors":
            allow_errors = True
        else:
            raise UsageError(f"bea price export takes only --output and --allow-errors; got: {arg}.")
    current = context.current()
    file = current.entry_file()
    argv = ["price-export", "--file", str(file)]
    if output_dir is not None:
        argv += ["--output", output_dir]
    if allow_errors:
        argv.append("--allow-errors")
    data = _answer(argv)
    if current.json_output:
        output.emit(
            {"output": data["output"], "files": data["files"], "sources": data["sources"]},
            target={**output.file_target(file), "into": data["output"]},
        )
        return
    files: list[str] = data["files"]
    output.success(f"Exported {len(files)} file{'s' if len(files) != 1 else ''} to {data['output']}.")
