"""Run engine programs as child processes.

Three shapes, because the boundary carries three kinds of traffic:

- `run_native` and `run_engine_argv` hand the caller's streams to the child and
  pass its exit status back untouched. Upstream keeps owning its stdout, its
  stderr and its status, an interactive program still sees the terminal, and a
  pipe still streams. `bea check`, `bea doctor`, `bea example`, `bea treeify`,
  and optional `bea price` (`bean-price`) are this shape.
- `run_optional_script` runs a user script (Beangulp ingest) with the engine
  interpreter after `require_feature`, still as a child process.
- `capture_native` keeps the child's output instead, for the few places where
  the frontend has to read the answer before it can act on it — `bea check
  --json` parses `bean-check --json`, and `bea format --check` compares the
  formatter's output against the file on disk.
- `helper_json` runs a helper command that answers with one JSON envelope,
  which the frontend renders itself.

Never `shell=True` and never a joined string: arguments go across as an argv
array, so a ledger path with spaces, quotes or a `$` in it needs no escaping
and cannot turn into shell syntax. Nothing here sets `cwd` either — the child
inherits the caller's working directory, so a relative path on the command line
means to the engine what it meant in the shell.

Resolving the engine, in order:

1. `$BEA_ENGINE_PYTHON` — an interpreter named outright.
2. A provisioned engine that is already installed. When a checkout's `cli/src`
   is also present, that source is put on `PYTHONPATH` so the helper module
   under edit wins over whatever the provisioned venv last installed — still
   the same Beancount interpreter, still a child process.
3. A checkout's `cli/src`, run with this interpreter. Still a separate process,
   and the only concession to the transition: it lets a developer exercise the
   boundary without provisioning, and it is unavailable from an installed
   wheel, whose helper resources are nested under `cli/_runtime`.
4. Provisioning a new engine.

`resolve_engine` answers that order without provisioning, and `bea engine
status` reports its answer, so what status names is what a command would run.

`native_command` resolves upstream executables in that same order, so a
developer's `bea format` runs the `bean-format` beside the interpreter they are
working with and a customer's runs the provisioned one. Neither consults
`PATH`: a globally installed Beancount of some other version must never answer.
Optional features (`beangulp`, `beanprice`) must be enabled first; see
`require_feature` / `run_optional_native` / `run_optional_script`.
"""

from __future__ import annotations

import atexit
import errno
import hashlib
import json
import os
import select
import signal
import stat
import subprocess
import sys
import threading
from collections.abc import Callable, Iterator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, TextIO

from cli import config, context, output
from cli.amounts import crashing_divisor_line
from cli.auth.credentials import load_credentials
from cli.engine import paths, provision
from cli.errors import BY_CATEGORY, BeaError, ConflictError, EngineError, SignalError, UsageError


def run_engine_argv(argv: Sequence[str], *, interactive: bool = False, ledger: Path | str | None = None) -> int:
    """Run the engine helper with `argv`, streams inherited. Returns its exit code.

    `interactive` marks a child that owns the terminal for a whole session,
    such as the query shell: Ctrl-C there belongs to the child, which cancels
    the line and keeps going, so this process must not die of it too.
    `ledger` is the one the child reads, when `argv` names it other than by `--file`.
    """
    # Streamed commands have no answer envelope to prove that the program
    # served. A non-Python override can otherwise silently exit successfully.
    refuse_unusable_engine()
    command, env = helper_command()
    ledger = ledger or _ledger_argument(argv)
    if not interactive:
        return _spawn([*command, *argv], env, ledger=ledger)
    with _terminal_child_owns_interrupts():
        return _spawn([*command, *argv], env, ledger=ledger)


@contextmanager
def _terminal_child_owns_interrupts() -> Iterator[None]:
    """Let a foreground child answer Ctrl-C while this process waits it out.

    The terminal delivers SIGINT to the whole foreground process group, so the
    frontend heard every Ctrl-C the shell's user meant for the shell. The
    `KeyboardInterrupt` then made `subprocess.run` kill the shell a quarter
    second later — before its atexit history write — and `bea` exited 130
    while the shell had already printed `(interrupted)` and a fresh prompt.

    A do-nothing Python handler rather than `SIG_IGN`: an ignored disposition
    survives `exec`, and Python started with SIGINT ignored never raises
    `KeyboardInterrupt`, so the child would stop hearing Ctrl-C altogether. A
    handler is reset to the default on `exec`. A child that does die of SIGINT
    still reports it, and `_died_on_signal` maps that to 130.
    """
    try:
        previous = signal.signal(signal.SIGINT, lambda _number, _frame: None)
    except (OSError, ValueError):  # Not the main thread: nothing to change.
        yield
        return
    try:
        yield
    finally:
        signal.signal(signal.SIGINT, previous)


def run_native(
    name: str, args: Sequence[str], *, env: dict[str, str] | None = None, ledger: Path | str | None = None
) -> int:
    """Run an upstream executable from the engine environment, streams inherited.

    `name` is the program as upstream installs it — `bean-check`, `bean-format`,
    `bean-query`, `bean-doctor`, `bean-example`, `treeify`, `bean-price`. The child
    gets this process's stdin, stdout and stderr, so the shell it was started from
    sees upstream's own output and status; an interactive program keeps its terminal.

    `env` replaces the child's environment when set; otherwise the child gets
    `_native_env`, so a ledger's plugins resolve as they do in the helper, and
    the load cache of the `ledger` it reads stays out of the ledger's directory.

    The child never hears Ctrl-C: upstream's programs answer it with Click's
    `Aborted!` or a traceback, and an interrupt is documented as silent. This
    process still hears it, and stops the child on its way out.
    """
    command = [str(native_command(name)), *args]
    code = _spawn(
        command,
        env if env is not None else _native_env(ledger),
        deaf_to_interrupt=True,
        renamed=_BEA_NAMES.get(name),
        ledger=ledger,
    )
    if code != 0 and code <= 128:
        # The streams are already upstream's; a damaged engine still gets its
        # remedy named below them (w5/785). Codes above 128 are signal
        # mappings and EPIPE, which say nothing about the engine's health;
        # upstream's own failures (and a damaged import) exit 0-2.
        refuse_unusable_engine()
    return code


#: The `bea` command each upstream program answers for. Its usage errors said
#: `Try 'bean-check --help'`, naming a program nobody installed (w5/624).
#: `bean-query` is left out: its shell must keep its terminal on stderr.
_BEA_NAMES = {
    "bean-check": "bea check",
    "bean-doctor": "bea doctor",
    "bean-example": "bea example",
    "bean-format": "bea format",
    "treeify": "bea treeify",
}


def _renamed(text: str, renamed: tuple[str, str] | None) -> str:
    """Upstream's usage lines with the `bea` command in its program's place.

    Click's `Usage:` and `Try '… --help'`, and argparse's `usage:` and
    `PROGRAM: error:`, which `treeify` prints: only Click's were renamed, so
    `bea treeify --nosuch` named `treeify` (w5/846).
    """
    if renamed is None:
        return text
    program, command = renamed

    def rename(line: str) -> str:
        if line.startswith("Usage: ") or "Try '" in line:
            line = line.replace(f"Usage: {program} ", f"Usage: {command} ")
            return line.replace(f"Try '{program} ", f"Try '{command} ")
        if line.startswith((f"usage: {program} ", f"usage: {program}\n", f"{program}: error: ")):
            return line.replace(program, command, 1)
        return line

    return "".join(rename(line) for line in text.splitlines(keepends=True))


def renamed_usage(text: str, program: str) -> str:
    """`text` with an upstream program's usage lines naming the `bea` command that answers for it."""
    command = _BEA_NAMES.get(program)
    return _renamed(text, (program, command) if command else None)


LOAD_CACHE_ENV = "BEANCOUNT_LOAD_CACHE_FILENAME"


def load_cache_pattern(ledger: Path | str) -> str:
    """The load-cache pattern an upstream executable reading `ledger` runs with.

    Beancount's default leaves `.<name>.picklecache` beside a ledger whose load
    took a second: all of its contents again, at the process umask rather than
    the ledger's mode, and trusted by the next read (w5/175). The helper
    resolves that default under the cache home instead, in a directory only
    its owner can enter; this is the same path as a pattern, which is all
    `bean-check` and `bean-doctor` can be told. A pattern the user set wins.
    """
    chosen = os.environ.get(LOAD_CACHE_ENV)
    if chosen:
        return chosen
    directory = config.cache_dir() / "load-cache"
    try:
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        if stat.S_IMODE(directory.stat().st_mode) & 0o077:
            directory.chmod(0o700)
    except OSError:
        # Upstream then finds no cache there and says so if it cannot write one.
        pass
    digest = hashlib.sha256(os.fsencode(os.path.dirname(os.path.realpath(ledger)))).hexdigest()[:32]
    if not _clear_stray_cache_entry(directory / f"{digest}.{os.path.basename(ledger)}.picklecache"):
        # Under the null device nothing can be read or created, so the load runs uncached.
        return os.path.join(os.devnull, "{filename}")
    literal = str(directory).replace("{", "{{").replace("}", "}}")
    return os.path.join(literal, f"{digest}.{{filename}}.picklecache")


def _clear_stray_cache_entry(cache: Path) -> bool:
    """Clear a non-regular entry at bea's own load-cache path; whether the path is now usable.

    `bean-check` opens the path unguarded: a directory there printed its
    traceback, and a FIFO hung it (w5/591). The engine's
    `clear_stray_cache_entry` does the same for its own loads: a link (never
    its target), a FIFO or device, an empty directory.
    """
    try:
        mode = cache.lstat().st_mode
    except FileNotFoundError:
        return True
    except OSError:
        return False
    if stat.S_ISREG(mode):
        return True
    try:
        if stat.S_ISDIR(mode):
            cache.rmdir()
        else:
            cache.unlink()
    except OSError:
        return False
    return True


def _native_env(ledger: Path | str | None = None) -> dict[str, str]:
    """The environment for an upstream executable: the helper's module search path, and nothing else of it.

    The bundled sources — the vendored `fava` package among them — are
    importable only where this path names them. Without it `bean-check` and
    `bean-doctor` failed with `No module named 'fava'` on a ledger using
    `fava.plugins.forecast` or `link_documents`, while the helper check, the
    reports and every query loaded the same ledger (w5/084). Appended after an
    inherited `PYTHONPATH`, so it only supplies what would otherwise be
    missing; the managed-price settings `_helper_env` adds stay helper-only.
    """
    root = paths.helper_source_root()
    inherited = os.environ.get("PYTHONPATH", "")
    env = {**os.environ, "PYTHONPATH": os.pathsep.join([inherited, str(root)]) if inherited else str(root)}
    if ledger is not None:
        env[LOAD_CACHE_ENV] = load_cache_pattern(ledger)
    # Ledger text out of upstream is UTF-8 whatever the locale, as bea's own is:
    # under a Latin-1 or cp1252 locale `treeify` and `doctor context` crashed on
    # `İstanbul` with a UnicodeEncodeError (w5/404).
    env["PYTHONIOENCODING"] = "utf-8"
    # Importing a local plugin during a read must not add __pycache__ beside
    # the ledger, including through an upstream executable (w5/655).
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return env


def require_feature(name: str) -> None:
    """Refuse optional-feature commands until the matching engine feature is available."""
    known = provision.optional_features()
    if name not in known:
        choices = ", ".join(sorted(known)) or "(none)"
        raise UsageError(f"Unknown engine feature '{name}'. Choose one of: {choices}.")
    try:
        if provision.feature_available(name):
            return
    except provision.ProbeNotRun:
        # Not known to be missing: the command itself reports what it meets.
        return
    override = paths.python_override()
    if override is not None:
        raise UsageError(
            f"Engine feature '{name}' is not available in {paths.PYTHON_ENV}={override}. "
            f"Install it into that environment, or unset {paths.PYTHON_ENV} and run "
            f"'bea engine enable {name}'."
        )
    raise UsageError(f"Engine feature '{name}' is not enabled. Run: bea engine enable {name}")


def run_optional_native(
    feature: str,
    name: str,
    args: Sequence[str],
    *,
    env: dict[str, str] | None = None,
    ledger: str | None = None,
) -> int:
    """Require an optional feature, then run its upstream executable.

    `ledger` places the load cache of a ledger the executable reads, as for
    every native (w5/456).
    """
    require_feature(feature)
    return run_native(name, args, env=env, ledger=ledger)


def run_optional_script(feature: str, script: Path, args: Sequence[str], *, ledger: str | None = None) -> int:
    """Require an optional feature, then run a user script with the engine interpreter.

    Beangulp's lifecycle lives in the user's ingest script (`Ingest(...)()`): we
    only choose the interpreter and forward `identify` / `extract` / `archive`
    plus the rest of the argv. The frontend never imports Beangulp.

    `ledger` is a ledger the script loads (`extract -e`): its load cache goes
    where every other load's does, not beside a private ledger as a
    world-readable pickle of every entry (w5/456).
    """
    require_feature(feature)
    if not script.is_file():
        raise UsageError(f"Ingest script not found: {script}")
    python = engine_python()
    env = _helper_env()
    if ledger is not None:
        env = {**(env if env is not None else os.environ), LOAD_CACHE_ENV: load_cache_pattern(ledger)}
    return _spawn([str(python), str(script), *args], env)


@dataclass(frozen=True)
class EngineSource:
    """The tier that answers engine programs for this process.

    `location` is what a person would look at: the override interpreter, the
    managed engine root, or the checkout's `cli/src`. `python` is None only for
    `first-use`, where nothing is installed yet and the next engine command
    provisions `location`.
    """

    tier: Literal["override", "managed", "checkout", "first-use"]
    location: Path
    python: Path | None


def resolve_engine() -> EngineSource:
    """Which tier the order in the module docstring picks, without provisioning anything."""
    override = paths.python_override()
    if override is not None:
        return EngineSource("override", override, override)
    root = paths.engine_root()
    if paths.is_provisioned(root):
        return EngineSource("managed", root, paths.venv_python(root))
    checkout = paths.checkout_source_root()
    if checkout is not None:
        return EngineSource("checkout", checkout, Path(sys.executable))
    return EngineSource("first-use", root, None)


def engine_python() -> Path:
    """The interpreter that will run engine programs for this process."""
    source = resolve_engine()
    if source.python is not None:
        return source.python
    return provision.ensure_engine()


def _suggests_engine_damage(completed: subprocess.CompletedProcess[str]) -> bool:
    """Whether a failed native run failed the way a damaged engine fails.

    A broken interpreter dies on the import with a traceback; an invalid
    ledger fails with upstream's own error lines, and a signal death says
    nothing about the engine's health — not even when the runtime prints a
    KeyboardInterrupt traceback on its way out. Only a positive exit with a
    traceback pays for a probe — and the probe loads no ledger, so a
    crashing user plugin still falls through to the caller's report (w5/785).
    """
    if completed.returncode <= 0:
        return False
    return "Traceback (most recent call last)" in (completed.stderr or "")


def capture_native(
    name: str,
    args: Sequence[str],
    *,
    ledger: Path | str | None = None,
    pass_fds: Sequence[int] = (),
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    """Run an upstream executable and keep its output instead of inheriting the streams.

    For the two commands that must read the answer before they can render one:
    `bea check --json` turns `bean-check --json` into the frontend's envelope,
    and `bea format --check` compares the formatter's output against the file.
    Everything else should use `run_native` and let upstream own the streams.
    """
    completed = run_captured(
        [str(native_command(name)), *args], env=_native_env(ledger), pass_fds=pass_fds, input_text=input_text
    )
    if _suggests_engine_damage(completed):
        refuse_unusable_engine(completed)
    return completed


def check_native(
    completed: subprocess.CompletedProcess[str], name: str, *, result: dict[str, Any] | None = None
) -> None:
    """Raise the standard error for a failed native call; pass successes through.

    The one boundary for non-envelope children: the last stderr line becomes
    the message, a stderr tail stays in the details for diagnosis, and a
    Python traceback reaches only the `--debug` traceback field — never the
    message, the details, or either stream.
    """
    if completed.returncode == 0:
        return
    if completed.returncode < 0:
        import typer

        try:
            status = captured_status(completed)
        except BeaError as exc:
            exc.result = result
            raise
        # Quiet signals keep their shell status instead of becoming an error
        # about a negative exit code; other signals were named above.
        raise typer.Exit(status)
    command = _BEA_NAMES.get(name)
    diagnostic = _renamed(completed.stderr or "", (name, command) if command else None).strip()
    tail = [line for line in diagnostic.splitlines() if line.strip()][-20:]
    reason = tail[-1] if tail else "No diagnostic was returned."
    if "Traceback (most recent call last)" in diagnostic:
        details: list[str] = []
        traceback_text: str | None = diagnostic or None
    else:
        details, traceback_text = tail[:-1], None
    # Status 2 is the usage status of both Click and argparse: a bad option or
    # argument to the upstream program is the caller's, not the ledger's, and
    # the message already quotes that status (w5/089).
    error = UsageError if completed.returncode == 2 and traceback_text is None else BeaError
    raise error(
        f"{name} failed (exit {completed.returncode}): {reason}",
        details=details,
        result=result,
        traceback=traceback_text,
    )


def capture_engine(argv: Sequence[str]) -> subprocess.CompletedProcess[str]:
    """Run the engine helper and keep its output instead of inheriting the streams.

    For a helper command that streams upstream's own text rather than an
    envelope, where `bea` has to read the answer before it can decide what the
    exit status should be.
    """
    refuse_unusable_engine()
    command, env = helper_command()
    return _run_helper([*command, *argv], env, None)


def captured_status(completed: subprocess.CompletedProcess[str], *, ledger: Path | str | None = None) -> int:
    """The exit status of a captured child, with a signal death reported as `_spawn` reports one.

    `subprocess` hands back a signal death as a negative return code. Passed to
    the shell as it stands, -11 comes out as exit 245 with nothing on either
    stream (w5/251). `ledger` is the one the child read, as for `_spawn`.
    """
    if completed.returncode < 0:
        return _died_on_signal(-completed.returncode, [str(part) for part in completed.args], ledger)
    return completed.returncode


def native_command(name: str) -> Path:
    """The upstream executable `name`, resolved inside the engine environment.

    Same order as `helper_command`, and for the same reasons; see the module
    docstring. A checkout resolves it beside the interpreter running the
    frontend, which is where `uv sync` puts `bean-check` and friends.
    """
    filename = f"{name}.exe" if sys.platform == "win32" else name
    for directory in _candidate_bin_dirs():
        executable = directory / filename
        if native_tool_problem(executable) is None:
            return executable

    directory = paths.bin_dir_for(provision.ensure_engine())
    executable = directory / filename
    problem = native_tool_problem(executable)
    if problem is not None:
        # A directory or a file without execute permission is no tool either:
        # it was returned for being there, and `check -v` died on a raw
        # `[Errno 13] Permission denied` (w5/863).
        found = f"no '{name}'" if problem == "missing" else f"a '{name}' that cannot run ({executable} is {problem})"
        # Which installation to blame depends on which one was consulted. Under
        # an override those are different places, and the managed engine named
        # by `engine_root()` is neither the thing that failed nor the thing that
        # would be used next — advising its removal destroys a working engine
        # and leaves the override still pointing where it did. `require_feature`
        # above already branches this way.
        override = paths.python_override()
        if override is not None:
            raise BeaError(
                f"{paths.PYTHON_ENV}={override} names an environment with {found} ({directory}). "
                f"Correct or unset {paths.PYTHON_ENV}, or run 'bea engine status' to see which engine would serve."
            )
        raise BeaError(
            f"The engine environment has {found} ({directory}). "
            f"Remove {paths.engine_root()} and rerun to provision it again."
        )
    return executable


#: The upstream executables local commands run beside the engine interpreter.
NATIVE_TOOLS = ("bean-check", "bean-doctor", "bean-example", "treeify")


def native_tool_problem(executable: Path) -> str | None:
    """Why `executable` cannot run as a native tool — `missing`, `a directory`, … — or None when it can.

    Judged from the file alone; nothing is executed to find out.
    """
    try:
        info = executable.stat()
    except OSError:
        return "missing"
    if stat.S_ISDIR(info.st_mode):
        return "a directory"
    if not stat.S_ISREG(info.st_mode):
        return "not a regular file"
    if sys.platform != "win32" and not os.access(executable, os.X_OK):
        return "not executable"
    return None


def native_tools_problem(python: Path) -> str | None:
    """What stops the native tools beside `python` from running, where `native_command` looks under an override.

    Present was taken for usable: a directory or a mode-644 script read as a
    tool, so status said usable while `check -v` could not run it (w5/863).
    """
    directory = paths.bin_dir_for(python)
    suffix = ".exe" if sys.platform == "win32" else ""
    problems = {name: native_tool_problem(directory / f"{name}{suffix}") for name in NATIVE_TOOLS}
    missing = [name for name, problem in problems.items() if problem == "missing"]
    broken = [f"{name} ({problem})" for name, problem in problems.items() if problem not in (None, "missing")]
    parts = ([f"no {', '.join(missing)}"] if missing else []) + ([f"{', '.join(broken)} cannot run"] if broken else [])
    return f"{'; '.join(parts)} beside {python} ({directory})" if parts else None


def _candidate_bin_dirs() -> list[Path]:
    """Where an upstream executable may already be, without provisioning anything."""
    override = paths.python_override()
    if override is not None:
        return [paths.bin_dir_for(override)]

    directories = []
    root = paths.engine_root()
    if paths.is_provisioned(root):
        directories.append(paths.bin_dir(root))
    if paths.checkout_source_root() is not None:
        directories.append(paths.bin_dir_for(Path(sys.executable)))
    return directories


def helper_json(
    args: Sequence[str],
    *,
    stdin: str | None = None,
    writes: bool = False,
    env_extra: dict[str, str] | None = None,
    pass_fds: Sequence[int] = (),
) -> dict[str, Any]:
    """Run a helper command and return its result, raising what it reports instead.

    The frontend renders: this hands back `data` from the envelope and turns a
    failure into the matching `cli.errors` exception, so a command reads like
    the in-process call it replaced.

    `writes` says the command may change a file. An engine that dies without an
    envelope then leaves an unknown outcome — the write may already have
    happened — so it is reported as `conflict`/4 rather than a plain failure,
    which invites a retry that would append the directive a second time. The
    exception is a `$BEA_ENGINE_PYTHON` that cannot load the helper: no command
    ran, so that is a plain failure naming the variable.

    `stdin` carries a request the argument list cannot hold — a batch of
    transactions for `bea-engine add --request -`. Nothing is read back from
    stdin, so there is no deadlock to worry about: the child gets the whole
    request and then answers.
    """
    command, env = helper_command()
    if env_extra:
        env = {**(env if env is not None else os.environ), **env_extra}
    completed = _run_helper([*command, *args], env, stdin, writes=writes, pass_fds=pass_fds)

    envelope = _parse(completed, args, writes=writes)
    if not envelope.get("ok"):
        failure = envelope.get("error") or {}
        category = str(failure.get("category", "validation"))
        # Load errors tolerated before a different failure — surface as warnings.
        # A refused write names only what forced the refusal on a terminal; its
        # `--json` envelope still carries what the flag tolerated (w5/461). A
        # partial write that wrote rows was not refused: what their write noted
        # prints as a clean write's notes do (w5/541).
        tolerated = [str(error) for error in failure.get("ledger_errors", [])]
        result = failure.get("result")
        wrote = isinstance(result, dict) and bool(result.get("written"))
        if tolerated and (not writes or wrote or context.current().json_output):
            output.render_ledger_errors(tolerated, allow=True)
        message = str(failure.get("message", "The engine reported a failure."))
        trace = failure.get("traceback")
        trace = trace if isinstance(trace, str) and trace else None
        if trace is not None and not context.current().debug:
            # The engine always sends the traceback and only `bea --debug` shows
            # it, so the advice to ask for one belongs on this side of the
            # boundary, where that flag is known.
            stop = " " if message.endswith((".", "!", "?")) else ". "
            message = f"{message}{stop}{output.DEBUG_HINT}"
        error = BY_CATEGORY.get(category, BeaError)(
            message,
            details=[str(detail) for detail in failure.get("details", [])],
        )
        if isinstance(result, dict):
            error.result = result
        error.traceback = trace
        if completed.stderr.strip():
            # The reroute note names the root that judged the write; dropped,
            # a refusal never said (w5/775). Tracebacks travel in the
            # envelope, so stderr holds only notes and plugin output.
            output.engine_output(completed.stderr.rstrip())
        raise error

    if completed.stderr.strip():
        output.engine_output(completed.stderr.rstrip())
    return dict(envelope.get("data") or {})


#: How long the helper gets to unwind once we pass a termination signal on. It
#: only has to drop a staged candidate file, so this is deliberately generous.
_CLEANUP_GRACE_SECONDS = 5.0
#: The status of a helper killed when that grace period runs out.
_KILLED = -signal.SIGKILL if hasattr(signal, "SIGKILL") else None


def _run_helper(
    command: list[str],
    env: dict[str, str] | None,
    stdin: str | None,
    *,
    writes: bool = False,
    pass_fds: Sequence[int] = (),
) -> subprocess.CompletedProcess[str]:
    """`subprocess.run`, except the child is told when the frontend is being stopped.

    A stopped write that still answered success had committed before the
    stop. That answer is kept and reported, and so is a stop that arrives
    while it is being rendered. Dying by the signal instead made a
    supervisor's retry record the entry twice (w5/606). Any other stopped
    child still takes this process down with it: a read before a write must
    not let the write run. A worker-thread write is the exception: nothing
    can forward a stop to it, so it runs shielded to completion and the
    approved write always commits and reports (w5/731).
    """
    stopped: list[int] = []
    committed = False
    with _forwarding_teardown(stopped, committed=lambda: committed) as attach:
        with _popen(
            command,
            env=env,
            stdin=subprocess.PIPE if stdin is not None else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            pass_fds=pass_fds,
            # Group delivery plus forwarding could otherwise interrupt cleanup twice.
            # Worker threads cannot forward signals, so their reads stay in the
            # group and die with the terminal's Ctrl-C. Their writes cannot be
            # told to stop at all, so those run shielded instead: an approved
            # write outlives the stop, commits, and reports, and the caller —
            # an ask worker the turn outlived — joins it before reporting
            # (w5/731). Only ask writes off the main thread.
            start_new_session=sys.platform != "win32"
            and (threading.current_thread() is threading.main_thread() or writes),
        ) as child:
            attach(child)
            # Read stderr here rather than in `communicate`, which hands it over
            # only once the child has exited: a notice has to show while it waits.
            stream, child.stderr = child.stderr, None
            assert stream is not None
            kept: list[str] = []
            relay = threading.Thread(target=_relay_notices, args=(stream, kept), daemon=True)
            relay.start()
            try:
                out, _ = child.communicate(stdin)
            finally:
                relay.join()
                stream.close()
        # Decide while forwarding handlers still own every stop. Restoring
        # defaults before installing the post-commit handlers left a window
        # where the frontend could die silently over a completed write.
        completed = subprocess.CompletedProcess(command, child.returncode, out, "".join(kept))
        committed = writes and _reports_commit(completed)
    # A writer SIGKILLed once the grace period ran out never said whether it
    # wrote: that is the unknown outcome `_parse` reports as exit 4, not a
    # silent death (w5/825). One that died of the stop itself did so before
    # its handlers were installed, with nothing started.
    unknown = writes and completed.returncode == _KILLED and _envelope(completed) is None
    if stopped and not committed and not unknown:
        _die_by(stopped[0])
    return completed


def _hold_stops_after_commit(stopped: list[int], previous: list[tuple[int, Any]]) -> None:
    """From a committed write on, a stop is noted and reported at exit, not obeyed.

    The default disposition came back with the helper's return, so a stop
    landing while the result was rendered killed bea silently over a write
    that had landed (w5/606).
    """

    from typer._click.globals import get_current_context

    registered = False

    def report_stop() -> None:
        nonlocal registered
        if stopped and not registered:
            registered = True
            atexit.register(_report_late_stop, stopped[0])

    def hold(number: int, _frame: Any) -> None:
        if not stopped:
            stopped.append(number)
        report_stop()

    # Held for the command that wrote, and handed back when it closes: an
    # embedding process (CliRunner) keeps its own handlers afterwards.
    command = get_current_context(silent=True)
    if command is None:
        report_stop()
        _restore_handlers(previous)
        return
    for number, _handler in previous:
        try:
            signal.signal(number, hold)
        except (OSError, ValueError):
            continue
    report_stop()
    if _owns_process:
        # Handed back on close, the default disposition was in place for the
        # interpreter's shutdown, and a stop there killed bea after it had
        # printed the result (w5/825). Held to the end instead, and ignored
        # from the last exit handler on: the interpreter's teardown resets a
        # Python handler to the default, but leaves an ignored signal alone.
        atexit.register(_ignore_stops, [number for number, _ in previous])
        return
    command.find_root().call_on_close(lambda: _restore_handlers(previous))


#: Whether this process is `bea` itself rather than a caller embedding the
#: app, such as `CliRunner`, which keeps its own handlers afterwards.
_owns_process = False


def own_process() -> None:
    """Mark this process as `bea` itself: a committed write then holds stops until it exits."""
    global _owns_process
    _owns_process = True


def _ignore_stops(numbers: list[int]) -> None:
    for number in numbers:
        try:
            signal.signal(number, signal.SIG_IGN)
        except (OSError, ValueError):
            continue


def _restore_handlers(previous: list[tuple[int, Any]]) -> None:
    for number, handler in previous:
        try:
            signal.signal(number, handler)
        except (OSError, ValueError):
            continue


def _report_late_stop(number: int) -> None:
    output.note(f"Stopped ({signal.Signals(number).name}) after the write had completed; its result stands.")


def _envelope(completed: subprocess.CompletedProcess[str]) -> dict[str, Any] | None:
    try:
        envelope = json.loads(completed.stdout)
    except ValueError:
        return None
    return envelope if isinstance(envelope, dict) else None


def _reports_commit(completed: subprocess.CompletedProcess[str]) -> bool:
    """Whether the helper's answer says a write landed, whatever its exit status.

    A success does, and so does a failure whose result names what was already
    written: a `--partial` add's rows, or the files a stopped `format -i` had
    rewritten. Requiring exit 0 as well made a stop that killed the engine
    after it answered look like no write at all (w5/825).
    """
    envelope = _envelope(completed)
    if envelope is None:
        return False
    if envelope.get("ok") is True:
        return True
    failure = envelope.get("error")
    result = failure.get("result") if isinstance(failure, dict) else None
    return isinstance(result, dict) and bool(result.get("written") or result.get("formatted"))


def _die_by(number: int) -> None:
    """End this process by `number` with its default disposition, keeping the status the shell reports."""
    signal.signal(number, signal.SIG_DFL)
    os.kill(os.getpid(), number)


#: Opens a stderr line the engine wants shown while it is still running
#: (`bea_engine.protocol.NOTICE_PREFIX`); every other line is kept for the end.
_NOTICE_PREFIX = "bea-engine-notice: "


def _relay_notices(stream: TextIO, kept: list[str]) -> None:
    """Show the helper's notices as they arrive and keep the rest of its stderr.

    A writer queued behind another `bea` write says so here, before any
    envelope exists (w5/182). `output.note` keeps JSON mode silent, where
    stderr must stay one parseable object.
    """
    try:
        for line in stream:
            if line.startswith(_NOTICE_PREFIX):
                output.note(line[len(_NOTICE_PREFIX) :].rstrip("\n"))
            else:
                kept.append(line)
    except (OSError, ValueError):
        # Undecodable diagnostics, or our own stderr gone: keep draining so the
        # child never blocks on a full pipe.
        while stream.buffer.read(65536):
            pass


@contextmanager
def _forwarding_teardown(
    stopped: list[int] | None = None, *, committed: Callable[[], bool] | None = None
) -> Iterator[Callable[[subprocess.Popen[str]], None]]:
    """Pass a termination signal on to `child`, and let it unwind before we go.

    The engine stages every write into a `.bea-*.tmp` candidate beside the
    ledger and drops it in a `finally`. That cleanup only runs if the child is
    told to stop. Main-thread calls give the helper a separate session, making
    this the only signal-delivery path: a terminal's group-wide Ctrl-C cannot
    interrupt cleanup again after forwarding. Worker-thread calls cannot
    install handlers, so their reads keep their helpers in the terminal's
    group; their writes run shielded to completion instead (w5/731).
    Signals aimed at the frontend alone, such as a supervisor's
    termination request, also reach main-thread helpers through this path.

    Install before spawning and defer signals until the child handle is ready,
    so an interrupt during Popen cannot orphan an isolated helper. Handlers are
    restored after the child exits. Once the child is done we re-raise the signal
    with its default disposition, keeping the status the shell reports. A
    caller passing `stopped` gets the signal recorded there instead, and
    decides once it has read the child's answer. Worker-thread writes skip
    this path's protection: no handlers install there, and their helpers run
    shielded to completion instead (w5/731).
    """
    child: subprocess.Popen[str] | None = None
    pending: int | None = None

    def forward(number: int, _frame: Any) -> None:
        nonlocal pending
        if child is None:
            pending = number
            return
        child.send_signal(number)
        try:
            child.wait(timeout=_CLEANUP_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            child.kill()
        if stopped is not None:
            stopped.append(number)
            return
        _die_by(number)

    def attach(started: subprocess.Popen[str]) -> None:
        nonlocal child, pending
        child = started
        if pending is not None:
            number, pending = pending, None
            forward(number, None)

    installed: list[tuple[int, Any]] = []
    try:
        for number in _FORWARDED_SIGNALS:
            try:
                installed.append((number, signal.signal(number, forward)))
            except (OSError, ValueError):
                # Not every signal can be handled on every platform, and
                # `signal.signal` only works on the main thread. Forwarding is
                # an improvement where it is available, never a requirement.
                continue
        yield attach
    finally:
        if committed is not None and committed():
            # Hand off directly, without restoring the default disposition
            # between a known committed result and its frontend rendering.
            _hold_stops_after_commit(stopped if stopped is not None else [], installed)
        else:
            _restore_handlers(installed)
        if pending is not None:
            # A failed spawn must not swallow a termination signal either.
            signal.signal(pending, signal.SIG_DFL)
            os.kill(os.getpid(), pending)


def _parse(completed: subprocess.CompletedProcess[str], args: Sequence[str], *, writes: bool = False) -> dict[str, Any]:
    """Read the one JSON object the protocol promises on stdout."""
    try:
        envelope = json.loads(completed.stdout)
    except ValueError:
        # No envelope at all: the engine died before it could answer, or it is
        # not the program we think it is. Its own output is the only evidence,
        # so it becomes the details rather than being swallowed.
        printed = [line for line in (completed.stderr or completed.stdout).splitlines() if line.strip()][-20:]
        number = -completed.returncode
        if number > 0:
            # Killed by a signal: the child printed nothing to carry the
            # explanation, so name the signal and what usually causes it.
            try:
                name = signal.Signals(number).name
            except ValueError:
                name = f"signal {number}"
        else:
            refuse_unusable_engine(completed)
        # A crash names the zero divisor that caused it, when the ledger holds one.
        located = _crash_location(number, _ledger_argument(args)) if number > 0 else None
        if writes:
            # A writer that produced no envelope may or may not have written.
            # Exit 4 says exactly that, and stops a caller from retrying a
            # command whose first attempt may already have changed the file.
            if number > 0:
                raise ConflictError(
                    f"The Beancount engine was killed by {name} answering 'bea-engine {' '.join(args)}'; "
                    "the outcome is unknown. Inspect the file before retrying.",
                    details=[located, *printed] if located else [*printed, _signal_hint(number)],
                ) from None
            raise ConflictError(
                f"The Beancount engine did not answer 'bea-engine {' '.join(args)}' "
                f"(exit {completed.returncode}); the outcome is unknown. Inspect the file before retrying.",
                details=printed,
            ) from None
        if number > 0:
            hint = located or _signal_hint(number)
            raise SignalError(
                f"The Beancount engine was killed by {name} answering "
                f"'bea-engine {' '.join(args)}' and produced no result.",
                signal_name=name,
                hint=hint,
                details=[located, *printed] if located else [*printed, hint],
            ) from None
        raise BeaError(
            f"The Beancount engine did not answer 'bea-engine {' '.join(args)}' (exit {completed.returncode}).",
            details=printed,
        ) from None
    if not isinstance(envelope, dict):
        raise BeaError(f"The Beancount engine answered with {type(envelope).__name__}, not a result object.")
    return envelope


def engine_load_failure(python: Path) -> str | None:
    """Why `python` cannot load the helper, or None when it can.

    The probe must say so itself: `/bin/echo` or a stale wrapper exits 0
    without running anything, and a writer then reported an unknown outcome
    (exit 4) for a write that never started (w5/309). A probe a process or
    descriptor limit keeps from starting raises `provision.ProbeNotRun`.
    """
    sentinel = "bea-engine-loaded"
    try:
        probe = subprocess.run(
            [str(python), "-P", "-c", f"import bea_engine.main; print({sentinel!r})"],
            env=_helper_env(),
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as exc:
        if exc.errno in provision.SPAWN_LIMITS:
            # The probe never ran, so it says nothing about the engine (w5/815).
            raise provision.ProbeNotRun(exc) from exc
        return str(exc) or type(exc).__name__
    except ValueError as exc:
        return str(exc) or type(exc).__name__
    if probe.returncode == 0 and probe.stdout.strip().endswith(sentinel):
        return None
    lines = [line.strip() for line in probe.stderr.splitlines() if line.strip()]
    if lines and lines[-1].startswith("Try `python -h'"):
        # A Python too old for `-P` ends on its usage hint; the complaint is first.
        return f"{lines[0]}; the engine needs Python 3.12 or newer"
    return lines[-1] if lines else "it is not a Python that loads the engine"


def refuse_unusable_engine(completed: subprocess.CompletedProcess[str] | None = None) -> None:
    """Refuse an override or managed interpreter that cannot load the helper.

    An override without Beancount died on the helper's first import, which
    `_parse` could only report as an engine that "did not answer", traceback
    and all, and for a writer as an unknown outcome (w5/269). A managed engine
    whose package directories exist but whose contents are damaged — a
    compiled extension quarantined, a half-deleted package — did the same
    while `engine status` said "Provisioned: yes" (w5/320). Asking that
    interpreter for the import alone settles it: when even that fails no
    command body ran, so nothing was written, and the engine is what to fix.
    Streamed/captured calls probe before spawning, since even exit 0 carries
    no envelope to distinguish an engine result from a non-Python program.
    An engine that does load the helper falls through to the caller's report.
    """
    source = resolve_engine()
    if source.tier not in ("override", "managed") or source.python is None:
        return
    try:
        reason = engine_load_failure(source.python)
    except provision.ProbeNotRun:
        # Unknown is not damaged: the caller reports what happened.
        return
    if reason is None:
        return
    if source.tier == "override":
        # The user's own environment: a native tool beside it may still work
        # when only the helper's import fails, so this stays a plain BeaError
        # the fail-open pre-checks swallow. A native crash still gets its
        # remedy through the probe on the native failure itself (w5/785).
        message = (
            f"{paths.PYTHON_ENV}={source.python} names an environment that cannot run the Beancount engine "
            f"({reason}). Correct or unset {paths.PYTHON_ENV}, or run 'bea engine status' to see which engine "
            "would serve."
        )
        raise BeaError(message, traceback=(completed.stderr or None) if completed is not None else None) from None
    message = (
        f"The managed Beancount engine at {source.location} is damaged and cannot load ({reason}). "
        f"Remove {source.location} and rerun; bea provisions a fresh engine."
    )
    raise EngineError(message, traceback=(completed.stderr or None) if completed is not None else None) from None


def helper_command() -> tuple[list[str], dict[str, str] | None]:
    """The argv prefix that runs the helper, and the environment it needs.

    The resolution order documented at the top of this module, in one place, so
    both callers and the tests that pin the order read the same code.

    `-m bea_engine` rather than the `bea-engine` console script: it works
    whether or not the environment's `bin/` is on `PATH`, and it is the only
    form a checkout can offer.
    """
    return _module_command(engine_python()), _helper_env()


def _module_command(python: Path) -> list[str]:
    # `-P`: `-m` would otherwise put the working directory first on the
    # module path, so a `regex.py` in whatever folder bea ran from was
    # imported ahead of the standard library, and a plugin resolved from cwd
    # only in the helper, never in bean-check (w1/098). The managed engine
    # requires Python 3.12, and `-P` exists since 3.11.
    return [str(python), "-P", "-m", "bea_engine"]


def _helper_env(source_root: Path | None = None) -> dict[str, str] | None:
    """Expose bundled helper sources only to child interpreters.

    Checkouts use src; installed releases use cli/_runtime. Neither adds the
    frontend site-packages (or its AI SDKs) to the managed interpreter's path.

    The global managed-price modes travel here too, so every load-bearing
    helper call honors `--offline` / `--strict-prices` without threading
    them through each command's argv. Flags win over the process environment;
    without them the managed-price settings are inherited. Bytecode writing
    stays disabled so importing local plugins never adds files beside books.
    """
    root = source_root if source_root is not None else paths.helper_source_root()
    if root is None:
        return None
    inherited = os.environ.get("PYTHONPATH", "")
    search_path = os.pathsep.join([str(root), inherited]) if inherited else str(root)
    env = {**os.environ, "PYTHONPATH": search_path, "PYTHONDONTWRITEBYTECODE": "1"}
    # Helper output is UTF-8 whatever the parent exports: under utf-16 the
    # engine probe read gibberish and called a healthy engine damaged
    # (w5/724), as upstream output already is (w5/404).
    env["PYTHONIOENCODING"] = "utf-8"
    current = context.current()
    if current.offline:
        env["MANAGED_PRICE_OFFLINE"] = "1"
    if current.strict_prices:
        env["MANAGED_PRICE_STRICT"] = "1"
    # Credentials cross only in the child environment, never argv or requests
    # describing the ledger. Missing/invalid login must not break local books:
    # no failure reading the credential, of any kind, stops a local command (w5/589).
    env.pop("BEA_MANAGED_PRICE_TOKEN", None)
    env.pop("BEA_MANAGED_PRICE_AUTH_ERROR", None)
    if env.get("MANAGED_PRICE_OFFLINE", "").strip().lower() not in {"1", "true", "yes", "on"}:
        try:
            credential = load_credentials()
            if credential is not None and credential.is_expired():
                env["BEA_MANAGED_PRICE_AUTH_ERROR"] = "expired"
            elif credential is not None:
                env["BEA_MANAGED_PRICE_TOKEN"] = credential.token
        except Exception:
            env["BEA_MANAGED_PRICE_AUTH_ERROR"] = "invalid"
    return env


def _spawn(
    command: list[str],
    env: dict[str, str] | None,
    *,
    deaf_to_interrupt: bool = False,
    renamed: str | None = None,
    ledger: Path | str | None = None,
) -> int:
    """Run a child with the caller's streams and working directory, and report its status.

    Streams are inherited when they are real OS file descriptors so an
    interactive program still sees a terminal and a pipe still streams. When
    the frontend's stdout/stderr have been replaced (CliRunner's StringIO in
    tests, or anything else without a fileno), inheritance would write past
    those objects to the process's original fds — so we capture and write
    through `sys.stdout` / `sys.stderr` instead, which is what the caller is
    actually reading. Piped stdout is relayed so an actual EPIPE can be
    distinguished from a child's independent failure; stderr beside it may
    also be relayed to drop CPython's failed-flush epilogue.

    `renamed` is the `bea` command an upstream program answers for: its stderr
    is then relayed with the program's name replaced in usage lines. `ledger`
    is the one the child reads, so a crash can name the amount that caused it.
    """
    rename = (Path(command[0]).name, renamed) if renamed else None
    if _stream_is_captured(sys.stdout) or _stream_is_captured(sys.stderr):
        try:
            captured = subprocess.run(
                command, env=env, capture_output=True, encoding="utf-8", errors="replace", check=False
            )
        except OSError as exc:
            failure = _spawn_failure(command, exc)
            if failure is None:
                raise
            raise failure from exc
        output.replay(captured.stdout, sys.stdout)
        output.replay(_renamed(captured.stderr, rename), sys.stderr)
        returncode = captured.returncode
    else:
        with _relayed_stdout() as (stdout, failures), _stderr_minus_flush_epilogue(rename) as stderr:
            if stdout is not None and stderr is None:
                try:
                    shared = os.path.samestat(os.fstat(sys.stdout.fileno()), os.fstat(sys.stderr.fileno()))
                except (OSError, ValueError, AttributeError):
                    shared = False
                if shared:
                    # Keep `2>&1` one byte stream: letting the child's stderr
                    # bypass our stdout relay could reorder flushed writes.
                    stderr = stdout
            returncode = _run_inherited(command, env, stderr, stdout=stdout, deaf_to_interrupt=deaf_to_interrupt)
        if failures:
            if failures[0].errno == errno.EPIPE:
                return 128 + signal.SIGPIPE
            raise failures[0]
    if returncode < 0:
        return _died_on_signal(-returncode, command, ledger)
    if returncode == _FLUSH_FAILED:
        # CPython's own status when the last flush of stdout failed on the way
        # out (a full disk, a size limit): undocumented, so the run says what
        # failed and exits 1, as bea's own commands do (w5/407). Upstream's
        # report, on the stream it shares with us, is already above.
        print("Error: Could not write output: the upstream program's stdout refused the write.", file=sys.stderr)
        return 1
    return returncode


#: The exit status CPython substitutes when flushing stdout at shutdown fails.
_FLUSH_FAILED = 120


def _run_inherited(
    command: list[str],
    env: dict[str, str] | None,
    stderr: int | None,
    *,
    stdout: int | None = None,
    deaf_to_interrupt: bool = False,
) -> int:
    """`subprocess.run` on our own streams, except a request to stop us stops the child too.

    A supervisor's SIGTERM or a hangup aimed at `bea` alone ended the frontend
    at once and left `bean-check` or the helper loading the ledger to the end,
    holding the inherited pipes open (w5/208). The signal is passed on, the
    child gets `_CLEANUP_GRACE_SECONDS` to go, and we then die of the same
    signal, so the caller sees the status it always did.

    Not `_forwarding_teardown`: its handler waits for the child itself, which
    cannot work while this thread is already blocked in that child's `wait`.
    The child also stays in our process group, because it may own the terminal,
    and Ctrl-C is left alone: the terminal delivers it to the child directly —
    unless the child is `deaf_to_interrupt`, when ours alone ends the run.
    """
    with (
        _stop_passed_on() as attach,
        _interrupt_withheld(deaf_to_interrupt) as hear_interrupts,
        _popen(command, env=env, stdout=stdout, stderr=stderr) as child,
    ):
        attach(child)
        try:
            hear_interrupts()
            return child.wait()
        except BaseException:
            child.kill()
            raise


@contextmanager
def _relayed_stdout() -> Iterator[tuple[int | None, list[OSError]]]:
    """Observe writes to a downstream pipe without guessing from its state.

    Click catches a child's EPIPE and exits 1 silently. That status and a
    closed reader cannot distinguish it from a genuine validation failure
    that never wrote stdout (w5/707). Relay bytes only for a pipe/socket;
    terminals and regular files retain direct inheritance.
    """
    failures: list[OSError] = []
    try:
        descriptor = sys.stdout.fileno()
        mode = os.fstat(descriptor).st_mode
    except (OSError, ValueError, AttributeError):
        descriptor, mode = -1, 0
    if getattr(select, "poll", None) is None or not (stat.S_ISFIFO(mode) or stat.S_ISSOCK(mode)):
        yield None, failures
        return

    reader, writer = os.pipe()

    def relay() -> None:
        # Closing this read end on EPIPE also stops the child's next write;
        # it gets to unwind instead of filling an unconsumed intermediate pipe.
        with os.fdopen(reader, "rb", buffering=0) as stream:
            try:
                while data := stream.read(65536):
                    while data:
                        data = data[os.write(descriptor, data) :]
            except OSError as exc:
                failures.append(exc)

    worker = threading.Thread(target=relay, daemon=True)
    worker.start()
    try:
        yield writer, failures
    except BaseException:
        # The child's owning context has already killed/reaped it. A relay
        # blocked behind an unread consumer must not delay an interrupt.
        raise
    else:
        os.close(writer)
        writer = -1
        worker.join()
    finally:
        if writer >= 0:
            os.close(writer)


def run_captured(
    command: list[str],
    *,
    env: dict[str, str] | None = None,
    pass_fds: Sequence[int] = (),
    stdin_closed: bool = False,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    """`subprocess.run` keeping the output, except a request to stop us stops the child too.

    A bare `subprocess.run` left `bean-example`, `treeify`, a captured
    `bean-doctor` or a `git clone` running after a SIGTERM or hangup aimed at
    `bea` alone; an orphaned clone then finished and failed the retry (w5/437).
    As `_run_inherited` does, the child stays in our process group, where it can
    still prompt on the terminal and hears a terminal's Ctrl-C itself;
    `stdin_closed` takes stdin away from an unattended child.
    """
    with (
        _stop_passed_on() as attach,
        _popen(
            command,
            env=env,
            stdin=subprocess.PIPE if input_text is not None else subprocess.DEVNULL if stdin_closed else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
            pass_fds=pass_fds,
        ) as child,
    ):
        attach(child)
        try:
            out, err = child.communicate(input_text)
        except BaseException:
            child.kill()
            raise
    return subprocess.CompletedProcess(command, child.returncode, out, err)


@contextmanager
def _stop_passed_on() -> Iterator[Callable[[subprocess.Popen[Any]], None]]:
    """Pass a SIGTERM or SIGHUP aimed at us on to the `attach`ed child, then die of it.

    The child gets `_CLEANUP_GRACE_SECONDS` before it is killed; once it is
    gone, the signal is raised again with its default disposition, keeping the
    status the shell reports. A signal that arrives before the child is
    attached is passed on as soon as it is.
    """
    child: subprocess.Popen[Any] | None = None
    stopped: list[int] = []

    def stop(started: subprocess.Popen[Any], number: int) -> None:
        started.send_signal(number)
        reaper = threading.Timer(_CLEANUP_GRACE_SECONDS, started.kill)
        reaper.daemon = True
        reaper.start()

    def forward(number: int, _frame: Any) -> None:
        stopped.append(number)
        if child is not None:
            stop(child, number)

    def attach(started: subprocess.Popen[Any]) -> None:
        nonlocal child
        child = started
        if stopped:  # Asked to stop while the child was still being started.
            stop(started, stopped[0])

    installed: list[tuple[int, Any]] = []
    try:
        for number in _STOP_SIGNALS:
            try:
                installed.append((number, signal.signal(number, forward)))
            except (OSError, ValueError):  # As in `_forwarding_teardown`: an improvement, never a requirement.
                continue
        yield attach
    finally:
        for number, previous in installed:
            try:
                signal.signal(number, previous)
            except (OSError, ValueError):
                pass
        if stopped:
            signal.signal(stopped[0], signal.SIG_DFL)
            os.kill(os.getpid(), stopped[0])


@contextmanager
def _interrupt_withheld(wanted: bool) -> Iterator[Callable[[], None]]:
    """Start a child that never hears Ctrl-C, without losing one pressed meanwhile.

    The terminal sends SIGINT to the child as well as to us. `bean-check` and
    `bean-doctor` are Click programs, so they answered it with `Aborted!`
    before our own interrupt could stop them, on a Ctrl-C the exit table
    promises is silent (w5/273). A blocked signal stays blocked across `exec`
    and a handler does not, so the child is started with SIGINT blocked and
    never raises `KeyboardInterrupt`; it is ours that ends the run, and
    `_run_inherited` kills the child for it.

    The call this yields gives the signal back to this process. A Ctrl-C from
    the moments in between is recorded rather than raised — raised inside
    `Popen` it would leave a child nothing can interrupt — and is delivered
    then, where the caller is ready to stop the child.
    """
    mask = getattr(signal, "pthread_sigmask", None)
    if not wanted or mask is None:  # Windows has no signal mask to hand a child.
        yield lambda: None
        return
    heard: list[int] = []
    try:
        previous = signal.signal(signal.SIGINT, lambda number, _frame: heard.append(number))
    except (OSError, ValueError):  # Not the main thread: the child keeps hearing it.
        yield lambda: None
        return
    blocked = mask(signal.SIG_BLOCK, {signal.SIGINT})
    held = True

    def release() -> None:
        nonlocal held
        if not held:
            return
        held = False
        mask(signal.SIG_SETMASK, blocked)  # A pending Ctrl-C reaches the recorder here.
        signal.signal(signal.SIGINT, previous)
        if heard:
            signal.raise_signal(signal.SIGINT)

    try:
        yield release
    finally:
        release()


@contextmanager
def _stderr_minus_flush_epilogue(rename: tuple[str, str] | None = None) -> Iterator[int | None]:
    """The child's stderr: ours, or a relay onto ours that drops one interpreter epilogue.

    A Python child that only buffered its output meets the closed pipe when the
    interpreter flushes stdout on the way out, after every handler upstream
    wrote has unwound. CPython then prints `Exception ignored … BrokenPipeError`
    itself, so `bea doctor print-options … | head` exited 141 with two lines of
    noise where the exit table promises none (w5/160). Nothing can ask the
    child to die of SIGPIPE instead: Python ignores the signal again at startup
    whatever disposition it was handed.

    Only a stdout that can hang up, with stderr going somewhere else, gets the
    relay. A terminal session keeps its terminal, and under `2>&1` the epilogue
    already lands in the closed pipe, where relaying would only reorder the two
    streams. A `rename` (upstream program, `bea` command) always relays, so
    usage lines name the command the user ran (w5/624).
    """
    if rename is None and not _stdout_can_hang_up_apart_from_stderr():
        yield None
        return
    reader, writer = os.pipe()
    relay = threading.Thread(target=_relay_stderr, args=(reader, rename), daemon=True)
    relay.start()
    try:
        yield writer
    finally:
        os.close(writer)  # The child's copy is gone with it, so the relay sees the end.
        relay.join()


def _stdout_can_hang_up_apart_from_stderr() -> bool:
    if getattr(select, "poll", None) is None:  # Windows: `_downstream_pipe_closed` cannot tell.
        return False
    try:
        out, err = os.fstat(sys.stdout.fileno()), os.fstat(sys.stderr.fileno())
    except (OSError, ValueError, AttributeError):
        return False
    return (stat.S_ISFIFO(out.st_mode) or stat.S_ISSOCK(out.st_mode)) and not os.path.samestat(out, err)


#: How CPython opens its report of a failed shutdown flush, and the line after it.
#: The header names the stream differently by version (`in: <… name='<stdout>' …>`,
#: `on flushing sys.stdout:`, `while flushing sys.stdout:`).
_EPILOGUE_HEADER = b"Exception ignored"
_EPILOGUE_REASON = b"BrokenPipeError"


def _relay_stderr(reader: int, rename: tuple[str, str] | None = None) -> None:
    """Copy the child's stderr to ours as it arrives, minus a closing flush epilogue.

    Everything is forwarded the moment it cannot be that epilogue, a prompt
    with no newline included. The two lines are dropped only when they are the
    last thing the child wrote and our reader really has gone; the same words
    anywhere else are the child's own report and pass through.
    """
    held: list[bytes] = []  # The epilogue so far: its header, then its reason.
    partial = b""  # An unfinished line that may still turn into either.
    passing = False  # In the middle of a line that is already being forwarded.
    with os.fdopen(reader, "rb", buffering=0) as stream:
        while chunk := stream.read(65536):
            *lines, partial = (partial + chunk).split(b"\n")
            for bare in lines:
                line = bare + b"\n"
                if passing:
                    passing = False
                    _write_stderr(line)
                elif len(held) == 1 and line.startswith(_EPILOGUE_REASON):
                    held.append(line)
                else:
                    _write_stderr(b"".join(held))
                    held.clear()
                    if line.startswith(_EPILOGUE_HEADER) and b"stdout" in line:
                        held.append(line)
                    else:
                        _write_stderr(
                            _renamed(line.decode("utf-8", "surrogateescape"), rename).encode("utf-8", "surrogateescape")
                            if rename
                            else line
                        )
            expected = _EPILOGUE_REASON if len(held) == 1 else _EPILOGUE_HEADER
            if partial and (passing or not (partial.startswith(expected) or expected.startswith(partial))):
                _write_stderr(b"".join(held) + partial)
                held.clear()
                partial = b""
                passing = True
    if len(held) == 2 and not partial and _downstream_pipe_closed():
        return
    _write_stderr(b"".join(held) + partial)


def _write_stderr(data: bytes) -> None:
    try:
        descriptor = sys.stderr.fileno()
        while data:
            data = data[os.write(descriptor, data) :]
    except (OSError, ValueError):  # Our own stderr is gone; there is nowhere to relay to.
        pass


def _downstream_pipe_closed() -> bool:
    """Whether our stdout is a pipe whose reader has gone away.

    Polling the descriptor is the only way to tell a child that failed on a
    closed pipe from one that failed on its own account: both come back with a
    plain non-zero status, and a zero-length write raises nothing. A reader that
    hung up leaves the write end readable as POLLHUP (POLLERR on Linux) with
    POLLOUT gone.
    """
    poll = getattr(select, "poll", None)
    if poll is None:  # Windows.
        return False
    try:
        descriptor = sys.stdout.fileno()
    except (OSError, ValueError, AttributeError):
        return False
    poller = poll()
    poller.register(descriptor, select.POLLOUT)
    try:
        events = poller.poll(0)
    except OSError:
        return False
    return any(event & (select.POLLERR | select.POLLHUP) for _, event in events)


def _signals(*names: str) -> frozenset[int]:
    """The named signals that exist here — SIGBUS and SIGPIPE are absent on Windows."""
    return frozenset(member.value for name in names if (member := getattr(signal, name, None)) is not None)


#: Signals that mean the run was ended deliberately rather than failing: Ctrl-C,
#: and a closed downstream pipe such as `bea example | head`. These keep the
#: shell's 128+N convention and stay silent — the user already knows about the
#: first, and there is nowhere left to write about the second.
_QUIET_SIGNALS = _signals("SIGINT", "SIGPIPE")

#: Signals that mean the child crashed, as opposed to being told to stop.
_CRASH_SIGNALS = _signals("SIGSEGV", "SIGBUS", "SIGABRT", "SIGFPE", "SIGILL")

#: Signals a supervisor, a container stop or `timeout` uses to end a command,
#: and which the engine child has to hear about to clean up after itself.
_FORWARDED_SIGNALS = _signals("SIGINT", "SIGTERM", "SIGHUP")

#: The same for a child on inherited streams, which hears a terminal's Ctrl-C itself.
_STOP_SIGNALS = _signals("SIGTERM", "SIGHUP")


def _died_on_signal(number: int, command: list[str], ledger: Path | str | None = None) -> int:
    """Report a child killed by a signal as something the exit table documents.

    A child that dies on a signal usually writes nothing first, so passing the
    shell's 128+N straight through failed twice over: with an exit code outside
    the documented 0-4 table, and with nothing on either stream to say why.
    `bea check` on a ledger whose amount arithmetic divides by zero exited 139
    in complete silence, which is the one command whose whole job is to report
    what is wrong with a ledger. `ledger` is the one the child read, if any.
    """
    if number in _QUIET_SIGNALS:
        return 128 + number
    try:
        name = signal.Signals(number).name
    except ValueError:
        name = f"signal {number}"
    program = Path(command[0]).name
    raise BeaError(
        f"The Beancount engine ({program}) was killed by {name} and produced no result.",
        details=[_crash_location(number, ledger) or _signal_hint(number), f"Command: {' '.join(command)}"],
    )


def _ledger_argument(args: Sequence[str]) -> str | None:
    """The ledger a helper command reads: its `--file` value, ahead of any `--`."""
    for flag, value in zip(args, args[1:], strict=False):
        if flag == "--":
            return None
        if flag == "--file":
            return value
    return None


def _crash_location(number: int, ledger: Path | str | None) -> str | None:
    """`FILE:LINE` of the zero divisor a crashed load died on, when the ledger's files hold one.

    Upstream's parser segfaults on a zero divisor in an amount expression,
    so the child says nothing about where; the hint to search for `/0`
    found nothing for `120/(3-3)` or `100 / 0` (w1/354). Read only on this
    failure path, so a healthy load pays nothing. Every reachable plaintext
    file is scanned in include order with the scan `bea format` uses;
    encrypted members are skipped, as format skips them, and nothing found
    leaves the generic hint in place.
    """
    if number not in _CRASH_SIGNALS or not ledger:
        return None
    try:
        members, _ = output.walk_closure(Path(ledger))
    except (OSError, ValueError, BeaError):
        return None
    for member in members:
        if output.is_encrypted(member):
            continue
        try:
            text = member.read_text(encoding="utf-8", errors="replace").removeprefix("\ufeff")
        except OSError:
            continue
        line = crashing_divisor_line(text)
        if line is not None:
            return (
                f"{member}:{line}: Division by zero in an amount expression; Beancount's parser crashes on "
                "a zero divisor, so fix that amount and re-run."
            )
    return None


def _signal_hint(number: int) -> str:
    """The likely cause, which differs by how the child died."""
    if number in _CRASH_SIGNALS:
        return (
            "Upstream's parser crashes this way on a zero divisor in an amount expression, such as "
            "'100/0 EUR'; searching the ledger for '/0' is the first thing to try."
        )
    # The kernel sends these for a resource limit, which none of the outside
    # causes below does (w5/816).
    if number == getattr(signal, "SIGXCPU", None):
        return "The process used up its CPU-time limit (ulimit -t, RLIMIT_CPU); raise the limit and retry."
    if number == getattr(signal, "SIGXFSZ", None):
        return "A file grew past the file-size limit (ulimit -f, RLIMIT_FSIZE); raise the limit and retry."
    return "Nothing in bea sends this signal, so it came from outside: an out-of-memory killer, a timeout, or a kill."


def _popen(command: list[str], **options: Any) -> subprocess.Popen[Any]:
    """`subprocess.Popen`, naming what could not be started, and why, when a limit refuses it.

    Every engine-backed command printed a bare `[Errno 24] Too many open
    files` or `[Errno 35] Resource temporarily unavailable`, naming neither
    the engine nor the limit (w5/816).
    """
    try:
        return subprocess.Popen(command, **options)
    except OSError as exc:
        failure = _spawn_failure(command, exc)
        if failure is None:
            raise
        raise failure from exc


def _spawn_failure(command: Sequence[str], exc: OSError) -> BeaError | None:
    limit = provision.SPAWN_LIMITS.get(exc.errno) if exc.errno is not None else None
    if limit is None:
        return None
    what = "the Beancount engine" if "bea_engine" in command else Path(command[0]).name
    return BeaError(f"Could not start {what} ({exc.strerror}: {limit}); nothing was run.")


def _stream_is_captured(stream: Any) -> bool:
    """True when `stream` is not backed by an OS file descriptor."""
    try:
        stream.fileno()
    except Exception:
        return True
    return False
