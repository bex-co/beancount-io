"""`bea format` — upstream's aligner, run as a child process (ADR014 t004).

`bean-format` owns the formatting: it is a text transformation, deliberately
regex-based and not a parse, and `bea` neither reimplements nor second-guesses
it. What `bea` keeps is the two conveniences that upstream has no equivalent
for — expanding a directory into the ledger files under it, and reporting what
would change without writing it (`--check` for a pre-commit hook, `--dry-run`
for a look first).

**Breaking change (ADR014).** Formatting used to rewrite the files it was given.
It now writes to stdout, like `bean-format`, and rewriting is `--in-place`.
Upstream's default is the safe one: a command that both reads a path and
silently rewrites it has no way to be tried out, and the old behavior could not
be recovered by any flag. `bea format -i .` is the old `bea format .`.
"""

from __future__ import annotations

import shlex
from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import BeaError, LedgerError, UsageError

SUFFIXES = {".bean", ".beancount"}
STDIN = "-"


def _require_output_file(path: Path) -> None:
    """Refuse -o when the path is already a directory."""
    if path.exists() and path.is_dir():
        raise UsageError(f"--output must be a file path, not a directory ({path}).")


def format_beans(
    paths: Annotated[
        list[Path] | None,
        typer.Argument(help="Ledger files, directories to expand recursively, or - for stdin (default: stdin)"),
    ] = None,
    in_place: Annotated[
        bool, typer.Option("--in-place", "-i", help="Rewrite each file instead of writing stdout")
    ] = False,
    output_file: Annotated[
        Path | None, typer.Option("--output", "-o", help="Write to this file instead of stdout")
    ] = None,
    check: Annotated[bool, typer.Option("--check", help="Write nothing; exit 1 if any file needs formatting")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Write nothing; report what would change")] = False,
    prefix_width: Annotated[
        int | None, typer.Option("--prefix-width", "-w", help="Force fixed prefix width (max 200)")
    ] = None,
    num_width: Annotated[
        int | None, typer.Option("--num-width", "-W", help="Force fixed numbers width (max 200)")
    ] = None,
    currency_column: Annotated[
        int | None, typer.Option("--currency-column", "-c", help="Align currencies to this column (max 200)")
    ] = None,
) -> None:
    """Format ledger files to stdout; rewrite them with --in-place."""
    ctx = context.current()
    alignment = _alignment(prefix_width, num_width, currency_column)

    if in_place and output_file is not None:
        raise UsageError("Pass either --in-place or --output, not both — they name two different destinations.")
    if output_file is not None:
        _require_output_file(output_file)
    reporting = check or dry_run
    if reporting and (in_place or output_file is not None):
        mode = "--check" if check else "--dry-run"
        raise UsageError(f"{mode} writes nothing, so it cannot be combined with --in-place or --output.")

    walking = reporting or in_place
    files, missing = _targets(paths, ctx.file, expand_includes=walking)
    if files is None:
        if reporting or in_place:
            raise UsageError("Name the files to format: reading stdin has nothing to compare or rewrite.")
        if ctx.json_output:
            _require_json_destination(in_place, output_file)
        # Upstream's stdin filter, and the one case where `bea` does not need to
        # know what the files are. The `-` is what asks for it: `bean-format`
        # takes filenames, and a call naming none is refused before it reads a
        # byte of the pipe.
        status = launch.run_native("bean-format", [*alignment, *_destination(output_file), STDIN])
        if status == 0 and ctx.json_output and output_file is not None:
            output.emit(_wrote(0, output_file), target={"stdin": STDIN})
            return
        raise typer.Exit(status)

    target = _target(paths, files)
    # The walk modes see whole ledgers: a root stands for its include closure,
    # and a file bean-format cannot parse is a failure rather than "already
    # formatted". Single-file stdout output stays a plain filter.
    failed: dict[str, list[str]] = _syntax_failures(files) if walking and files else {}
    if reporting:
        remedy = _remedy(_named(paths, ctx.file), alignment)
        _report(files, alignment, target, remedy, failed, missing, check=check, dry_run=dry_run)
        return

    if not files:
        if ctx.json_output:
            if in_place:
                raise UsageError(
                    "No .bean or .beancount files found to rewrite.",
                    result=_result([], [], {}, []) | {"in_place": True},
                )
            _require_json_destination(in_place, output_file)
            if output_file is not None:
                output.emit(_wrote(0, output_file), target=target)
                return
        if in_place:
            raise UsageError("No .bean or .beancount files found to rewrite.")
        output.success("No .bean or .beancount files found.")
        return

    if ctx.json_output:
        _require_json_destination(in_place, output_file)

    if in_place:
        _format_in_place(files, alignment, target, failed, missing)
        return

    if len(files) > 1:
        raise UsageError(
            "Formatting multiple files to stdout is unsupported; pass --in-place (-i), or format one file at a time."
        )

    if output_file is not None:
        # Upstream reads the target and writes this path; naming the target
        # itself would truncate the file before it is read.
        for ledger_file in files:
            output.refuse_ledger_alias(output_file, ledger_file)

    status = launch.run_native("bean-format", [*alignment, *_destination(output_file), *(str(f) for f in files)])
    if status != 0:
        raise typer.Exit(status)
    if ctx.json_output and output_file is not None:
        output.emit(_wrote(len(files), output_file), target=target)


def _format_in_place(
    files: list[Path],
    alignment: list[str],
    target: dict[str, str],
    failed: dict[str, list[str]],
    missing: list[output.MissingInclude],
) -> None:
    # Unparseable files are skipped, not "formatted": upstream would echo them
    # back with a newline appended and call that a rewrite.
    formattable = [file for file in files if str(file) not in failed]
    before = {file: _text(file) for file in formattable}
    completed = (
        launch.capture_native("bean-format", [*alignment, "--in-place", *(str(f) for f in formattable)])
        if formattable
        else None
    )
    # Read back even after failure: upstream can rewrite earlier files before
    # encountering one it cannot write. Never invite a retry without that result.
    if completed is not None and completed.returncode == 0:
        for file in formattable:
            text = _text(file)
            fixed = _canonical_posting_indent(text)
            if fixed != text:
                file.write_text(fixed)
    changed = [str(file) for file in formattable if _text(file) != before[file]]
    result = _result(files, changed, failed, missing) | {"in_place": True}
    if completed is not None and completed.returncode != 0:
        diagnostic = (completed.stderr or "").strip()
        # An uncaught upstream exception ends with its type, reason, and path;
        # the stack itself belongs only in the --debug traceback field.
        reason = diagnostic.splitlines()[-1] if diagnostic else "No diagnostic was returned."
        raise LedgerError(
            f"bean-format could not finish in-place formatting (exit {completed.returncode}): {reason}",
            details=[f"formatted: {name}" for name in changed],
            result=result,
            traceback=diagnostic or None,
        )
    if failed or missing:
        raise LedgerError(
            _problems_message(len(changed), failed, missing) + " Nothing was written to the failed files.",
            details=[f"formatted: {name}" for name in changed] + _problem_lines(failed, missing),
            result=result,
        )
    if context.current().json_output:
        output.emit(result, target=target)
        return
    for name in changed:
        typer.echo(f"formatted: {name}")
    output.success(f"{len(changed)}/{len(files)} file(s) formatted.")


def _report(
    files: list[Path],
    alignment: list[str],
    target: dict[str, str],
    remedy: str,
    failed: dict[str, list[str]],
    missing: list[output.MissingInclude],
    *,
    check: bool,
    dry_run: bool,
) -> None:
    """Which files upstream would rewrite, without rewriting any of them."""
    ctx = context.current()
    changed = [str(f) for f in files if str(f) not in failed and _would_change(f, alignment)]
    result = _result(files, changed, failed, missing) | {"check": check, "dry_run": dry_run}

    if check and (changed or failed or missing):
        for name in changed:
            output.note(f"would format: {name}")
        for line in _problem_lines(failed, missing):
            output.note(line)
        raise LedgerError(_check_message(len(changed), failed, missing, remedy), result=result)
    if ctx.json_output:
        output.emit(result, target=target)
        return
    if not files:
        output.success("No .bean or .beancount files found.")
        return
    for name in changed:
        typer.echo(f"would format: {name}")
    for line in _problem_lines(failed, missing):
        typer.echo(line)
    if check:
        for file in files:
            typer.echo(f"checked: {file}")
        output.success(f"All {len(files)} file(s) are formatted.")
    else:
        output.success(f"Would format {len(changed)}/{len(files)} file(s) (dry run).")


def _problem_lines(failed: dict[str, list[str]], missing: list[output.MissingInclude]) -> list[str]:
    """One human line per file that could not be processed, naming each one."""
    lines = [f"cannot parse: {errors[0]}" for _, errors in sorted(failed.items()) if errors]
    lines.extend(f'missing include: "{item.include}" (included by {item.source})' for item in missing)
    return lines


def _check_message(
    changed_count: int, failed: dict[str, list[str]], missing: list[output.MissingInclude], remedy: str
) -> str:
    """What a failing `--check` reports: every problem class, each named."""
    if changed_count and not failed and not missing:
        return f"{changed_count} file(s) need formatting. Run {remedy} to apply."
    parts = []
    if changed_count:
        parts.append(f"{changed_count} file(s) need formatting")
    if failed:
        parts.append(f"{len(failed)} file(s) cannot be parsed")
    if missing:
        parts.append(f"{len(missing)} include(s) are missing")
    message = "; ".join(parts) + "."
    if changed_count:
        message += f" Run {remedy} to apply formatting."
    if failed or missing:
        message += " Fix the files above and re-run."
    return message


def _problems_message(formatted_count: int, failed: dict[str, list[str]], missing: list[output.MissingInclude]) -> str:
    """What a partial `-i` reports: what it did, and what it could not do."""
    parts = [f"{formatted_count} file(s) formatted"]
    if failed:
        parts.append(f"{len(failed)} file(s) cannot be parsed")
    if missing:
        parts.append(f"{len(missing)} include(s) are missing")
    return "; ".join(parts) + "."


def _remedy(named: list[Path], alignment: list[str]) -> str:
    """The command that clears a failing `--check`, ready to paste into a shell.

    It repeats the gate's own paths and alignment options: rewriting a narrower
    set of files, or at upstream's default widths, leaves the identical gate red.
    """
    return shlex.join(["bea", "format", "-i", *(str(path.expanduser().resolve()) for path in named), *alignment])


def _would_change(file: Path, alignment: list[str]) -> bool:
    """Whether upstream's output for `file` differs from what is on disk.

    Captured rather than streamed, because the answer is a comparison and not
    something to print. A formatter that fails is reported as a failure instead
    of being read as "already formatted".
    """
    completed = launch.capture_native("bean-format", [*alignment, str(file)])
    if completed.returncode != 0:
        raise BeaError(
            f"bean-format could not read {file} (exit {completed.returncode}).",
            details=[line for line in (completed.stderr or "").splitlines() if line.strip()][-20:],
        )
    return _canonical_posting_indent(completed.stdout) != _canonical_posting_indent(_text(file))


def _canonical_posting_indent(text: str) -> str:
    """Normalize tab / single-space posting indents to the usual two spaces.

    Upstream bean-format turns tabs into one ASCII space and then treats that
    as already formatted. Agents and docs use two spaces; rewrite leftover
    odd indents so --check stays honest.
    """
    import re

    lines: list[str] = []
    for line in text.splitlines(keepends=True):
        match = re.match(r"^([ \t]+)(.*)$", line)
        if match and match.group(1) != "  ":
            rest = match.group(2)
            if rest and not re.match(r"^\d{4}-\d{2}-\d{2}\b", rest):
                ending = "\n" if line.endswith("\n") else ""
                body = line[: -len(ending)] if ending else line
                lines.append("  " + body.lstrip(" \t") + ending)
                continue
        lines.append(line)
    return "".join(lines)


def _text(file: Path) -> str:
    """The file as the comparison sees it: text mode, so CRLF and LF read alike.

    Upstream writes LF, and a CRLF file is not "unformatted" for that reason
    alone — the alignment is what is being compared.
    """
    try:
        return file.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise LedgerError(f"Could not read {file} as UTF-8 text ({exc.reason}).") from exc
    except OSError as exc:
        raise LedgerError(f"Could not read {file}: {exc.strerror or exc}.") from exc


def _named(paths: list[Path] | None, default: Path | None) -> list[Path]:
    """The paths on the command line, or the global `--file` when none were given."""
    return [path for path in (paths or []) if str(path)] or ([default] if default is not None else [])


def _targets(
    paths: list[Path] | None, default: Path | None, *, expand_includes: bool
) -> tuple[list[Path] | None, list[output.MissingInclude]]:
    """The files to format, or None for upstream's stdin filter, plus missing includes.

    An explicit path wins; otherwise the global `--file` names the ledger. A
    bare `bea format` formats stdin, which is what `bean-format` does — it no
    longer walks the working directory, because walking it and then writing to
    stdout would concatenate a whole tree into one stream. An explicit `-` asks
    for that same filter by name, as it does in every other shell tool; reading
    it as a path would look for a file called `-` in the working directory.

    In the walk modes an explicitly named file stands for its include closure:
    every reachable ledger file joins the scan, and every include that
    resolves nowhere is reported. Directory walks keep their on-disk set —
    naming a directory must not rewrite files outside it.
    """
    named = _named(paths, default)
    if any(str(path) == STDIN for path in named):
        if len(named) > 1:
            raise UsageError(f"Read either stdin ('{STDIN}') or named files, not both.")
        return None, []
    if not named:
        return None, []

    files: set[Path] = set()
    missing: dict[tuple[str, Path], output.MissingInclude] = {}
    for path in named:
        resolved = path.expanduser().resolve()
        if not resolved.exists():
            raise UsageError(f"Formatting target does not exist: {resolved}")
        if resolved.is_dir():
            root = resolved
            for pattern in ("*.bean", "*.beancount"):
                for match in root.rglob(pattern):
                    if match.is_dir():
                        continue
                    if not match.is_file():
                        # A walked entry the scan cannot read is not one it may
                        # drop: naming the same path explicitly is an error, and
                        # a `--check` that skips it reports a tree it never
                        # looked at — green while `bea check` fails on the very
                        # include the entry stands for.
                        raise UsageError(_unreadable(match))
                    target = match.resolve()
                    try:
                        target.relative_to(root)
                    except ValueError:
                        # Outbound symlink: stay inside the requested directory tree.
                        continue
                    files.add(target)
        elif resolved.is_file():
            if resolved.suffix not in SUFFIXES:
                raise UsageError("Expected a .bean or .beancount file, or a directory.")
            files.add(resolved)
            if expand_includes:
                for member in output.ledger_closure(resolved):
                    if member.suffix in SUFFIXES:
                        files.add(member.resolve())
                for item in output.missing_includes(resolved):
                    missing[(item.include, item.source)] = item
        else:
            raise UsageError(f"Not a regular file or directory: {resolved}")
    if expand_includes:
        for file in sorted(files):
            for item in output.missing_includes(file):
                missing[(item.include, item.source)] = item
    return sorted(files), list(missing.values())


def _syntax_failures(files: list[Path]) -> dict[str, list[str]]:
    """The scanned files bean-format cannot parse, each with its syntax errors.

    One engine call for the whole set: parsing is Beancount's job and the
    frontend has none. A file with no errors is absent from the answer. Files
    are read as UTF-8 first, so an undecodable path raises the same error it
    always has instead of arriving as a parse failure.
    """
    for file in files:
        _text(file)
    data = launch.helper_json(["syntax", *(str(file) for file in files)])
    reported = data.get("files", {})
    failures: dict[str, list[str]] = {}
    for file in files:
        errors = [str(error) for error in reported.get(str(file), [])]
        if not errors:
            continue
        if len(errors) == 1 and errors[0].startswith(f"{file}: cannot read file"):
            _text(file)
            continue
        failures[str(file)] = errors
    return failures


# Upstream pads with spaces to these columns; unbounded values rewrite a ledger
# into hundreds of KiB of whitespace (w3/331). 200 is well above useful layouts.
_MAX_ALIGNMENT_WIDTH = 200


def _unreadable(path: Path) -> str:
    """Why a `*.bean` entry found by the directory walk could not be formatted."""
    if path.is_symlink():
        return (
            f"Formatting target does not exist: {path} → {path.readlink()}. "
            "Repair or remove the broken link; a directory scan cannot format what it cannot read."
        )
    return f"Not a regular file: {path}."


def _alignment(prefix_width: int | None, num_width: int | None, currency_column: int | None) -> list[str]:
    """Upstream's width options, forwarded as given once they are known to be usable.

    These are `bea`'s own declared options, so `bea` rejects a negative value:
    `bean-format` would turn it into a format specifier and die with a traceback.
    Values above `_MAX_ALIGNMENT_WIDTH` are refused so `-i` cannot bloat the file.
    """
    flags: list[str] = []
    for flag, short, value in (
        ("--prefix-width", "-w", prefix_width),
        ("--num-width", "-W", num_width),
        ("--currency-column", "-c", currency_column),
    ):
        if value is None:
            continue
        if value < 0:
            raise UsageError(f"{flag} ({short}) must be nonnegative; got {value}.")
        if value > _MAX_ALIGNMENT_WIDTH:
            raise UsageError(f"{flag} ({short}) must be at most {_MAX_ALIGNMENT_WIDTH}; got {value}.")
        flags += [flag, str(value)]
    return flags


def _destination(output_file: Path | None) -> list[str]:
    return ["--output", str(output_file)] if output_file is not None else []


def _require_json_destination(in_place: bool, output_file: Path | None) -> None:
    """Where the formatted ledger goes when stdout is already spoken for.

    In `--json` mode stdout carries the envelope and nothing else, so the text
    needs a destination named outright rather than one guessed here — including
    when that destination is upstream's `-`, which means the very stream the
    envelope owns.
    """
    if output_file is not None and str(output_file) == STDIN:
        raise UsageError(
            "In --json mode, --output - would mix formatted ledger text into the JSON on stdout. "
            "Name a file with --output FILE, or drop --json to write the text to stdout."
        )
    if not in_place and output_file is None:
        raise UsageError(
            "In --json mode, formatting needs an explicit destination: "
            "pass --in-place to rewrite the files, --output FILE, or --check/--dry-run to report instead."
        )


def _wrote(scanned: int, destination: Path) -> dict[str, object]:
    """What a successful `--output FILE` did: how much it read, and what it wrote."""
    return {"scanned": scanned, "output": str(destination.expanduser().resolve())}


def _result(
    files: list[Path],
    changed: list[str],
    failed: dict[str, list[str]],
    missing: list[output.MissingInclude],
) -> dict[str, object]:
    """The scanned set: how many files were walked, and what happened to each."""
    return {
        "scanned": len(files),
        "formatted": changed,
        "failed": [{"file": name, "errors": errors} for name, errors in sorted(failed.items())],
        "missing": [{"include": item.include, "from": str(item.source)} for item in missing],
    }


def _target(paths: list[Path] | None, files: list[Path]) -> dict[str, str]:
    named = [path for path in (paths or []) if str(path)]
    if len(named) == 1 and named[0].expanduser().resolve().is_dir():
        return {"directory": str(named[0].expanduser().resolve())}
    if len(files) == 1:
        return {"file": str(files[0])}
    return {"files": ", ".join(str(f) for f in files)}
