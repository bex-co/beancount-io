"""What an existing ledger is made of, for `bea init --existing` (w1/m42).

A ledger `bea` did not create arrives with its own root name, `include`
tree and plugins. Coding agents need those facts written down, and a newcomer
needs to know which plugins will not load under the managed engine before an
agent's first `bea check` fails on them. This module reads them from one load
and writes nothing.

A plugin that fails to import is classified by where its module would come
from, because each has a different next step:

- `beancount`: a module under `beancount.` that this Beancount does not ship,
  which is what a Beancount 2 plugin removed or renamed in Beancount 3 looks
  like. When bea bundles a drop-in replacement for it, `replacement` names it
  (w1/362);
- `beside-ledger`: a module in the ledger's own folder. The engine never
  imports from the working directory (w1/098), so it loads only through
  `PYTHONPATH`;
- `package`: anything else, a package the managed engine does not include.
"""

from __future__ import annotations

import importlib.util
import os
import re
import sys
from pathlib import Path
from typing import Any

_UNKNOWN_OPTION = re.compile(r"^Invalid option: '([^']*)'$")


def describe(file: Path) -> dict[str, Any]:
    """Describe the ledger rooted at `file`; never raises for ledger errors."""
    from beancount.core.data import Close, Open

    from bea_engine.managed_load import data_type_errors
    from bea_engine.query import format_error, plugin_directive, plugin_failure
    from fava.core.loader import load_file

    loaded = load_file(str(file))
    entries: list[Any] = list(loaded[0])
    errors: list[Any] = list(loaded[1])
    options: dict[str, Any] = dict(loaded[2])
    folder = file.parent
    files = sorted(Path(path) for path in options.get("include") or () if Path(path) != file)
    opened = {str(entry.account) for entry in entries if isinstance(entry, Open)}
    closed = {str(entry.account) for entry in entries if isinstance(entry, Close)}
    failures: dict[str, tuple[bool, str]] = {}
    others: list[Any] = []
    for error in errors:
        failure = plugin_failure(error)
        if failure is None:
            others.append(error)
        else:
            failures.setdefault(failure[1], (failure[0], format_error(error, ledger_file=file)))
    # Beancount keeps only the root's options, so only its `plugin` lines count.
    plugins = [
        _plugin(name, plugin_directive(file, name, config), failures.get(name), folder)
        for name, config in options.get("plugin") or ()
    ]
    others += data_type_errors(entries, options)
    from beancount import __version__ as beancount_version

    return {
        "root": str(file),
        "files": [_relative(path, folder) for path in files],
        "operating_currencies": [str(value) for value in options.get("operating_currency") or ()],
        "open_accounts": sorted(opened - closed),
        "plugins": plugins,
        "errors": [_error(error, file) for error in others],
        "beancount_version": beancount_version,
    }


def _error(error: Any, root: Path) -> dict[str, Any]:
    """One loader error as `{file, line, message, option}`, read from the error, not its rendering.

    `option` names an option this Beancount does not know, which is how a
    Beancount 2 option removed in Beancount 3 reads. An include the loader
    reports at `<load>:0` is located at the include that wrote it, and the
    paths its message names read as "Needs attention" names locations (w1/284).
    A `pushtag` or `pushmeta` never closed is located at the push (w1/345).
    """
    from bea_engine.query import format_error, include_error, unclosed_push

    located = include_error(error, root, show=lambda path: _shown(path, root.parent)) or unclosed_push(error)
    if located is not None:
        filename, line, message = located
    else:
        source = getattr(error, "source", None) or {}
        filename, line = str(source.get("filename") or root), int(source.get("lineno") or 0)
        prefix = f"{source.get('filename', '<ledger>')}:{source.get('lineno', 0)}: "
        message = format_error(error, ledger_file=root).removeprefix(prefix)
    raw = getattr(error, "message", None)
    match = _UNKNOWN_OPTION.match(raw) if isinstance(raw, str) else None
    return {"file": filename, "line": line, "message": message, "option": match[1] if match else None}


def _shown(path: str, folder: Path) -> str:
    """`path` relative to the ledger folder when it is inside it, else whole, as `init` shows a location."""
    try:
        shown = os.path.relpath(path, folder)
    except ValueError:
        return path
    return path if shown.startswith("..") else shown


def _relative(path: Path, folder: Path) -> str:
    """`path` as the root's folder would name it: `../shared/prices.beancount` for a file beside it (w1/270).

    `AGENTS.md` travels with the folder, so an absolute path would name nothing
    once it is cloned or moved. Only a file on another Windows drive, which no
    relative path reaches, keeps its absolute path.
    """
    try:
        return Path(os.path.relpath(path, folder)).as_posix()
    except ValueError:
        return str(path)


def _plugin(
    name: str, location: tuple[str, int] | None, failure: tuple[bool, str] | None, folder: Path
) -> dict[str, Any]:
    from bea_engine.query import bundled_replacement, module_beside

    top = name.split(".", 1)[0]
    if top == "beancount":
        source = "beancount"
    elif module_beside(top, folder) or _loaded_from(top, folder):
        source = "beside-ledger"
    else:
        source = "package"
    return {
        "name": name,
        "file": location[0] if location else None,
        "line": location[1] if location else None,
        "loaded": failure is None,
        "source": source,
        "error": failure[1] if failure is not None else None,
        "failed_while_running": failure is not None and failure[0],
        "replacement": bundled_replacement(name, failure[1]) if failure is not None and not failure[0] else None,
    }


def _loaded_from(top: str, folder: Path) -> bool:
    """Whether an imported module `top` came from inside `folder` (found through `PYTHONPATH`)."""
    module = sys.modules.get(top)
    origin = getattr(module, "__file__", None)
    if origin is None:
        try:
            spec = importlib.util.find_spec(top)
        except (ImportError, ValueError):
            return False
        origin = spec.origin if spec is not None else None
    if not origin:
        return False
    try:
        return Path(os.path.abspath(origin)).is_relative_to(Path(os.path.abspath(folder)))
    except OSError:
        return False
