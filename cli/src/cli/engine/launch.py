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

import json
import os
import signal
import subprocess
import sys
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from cli import context, output
from cli.engine import paths, provision
from cli.errors import BY_CATEGORY, BeaError, UsageError


def run_engine_argv(argv: Sequence[str]) -> int:
    """Run the engine helper with `argv`, streams inherited. Returns its exit code."""
    command, env = helper_command()
    return _spawn([*command, *argv], env)


def run_native(name: str, args: Sequence[str], *, env: dict[str, str] | None = None) -> int:
    """Run an upstream executable from the engine environment, streams inherited.

    `name` is the program as upstream installs it — `bean-check`, `bean-format`,
    `bean-query`, `bean-doctor`, `bean-example`, `treeify`, `bean-price`. The child
    gets this process's stdin, stdout and stderr, so the shell it was started from
    sees upstream's own output and status; an interactive program keeps its terminal.

    `env` replaces the child's environment when set; otherwise the process inherits
    (or, for checkout helpers, gets the checkout `PYTHONPATH` via other entry points).
    """
    return _spawn([str(native_command(name)), *args], env)


def require_feature(name: str) -> None:
    """Refuse optional-feature commands until the matching engine feature is available."""
    known = provision.optional_features()
    if name not in known:
        choices = ", ".join(sorted(known)) or "(none)"
        raise UsageError(f"Unknown engine feature '{name}'. Choose one of: {choices}.")
    if provision.feature_available(name):
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
) -> int:
    """Require an optional feature, then run its upstream executable."""
    require_feature(feature)
    return run_native(name, args, env=env)


def run_optional_script(feature: str, script: Path, args: Sequence[str]) -> int:
    """Require an optional feature, then run a user script with the engine interpreter.

    Beangulp's lifecycle lives in the user's ingest script (`Ingest(...)()`): we
    only choose the interpreter and forward `identify` / `extract` / `archive`
    plus the rest of the argv. The frontend never imports Beangulp.
    """
    require_feature(feature)
    if not script.is_file():
        raise UsageError(f"Ingest script not found: {script}")
    python = engine_python()
    env = _helper_env()
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


def capture_native(name: str, args: Sequence[str]) -> subprocess.CompletedProcess[str]:
    """Run an upstream executable and keep its output instead of inheriting the streams.

    For the two commands that must read the answer before they can render one:
    `bea check --json` turns `bean-check --json` into the frontend's envelope,
    and `bea format --check` compares the formatter's output against the file.
    Everything else should use `run_native` and let upstream own the streams.
    """
    return subprocess.run([str(native_command(name)), *args], capture_output=True, text=True, check=False)


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
    diagnostic = (completed.stderr or "").strip()
    tail = [line for line in diagnostic.splitlines() if line.strip()][-20:]
    reason = tail[-1] if tail else "No diagnostic was returned."
    if "Traceback (most recent call last)" in diagnostic:
        details: list[str] = []
        traceback_text: str | None = diagnostic or None
    else:
        details, traceback_text = tail[:-1], None
    raise BeaError(
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
    command, env = helper_command()
    return _run_helper([*command, *argv], env, None)


def native_command(name: str) -> Path:
    """The upstream executable `name`, resolved inside the engine environment.

    Same order as `helper_command`, and for the same reasons; see the module
    docstring. A checkout resolves it beside the interpreter running the
    frontend, which is where `uv sync` puts `bean-check` and friends.
    """
    filename = f"{name}.exe" if sys.platform == "win32" else name
    for directory in _candidate_bin_dirs():
        executable = directory / filename
        if executable.exists():
            return executable

    directory = paths.bin_dir_for(provision.ensure_engine())
    executable = directory / filename
    if not executable.exists():
        # Which installation to blame depends on which one was consulted. Under
        # an override those are different places, and the managed engine named
        # by `engine_root()` is neither the thing that failed nor the thing that
        # would be used next — advising its removal destroys a working engine
        # and leaves the override still pointing where it did. `require_feature`
        # above already branches this way.
        override = paths.python_override()
        if override is not None:
            raise BeaError(
                f"{paths.PYTHON_ENV}={override} names an environment with no '{name}' ({directory}). "
                f"Correct or unset {paths.PYTHON_ENV}, or run 'bea engine status' to see which engine would serve."
            )
        raise BeaError(
            f"The engine environment has no '{name}' ({directory}). "
            f"Remove {paths.engine_root()} and rerun to provision it again."
        )
    return executable


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


def helper_json(args: Sequence[str], *, stdin: str | None = None) -> dict[str, Any]:
    """Run a helper command and return its result, raising what it reports instead.

    The frontend renders: this hands back `data` from the envelope and turns a
    failure into the matching `cli.errors` exception, so a command reads like
    the in-process call it replaced.

    `stdin` carries a request the argument list cannot hold — a batch of
    transactions for `bea-engine add --request -`. Nothing is read back from
    stdin, so there is no deadlock to worry about: the child gets the whole
    request and then answers.
    """
    command, env = helper_command()
    completed = _run_helper([*command, *args], env, stdin)

    envelope = _parse(completed, args)
    if not envelope.get("ok"):
        failure = envelope.get("error") or {}
        category = str(failure.get("category", "validation"))
        # Load errors tolerated before a different failure — surface as warnings.
        tolerated = [str(error) for error in failure.get("ledger_errors", [])]
        if tolerated:
            output.render_ledger_errors(tolerated, allow=True)
        message = str(failure.get("message", "The engine reported a failure."))
        trace = failure.get("traceback")
        trace = trace if isinstance(trace, str) and trace else None
        if trace is not None and not context.current().debug:
            # The engine always sends the traceback and only `bea --debug` shows
            # it, so the advice to ask for one belongs on this side of the
            # boundary, where that flag is known.
            message = f"{message} Pass --debug before the command for a traceback."
        error = BY_CATEGORY.get(category, BeaError)(
            message,
            details=[str(detail) for detail in failure.get("details", [])],
        )
        result = failure.get("result")
        if isinstance(result, dict):
            error.result = result
        error.traceback = trace
        raise error

    if completed.stderr.strip():
        output.note(completed.stderr.rstrip())
    return dict(envelope.get("data") or {})


#: How long the helper gets to unwind once we pass a termination signal on. It
#: only has to drop a staged candidate file, so this is deliberately generous.
_CLEANUP_GRACE_SECONDS = 5.0


def _run_helper(command: list[str], env: dict[str, str] | None, stdin: str | None) -> subprocess.CompletedProcess[str]:
    """`subprocess.run`, except the child is told when the frontend is being stopped."""
    with subprocess.Popen(
        command,
        env=env,
        stdin=subprocess.PIPE if stdin is not None else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    ) as child:
        with _forwarding_teardown(child):
            out, err = child.communicate(stdin)
    return subprocess.CompletedProcess(command, child.returncode, out, err)


@contextmanager
def _forwarding_teardown(child: subprocess.Popen[str]) -> Iterator[None]:
    """Pass a termination signal on to `child`, and let it unwind before we go.

    The engine stages every write into a `.bea-*.tmp` candidate beside the
    ledger and drops it in a `finally`. That cleanup only runs if the child is
    told to stop. A terminal delivers Ctrl-C to the whole foreground process
    group, so interactive use was always fine — but a supervisor, a container
    stopping its main pid, `timeout` or `Popen.terminate()` signals the
    frontend alone, and the orphaned child left a full-size copy of the ledger
    beside the user's books on every attempt.

    Handlers are installed only for the child's lifetime and restored after, so
    nothing else in the process changes its interrupt behaviour. Once the child
    is done we re-raise the signal with its default disposition, which keeps the
    status the shell reports exactly what it was.
    """
    if not _FORWARDED_SIGNALS:
        yield
        return

    def forward(number: int, _frame: Any) -> None:
        child.send_signal(number)
        try:
            child.wait(timeout=_CLEANUP_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            child.kill()
        signal.signal(number, signal.SIG_DFL)
        os.kill(os.getpid(), number)

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
        yield
    finally:
        for number, previous in installed:
            try:
                signal.signal(number, previous)
            except (OSError, ValueError):
                pass


def _parse(completed: subprocess.CompletedProcess[str], args: Sequence[str]) -> dict[str, Any]:
    """Read the one JSON object the protocol promises on stdout."""
    try:
        envelope = json.loads(completed.stdout)
    except ValueError:
        # No envelope at all: the engine died before it could answer, or it is
        # not the program we think it is. Its own output is the only evidence,
        # so it becomes the details rather than being swallowed.
        printed = [line for line in (completed.stderr or completed.stdout).splitlines() if line.strip()][-20:]
        if completed.returncode < 0:
            # Killed by a signal: the child printed nothing to carry the
            # explanation, so name the signal and what usually causes it.
            number = -completed.returncode
            try:
                name = signal.Signals(number).name
            except ValueError:
                name = f"signal {number}"
            raise BeaError(
                f"The Beancount engine was killed by {name} answering "
                f"'bea-engine {' '.join(args)}' and produced no result.",
                details=[*printed, _signal_hint(number)],
            ) from None
        raise BeaError(
            f"The Beancount engine did not answer 'bea-engine {' '.join(args)}' (exit {completed.returncode}).",
            details=printed,
        ) from None
    if not isinstance(envelope, dict):
        raise BeaError(f"The Beancount engine answered with {type(envelope).__name__}, not a result object.")
    return envelope


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
    return [str(python), "-m", "bea_engine"]


def _helper_env(source_root: Path | None = None) -> dict[str, str] | None:
    """Expose bundled helper sources only to child interpreters.

    Checkouts use src; installed releases use cli/_runtime. Neither adds the
    frontend site-packages (or its AI SDKs) to the managed interpreter's path.

    The global managed-price modes travel here too, so every load-bearing
    helper call honors `--offline` / `--strict-prices` without threading
    them through each command's argv. Flags win over the process environment;
    without them the child's environment is exactly what was inherited.
    """
    root = source_root if source_root is not None else paths.helper_source_root()
    if root is None:
        return None
    inherited = os.environ.get("PYTHONPATH", "")
    search_path = os.pathsep.join([str(root), inherited]) if inherited else str(root)
    env = {**os.environ, "PYTHONPATH": search_path}
    current = context.current()
    if current.offline:
        env["MANAGED_PRICE_OFFLINE"] = "1"
    if current.strict_prices:
        env["MANAGED_PRICE_STRICT"] = "1"
    return env


def _spawn(command: list[str], env: dict[str, str] | None) -> int:
    """Run a child with the caller's streams and working directory, and report its status.

    Streams are inherited when they are real OS file descriptors so an
    interactive program still sees a terminal and a pipe still streams. When
    the frontend's stdout/stderr have been replaced (CliRunner's StringIO in
    tests, or anything else without a fileno), inheritance would write past
    those objects to the process's original fds — so we capture and write
    through `sys.stdout` / `sys.stderr` instead, which is what the caller is
    actually reading.
    """
    if _stream_is_captured(sys.stdout) or _stream_is_captured(sys.stderr):
        captured = subprocess.run(command, env=env, capture_output=True, text=True, check=False)
        if captured.stdout:
            sys.stdout.write(captured.stdout)
        if captured.stderr:
            sys.stderr.write(captured.stderr)
        returncode = captured.returncode
    else:
        inherited = subprocess.run(command, env=env, check=False)
        returncode = inherited.returncode
    if returncode < 0:
        return _died_on_signal(-returncode, command)
    return returncode


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


def _died_on_signal(number: int, command: list[str]) -> int:
    """Report a child killed by a signal as something the exit table documents.

    A child that dies on a signal usually writes nothing first, so passing the
    shell's 128+N straight through failed twice over: with an exit code outside
    the documented 0-4 table, and with nothing on either stream to say why.
    `bea check` on a ledger whose amount arithmetic divides by zero exited 139
    in complete silence, which is the one command whose whole job is to report
    what is wrong with a ledger.
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
        details=[_signal_hint(number), f"Command: {' '.join(command)}"],
    )


def _signal_hint(number: int) -> str:
    """The likely cause, which differs by how the child died."""
    if number in _CRASH_SIGNALS:
        return (
            "Upstream's parser crashes this way on a zero divisor in an amount expression, such as "
            "'100/0 EUR'; searching the ledger for '/0' is the first thing to try."
        )
    return "Nothing in bea sends this signal, so it came from outside: an out-of-memory killer, a timeout, or a kill."


def _stream_is_captured(stream: Any) -> bool:
    """True when `stream` is not backed by an OS file descriptor."""
    try:
        stream.fileno()
    except Exception:
        return True
    return False
