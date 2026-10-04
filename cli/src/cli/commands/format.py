"""`bea format` — upstream's aligner, run as a child process (ADR014 t004).

The engine uses upstream's text aligner, with Beancount's lexer identifying
posting indents and protecting multiline strings from whitespace edits. Every
destination uses that same transformation. The frontend expands directories
and reports what would change without writing it (`--check` for a pre-commit
hook, `--dry-run` for a look first).

Rewriting a file is `bea-engine format --in-place` rather than upstream's own
`--in-place`, because upstream truncates the file it was given. The engine runs
the same alignment on the bytes it read and replaces each target atomically
under the ledger lock, which is what makes `-i` safe to run beside another
`bea` write or to interrupt (w3/434, w3/435).

**Breaking change (ADR014).** Formatting used to rewrite the files it was given.
It now writes to stdout, like `bean-format`, and rewriting is `--in-place`.
Upstream's default is the safe one: a command that both reads a path and
silently rewrites it has no way to be tried out, and the old behavior could not
be recovered by any flag. `bea format -i .` is the old `bea format .`.
"""

from __future__ import annotations

import shlex
import sys
from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import BeaError, LedgerError, UsageError
from cli.utils import decode_error_message, single_line

SUFFIXES = {".bean", ".beancount"}
STDIN = "-"


def _require_output_file(path: Path) -> None:
    """Refuse -o when the path cannot become a fresh file."""
    output.check_output_destination(path)


def format_beans(
    paths: Annotated[
        list[Path] | None,
        typer.Argument(help="Ledger files, directories to expand recursively, or - for stdin (default: stdin)"),
    ] = None,
    in_place: Annotated[
        bool, typer.Option("--in-place", "-i", help="Rewrite each file instead of writing stdout")
    ] = False,
    output_file: Annotated[
        Path | None, typer.Option("--output", "-o", help="Write to this file instead of stdout", readable=False)
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
        _render(None, alignment, output_file)
        if ctx.json_output and output_file is not None:
            output.emit(_wrote(0, output_file), target={"stdin": STDIN})
        return

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
        if in_place:
            raise UsageError(
                "No .bean or .beancount files found to rewrite.",
                result=_result([], [], {}, []) | {"in_place": True},
            )
        if ctx.json_output:
            _require_json_destination(in_place, output_file)
        if output_file is not None:
            # Reporting the destination as written would vouch for whatever an
            # earlier run left there; nothing was read, so nothing is written.
            raise UsageError(
                f"No .bean or .beancount files found; nothing was written to {output_file}.",
                result=_result([], [], {}, []),
            )
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

    _render(files[0], alignment, output_file)
    if ctx.json_output and output_file is not None:
        output.emit(_wrote(len(files), output_file), target=target)


def _format_in_place(
    files: list[Path],
    alignment: list[str],
    target: dict[str, str | list[str]],
    failed: dict[str, list[str]],
    missing: list[output.MissingInclude],
) -> None:
    # Unparseable files are skipped, not "formatted": upstream would echo them
    # back with a newline appended and call that a rewrite.
    formattable = [file for file in files if str(file) not in failed]
    try:
        changed = _changed(formattable, alignment, in_place=True)
    except BeaError as exc:
        # Report even after a failure: the engine rewrites file by file and can
        # meet one it cannot write after replacing earlier ones. Never invite a
        # retry without saying which files are already done.
        if exc.result is None:
            # A lost response cannot establish even an empty formatted list.
            exc.details = _problem_lines(failed, missing) + exc.details
            raise
        progress = exc.result
        partial = [str(name) for name in progress.get("formatted", [])]
        write_failed = {
            str(item["file"]): [_file_reason(str(error), partial) for error in item["errors"]]
            for item in progress.get("failed", [])
        }
        details = [f"formatted: {name}" for name in partial] + _problem_lines(failed, missing)
        details.extend(f"failed: {name}: {errors[0]}" for name, errors in write_failed.items() if errors)
        result = _result(files, partial, failed | write_failed, missing) | {"in_place": True}
        # A missing engine result can mean an unknown write outcome. Only
        # publish these classifications when the engine actually reported them.
        for key, label in (("unchanged", "unchanged"), ("not_attempted", "not attempted")):
            if key in progress:
                names = [str(name) for name in progress[key]]
                result[key] = names
                details.extend(f"{label}: {name}" for name in names)
        exc.details = details + [_file_reason(detail, partial) for detail in exc.details]
        exc.result = result
        if partial:
            # The engine's message describes the one file it stopped on; after
            # earlier rewrites, "nothing was written" would misreport the run.
            exc.args = (_partial_message(len(partial), write_failed, failed, missing, progress),)
        raise
    result = _result(files, changed, failed, missing) | {"in_place": True}
    if failed or missing:
        completed = set(changed)
        unchanged = [str(file) for file in formattable if str(file) not in completed]
        result.update(unchanged=unchanged, not_attempted=[])
        raise LedgerError(
            _problems_message(len(changed), failed, missing) + " Nothing was written to the failed files.",
            details=(
                [f"formatted: {name}" for name in changed]
                + [f"unchanged: {name}" for name in unchanged]
                + _problem_lines(failed, missing)
            ),
            result=result,
        )
    if context.current().json_output:
        output.emit(result, target=target)
        return
    for name in changed:
        typer.echo(single_line(f"formatted: {name}"))
    output.success(f"{len(changed)}/{len(files)} file(s) formatted.")


def _report(
    files: list[Path],
    alignment: list[str],
    target: dict[str, str | list[str]],
    remedy: str,
    failed: dict[str, list[str]],
    missing: list[output.MissingInclude],
    *,
    check: bool,
    dry_run: bool,
) -> None:
    """Which files upstream would rewrite, without rewriting any of them."""
    ctx = context.current()
    changed = _changed([file for file in files if str(file) not in failed], alignment, in_place=False)
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
    # File names and parse errors are ledger-controlled text (w1/134).
    for name in changed:
        typer.echo(single_line(f"would format: {name}"))
    for line in _problem_lines(failed, missing):
        typer.echo(single_line(line))
    if check:
        for file in files:
            typer.echo(single_line(f"checked: {file}"))
        output.success(f"All {len(files)} file(s) are formatted.")
    else:
        output.success(f"Would format {len(changed)}/{len(files)} file(s) (dry run).")


def _file_reason(reason: str, partial: list[str]) -> str:
    """A per-file write failure, worded for that file once other files were rewritten."""
    return reason.replace("nothing was written", "this file was not changed") if partial else reason


def _partial_message(
    formatted_count: int,
    write_failed: dict[str, list[str]],
    failed: dict[str, list[str]],
    missing: list[output.MissingInclude],
    progress: dict[str, object],
) -> str:
    """The headline of an `-i` run the engine stopped after rewriting some files."""
    parts = [f"{formatted_count} file(s) formatted"]
    if write_failed:
        parts.append(f"{len(write_failed)} file(s) could not be written")
    parts.extend(_problem_parts(failed, missing))
    not_attempted = progress.get("not_attempted")
    if isinstance(not_attempted, list) and not_attempted:
        parts.append(f"{len(not_attempted)} file(s) not attempted")
    return "; ".join(parts) + ". Each file is listed below; fix the failures and re-run."


def _problem_lines(failed: dict[str, list[str]], missing: list[output.MissingInclude]) -> list[str]:
    """One human line per file that could not be processed, naming each one."""
    lines = [f"cannot parse: {errors[0]}" for _, errors in sorted(failed.items()) if errors]
    lines.extend(f'missing include: "{item.include}" (included by {item.source})' for item in missing)
    return lines


def _problem_parts(failed: dict[str, list[str]], missing: list[output.MissingInclude]) -> list[str]:
    """The unparseable-file and missing-include tallies, shared by both reporters."""
    parts = []
    if failed:
        parts.append(f"{len(failed)} file(s) cannot be parsed")
    if missing:
        parts.append(f"{len(missing)} include(s) are missing")
    return parts


def _check_message(
    changed_count: int, failed: dict[str, list[str]], missing: list[output.MissingInclude], remedy: str
) -> str:
    """What a failing `--check` reports: every problem class, each named."""
    if changed_count and not failed and not missing:
        return f"{changed_count} file(s) need formatting. Run {remedy} to apply."
    parts = []
    if changed_count:
        parts.append(f"{changed_count} file(s) need formatting")
    parts.extend(_problem_parts(failed, missing))
    message = "; ".join(parts) + "."
    if changed_count:
        message += f" Run {remedy} to apply formatting."
    if failed or missing:
        message += " Fix the files above and re-run."
    return message


def _problems_message(formatted_count: int, failed: dict[str, list[str]], missing: list[output.MissingInclude]) -> str:
    """What a partial `-i` reports: what it did, and what it could not do."""
    parts = [f"{formatted_count} file(s) formatted", *_problem_parts(failed, missing)]
    return "; ".join(parts) + "."


def _remedy(named: list[Path], alignment: list[str]) -> str:
    """The command that clears a failing `--check`, ready to paste into a shell.

    It repeats the gate's own paths and alignment options: rewriting a narrower
    set of files, or at upstream's default widths, leaves the identical gate red.
    """
    return shlex.join(["bea", "format", "-i", *(str(path.expanduser().resolve()) for path in named), *alignment])


def _changed(files: list[Path], alignment: list[str], *, in_place: bool) -> list[str]:
    """Which of `files` alignment would rewrite — or, with `in_place`, did rewrite.

    One engine call answers both, so the report and the rewrite can never
    disagree about what would change. The rewrite itself belongs there too:
    `bea-engine format --in-place` takes the same ledger lock every other writer
    takes and replaces each file atomically from a staged candidate, which is
    what upstream's own `--in-place` cannot do (w3/434, w3/435).
    """
    if not files:
        return []
    flag = ["--in-place"] if in_place else []
    data = launch.helper_json(["format", *flag, *alignment, *(str(file) for file in files)], writes=in_place)
    return [str(name) for name in data.get("changed", [])]


def _text(file: Path) -> str:
    """The file as the alignment comparison sees it: CRLF and LF read alike.

    Endings themselves are answered from bytes before this is reached (any
    carriage return means `-i` would rewrite the file); here only the
    alignment is being compared.
    """
    try:
        return file.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise LedgerError(decode_error_message(file, exc)) from exc
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
    if not paths and default is not None and default.expanduser().is_dir():
        directory = default.expanduser().resolve()
        raise UsageError(
            f"Ledger path '{directory}' (from --file) is a directory; expected a ledger file. "
            f"To format this directory, run bea format -i {shlex.quote(str(directory))}."
        )
    if any(str(path) == STDIN for path in named):
        if len(named) > 1:
            raise UsageError(f"Read either stdin ('{STDIN}') or named files, not both.")
        return None, []
    if not named:
        return None, []

    files: set[Path] = set()
    roots: list[Path] = []
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
                        if _editor_lock(match):
                            continue
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
            roots.append(resolved)
        else:
            raise UsageError(f"Not a regular file or directory: {resolved}")
    if not expand_includes:
        return sorted(files), []
    # Every member, whatever its suffix: `SUFFIXES` says which files a
    # directory walk treats as ledgers, but an `include` already made
    # `entries.inc` part of this ledger (w1/041). One shared walk per set of
    # roots — never one per file, which is quadratic on a long chain (w1/087).
    members, _ = output.walk_closure(*roots)
    files.update(member.resolve() for member in members)
    missing: dict[tuple[str, Path], output.MissingInclude] = {}
    for item in output.walk_closure(*sorted(files))[1]:
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


def _editor_lock(path: Path) -> bool:
    """A dangling `.#name` link: the lock Emacs keeps beside a file with unsaved edits.

    It points at `user@host.pid:boot`, never at a file, and no ledger includes
    it. Failing the walk on it would make a pre-commit gate demand deleting
    the editor's edit-collision guard (w1/102).
    """
    return path.name.startswith(".#") and path.is_symlink() and not path.exists()


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


def _render(file: Path | None, alignment: list[str], destination: Path | None) -> None:
    """Keep every output mode on the engine's single formatting transformation."""
    data = launch.helper_json(
        ["format", "--render", *alignment, str(file) if file is not None else STDIN],
        stdin=_stdin_text() if file is None else None,
    )
    text = str(data["text"])
    if destination is None or str(destination) == STDIN:
        sys.stdout.write(text)
    else:
        destination.write_text(text, encoding="utf-8")


def _stdin_text() -> str:
    """Piped ledger text, held to the same UTF-8 rule as a named file (w1/166).

    Text-mode stdin decodes with surrogateescape, which lets an invalid byte
    through as a lone surrogate that only fails later, as an "encode" error
    naming neither the input nor the remedy.
    """
    stream = getattr(sys.stdin, "buffer", None)
    if stream is None:
        return sys.stdin.read()
    try:
        return bytes(stream.read()).decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise LedgerError(decode_error_message("stdin", exc)) from exc


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


def _target(paths: list[Path] | None, files: list[Path]) -> dict[str, str | list[str]]:
    named = [path for path in (paths or []) if str(path)]
    if len(named) == 1 and named[0].expanduser().resolve().is_dir():
        return {"directory": str(named[0].expanduser().resolve())}
    if len(files) == 1:
        return {"file": str(files[0])}
    return {"files": [str(file) for file in files]}
