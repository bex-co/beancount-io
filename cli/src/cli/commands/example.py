"""`bea example` — delegate to upstream `bean-example`."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import typer

from cli.engine import launch
from cli.errors import ConflictError, UsageError, refuse_json
from cli.output import forwarded_option

_FORCE = "--force"


def _split_output(args: list[str]) -> tuple[list[str], Path | None, bool]:
    """Pull bea's own `--force` and upstream's `-o` out of the passthrough args.

    `bean-example` knows no `--force`, so it is stripped before forwarding;
    `-o`/`--output` stays, since upstream is what writes it. Only an existing
    destination needs refusing — a fresh path is upstream's normal case.
    """
    stop = args.index("--") if "--" in args else len(args)
    force = _FORCE in args[:stop]
    forwarded = [arg for index, arg in enumerate(args) if arg != _FORCE or index > stop]
    value = forwarded_option(forwarded, "-o", "--output")
    return forwarded, None if value is None else Path(value), force


def example(ctx: typer.Context) -> None:
    """Generate an example Beancount history (delegates to bean-example)."""
    refuse_json("example", hint="Run without --json to print the sample ledger.")
    forwarded, output, force = _split_output(list(ctx.args))
    if output is not None and not force and (output.exists() or output.is_symlink()):
        raise ConflictError(
            f"Already exists: {output}. Pass --force to overwrite it with a generated example; "
            "without it, example never overwrites."
        )
    _check_date_order(forwarded)
    completed = launch.capture_native("bean-example", forwarded)
    launch.check_native(completed, "bean-example")
    if completed.stdout:
        sys.stdout.write(completed.stdout)
    if completed.stderr:
        sys.stderr.write(completed.stderr)


#: The shortest range bean-example reliably generates. Its rules schedule
#: monthly entries, and a shorter range crashes it with IndexError or
#: StopIteration (30 days still fails for some seeds; 31 never did).
_MIN_SPAN_DAYS = 31


def _check_date_order(args: list[str], today: date | None = None) -> None:
    """Refuse a date range bean-example cannot generate before upstream dies on it.

    A missing side takes upstream's default (January 1 two years back, and
    today), so a lone `--date-end` in the past or `--date-begin` in the
    future is caught as inverted too. Only ISO dates are compared; anything
    else passes through to upstream's own parsing.
    """
    values: dict[str, str] = {}
    index = 0
    while index < len(args):
        arg = args[index]
        if arg == "--":
            break
        if arg in ("--date-begin", "--date-end") and index + 1 < len(args):
            values[arg] = args[index + 1]
            index += 2
            continue
        if arg.startswith("--date-begin="):
            values["--date-begin"] = arg.split("=", 1)[1]
        elif arg.startswith("--date-end="):
            values["--date-end"] = arg.split("=", 1)[1]
        index += 1
    if not values:
        return
    today = today or date.today()
    try:
        begin = date.fromisoformat(values["--date-begin"]) if "--date-begin" in values else date(today.year - 2, 1, 1)
        end = date.fromisoformat(values["--date-end"]) if "--date-end" in values else today
    except ValueError:
        return
    shown_begin = f"--date-begin {begin.isoformat()}" + ("" if "--date-begin" in values else " (default)")
    shown_end = f"--date-end {end.isoformat()}" + ("" if "--date-end" in values else " (default: today)")
    if begin > end:
        raise UsageError(f"{shown_begin} is after {shown_end}; begin must be on or before end.")
    if (end - begin).days < _MIN_SPAN_DAYS:
        raise UsageError(
            f"{shown_begin} to {shown_end} spans {(end - begin).days} days; "
            f"bean-example needs at least {_MIN_SPAN_DAYS}."
        )
