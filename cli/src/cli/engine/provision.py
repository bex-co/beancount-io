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

import hashlib
import json
import os
import shutil
import subprocess
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from importlib import resources
from pathlib import Path
from typing import Any

from cli import output
from cli.engine import paths
from cli.errors import BeaError, UsageError

UV_ENV = "BEA_UV"
FEATURES_FILE = "bea-features.json"


def ensure_engine() -> Path:
    """Return the engine interpreter, installing the environment if it is missing."""
    override = paths.python_override()
    if override is not None:
        return override

    root = paths.engine_root()
    if not paths.is_provisioned(root):
        with provisioning_lock(root):
            # Another command may have finished provisioning while we waited.
            if not paths.is_provisioned(root):
                provision(root)
    return paths.venv_python(root)


@contextmanager
def provisioning_lock(root: Path) -> Iterator[None]:
    """Hold the exclusive lock for changing the engine at `root`.

    Commands started together on a fresh install would otherwise each build
    an engine and each move the other's freshly published one aside — out
    from under a command already running it. The lock file sits beside the
    root and is never removed, so every waiter locks the same inode.
    """
    root.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(root.with_name(f"{root.name}.lock"), os.O_RDWR | os.O_CREAT, 0o600)
    with os.fdopen(fd, "r+b") as stream:
        if sys.platform == "win32":
            import msvcrt

            if not os.fstat(stream.fileno()).st_size:
                stream.write(b"\0")
                stream.flush()
            stream.seek(0)
            msvcrt.locking(stream.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl

            fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
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
    output.note(f"Beancount engine {version} ready.")


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
        features[name] = {
            "enabled": name in enabled,
            "present": feature_available(name),
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
            raise BeaError(f"Engine feature '{name}' has no requirements in the manifest.")
        _run(
            [uv, "pip", "install", "--python", python, *requirements],
            failure=f"Could not install engine feature '{name}'",
        )
    if not _feature_present(root, name):
        raise BeaError(
            f"Engine feature '{name}' installed but its packages are not importable.",
            details=[f"Expected packages: {', '.join(_feature_packages(name))}"],
        )


def _feature_packages(name: str) -> list[str]:
    spec = optional_features().get(name) or {}
    return [str(item) for item in spec.get("packages") or ([name] if name in optional_features() else [])]


def _feature_present(root: Path, name: str) -> bool:
    return _packages_importable(paths.venv_python(root), _feature_packages(name))


def _packages_importable(python: Path, packages: list[str]) -> bool:
    if not packages:
        return False
    probe = ";".join(f"import {package}" for package in packages)
    completed = subprocess.run([str(python), "-c", probe], capture_output=True, text=True, check=False)
    return completed.returncode == 0


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
        raise BeaError(
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
        # `os.kill` on Windows terminates rather than probes; assume alive.
        return True
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


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
        os.replace(partial, root)
    except OSError as exc:
        raise BeaError(f"Could not move the finished engine into place at {root}: {exc.strerror or exc}.") from exc


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
        if not Path(override).expanduser().exists():
            raise BeaError(f"{UV_ENV} points at '{override}', which does not exist.")
        return override
    found = shutil.which("uv")
    if found:
        return found
    raise BeaError(
        "The Beancount engine needs uv to install, and uv was not found on PATH. "
        "Install it from https://docs.astral.sh/uv/ or set BEA_UV to its path."
    )


def _run(command: list[str], *, failure: str) -> None:
    """Run one provisioning step, keeping its output for the error message.

    Captured rather than inherited: in JSON mode the frontend's stderr must
    stay a single parseable object, and uv is chatty. On failure the output is
    what explains it, so it becomes the error's details.
    """
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        details = [line for line in (completed.stderr or completed.stdout or "").splitlines() if line.strip()]
        raise BeaError(f"{failure} (uv exited {completed.returncode}).", details=details[-20:])
