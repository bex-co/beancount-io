"""`bea ingest` — run the user's Beangulp ingest script through the engine.

Identify, extract, and archive stay in Beangulp's own CLI (the script that
builds `Ingest(importers, hooks=...)`). This module only picks the engine
interpreter, requires `bea engine enable beangulp`, and forwards the subcommand.
`bea import` remains the review/apply workflow and is unchanged.
"""

from __future__ import annotations

import ast
import os
import re
import shlex
import unicodedata
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError, placement_hint, refuse_json
from cli.native_command import ForwardingCommand
from cli.native_help import native_help
from cli.paths import expand_path

_EXTRA = {"allow_extra_args": True, "ignore_unknown_options": True}
_CONFIG = Annotated[
    Path | None,
    typer.Option("--config", help="Ingest script (defaults to ingest.py beside the ledger or cwd)"),
]

ingest_app = typer.Typer(
    name="ingest",
    help=("Run Beangulp identify/extract/archive via your ingest script.\n\nRequires 'bea engine enable beangulp'."),
    no_args_is_help=True,
)


def _ingest_script(supplied: Path | None) -> Path:
    """Locate the user's ingest script: --config, else ingest.py beside the ledger or cwd.

    Made absolute without following links: Beangulp files `archive` documents
    beside the script path it was started with, so a symlinked `ingest.py`
    must stay the link, not become the shared script it points to.
    """
    if supplied is not None:
        script = expand_path(supplied, "--config").absolute()
        # Before anything opens it: reading a pipe nobody feeds waits forever (w5/885).
        if script.exists() and not script.is_file():
            raise UsageError(f"--config {script} is not a regular file. Save the ingest script as a Python file.")
        return script
    try:
        ledger = context.current().entry_file()
    except UsageError:
        ledger = None
    candidates: list[Path] = []
    if ledger is not None:
        candidates.append(ledger.parent / "ingest.py")
    candidates.append(Path.cwd() / "ingest.py")
    for candidate in candidates:
        if candidate.is_file():
            return candidate.absolute()
    raise UsageError(
        "Choose an ingest script with --config FILE, or place ingest.py beside the root ledger "
        "(or in the current directory). The script should call beangulp.Ingest(...)()."
    )


#: Beangulp `extract`'s boolean short flags (`--reverse`, `--failfast`,
#: `--quiet`). Click lets them cluster in front of `-o`/`-e`, so `-qo X` names
#: a destination exactly as `-o X` does (w1/141).
_EXTRACT_FLAGS = "rxq"


def _forward(operation: str, ctx: typer.Context, config: Path | None) -> None:
    refuse_json("ingest", hint="Run without --json for native output; use bea import for a JSON preview.")
    existing = (
        output.forwarded_option(list(ctx.args), "-e", "--existing", flags=_EXTRACT_FLAGS)
        if operation == "extract"
        else None
    )
    placed = {"ledger": os.path.abspath(expand_path(Path(existing), "--existing"))} if existing else {}
    if placed:
        # Before any output guard walks the closure: a FIFO must not be read,
        # and a directory cannot supply existing transactions (w5/706).
        _require_existing_ledger(Path(placed["ledger"]))
    if operation == "extract":
        # `archive -o DIR` moves source documents into a directory tree — not a
        # ledger write — so it stays outside the guard on purpose, and
        # `identify` writes nothing at all.
        destination = output.forwarded_option(list(ctx.args), "-o", "--output", flags=_EXTRACT_FLAGS)
        if destination is not None and destination != "-":
            output.guard_forwarded_output(list(ctx.args), _extract_ledgers(ctx), flags=_EXTRACT_FLAGS)
            path = expand_path(Path(destination), "--output").absolute()
            output.check_output_destination(path)
            output.require_writable_destination(path)
    script = _ingest_script(config)
    if operation == "extract":
        _refuse_output_over_inputs(list(ctx.args), script)
    _refuse_config_only_script(script)
    if placed and output.has_unreadable_include(Path(placed["ledger"])):
        # Beangulp loads `-e` with Beancount, which answers an include it
        # cannot open with a traceback; the helper names it (w5/120, w5/438).
        launch.helper_json(["check", "--file", placed["ledger"]])
    if placed:
        _refuse_noncanonical_existing(Path(placed["ledger"]))
    code = launch.run_optional_script("beangulp", script, [operation, *ctx.args], **placed)
    raise typer.Exit(code)


def _require_existing_ledger(path: Path) -> None:
    """Require a root ledger before any include walk or user script runs."""
    if path.is_dir():
        from cli.config import DEFAULT_ENTRY_FILE_FALLBACKS

        hint = next(
            (path / name for name in DEFAULT_ENTRY_FILE_FALLBACKS if (path / name).is_file()),
            path / DEFAULT_ENTRY_FILE_FALLBACKS[0],
        )
        raise UsageError(
            f"--existing {path} is a directory; expected a root ledger file. "
            f"Pass --existing {shlex.quote(str(hint))}. Nothing was extracted."
        )
    if not path.is_file():
        raise UsageError(f"--existing {path} is not a regular ledger file. Name its root file. Nothing was extracted.")


def _refuse_noncanonical_existing(root: Path) -> None:
    """Do not let Beangulp silently deduplicate against a misread ledger.

    The user's script loads `-e` through stock Beancount, outside the helper's
    BOM/NFC compatibility layer. Refuse before running it or opening `-o`;
    importing the script here could itself extract or archive documents.
    """
    for member in output.ledger_closure(root):
        if output.is_encrypted(member):
            continue
        try:
            raw = member.read_bytes()
        except OSError:
            continue  # Existing unreadable-include handling and native errors still apply.
        if raw.startswith(b"\xef\xbb\xbf"):
            remedy = shlex.join(["bea", "format", "-i", str(member)])
            raise UsageError(
                f"Existing ledger file {member} starts with a UTF-8 BOM, which Beangulp cannot read reliably "
                f"for duplicate detection. Run {remedy} to strip the mark, then retry. Nothing was extracted."
            )
        if not unicodedata.is_normalized("NFC", raw.decode("utf-8", errors="surrogateescape")):
            raise UsageError(
                f"Existing ledger file {member} is not Unicode NFC. Beangulp reads it without bea's "
                "normalization, so duplicate detection may miss entries. Re-save that file in Unicode NFC, "
                "then retry; 'bea format -i' does not normalize Unicode. Nothing was extracted."
            )


def _extract_ledgers(ctx: typer.Context) -> list[Path]:
    """The ledgers an `extract` must never write over: `bea --file`, and Beangulp's `-e`.

    Both are read by the run, so both are destinations that would destroy the
    books being extracted against.
    """
    ledgers: list[Path] = []
    try:
        ledgers.append(context.current().entry_file())
    except UsageError:
        pass
    existing = output.forwarded_option(list(ctx.args), "-e", "--existing", flags=_EXTRACT_FLAGS)
    if existing is not None:
        ledgers.append(expand_path(Path(existing), "--existing"))
    return ledgers


def _refuse_output_over_inputs(args: list[str], script: Path) -> None:
    """Refuse an extract destination that is a source document or the ingest script.

    Beangulp opens `-o` for writing once extraction is done, so a destination
    that is one of the run's own inputs replaced the bank export — the only
    evidence for the extracted entries — or the script, and exited 0. Compared
    by identity, so a symlink or hard link to an input counts, and a source
    directory covers every file Beangulp would walk inside it.
    """
    value = output.forwarded_option(args, "-o", "--output", flags=_EXTRACT_FLAGS)
    if value is None or value == "-":
        return
    destination = expand_path(Path(value), "--output")
    if not destination.exists():
        return  # Nothing there to lose; `-o -` and a fresh file pass through.
    output.refuse_input_alias(destination, script)
    for source in _positional_sources(args):
        if source.is_dir():
            for directory, _, names in os.walk(source):
                for name in names:
                    output.refuse_input_alias(destination, Path(directory, name))
        else:
            output.refuse_input_alias(destination, source)


def _positional_sources(args: list[str]) -> list[Path]:
    """Every forwarded argument that may be a source document or directory.

    Read generously: an option's value is harmless to include — it is either
    the ledger, already refused, or not a file the destination could alias —
    while a source mistaken for an option value would escape the guard. Only
    the destination itself is left out, in the spellings `forwarded_option`
    reads.
    """
    sources: list[Path] = []
    index = 0
    while index < len(args):
        arg = args[index]
        if arg == "--":
            sources.extend(expand_path(Path(rest), "ingest source") for rest in args[index + 1 :])
            break
        if arg == "--output" or re.fullmatch(rf"-[{_EXTRACT_FLAGS}]*o", arg):
            index += 2
            continue
        if not arg.startswith("-"):
            sources.append(expand_path(Path(arg), "ingest source"))
        index += 1
    return sources


def _refuse_config_only_script(script: Path) -> None:
    """Refuse an import CONFIG module, which would otherwise exit 0 silently.

    A `CONFIG = [...]` module loads, ignores argv, and exits 0 with empty
    output — indistinguishable from success. That shape belongs to
    `bea import --config`; `bea ingest` needs a script whose `__main__`
    calls the Beangulp entrypoint. Anything else passes through untouched:
    only the known-silent shape is refused.

    The shape is read from the syntax tree, not the spelling: an annotated
    `CONFIG: list = [...]` is the same module, and a script with a `__main__`
    block runs something even when the `Ingest` call sits in a module it
    imports. `CONFIG` bound by an import or inside `try`/`if`/`with` is the
    same module too, and an `Ingest(` in a comment or a docstring calls
    nothing (w5/635). A file Python cannot parse is left for Python to report.

    Read as Python reads it — bytes, so a UTF-8 BOM or an encoding cookie
    parses — and `from helpers import *` binds whatever a sibling
    `helpers.py` binds. Only an entrypoint that runs counts: one constructed
    and never called, or called only inside a function nothing calls, is the
    same silent exit, while an import alias such as `Ingest as Main` still
    names it (w5/851).
    """
    tree = _parsed(script)
    if tree is None:
        return
    statements = list(_module_statements(tree.body))
    if any(_is_main_guard(node) for node in statements) or _runs_ingest(tree, statements):
        return
    if any(_binds_config(node, script.parent) for node in statements):
        raise UsageError(
            f"{script} looks like a `bea import --config` module (CONFIG = [...]). "
            "`bea ingest` needs a script that calls beangulp.Ingest(...)(); "
            "run `bea import --config` for this file instead."
        )


def _parsed(script: Path) -> ast.Module | None:
    """The module's syntax tree, read from its bytes as Python reads them, or None when it does not parse."""
    try:
        return ast.parse(script.read_bytes())
    except (OSError, SyntaxError, ValueError):
        return None


def _runs_ingest(tree: ast.Module, statements: list[ast.stmt]) -> bool:
    """Whether the Beangulp entrypoint is called as the module loads, directly or through a function it calls.

    A construction alone — the bare statement `Ingest(CONFIG)` — runs nothing;
    one called, assigned, passed or returned is taken as used.
    """
    names = {"Ingest"} | {
        alias.asname
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom)
        for alias in node.names
        if alias.name == "Ingest" and alias.asname
    }
    running: list[ast.AST] = [node for node in statements if not isinstance(node, _SCOPES)]
    called = {
        node.func.id
        for scope in running
        for node in _running_nodes(scope)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
    }
    running += [node for node in statements if isinstance(node, _SCOPES[:2]) and node.name in called]
    nodes = [node for scope in running for node in _running_nodes(scope)]
    bare = {id(node.value) for node in nodes if isinstance(node, ast.Expr)}
    return any(_constructs_ingest(node, names) and id(node) not in bare for node in nodes)


_SCOPES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)


def _running_nodes(node: ast.AST) -> Iterator[ast.AST]:
    """`ast.walk` over code that runs with `node`, not into a nested function or class body."""
    yield node
    for child in ast.iter_child_nodes(node):
        if not isinstance(child, _SCOPES):
            yield from _running_nodes(child)


def _constructs_ingest(node: ast.AST, names: set[str]) -> bool:
    """Whether a node constructs the entrypoint: `Ingest(...)`, `beangulp.Ingest(...)` or an alias's call."""
    if not isinstance(node, ast.Call):
        return False
    func = node.func
    return (isinstance(func, ast.Name) and func.id in names) or (
        isinstance(func, ast.Attribute) and func.attr == "Ingest"
    )


def _module_statements(body: list[ast.stmt]) -> Iterator[ast.stmt]:
    """The statements that run when the module loads, inside compound statements too, not in a def or class."""
    for node in body:
        yield node
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef):
            continue
        for field in ("body", "orelse", "finalbody"):
            yield from _module_statements(getattr(node, field, None) or [])
        for handler in getattr(node, "handlers", None) or []:
            yield from _module_statements(handler.body)
        for case in getattr(node, "cases", None) or []:
            yield from _module_statements(case.body)


def _binds_config(node: ast.stmt, directory: Path, depth: int = 0) -> bool:
    """Whether a statement binds `CONFIG`: assigned, annotated, or imported under that name.

    `from helpers import *` binds it when the sibling module it names does.
    """
    if isinstance(node, ast.ImportFrom) and node.level == 0 and node.module and depth < 3:
        if any(alias.name == "*" for alias in node.names):
            parts = node.module.split(".")
            for candidate in (directory.joinpath(*parts).with_suffix(".py"), directory.joinpath(*parts, "__init__.py")):
                tree = _parsed(candidate) if candidate.is_file() else None
                if tree is not None and any(
                    _binds_config(child, candidate.parent, depth + 1) for child in _module_statements(tree.body)
                ):
                    return True
    if isinstance(node, ast.Import | ast.ImportFrom):
        return any((alias.asname or alias.name) == "CONFIG" for alias in node.names)
    if isinstance(node, ast.Assign):
        targets = node.targets
    elif isinstance(node, ast.AnnAssign) and node.value is not None:
        targets = [node.target]
    else:
        return False
    return any(
        isinstance(name, ast.Name) and isinstance(name.ctx, ast.Store) and name.id == "CONFIG"
        for target in targets
        for name in ast.walk(target)
    )


def _is_main_guard(node: ast.stmt) -> bool:
    """Whether a statement is `if __name__ == "__main__":`, either way round."""
    if not isinstance(node, ast.If) or not isinstance(node.test, ast.Compare):
        return False
    operands = [node.test.left, *node.test.comparators]
    return any(isinstance(operand, ast.Name) and operand.id == "__name__" for operand in operands) and any(
        isinstance(operand, ast.Constant) and operand.value == "__main__" for operand in operands
    )


@ingest_app.command("identify", cls=ForwardingCommand, epilog=native_help("ingest identify"), context_settings=_EXTRA)
def identify(ctx: typer.Context, config: _CONFIG = None) -> None:
    """Identify which importer matches each document."""
    _forward("identify", ctx, config)


@ingest_app.command("extract", cls=ForwardingCommand, epilog=native_help("ingest extract"), context_settings=_EXTRA)
def extract(ctx: typer.Context, config: _CONFIG = None) -> None:
    """Extract raw entries from documents.

    The Beangulp extract step. This is not bea import --apply.

    With the pinned Beangulp 0.2.0, --reverse (-r) is accepted but ignored:
    entries are still written oldest first. bea forwards the flag unchanged.
    For newest-first output, override sort in your importer:

    \b
    def sort(self, entries, reverse=False):
        return super().sort(entries, reverse=True)
    """
    _forward("extract", ctx, config)


@ingest_app.command("archive", cls=ForwardingCommand, epilog=native_help("ingest archive"), context_settings=_EXTRA)
def archive(ctx: typer.Context, config: _CONFIG = None) -> None:
    """File documents into the archive hierarchy (Beangulp archive)."""
    _refuse_ledger_after_overwrite(list(ctx.args))
    _forward("archive", ctx, config)


def _refuse_ledger_after_overwrite(args: list[str]) -> None:
    """`-f` after `ingest archive` is Beangulp's `--overwrite`, not bea's ledger.

    `bea ingest archive … -f main.bean` replaced documents already filed and
    offered the ledger as one more source to archive, with exit 0 (w5/413).
    """
    for index, arg in enumerate(args[:-1]):
        if arg == "--":
            return
        following = args[index + 1]
        if arg in ("-f", "--overwrite") and following.endswith((".bean", ".beancount")):
            raise UsageError(
                f"{arg} after ingest archive is Beangulp's --overwrite, which replaces documents already filed, "
                f"and {following} would be archived as a source. {placement_hint('-f')} Nothing was changed."
            )
