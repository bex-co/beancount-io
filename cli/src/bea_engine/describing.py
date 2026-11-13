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
  like;
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

_PLUGIN_LINE = re.compile(r'^plugin\s+"((?:[^"\\]|\\.)*)"')
_IMPORT_FAILURE = re.compile(r'^Error importing "([^"]+)":')
_RUN_FAILURE = re.compile(r'^Error applying plugin "([^"]+)":')
_UNKNOWN_OPTION = re.compile(r"^Invalid option: '([^']*)'$")


def describe(file: Path) -> dict[str, Any]:
    """Describe the ledger rooted at `file`; never raises for ledger errors."""
    from beancount.core.data import Close, Open

    from bea_engine.managed_load import data_type_errors
    from bea_engine.query import format_error, is_plugin_failure
    from fava.core.loader import load_file

    loaded = load_file(str(file))
    entries: list[Any] = list(loaded[0])
    errors: list[Any] = list(loaded[1])
    options: dict[str, Any] = dict(loaded[2])
    folder = file.parent
    files = sorted(Path(path) for path in options.get("include") or () if Path(path) != file)
    opened = {str(entry.account) for entry in entries if isinstance(entry, Open)}
    closed = {str(entry.account) for entry in entries if isinstance(entry, Close)}
    failures: dict[str, tuple[str, str]] = {}
    for error in errors:
        message = getattr(error, "message", "")
        if not isinstance(message, str):
            continue
        for pattern, kind in ((_IMPORT_FAILURE, "import"), (_RUN_FAILURE, "run")):
            match = pattern.match(message)
            if match is not None:
                failures.setdefault(match[1], (kind, format_error(error, ledger_file=file)))
    locations = _plugin_locations([file, *files])
    plugins = [
        _plugin(name, locations.get(name), failures.get(name), folder) for name, _config in options.get("plugin") or ()
    ]
    others = [error for error in errors if not is_plugin_failure(error)]
    unknown = [
        {"name": match[1], "location": format_error(error, ledger_file=file).split(": Invalid option", 1)[0]}
        for error in others
        if isinstance(getattr(error, "message", None), str) and (match := _UNKNOWN_OPTION.match(error.message))
    ]
    others += data_type_errors(entries, options)
    from beancount import __version__ as beancount_version

    return {
        "root": str(file),
        "files": [_relative(path, folder) for path in files],
        "operating_currencies": [str(value) for value in options.get("operating_currency") or ()],
        "open_accounts": sorted(opened - closed),
        "plugins": plugins,
        "errors": [format_error(error, ledger_file=file) for error in others],
        # A subset of `errors`: options this Beancount does not know, which is
        # how a Beancount 2 option removed in Beancount 3 reads.
        "unknown_options": unknown,
        "beancount_version": beancount_version,
    }


def _relative(path: Path, folder: Path) -> str:
    try:
        return path.relative_to(folder).as_posix()
    except ValueError:
        return str(path)


def _plugin_locations(files: list[Path]) -> dict[str, str]:
    """`file:line` of each plugin's first `plugin` line, read from the loaded files."""
    found: dict[str, str] = {}
    for path in files:
        try:
            lines = path.read_text(encoding="utf-8-sig").splitlines()
        except (OSError, UnicodeDecodeError):
            continue
        for number, line in enumerate(lines, start=1):
            match = _PLUGIN_LINE.match(line)
            if match is not None:
                found.setdefault(match[1], f"{path}:{number}")
    return found


def _plugin(name: str, location: str | None, failure: tuple[str, str] | None, folder: Path) -> dict[str, Any]:
    top = name.split(".", 1)[0]
    beside = _beside_ledger(top, folder)
    if top == "beancount":
        source = "beancount"
    elif beside or _loaded_from(top, folder):
        source = "beside-ledger"
    else:
        source = "package"
    return {
        "name": name,
        "location": location,
        "loaded": failure is None,
        "source": source,
        "directory": str(folder) if source == "beside-ledger" else None,
        "error": failure[1] if failure is not None else None,
        "failed_while_running": failure is not None and failure[0] == "run",
    }


def _beside_ledger(top: str, folder: Path) -> bool:
    """Whether `folder` holds a module or package named `top`."""
    return (folder / f"{top}.py").is_file() or (folder / top / "__init__.py").is_file()


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
