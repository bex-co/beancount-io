"""Beancount.io CLI entry point — the `bea` command."""

from __future__ import annotations

import errno
import os
import sys
from pathlib import Path
from typing import Annotated, Any, NoReturn

import typer
from typer._click.exceptions import NoArgsIsHelpError
from typer.core import TyperGroup

from cli import context, output, update
from cli.commands.add import add_app
from cli.commands.ask import ask
from cli.commands.check import check
from cli.commands.cloud.app import cloud_app
from cli.commands.doctor import doctor_app
from cli.commands.engine import engine_app
from cli.commands.example import example
from cli.commands.format import format_beans
from cli.commands.import_ import import_entries
from cli.commands.ingest import ingest_app
from cli.commands.init import init
from cli.commands.list import list_app
from cli.commands.price import PriceCommand, price
from cli.commands.query import query
from cli.commands.report import balance, report_app
from cli.commands.treeify import treeify
from cli.commands.update import update_app
from cli.commands.upgrade import current_channel, upgrade
from cli.completion import complete_shell
from cli.completion import install as install_completion_callback
from cli.completion import show as show_completion_callback
from cli.config import config_dir
from cli.errors import BeaError
from cli.native_command import ForwardingCommand
from cli.native_help import native_help
from cli.single_value import SingleValueCommand, single_value_parser


def _discard_diagnostics_without_stderr() -> None:
    """With fd 2 closed, send diagnostics to devnull rather than into stdout.

    `2>&-` leaves `sys.stderr` None, and `print(..., file=None)` falls back to
    stdout: tolerated loader errors were written into a `query -f csv` export
    and after a `--json` envelope, with exit 0, and every error message landed
    in the results (w5/308). A descriptor at devnull also keeps an engine
    child, which inherits fd 2, from doing the same.
    """
    if sys.stderr is not None:
        return
    try:
        devnull = os.open(os.devnull, os.O_WRONLY)
        if devnull != 2:
            os.dup2(devnull, 2)
            os.close(devnull)
        else:
            # `os.open` hands back the free fd 2 itself, non-inheritable
            # (PEP 446), so every child bea spawns started without fd 2: its
            # errors fell back to stdout with exit 0, and the query shell's
            # `input()` looped on `lost sys.stderr` (w5/583).
            os.set_inheritable(2, True)
        sys.stderr = open(2, "w", errors="backslashreplace", closefd=False)  # noqa: SIM115 - lives as sys.stderr
    except OSError:
        pass


def _empty_stdin_when_closed() -> None:
    """With fd 0 closed, read stdin as empty rather than failing on `None`.

    `<&-` (a CI runner, a daemon) leaves `sys.stdin` None: `query`, `format -`
    and `add transactions --from -` exited 1 with `'NoneType' object has no
    attribute 'isatty'` or `'read'`, and treeify's child started with no fd 0
    (w5/584). Devnull at fd 0, inheritable, gives every command and child the
    empty input `</dev/null` already gets.
    """
    if sys.stdin is not None:
        return
    try:
        devnull = os.open(os.devnull, os.O_RDONLY)
        if devnull != 0:
            os.dup2(devnull, 0)
            os.close(devnull)
        else:
            os.set_inheritable(0, True)
        sys.stdin = open(0, errors="surrogateescape", closefd=False)  # noqa: SIM115 - lives as sys.stdin
    except OSError:
        pass


def _tolerate_unencodable_output() -> None:
    """Escape what the terminal's encoding cannot show instead of failing on it.

    stdout is strict by default, so under an ASCII or cp1252 locale a write
    that had already landed reported `'ascii' codec can't encode …` and exit 1
    when its confirmation named a non-ASCII path — and a retry wrote the entry
    again. Output is a report of what happened; it must never undo exit 0.
    """
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(errors="backslashreplace")
        except (OSError, ValueError):  # A detached or already-closed stream.
            pass


def _settle_stdout() -> None:
    """Push the last of stdout out while a closed reader is still catchable.

    Piped stdout is block-buffered, so `bea list … | head` usually succeeds at
    every write and only fails when CPython flushes on the way out. That flush
    happens after every handler here has been unwound: it prints `Exception
    ignored on flushing sys.stdout` and replaces the exit code with 120. Doing
    the flush inside the guard turns that into a `BrokenPipeError` we can still
    answer for.

    With fd 1 closed (`>&-`) Python sets `sys.stdout` to None and every print
    already went nowhere; there is nothing to settle, and failing here turned
    a write that had landed into exit 1.
    """
    if sys.stdout is None:
        return
    sys.stdout.flush()


def _exit_on_broken_pipe() -> NoReturn:
    """Leave the way a Unix filter does when its reader goes away: 141, silent.

    `USAGE.md` promises `bea … | head` exits 141 without a message, but Python
    ignores SIGPIPE, so the frontend's own writes raise `BrokenPipeError` and
    landed in the generic handler as a reported failure. Exiting is not enough
    on its own — stdout is still broken and still holds buffered bytes, so the
    shutdown flush would fail in turn and force 120. Pointing the file
    descriptor at devnull gives that flush somewhere harmless to go.
    """
    # Both streams: the broken one may be stderr's, under `2>&1 | head` (w5/522).
    output.silence_broken_streams()
    sys.exit(141)


#: What a full disk, a quota, a size limit or a failing device says to a write.
_OUTPUT_ERRNOS = frozenset({errno.EFBIG, errno.ENOSPC, errno.EDQUOT, errno.EIO})


def _output_failed(exc: BaseException) -> bool:
    """Whether `exc` is stdout refusing a write, rather than a failure of the command itself.

    Ledger and `-o` writes report these in their own words before they get
    here (w5/410), so one that arrives raw is the output stream's.
    """
    return isinstance(exc, OSError) and not isinstance(exc, BrokenPipeError) and exc.errno in _OUTPUT_ERRNOS


def _exit_on_output_failure(exc: OSError) -> NoReturn:
    """Leave with exit 1 and bea's sentence when stdout cannot take the output.

    The raw `[Errno 27] File too large` was reported, and the bytes still
    buffered failed again at the shutdown flush: CPython printed `Exception
    ignored on flushing sys.stdout` and exited with the undocumented 120
    (w5/407). As on a broken pipe, the descriptor goes to devnull first.
    """
    try:
        devnull = os.open(os.devnull, os.O_WRONLY)
        os.dup2(devnull, sys.stdout.fileno())
    except (OSError, ValueError, AttributeError):
        pass
    output.error(BeaError(f"Could not write output: {exc.strerror or type(exc).__name__}."))


def _exit_on_interrupt() -> NoReturn:
    """Leave the way a shell expects after Ctrl-C: 130, silent.

    The sibling of `_exit_on_broken_pipe`. `USAGE.md` carves out exactly two
    signals that mean the run was ended on purpose — Ctrl-C exits 130 and a
    closed pipe exits 141, both without a message — and a script needs that to
    tell a deliberate stop from a genuine failure. A mid-computation Ctrl-C and
    `bea query`'s interactive shell already complied; a Typer prompt did not,
    because `click` turns the `KeyboardInterrupt` into `Abort` and its own
    top-level handler prints `Aborted!` and exits 1.

    Silent means silent: no warning flush on the way out, because the contract
    promises no message. Nothing is half-written either — a prompt aborts
    before any command does work.

    `Abort` covers an EOF at a prompt as well, which `click` raises the same
    way and does not let us tell apart. That is the same "the user ended it"
    case, and no `bea` prompt uses `abort=True`, so an `Abort` reaching here
    is always an interrupted prompt rather than a declined confirmation — a
    declined confirmation returns `False` and the caller reports it.
    """
    sys.exit(130)


def _refuse_empty_paths(command: Any) -> None:
    """Make every path parameter under `command` refuse `''` instead of reading `.`.

    Typer turns `''` into `Path('')`, the working directory, so an unset
    variable in a script reached commands as `.`: `format -i ''` reformatted
    the ledgers under the cwd and `init ''` initialized it, with exit 0
    (w5/387). Each `TyperPath` becomes a subclass whose `convert` first runs
    the shared empty-value refusal, so a new path option is covered too.
    """
    from typer.models import TyperPath

    from cli.utils import refuse_empty_path

    for param in command.params:
        kind = type(param.type)
        if isinstance(param.type, TyperPath) and not getattr(kind, "_refuses_empty", False):

            def convert(self: Any, value: Any, param: Any, ctx: Any, *, _super: Any = kind) -> Any:
                refuse_empty_path(value, param)
                return _super.convert(self, value, param, ctx)

            param.type.__class__ = type(kind.__name__, (kind,), {"convert": convert, "_refuses_empty": True})
    for sub in getattr(command, "commands", {}).values():
        _refuse_empty_paths(sub)


class _GuardedGroup(TyperGroup):
    """Turn anything a command raises into the documented category and exit code.

    The failure contract belongs at the one point every command passes through.
    Pasted into each command body it would be optional, and a command whose
    author forgot it would exit with a traceback on stdout — off-contract in
    both shape and status, which is exactly what `--json` callers cannot parse.
    Click nests subcommand dispatch inside the root group's `invoke`, so this
    covers the mounted sub-apps too.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        from typer.completion import get_completion_inspect_parameters

        # Custom completion flags still need Typer's shell protocol handlers.
        get_completion_inspect_parameters()
        super().__init__(*args, **kwargs)
        _refuse_empty_paths(self)

    # `ctx` is typer's vendored click Context; typed loosely to avoid importing
    # a private module just to restate the supertype's annotation.
    def parse_args(self, ctx: Any, args: list[str]) -> list[str]:
        _discard_diagnostics_without_stderr()
        _empty_stdin_when_closed()
        # Parse global switches before command resolution can fail. Use Click's
        # parser so --file=--json and arguments following -- remain values.
        resilient, ignore_unknown = ctx.resilient_parsing, ctx.ignore_unknown_options
        try:
            ctx.resilient_parsing = True
            ctx.ignore_unknown_options = True
            # The plain parser: a conflicting `--file` is refused by the real
            # parse below, once `--json` has been read.
            opts, _, _ = super().make_parser(ctx).parse_args(list(args))
        finally:
            ctx.resilient_parsing, ctx.ignore_unknown_options = resilient, ignore_unknown
        context.configure(
            json_output=bool(opts.get("json_output")),
            no_input=bool(opts.get("no_input")),
            yes=bool(opts.get("yes")),
            debug=bool(opts.get("debug")),
            strict=bool(opts.get("strict")),
        )
        ctx.meta["completion_shell"] = opts.get("shell")
        try:
            return super().parse_args(ctx, list(args))
        except BrokenPipeError:
            # The eager options (--version, --help, --show-completion) print
            # and exit from in here, before `invoke` and its guard ever run.
            _exit_on_broken_pipe()
        except typer.Exit:
            try:
                _settle_stdout()
            except BrokenPipeError:
                _exit_on_broken_pipe()
            except OSError as failure:
                if not _output_failed(failure):
                    raise
                _exit_on_output_failure(failure)
            raise
        except typer.Abort:
            raise
        except NoArgsIsHelpError as exc:
            # Typer normally renders this after parse_args has unwound, where
            # a closed stderr reader can replace its usage status with 120.
            try:
                exc.show()
                if sys.stderr is not None:
                    sys.stderr.flush()
            except BrokenPipeError:
                output.silence_broken_streams()
            except OSError as failure:
                if not _output_failed(failure):
                    raise
                _exit_on_output_failure(failure)
            except (typer.Abort, KeyboardInterrupt):
                _exit_on_interrupt()
            raise typer.Exit(exc.exit_code) from None
        except Exception as exc:
            if isinstance(exc, OSError) and _output_failed(exc):
                _exit_on_output_failure(exc)
            if not args:  # Keep the normal no-arguments help page.
                raise
            output.error(exc)

    def make_parser(self, ctx: Any) -> Any:
        # Global options hold one value like every command's own (w5/485).
        return single_value_parser(self, ctx)

    def invoke(self, ctx: Any) -> Any:
        _tolerate_unencodable_output()
        try:
            result = super().invoke(ctx)
            _settle_stdout()
            # Deferred warnings and courtesy notices write too: keep them
            # inside the same pipe/output/interrupt guard as the command.
            output.flush_warnings()
            update.print_notice()
        except BrokenPipeError:
            _exit_on_broken_pipe()
        except typer.Exit as exc:
            # Native-delegated commands (check/format/query/…) finish with
            # `raise typer.Exit(status)` so upstream's exit code is preserved.
            # A successful Exit must still run the courtesy update notice that
            # the normal return path prints — otherwise `bea check` goes silent
            # about upgrades after ADR014.
            try:
                _settle_stdout()
                output.flush_warnings()
                if (exc.exit_code or 0) == 0:
                    update.print_notice()
            except BrokenPipeError:
                _exit_on_broken_pipe()
            except OSError as failure:
                if not _output_failed(failure):
                    raise
                _exit_on_output_failure(failure)
            except (typer.Abort, KeyboardInterrupt):
                _exit_on_interrupt()
            raise
        except (typer.Abort, KeyboardInterrupt):
            _exit_on_interrupt()
        except Exception as e:
            if isinstance(e, OSError) and _output_failed(e):
                _exit_on_output_failure(e)
            output.error(e)
        return result

    def format_commands(self, ctx: Any, formatter: Any) -> None:
        """Render the command list grouped by `rich_help_panel`.

        The panel metadata carries the local/cloud boundary, but with
        `rich_markup_mode=None` typer renders help through plain click, which
        ignores it — so the grouping has to happen here for `--help` to show
        which commands stay on disk and which talk to the hosted service.
        """
        commands = [
            (name, cmd)
            for name in self.list_commands(ctx)
            if (cmd := self.get_command(ctx, name)) is not None and not cmd.hidden
        ]
        if not commands:
            return
        limit = formatter.width - 6 - max(len(name) for name, _ in commands)
        panels: dict[str, list[tuple[str, str]]] = {}
        for name, cmd in commands:
            panel = getattr(cmd, "rich_help_panel", None) or "Commands"
            panels.setdefault(panel, []).append((name, cmd.get_short_help_str(limit)))
        for title, rows in panels.items():
            with formatter.section(title):
                formatter.write_dl(rows)


app = typer.Typer(
    name="bea",
    cls=_GuardedGroup,
    help="Beancount.io CLI — check, query, and edit beancount ledgers",
    no_args_is_help=True,
    rich_markup_mode=None,
    add_completion=False,
    context_settings={"help_option_names": ["-h", "--help"]},
)


def _version_callback(value: bool) -> None:
    """Print the version and stop, without loading accounting code or touching the network."""
    if value:
        from cli.config import package_version

        version = package_version()
        # Eager, like print_version_hint below: the run context does not exist
        # yet, so machine mode is read from argv (either flag order works).
        if "--json" in sys.argv[1:]:
            from cli import output

            output.emit({"version": version}, target=None)
        else:
            typer.echo(f"bea {version}")
        # From the day-old cache only: `--version` is what scripts parse and
        # what people run when the network is the thing that is broken.
        update.print_version_hint(version, sys.argv[1:], channel=current_channel().name)
        raise typer.Exit()


@app.callback()
def main(
    file: Annotated[
        Path | None,
        typer.Option("--file", "-f", help="Ledger entry file (overrides $BEA_FILE and cwd main.bean/main.beancount)"),
    ] = None,
    json_output: Annotated[bool, typer.Option("--json", help="Emit JSON on stdout and JSON errors on stderr")] = False,
    no_input: Annotated[bool, typer.Option("--no-input", help="Never prompt; fail instead of waiting")] = False,
    yes: Annotated[bool, typer.Option("--yes", "-y", help="Answer confirmations with yes")] = False,
    debug: Annotated[bool, typer.Option("--debug", help="Include exception tracebacks in errors")] = False,
    strict: Annotated[
        bool, typer.Option("--strict", help="Refuse partial answers even in a terminal; --allow-errors opts in")
    ] = False,
    offline: Annotated[
        bool,
        typer.Option(
            "--offline",
            help="Never fetch (except upgrade --check): reuse cached managed prices and skip background update checks",
        ),
    ] = False,
    strict_prices: Annotated[
        bool,
        typer.Option("--strict-prices", help="Fail the load when a managed price source is stale or unavailable"),
    ] = False,
    shell: Annotated[
        str | None,
        typer.Option(
            "--shell", help="Completion shell: bash, zsh, fish, powershell or pwsh", autocompletion=complete_shell
        ),
    ] = None,
    show_completion: Annotated[
        bool,
        typer.Option(
            "--show-completion",
            callback=show_completion_callback,
            is_eager=True,
            help="Print completion script; detects the shell unless --shell is supplied",
        ),
    ] = False,
    install_completion: Annotated[
        bool,
        typer.Option(
            "--install-completion",
            callback=install_completion_callback,
            is_eager=True,
            help="Install shell completion; optionally select --shell",
        ),
    ] = False,
    version: Annotated[
        bool,
        typer.Option("--version", callback=_version_callback, is_eager=True, help="Show the version and exit"),
    ] = False,
) -> None:
    """Global options, resolved once for whichever command runs."""
    del shell, show_completion, install_completion  # Handled by the completion callbacks.
    ctx = context.configure(
        file=file,
        json_output=json_output,
        no_input=no_input,
        yes=yes,
        debug=debug,
        strict=strict,
        offline=offline,
        strict_prices=strict_prices,
    )
    # Checked for every command, not only the ones that reach per-user state,
    # so a bad `BEA_CONFIG_DIR` fails the same way with or without a terminal.
    config_dir()
    # Started here, where the machine-mode options are already resolved, so the
    # check overlaps the command instead of delaying it.
    update.start(
        json_output=ctx.json_output, no_input=ctx.no_input, channel=current_channel().name, offline=ctx.offline
    )


# `ask` is local despite its hosted model calls — the task-verb rule in
# cli/AGENTS.md keeps every verb over .bean files out of `cloud`. `upgrade`
# and `engine` are about the tool itself (PyPI/Homebrew / managed engine), so
# they are neither local nor cloud.
_LOCAL_PANEL = "Local ledger commands (work on .bean files)"
_CLOUD_PANEL = "Cloud commands (beancount.io — need 'bea cloud login' or BEA_TOKEN)"
_SELF_PANEL = "CLI maintenance"

_CHECK_CTX = {"allow_extra_args": True, "ignore_unknown_options": True}
app.command(
    "check",
    cls=ForwardingCommand,
    rich_help_panel=_LOCAL_PANEL,
    context_settings=_CHECK_CTX,
    epilog=native_help("check"),
)(check)
# Read commands refuse a repeated scalar option with two values instead of
# silently keeping the last (w5/381), as `add`, `init` and `import` do.
app.command("balance", cls=SingleValueCommand, rich_help_panel=_LOCAL_PANEL)(balance)
app.command("init", cls=SingleValueCommand, rich_help_panel=_LOCAL_PANEL)(init)
app.command("import", cls=SingleValueCommand, rich_help_panel=_LOCAL_PANEL)(import_entries)
app.add_typer(ingest_app, name="ingest", rich_help_panel=_LOCAL_PANEL)
# `format -o a -o b` wrote `b` alone with exit 0 (w5/512); `ask --into` names a write destination too.
app.command("format", cls=SingleValueCommand, rich_help_panel=_LOCAL_PANEL)(format_beans)
app.command("query", cls=SingleValueCommand, rich_help_panel=_LOCAL_PANEL)(query)
app.command(
    "price",
    cls=PriceCommand,
    rich_help_panel=_LOCAL_PANEL,
    context_settings=_CHECK_CTX,
    epilog=native_help("price"),
)(price)
app.command("ask", cls=SingleValueCommand, rich_help_panel=_LOCAL_PANEL)(ask)
app.command(
    "example",
    cls=ForwardingCommand,
    rich_help_panel=_LOCAL_PANEL,
    context_settings=_CHECK_CTX,
    epilog=native_help("example"),
)(example)
app.command(
    "treeify",
    cls=ForwardingCommand,
    rich_help_panel=_LOCAL_PANEL,
    context_settings=_CHECK_CTX,
    epilog=native_help("treeify"),
)(treeify)

app.add_typer(add_app, name="add", rich_help_panel=_LOCAL_PANEL)
app.add_typer(update_app, name="update", rich_help_panel=_LOCAL_PANEL)
app.add_typer(list_app, name="list", rich_help_panel=_LOCAL_PANEL)
app.add_typer(report_app, name="report", rich_help_panel=_LOCAL_PANEL)
app.add_typer(doctor_app, name="doctor", rich_help_panel=_LOCAL_PANEL)

app.add_typer(cloud_app, name="cloud", rich_help_panel=_CLOUD_PANEL)

app.command("upgrade", rich_help_panel=_SELF_PANEL)(upgrade)
app.add_typer(engine_app, name="engine", rich_help_panel=_SELF_PANEL)

if __name__ == "__main__":
    from cli.engine.launch import own_process

    own_process()
    app()
