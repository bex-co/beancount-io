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
   wheel, which ships no `bea_engine` (`paths.checkout_source_root`).
4. Provisioning a new engine.

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
import subprocess
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from cli import output
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
    env = _checkout_env()
    return _spawn([str(python), str(script), *args], env)


def engine_python() -> Path:
    """The interpreter that will run engine programs for this process."""
    override = paths.python_override()
    if override is not None:
        return override
    root = paths.engine_root()
    if paths.is_provisioned(root):
        return paths.venv_python(root)
    if paths.checkout_source_root() is not None:
        return Path(sys.executable)
    return provision.ensure_engine()


def capture_native(name: str, args: Sequence[str]) -> subprocess.CompletedProcess[str]:
    """Run an upstream executable and keep its output instead of inheriting the streams.

    For the two commands that must read the answer before they can render one:
    `bea check --json` turns `bean-check --json` into the frontend's envelope,
    and `bea format --check` compares the formatter's output against the file.
    Everything else should use `run_native` and let upstream own the streams.
    """
    return subprocess.run([str(native_command(name)), *args], capture_output=True, text=True, check=False)


def native_command(name: str) -> Path:
    """The upstream executable `name`, resolved inside the engine environment.

    Same order as `helper_command`, and for the same reasons; see the module
    docstring. A checkout resolves it beside the interpreter running the
    frontend, which is where `uv sync` puts `bean-check` and friends.
    """
    for directory in _candidate_bin_dirs():
        executable = directory / name
        if executable.exists():
            return executable

    directory = paths.bin_dir_for(provision.ensure_engine())
    executable = directory / name
    if not executable.exists():
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
    completed = subprocess.run([*command, *args], env=env, input=stdin, capture_output=True, text=True, check=False)

    envelope = _parse(completed, args)
    if not envelope.get("ok"):
        failure = envelope.get("error") or {}
        category = str(failure.get("category", "validation"))
        # Load errors tolerated before a different failure — surface as warnings.
        tolerated = [str(error) for error in failure.get("ledger_errors", [])]
        if tolerated:
            output.render_ledger_errors(tolerated, allow=True)
        error = BY_CATEGORY.get(category, BeaError)(
            str(failure.get("message", "The engine reported a failure.")),
            details=[str(detail) for detail in failure.get("details", [])],
        )
        result = failure.get("result")
        if isinstance(result, dict):
            error.result = result
        trace = failure.get("traceback")
        if isinstance(trace, str) and trace:
            error.traceback = trace
        raise error

    if completed.stderr.strip():
        output.note(completed.stderr.rstrip())
    return dict(envelope.get("data") or {})


def _parse(completed: subprocess.CompletedProcess[str], args: Sequence[str]) -> dict[str, Any]:
    """Read the one JSON object the protocol promises on stdout."""
    try:
        envelope = json.loads(completed.stdout)
    except ValueError:
        # No envelope at all: the engine died before it could answer, or it is
        # not the program we think it is. Its own output is the only evidence,
        # so it becomes the details rather than being swallowed.
        raise BeaError(
            f"The Beancount engine did not answer 'bea-engine {' '.join(args)}' (exit {completed.returncode}).",
            details=[line for line in (completed.stderr or completed.stdout).splitlines() if line.strip()][-20:],
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
    return _module_command(engine_python()), _checkout_env()


def _module_command(python: Path) -> list[str]:
    return [str(python), "-m", "bea_engine"]


def _checkout_env(source_root: Path | None = None) -> dict[str, str] | None:
    """Put a checkout's `cli/src` first on `PYTHONPATH`, or leave the env alone.

    Needed both for the no-venv transition path and when a provisioned
    interpreter still has an older `bea_engine` installed: the child must load
    the helper under edit, not whatever was last pip-installed into the venv.
    """
    root = source_root if source_root is not None else paths.checkout_source_root()
    if root is None:
        return None
    inherited = os.environ.get("PYTHONPATH", "")
    search_path = os.pathsep.join([str(root), inherited]) if inherited else str(root)
    return {**os.environ, "PYTHONPATH": search_path}


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
    # A child killed by a signal reports -N; a shell reports 128+N, and `bea`
    # is what the shell sees.
    return 128 - returncode if returncode < 0 else returncode


def _stream_is_captured(stream: Any) -> bool:
    """True when `stream` is not backed by an OS file descriptor."""
    try:
        stream.fileno()
    except Exception:
        return True
    return False
