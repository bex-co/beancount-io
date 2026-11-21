"""A plugin module kept beside the ledger is named as such when it will not import (w1/344).

The engine never imports from the ledger's folder (w1/098), so `plugin "myplug"`
next to a `myplug.py` failed every command with "Check the name is spelled
right and the plugin is installed" — though the name was right and the file
was there. The line now says the module is in the ledger's folder and names
both ways to load it: `option "insert_pythonpath" "TRUE"`, or `PYTHONPATH`.
A plugin with no module beside the ledger keeps the spelling hint.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = 'option "operating_currency" "USD"\nplugin "{name}"\n2026-01-01 open Assets:Bank USD\n'
PLUGIN = '__plugins__ = ["p"]\n\n\ndef p(entries, options_map):\n    return entries, []\n'
SPELLING = "Check the name is spelled right and the plugin is installed."


def _bea(cwd: Path, *args: str, pythonpath: str | None = None) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    search = [str(ROOT / "src")] + ([pythonpath] if pythonpath else [])
    env.update(
        BEA_CONFIG_DIR=str(cwd.parent / "config"),
        XDG_CACHE_HOME=str(cwd.parent / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=os.pathsep.join(search),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _books(tmp_path: Path, name: str = "myplug", ledger: str = LEDGER) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(ledger.format(name=name), encoding="utf-8")
    return books


def _beside(books: Path, top: str = "myplug") -> str:
    return (
        f'{books / "main.bean"}:2: Cannot import plugin "{top}": ModuleNotFoundError: '
        f"No module named '{top}'. The module {top} is in the ledger's folder, and bea does not import "
        f'from there: add option "insert_pythonpath" "TRUE" to main.bean, or run bea with PYTHONPATH={books}.'
    )


@pytest.mark.parametrize(
    "args",
    [
        ("check",),
        ("list", "open"),
        ("add", "open", "--date", "2026-01-02", "-a", "Assets:Cash"),
    ],
    ids=["check", "list", "add"],
)
def test_a_module_beside_the_ledger_is_named_in_text_and_json(tmp_path: Path, args: tuple[str, ...]) -> None:
    books = _books(tmp_path)
    (books / "myplug.py").write_text(PLUGIN, encoding="utf-8")
    before = (books / "main.bean").read_bytes()

    text = _bea(books, *args)
    as_json = _bea(books, "--json", *args)

    assert text.returncode == 1, text.stderr
    assert f"  {_beside(books)}" in text.stderr.splitlines()
    assert SPELLING not in text.stderr
    assert as_json.returncode == 1, as_json.stderr
    assert json.loads(as_json.stderr)["error"]["details"] == [_beside(books)]
    assert (books / "main.bean").read_bytes() == before


def test_a_report_kept_with_allow_errors_carries_the_same_line(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "myplug.py").write_text(PLUGIN, encoding="utf-8")

    result = _bea(books, "--json", "list", "open", "--allow-errors")

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["ledger_errors"] == [_beside(books)]


def test_a_package_beside_the_ledger_is_named_too(tmp_path: Path) -> None:
    books = _books(tmp_path, name="myplug.rules")
    (books / "myplug").mkdir()
    (books / "myplug" / "__init__.py").write_text("", encoding="utf-8")
    (books / "myplug" / "rules.py").write_text(PLUGIN, encoding="utf-8")

    result = _bea(books, "--json", "check")

    assert result.returncode == 1, result.stderr
    expected = _beside(books).replace('plugin "myplug"', 'plugin "myplug.rules"')
    assert json.loads(result.stderr)["error"]["details"] == [expected]


def test_both_named_remedies_load_the_plugin(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "myplug.py").write_text(PLUGIN, encoding="utf-8")

    through_path = _bea(books, "check", pythonpath=str(books))
    ledger = books / "main.bean"
    ledger.write_text('option "insert_pythonpath" "TRUE"\n' + ledger.read_text(encoding="utf-8"), encoding="utf-8")
    through_option = _bea(books, "check")

    assert (through_path.returncode, through_path.stderr) == (0, "")
    assert (through_option.returncode, through_option.stderr) == (0, "")


def test_a_plugin_with_no_module_beside_the_ledger_keeps_the_spelling_hint(tmp_path: Path) -> None:
    books = _books(tmp_path, name="nonexistent_plugin")

    result = _bea(books, "--json", "check")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [
        f'{books / "main.bean"}:2: Cannot import plugin "nonexistent_plugin": ModuleNotFoundError: '
        f"No module named 'nonexistent_plugin'. {SPELLING}"
    ]


def test_a_module_beside_the_ledger_missing_its_own_import_keeps_the_spelling_hint(tmp_path: Path) -> None:
    # The module is found here, so the folder is not the problem: what is
    # missing is the package it imports, and the spelling hint still fits.
    books = _books(tmp_path, ledger='option "insert_pythonpath" "TRUE"\n' + LEDGER)
    (books / "myplug.py").write_text("import nonexistent_dependency\n" + PLUGIN, encoding="utf-8")

    result = _bea(books, "--json", "check")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [
        f'{books / "main.bean"}:3: Cannot import plugin "myplug": ModuleNotFoundError: '
        f"No module named 'nonexistent_dependency'. {SPELLING}"
    ]
