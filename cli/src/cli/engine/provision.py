"""Install the managed engine environment, once, on first use.

ADR014 promises one customer installation: nobody installs Beancount or
Beanquery themselves, and there is no separate setup command. So the first
local command that needs the engine builds it here and every later command
reuses it offline.

Two properties make the reuse safe. Installing happens in a sibling `.partial`
directory that is renamed into place only after it succeeds, so an interrupted
or failed provision never leaves a half-built environment that later runs
would trust. And the destination is versioned (`paths.engine_root`), so a
future engine lands beside the current one instead of replacing it underneath a
running command.

Release artifacts ship `engine-requirements.lock` (see `make engine-release-lock`);
when that lock ships inside the installed package or sits in the checkout, installs
use `--require-hashes`, and a shipped lock that cannot be used stops the install
rather than dropping the hashes. Checkouts without the lock fall back to the version pins
in `manifest.json` while the helper sources always come from this beancount-io installation.

Optional Beangulp / Beanprice features (ADR012, ADR014 m20) stay out of the
base profile. `bea engine enable <feature>` installs a reviewed, hash-pinned
extra into the managed engine venv and records it so repairs re-apply it.
"""

from __future__ import annotations

import errno
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from importlib import resources
from pathlib import Path
from typing import Any

from cli import context, output
from cli.engine import paths
from cli.errors import AuthError, BeaError, ConflictError, EngineError, UsageError
from cli.paths import expand_path

UV_ENV = "BEA_UV"
FEATURES_FILE = "bea-features.json"


def ensure_engine() -> Path:
    """Return the engine interpreter, installing the environment if it is missing."""
    override = paths.python_override()
    if override is not None:
        return override

    root = paths.engine_root()
    if not paths.is_provisioned(root):
        _refuse_offline_install(root)
        with provisioning_lock(root):
            # Another command may have finished provisioning while we waited.
            if not paths.is_provisioned(root):
                provision(root)
    return paths.venv_python(root)


def _refuse_offline_install(root: Path) -> None:
    if context.current().offline:
        raise UsageError(
            f"The Beancount engine is not installed at {root}; installing it requires network access. "
            "Rerun without --offline once with network access, then reuse the installed engine offline."
        )


#: How long a command queues behind another bea's engine install before it
#: gives up, when it first says so, and how often it retries. Mirrors the
#: write lock's notice and limit (w5/182): a stalled install must not hang
#: every later command behind it without a word (w5/787).
_PROVISION_LOCK_TIMEOUT = 60.0
_PROVISION_LOCK_NOTICE_SECONDS = 1.0
_PROVISION_LOCK_POLL_SECONDS = 0.05


def _unwritable_engine_dir(root: Path, exc: OSError) -> AuthError:
    """The exit-3 refusal for a data directory bea cannot install into."""
    variable = paths.DIR_ENV if os.environ.get(paths.DIR_ENV) else "XDG_DATA_HOME"
    return AuthError(
        f"Cannot install the Beancount engine: the directory {root.parent} cannot be created or is not "
        f"writable ({exc.strerror or exc}). Make it a writable directory or set {variable} to one before retrying."
    )


@contextmanager
def provisioning_lock(root: Path) -> Iterator[None]:
    """Hold the exclusive lock for changing the engine at `root`.

    Commands started together on a fresh install would otherwise each build
    an engine and each move the other's freshly published one aside — out
    from under a command already running it. The lock file sits beside the
    root and is never removed, so every waiter locks the same inode.
    """
    lock = root.with_name(f"{root.name}.lock")
    try:
        root.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(lock, os.O_RDWR | os.O_CREAT, 0o600)
    except OSError as exc:
        raise _unwritable_engine_dir(root, exc) from exc
    with os.fdopen(fd, "r+b") as stream:
        if sys.platform == "win32":
            import msvcrt

            if not os.fstat(stream.fileno()).st_size:
                try:
                    stream.write(b"\0")
                    stream.flush()
                except OSError as exc:
                    raise _unwritable_engine_dir(root, exc) from exc
        else:
            import fcntl

        started = time.monotonic()
        announced = False
        while True:
            try:
                if sys.platform == "win32":
                    stream.seek(0)
                    msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError as exc:
                if sys.platform != "win32" and not isinstance(exc, BlockingIOError):
                    raise _unwritable_engine_dir(root, exc) from exc
            waited = time.monotonic() - started
            if _PROVISION_LOCK_TIMEOUT <= waited:
                raise ConflictError(
                    f"Timed out after {_PROVISION_LOCK_TIMEOUT:g} seconds waiting for another bea to finish "
                    f"installing the engine at {root}. Retry once that install has finished."
                )
            if not announced and waited >= _PROVISION_LOCK_NOTICE_SECONDS:
                announced = True
                output.note(
                    f"Waiting up to {_PROVISION_LOCK_TIMEOUT:g} seconds for another bea to finish installing "
                    f"the engine at {root} ..."
                )
            time.sleep(_PROVISION_LOCK_POLL_SECONDS)
        try:
            yield
        finally:
            if sys.platform == "win32":
                stream.seek(0)
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def provision(root: Path) -> None:
    """Build the engine environment at `root`, atomically.

    Callers hold `provisioning_lock(root)`.

    Whatever is already at `root` stays there until its replacement is
    complete, so a failed rebuild (offline, no uv, a bad package) keeps the
    engine commands were using. Optional features recorded in it are
    reinstalled into the replacement before it is published.
    """
    _refuse_offline_install(root)
    _refuse_foreign_root(root)
    uv = _find_uv()
    remembered = enabled_features(root)
    version = paths.engine_version()
    manifest = paths.manifest()

    # Per-process, so an interrupted build is attributable to its pid.
    partial = root.with_name(f"{root.name}.partial.{os.getpid()}")
    partial.parent.mkdir(parents=True, exist_ok=True)
    _sweep_abandoned(root)

    output.note(f"Installing the Beancount engine {version} (one time) in {root}...")
    try:
        _run(
            # `--relocatable` is what makes the rename below survivable. A
            # normal venv bakes its own absolute path into the shebang of every
            # console script, so `bean-check` and friends would point at the
            # `.partial` directory that no longer exists; a relocatable one
            # resolves its interpreter relative to the script.
            [uv, "venv", "--relocatable", "--python", str(manifest["requires_python"]), str(partial)],
            failure=f"Could not create the engine environment in {partial}",
        )
        (partial / ENGINE_MARKER).write_text(f"bea engine {version}\n", encoding="utf-8")
        python = str(paths.venv_python(partial))
        lock = _lockfile()
        if lock is not None:
            # Released frontend: hash-pinned transitive graph, then the helper
            # wheel with --no-deps so pip does not re-resolve unhashed edges.
            _run(
                [
                    uv,
                    "pip",
                    "install",
                    "--python",
                    python,
                    "--require-hashes",
                    "--only-binary",
                    ":all:",
                    "-r",
                    str(lock),
                ],
                failure="Could not install the hash-pinned engine packages",
            )
        else:
            _run(
                [uv, "pip", "install", "--python", python, *_requirements()],
                failure="Could not install the engine's packages",
            )
        for name in sorted(remembered):
            _install_feature(partial, name)
            _record_feature(partial, name)
        _publish(partial, root)
    except BaseException:
        shutil.rmtree(partial, ignore_errors=True)
        raise
    # A writer that died since the pre-build sweep left a partial no future
    # provision will see; remove it while provisioning still runs (w5/786).
    # One still running can still rebuild its directory afterwards — SIGKILL
    # cannot be forwarded — but it must now outlive the whole build to do so.
    _sweep_abandoned(root)
    _prune_other_versions(root)
    output.note(f"Beancount engine {version} ready.")


def _prune_other_versions(root: Path) -> None:
    """Remove engine versions a successful provision just superseded (w5/788).

    Each version lives in its own directory, so an upgrade that provisions a
    new one would otherwise leave the old tens of megabytes behind forever.
    Only directories bea marked are removed — never an unmarked one, which
    predates the marker or is not bea's — and lock files stay: a build of
    that version still running elsewhere waits on its lock's inode.
    """
    try:
        siblings = list(root.parent.iterdir())
    except OSError:
        return
    for sibling in siblings:
        if sibling.name == root.name or not sibling.is_dir():
            continue
        if not (sibling / ENGINE_MARKER).is_file():
            continue
        shutil.rmtree(sibling, ignore_errors=True)
        if not sibling.exists():
            output.note(f"Removed superseded Beancount engine {sibling.name}.")


def optional_features() -> dict[str, dict[str, Any]]:
    """Reviewed optional engine features from the shipped manifest."""
    raw = paths.manifest().get("optional") or {}
    if not isinstance(raw, dict):
        return {}
    return {str(name): dict(spec) for name, spec in raw.items() if isinstance(spec, dict)}


def enabled_features(root: Path | None = None) -> set[str]:
    """Features previously enabled in the managed engine at `root`."""
    target = root if root is not None else paths.engine_root()
    path = target / FEATURES_FILE
    if not path.is_file():
        return set()
    try:
        payload = json.loads(path.read_text())
    except (OSError, ValueError):
        return set()
    names = payload.get("enabled") if isinstance(payload, dict) else None
    if not isinstance(names, list):
        return set()
    known = optional_features()
    return {str(name) for name in names if str(name) in known}


def enable_feature(name: str) -> tuple[bool, set[str]]:
    """Provision `name` into the managed engine and remember it across repairs.

    Always targets the managed engine directory — never the frontend interpreter
    and never `$BEA_ENGINE_PYTHON`, which is an escape hatch outside bea's
    ownership.

    Returns `(changed, enabled_features)`. `changed` is False when the feature
    was already present so callers can avoid claiming a fresh enable.
    """
    context.current().require_network("engine enable")
    if paths.python_override() is not None:
        raise UsageError(
            f"Cannot enable engine feature '{name}' while {paths.PYTHON_ENV} is set. "
            "Unset it to use the managed engine, then rerun 'bea engine enable'."
        )
    known = optional_features()
    if name not in known:
        choices = ", ".join(sorted(known)) or "(none)"
        raise UsageError(f"Unknown engine feature '{name}'. Choose one of: {choices}.")

    root = paths.engine_root()
    with provisioning_lock(root):
        if not paths.is_provisioned(root):
            provision(root)
        else:
            # A damaged base would record the feature into a broken engine
            # (or blame the feature for not importing); refuse it as damaged
            # instead (w5/785). Deferred: launch imports this module.
            from cli.engine.launch import refuse_unusable_engine

            refuse_unusable_engine()

        already = enabled_features(root)
        if name in already and _feature_present(root, name):
            output.note(f"Engine feature '{name}' is already enabled.")
            return False, already

        output.note(f"Enabling engine feature '{name}' in {root}...")
        _install_feature(root, name)
        recorded = _record_feature(root, name)
    output.note(f"Engine feature '{name}' ready.")
    return True, recorded


def feature_available(name: str) -> bool:
    """Whether `name`'s packages are importable in the interpreter commands will use.

    An explicit `$BEA_ENGINE_PYTHON` is checked directly. A provisioned managed
    engine counts as available when the feature was enabled (or its packages are
    already present). A checkout without a managed engine falls through to this
    process's interpreter — useful for developers who installed the optional
    packages into their working environment.
    """
    packages = _feature_packages(name)
    if not packages:
        return False
    override = paths.python_override()
    if override is not None:
        return _packages_importable(override, packages)
    root = paths.engine_root()
    if paths.is_provisioned(root):
        return _feature_present(root, name)
    if paths.checkout_source_root() is not None:
        return _packages_importable(Path(sys.executable), packages)
    return False


def feature_status() -> dict[str, Any]:
    """Report base engine readiness and each optional feature's state."""
    override = paths.python_override()
    root = paths.engine_root()
    provisioned = override is not None or paths.is_provisioned(root)
    enabled = set() if override is not None else enabled_features(root)
    features: dict[str, Any] = {}
    for name, spec in sorted(optional_features().items()):
        try:
            present: bool | None = feature_available(name)
        except ProbeNotRun:
            present = None
        features[name] = {
            "enabled": name in enabled,
            "present": present,
            "license": spec.get("license"),
            "notes": spec.get("notes"),
            "requirements": list(spec.get("requirements") or []),
        }
    return {
        "engine_version": paths.engine_version(),
        "engine_root": None if override is not None else str(root),
        "python_override": str(override) if override is not None else None,
        "provisioned": provisioned,
        "features": features,
    }


def _install_feature(root: Path, name: str) -> None:
    """Install one optional feature into an already-provisioned engine root."""
    spec = optional_features()[name]
    uv = _find_uv()
    python = str(paths.venv_python(root))
    lock = _find_packaged_file(str(spec.get("lockfile") or ""))
    if lock is not None:
        _run(
            [
                uv,
                "pip",
                "install",
                "--python",
                python,
                "--require-hashes",
                "--only-binary",
                ":all:",
                "-r",
                str(lock),
            ],
            failure=f"Could not install the hash-pinned engine feature '{name}'",
        )
    else:
        requirements = [str(item) for item in spec.get("requirements") or []]
        if not requirements:
            raise EngineError(f"Engine feature '{name}' has no requirements in the manifest.")
        _run(
            [uv, "pip", "install", "--python", python, *requirements],
            failure=f"Could not install engine feature '{name}'",
        )
    if not _feature_present(root, name):
        raise EngineError(
            f"Engine feature '{name}' installed but its packages are not importable.",
            details=[f"Expected packages: {', '.join(_feature_packages(name))}"],
        )


def _feature_packages(name: str) -> list[str]:
    spec = optional_features().get(name) or {}
    return [str(item) for item in spec.get("packages") or ([name] if name in optional_features() else [])]


def _feature_present(root: Path, name: str) -> bool:
    return _packages_importable(paths.venv_python(root), _feature_packages(name))


#: What a refused spawn's errno says about the limit behind it.
SPAWN_LIMITS = {
    errno.EMFILE: "the open-file limit is reached (ulimit -n)",
    errno.ENFILE: "the system's open-file table is full",
    errno.EAGAIN: "the process limit is reached (ulimit -u)",
    errno.ENOMEM: "there is not enough memory to start it",
}


class ProbeNotRun(BeaError):
    """A probe a process or descriptor limit kept from starting: it says nothing about the engine.

    Read as a failed probe, a working engine was called damaged, with advice
    to delete it, and its features absent (w5/815).
    """

    def __init__(self, exc: OSError) -> None:
        super().__init__(f"the check could not start ({exc.strerror}: {SPAWN_LIMITS[exc.errno or 0]})")


def _packages_importable(python: Path, packages: list[str]) -> bool:
    if not packages:
        return False
    sentinel = "bea-packages-imported"
    probe = ";".join([*(f"import {package}" for package in packages), f"print({sentinel!r})"])
    # `-P`: `-c` would otherwise put the working directory first on the module
    # path, so a `beanprice.py` in whatever folder bea ran from was executed
    # and a folder of that name made the feature look installed (w5/174).
    try:
        completed = subprocess.run([str(python), "-P", "-c", probe], capture_output=True, text=True, check=False)
    except OSError as exc:
        if exc.errno in SPAWN_LIMITS:
            raise ProbeNotRun(exc) from exc
        return False
    except ValueError:
        return False
    # The import must say so itself: `/usr/bin/true` exits 0 having run
    # nothing, and its features read as present (w5/481).
    return completed.returncode == 0 and completed.stdout.strip().endswith(sentinel)


def _record_feature(root: Path, name: str) -> set[str]:
    enabled = enabled_features(root)
    enabled.add(name)
    path = root / FEATURES_FILE
    path.write_text(json.dumps({"enabled": sorted(enabled)}, indent=2, sort_keys=True) + "\n")
    return enabled


def _lockfile() -> Path | None:
    """Locate `engine-requirements.lock` next to the installed package or checkout."""
    name = str(paths.manifest().get("lockfile") or "engine-requirements.lock")
    return _find_packaged_file(name)


def _find_packaged_file(name: str) -> Path | None:
    """Locate a release lock shipped with this installation or checkout.

    None means this installation ships no such lock (a checkout before
    `make release-lock`), which is the only case allowed to fall back to the
    manifest's version pins. A lock that ships but cannot be handed to uv is
    an error: falling back would quietly drop hash verification.
    """
    if not name:
        return None
    # Checkout: cli/<name> (generated by make engine-release-lock).
    checkout = paths.checkout_source_root()
    if checkout is not None:
        candidate = checkout.parent / name
        if candidate.is_file():
            return candidate
    # Installed wheel: the build hook ships the locks inside the `cli` package.
    installed = Path(__file__).resolve().parents[1] / name
    if installed.is_file():
        return installed
    try:
        traversable = resources.files("cli").joinpath(name)
        shipped = traversable.is_file()
    except (FileNotFoundError, TypeError, AttributeError, OSError):
        return None
    if not shipped:
        return None
    if isinstance(traversable, Path):
        return traversable
    # A zipped install: uv needs a real file. Named by content, so a copy from
    # another bea version is never mistaken for this one, and written through
    # a temporary name so a reader never sees a partial file.
    data = traversable.read_bytes()
    digest = hashlib.sha256(data).hexdigest()[:16]
    cache = paths.engine_root().parent / f"{Path(name).stem}-{digest}{Path(name).suffix}"
    try:
        if cache.is_file() and cache.read_bytes() == data:
            return cache
        cache.parent.mkdir(parents=True, exist_ok=True)
        staged = cache.with_name(f"{cache.name}.{os.getpid()}.tmp")
        staged.write_bytes(data)
        os.replace(staged, cache)
    except OSError as exc:
        raise EngineError(
            f"Could not prepare the hash-pinned {name} for the engine install at {cache}: {exc.strerror or exc}.",
            details=["Make that directory writable, or set BEA_ENGINE_DIR to a writable location."],
        ) from exc
    return cache


def _sweep_abandoned(root: Path) -> None:
    """Remove scratch directories left beside `root` by builds that died.

    A build killed by SIGTERM or SIGHUP (a closed terminal) never reaches its
    cleanup, leaving a `.partial.<pid>` engine of tens of megabytes behind.
    Called under the provisioning lock; a directory whose process is still
    alive is left alone, since an older bea without the lock may own it.
    """
    for prefix in (f"{root.name}.partial.", f"{root.name}.discarded.", f"{root.name}.repair-discard."):
        for path in root.parent.glob(f"{prefix}*"):
            suffix = path.name[len(prefix) :]
            if not suffix.isdigit():
                continue
            pid = int(suffix)
            if pid == os.getpid() or not _process_alive(pid):
                shutil.rmtree(path, ignore_errors=True)


def _process_alive(pid: int) -> bool:
    if sys.platform == "win32":
        # `os.kill` on Windows terminates rather than probes.
        return _windows_process_alive(pid)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


#: Windows constants for the liveness probe below.
_PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
_STILL_ACTIVE = 259
_ERROR_ACCESS_DENIED = 5
_ERROR_INVALID_PARAMETER = 87


def _windows_process_alive(pid: int, kernel32: Any = None) -> bool:
    """Whether a process id is a running process, probed with `OpenProcess` (w5/1111).

    A refused open means the process exists but is not ours to inspect; an
    unknown id means it is gone. Anything unclear counts as alive, since a
    wrongly kept scratch directory costs disk and a wrongly removed one costs
    another build's work.
    """
    if kernel32 is None:
        import ctypes
        from ctypes import wintypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)  # type: ignore[attr-defined]
        kernel32.OpenProcess.restype = wintypes.HANDLE
    handle = kernel32.OpenProcess(_PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        import ctypes

        return bool(ctypes.get_last_error() != _ERROR_INVALID_PARAMETER)  # type: ignore[attr-defined]
    try:
        import ctypes

        code = ctypes.c_ulong()
        if not kernel32.GetExitCodeProcess(handle, ctypes.byref(code)):
            return True
        return code.value == _STILL_ACTIVE
    finally:
        kernel32.CloseHandle(handle)


#: Written into every engine bea builds: what tells a later rebuild that the
#: directory is bea's to replace (w5/419).
ENGINE_MARKER = ".bea-engine"


def _refuse_foreign_root(root: Path) -> None:
    """Refuse to build an engine over a directory bea did not make.

    A rebuild replaces `root` and deletes what was there, and `BEA_ENGINE_DIR`
    is taken as given: a typo naming a data folder (`~/books`) would have
    been deleted once the install succeeded (w5/419). Only nothing, an empty
    directory, an engine bea marked, or bea's own default location (whose
    engines from before the marker carry none) is replaced.
    """
    if not os.path.lexists(root):
        return
    if root.is_dir():
        if (root / ENGINE_MARKER).is_file() or not any(root.iterdir()):
            return
        if not os.environ.get(paths.DIR_ENV):
            return
        reason = "holds files but no engine bea built"
    else:
        reason = "is not a directory"
    if os.environ.get(paths.DIR_ENV):
        raise EngineError(
            f"{paths.DIR_ENV} points at '{root}', which {reason}, so bea will not install an engine over it. "
            f"Point {paths.DIR_ENV} at an empty or new directory, or unset it."
        )
    raise EngineError(
        f"The engine location '{root}' {reason}, so bea will not install over it. Move it aside, then rerun."
    )


#: Windows (Defender, the indexer) keeps a just-built environment open for up to about half a minute after
#: `uv pip install` returns, and a rename of it fails until it lets go (w5/1111).
_RENAME_ATTEMPTS = 12
_RENAME_FIRST_DELAY = 0.5
_RENAME_MAX_DELAY = 8.0
_WINERROR_ACCESS_DENIED = 5
_WINERROR_SHARING_VIOLATION = 32


def _replace_patiently(source: Path, target: Path) -> None:
    """`os.replace`, retried with backoff on Windows while a scanner still holds the files."""
    delay = _RENAME_FIRST_DELAY
    for attempt in range(_RENAME_ATTEMPTS):
        try:
            os.replace(source, target)
            return
        except OSError as exc:
            transient = sys.platform == "win32" and (
                isinstance(exc, PermissionError)
                or getattr(exc, "winerror", None) in (_WINERROR_ACCESS_DENIED, _WINERROR_SHARING_VIOLATION)
            )
            if not transient or attempt == _RENAME_ATTEMPTS - 1:
                raise
            time.sleep(delay)
            delay = min(delay * 2, _RENAME_MAX_DELAY)


def _publish(partial: Path, root: Path) -> None:
    """Move a finished environment into place under the name commands look for."""
    try:
        if root.exists():
            # Something unusable is already there — under the provisioning
            # lock we only build when `is_provisioned` said no. Move it out of
            # the way first, because renaming onto a non-empty directory fails.
            discarded = root.with_name(f"{root.name}.discarded.{os.getpid()}")
            os.replace(root, discarded)
            shutil.rmtree(discarded, ignore_errors=True)
        _replace_patiently(partial, root)
    except OSError as exc:
        raise EngineError(f"Could not move the finished engine into place at {root}: {exc.strerror or exc}.") from exc


def _requirements() -> list[str]:
    """Version-pin list used when no hash lock is available (checkouts / tests).

    Prefer the two-step hashed install in `provision()` for released frontends.
    """
    manifest = paths.manifest()
    return [str(spec) for spec in manifest["requirements"]]


def _find_uv() -> str:
    """Locate uv, which builds the environment."""
    override = os.environ.get(UV_ENV)
    if override:
        # Checked here rather than left to `subprocess`, whose FileNotFoundError
        # names the path but never the variable that supplied it — which is the
        # only part a user with an inherited profile or CI image cannot guess.
        # `paths.python_override()` validates its own variable the same way.
        expanded = expand_path(Path(override), f"${UV_ENV}")
        if not expanded.exists():
            raise EngineError(f"{UV_ENV} points at '{override}', which does not exist.")
        return str(expanded)
    found = shutil.which("uv")
    if found:
        return found
    raise EngineError(
        "The Beancount engine needs uv to install, and uv was not found on PATH. "
        "Install it from https://docs.astral.sh/uv/ or set BEA_UV to its path."
    )


#: What a failed install says last: the fix is network and uv, then a retry,
#: not a manual Beancount install. Shared with `bea upgrade`, which appends
#: the same line when its own engine refresh fails (w5/788).
RETRY_ONCE_ONLINE = "Retry with a local command such as 'bea check' once the network and uv are available."


def _run(command: list[str], *, failure: str) -> None:
    """Run one provisioning step, keeping its output for the error message.

    Captured rather than inherited: in JSON mode the frontend's stderr must
    stay a single parseable object, and uv is chatty. On failure the output is
    what explains it, so it becomes the error's details. A stop aimed at bea
    alone still stops uv: a bare `subprocess.run` orphaned it, and a retry in
    that window left a partial directory that survived forever (w5/786).
    """
    # Deferred: launch imports this module.
    from cli.engine.launch import run_captured

    completed = run_captured(command)
    if completed.returncode != 0:
        details = [line for line in (completed.stderr or completed.stdout or "").splitlines() if line.strip()]
        raise EngineError(f"{failure} (uv exited {completed.returncode}).", details=[*details[-20:], RETRY_ONCE_ONLINE])
