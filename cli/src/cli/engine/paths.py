"""Where the managed engine environment lives, and how to find things inside it.

Layout questions only: no subprocesses, no installing, and nothing that imports
Beancount. `provision` creates what these paths name and `launch` runs it.

Three overrides, each resolved on every call rather than at import, because the
environment is what tests and CI jobs set:

- `$BEA_ENGINE_PYTHON` names an interpreter directly and skips provisioning
  entirely. This is how the test suite points at an environment it prepared.
- `$BEA_ENGINE_DIR` relocates the managed environment.
- `$XDG_DATA_HOME` moves the default root, the same way the rest of `bea`
  honors the XDG variables (see `cli.config`).
"""

from __future__ import annotations

import json
import os
import sys
from functools import cache
from pathlib import Path
from typing import Any

from cli.config import data_dir
from cli.errors import BeaError

PYTHON_ENV = "BEA_ENGINE_PYTHON"
DIR_ENV = "BEA_ENGINE_DIR"

MANIFEST = Path(__file__).parent / "manifest.json"

# The checkout this frontend was imported from, if it is one: `src/cli/engine`
# -> `src`. In an installed wheel this points at `site-packages`, where no
# `bea_engine` will be found, which is exactly how the checkout path below
# switches itself off.
_IMPORT_ROOT = Path(__file__).resolve().parents[2]


@cache
def manifest() -> dict[str, Any]:
    """The pinned engine combination, shipped inside the frontend package.

    Cached: it is a small read-only file that provisioning, version reporting
    and path resolution all consult.
    """
    return json.loads(MANIFEST.read_text())  # type: ignore[no-any-return]


def engine_version() -> str:
    return str(manifest()["engine_version"])


def engine_root() -> Path:
    """The managed environment's directory, versioned by the engine it holds.

    The version in the path is what makes an upgrade safe: a new engine
    provisions a sibling directory instead of mutating the one a running
    command is using.
    """
    override = os.environ.get(DIR_ENV)
    if override:
        return Path(override).expanduser()
    return data_dir() / "engine" / engine_version()


def python_override() -> Path | None:
    """An interpreter named outright, bypassing provisioning.

    Validated here rather than at the point of use: a typo in this variable
    would otherwise surface as whatever `subprocess` says about a missing
    executable, several layers from the thing that is actually wrong.
    """
    value = os.environ.get(PYTHON_ENV)
    if not value:
        return None
    python = Path(value).expanduser()
    if not python.exists():
        raise BeaError(f"{PYTHON_ENV} points at '{python}', which does not exist.")
    return python


def venv_python(root: Path) -> Path:
    return bin_dir(root) / ("python.exe" if sys.platform == "win32" else "python")


def bin_dir(root: Path) -> Path:
    return root / ("Scripts" if sys.platform == "win32" else "bin")


def bin_dir_for(python: Path) -> Path:
    """Where an interpreter's sibling executables live — `bean-check` and friends.

    Derived from the interpreter rather than from `engine_root()`, so it is
    right for both a provisioned environment and a `$BEA_ENGINE_PYTHON` that
    points somewhere else entirely.
    """
    return python.parent


def is_provisioned(root: Path) -> bool:
    """Whether `root` holds a usable engine.

    The interpreter has to be there and `bea_engine` has to be importable by it;
    a venv whose install died halfway has the first and not the second, and
    treating that as ready would fail later with a confusing traceback instead
    of provisioning again here.
    """
    python = venv_python(root)
    if not python.exists():
        return False
    if sys.platform == "win32":
        return (root / "Lib" / "site-packages" / "bea_engine").is_dir()
    return any(path.is_dir() for path in root.glob("lib/python*/site-packages/bea_engine"))


def checkout_source_root() -> Path | None:
    """The `cli/src` directory when running from a checkout, else None.

    A checkout has the engine's sources sitting beside the frontend's, so the
    transition can run the helper out of the tree without provisioning
    anything. Decided by looking for the files rather than by trying to import
    `bea_engine`, so it answers the same way whether or not the frontend was
    installed editable.

    The engine project alongside the sources is what tells a checkout from an
    installed wheel: only a checkout has `cli/engine/pyproject.toml` next to
    `cli/src/bea_engine`. The frontend wheel ships neither, so an installed
    frontend always provisions its own engine environment.
    """
    if (_IMPORT_ROOT / "bea_engine" / "main.py").is_file() and (
        _IMPORT_ROOT.parent / "engine" / "pyproject.toml"
    ).is_file():
        return _IMPORT_ROOT
    return None


def checkout_engine_project() -> Path | None:
    """The `cli/engine` project directory when running from a checkout, else None.

    Provisioning installs this instead of the manifest's `helper` requirement
    when it is present, so a checkout provisions the code in front of it rather
    than a published release.
    """
    source_root = checkout_source_root()
    if source_root is None:
        return None
    project = source_root.parent / "engine"
    return project if (project / "pyproject.toml").is_file() else None
