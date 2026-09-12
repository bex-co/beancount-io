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
when that lock is present beside the installed package or in the sdist, installs
use `--require-hashes`. Checkouts without the lock fall back to the version pins
in `manifest.json` while the helper sources always come from this beancount-io installation.

Optional Beangulp / Beanprice features (ADR012, ADR014 m20) stay out of the
base profile. `bea engine enable <feature>` installs a reviewed, hash-pinned
extra into the managed engine venv and records it so repairs re-apply it.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
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
    if paths.is_provisioned(root):
        return paths.venv_python(root)

    provision(root)
    return paths.venv_python(root)


def repair_engine() -> Path:
    """Rebuild the managed engine after a failed or incomplete install."""
    override = paths.python_override()
    if override is not None:
        return override
    root = paths.engine_root()
    remembered = enabled_features(root)
    if root.exists():
        discarded = root.with_name(f"{root.name}.repair-discard.{os.getpid()}")
        os.replace(root, discarded)
        shutil.rmtree(discarded, ignore_errors=True)
    provision(root)
    for name in sorted(remembered):
        _install_feature(root, name)
        _record_feature(root, name)
    return paths.venv_python(root)


def provision(root: Path) -> None:
    """Build the engine environment at `root`, atomically."""
    uv = _find_uv()
    version = paths.engine_version()
    manifest = paths.manifest()

    # Per-process, so two commands provisioning at the same time build in
    # separate directories and the loser's rename is simply redundant.
    partial = root.with_name(f"{root.name}.partial.{os.getpid()}")
    shutil.rmtree(partial, ignore_errors=True)
    partial.parent.mkdir(parents=True, exist_ok=True)

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


def enable_feature(name: str) -> set[str]:
    """Provision `name` into the managed engine and remember it across repairs.

    Always targets the managed engine directory — never the frontend interpreter
    and never `$BEA_ENGINE_PYTHON`, which is an escape hatch outside bea's
    ownership.
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
    if not paths.is_provisioned(root):
        provision(root)

    already = enabled_features(root)
    if name in already and _feature_present(root, name):
        output.note(f"Engine feature '{name}' is already enabled.")
        return already

    output.note(f"Enabling engine feature '{name}' in {root}...")
    _install_feature(root, name)
    recorded = _record_feature(root, name)
    output.note(f"Engine feature '{name}' ready.")
    return recorded


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
    """Locate a release lock next to the installed package or checkout."""
    if not name:
        return None
    # Checkout: cli/<name> (generated by make engine-release-lock).
    checkout = paths.checkout_source_root()
    if checkout is not None:
        candidate = checkout.parent / name
        if candidate.is_file():
            return candidate
    # Installed wheel/sdist: adjacent to the distribution root.
    package_root = Path(__file__).resolve().parents[2]  # .../site-packages or .../src
    for candidate in (package_root.parent / name, package_root / name):
        if candidate.is_file():
            return candidate
    try:
        traversable = resources.files("cli").joinpath(name)
        if traversable.is_file():
            # Wheels store package data inside a zip; uv needs a real filesystem
            # path, so materialize once beside the managed engines.
            cache = paths.engine_root().parent / name
            cache.parent.mkdir(parents=True, exist_ok=True)
            data = traversable.read_bytes()
            if not cache.is_file() or cache.read_bytes() != data:
                cache.write_bytes(data)
            return cache
    except (FileNotFoundError, TypeError, AttributeError, OSError):
        pass
    return None


def _publish(partial: Path, root: Path) -> None:
    """Move a finished environment into place under the name commands look for."""
    if root.exists():
        # Something unusable is already there — `ensure_engine` only calls us
        # when `is_provisioned` said no. Move it out of the way first, because
        # renaming onto a non-empty directory fails.
        discarded = root.with_name(f"{root.name}.discarded.{os.getpid()}")
        os.replace(root, discarded)
        shutil.rmtree(discarded, ignore_errors=True)
    os.replace(partial, root)


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
