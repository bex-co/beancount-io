"""`price export` carries what a plugin imports only when it runs (w5/880).

A helper imported inside the plugin function was missing from the export once
a cached check had skipped the plugin, and a namespace package (no
`__init__.py`, so no `__file__`) was never recognized at all. Either way the
export exited 0 for a snapshot that failed `check`.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_price_export_plugin_siblings import LEDGER, _bea

LAZY_PLUGIN = """import time
__plugins__ = ["run"]
def run(entries, options):
    time.sleep(1.1)
    import helper
    assert helper.TEXT == "Synthetic"
    return entries, []
"""
NAMESPACE_PLUGIN = """from importlib.resources import files
__plugins__ = ["run"]
def run(entries, options):
    assert files("bankdata").joinpath("settings.json").read_text().strip() == '{"ok": true}'
    return entries, []
"""


def _books(tmp_path: Path, plugin: str) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(LEDGER)
    (books / "myplug.py").write_text(plugin)
    return books


def _export_and_check(tmp_path: Path, books: Path) -> set[str]:
    exported = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(tmp_path / "exp"))
    assert exported.returncode == 0, exported.stderr
    out = tmp_path / "exp"
    shipped = {str(path.relative_to(out)) for path in out.rglob("*") if path.is_file()}
    # The original tree is hidden so the snapshot cannot fall back to it.
    books.rename(tmp_path / "hidden")
    try:
        checked = _bea(tmp_path, "-f", str(out / "main.bean"), "check")
    finally:
        (tmp_path / "hidden").rename(books)
    assert checked.returncode == 0, checked.stderr
    return shipped


def test_a_helper_imported_in_the_function_travels_after_a_cached_check(tmp_path: Path) -> None:
    books = _books(tmp_path, LAZY_PLUGIN)
    (books / "helper.py").write_text('TEXT = "Synthetic"\n')
    (books / "unrelated.py").write_text("X = 1\n")

    # The second check is served from the load cache: the plugin does not run.
    for _ in range(2):
        assert _bea(tmp_path, "-f", str(books / "main.bean"), "check").returncode == 0

    assert _export_and_check(tmp_path, books) == {"main.bean", "myplug.py", "helper.py"}


def test_a_namespace_package_resource_travels(tmp_path: Path) -> None:
    books = _books(tmp_path, NAMESPACE_PLUGIN)
    (books / "bankdata").mkdir()
    (books / "bankdata" / "settings.json").write_text('{"ok": true}\n')

    assert _export_and_check(tmp_path, books) == {"main.bean", "myplug.py", "bankdata/settings.json"}


# w5/968: a plugin that skips entries it already processed.
MARKED_PLUGIN = """import time
from beancount.core.data import Transaction
__plugins__ = ["mark"]
def mark(entries, options):
    if any(isinstance(e, Transaction) and e.meta.get("qa_done") for e in entries):
        return entries, []
    time.sleep(1.1)
    import helper
    changed = []
    for entry in entries:
        if isinstance(entry, Transaction):
            entry = entry._replace(meta={**entry.meta, "qa_done": True, "label": helper.TEXT})
        changed.append(entry)
    return changed, []
"""
MARKED_LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "myplug"
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Services USD
2026-01-02 * "Invoice"
  Assets:Checking 100 USD
  Income:Services -100 USD
"""


def test_a_helper_travels_when_the_plugin_skips_entries_it_already_marked(tmp_path: Path) -> None:
    books = _books(tmp_path, MARKED_PLUGIN)
    (books / "main.bean").write_text(MARKED_LEDGER)
    (books / "helper.py").write_text('TEXT = "Synthetic"\n')
    (books / "unrelated.py").write_text("X = 1\n")

    for _ in range(2):
        assert _bea(tmp_path, "-f", str(books / "main.bean"), "check").returncode == 0

    assert _export_and_check(tmp_path, books) == {"main.bean", "myplug.py", "helper.py"}


# w5/969: one namespace package spread over two directories that set insert_pythonpath.
SPLIT_LEDGER = """option "operating_currency" "USD"
include "a/settings.bean"
include "b/settings.bean"
plugin "qa_plugin"
2024-01-01 open Assets:Cash USD
"""
SPLIT_PLUGIN = """import json
from importlib.resources import files
__plugins__ = ["read_data"]
def read_data(entries, options):
    data = files("qa_bankdata")
    assert json.loads(data.joinpath("a.json").read_text())["amount"] == 100
    assert json.loads(data.joinpath("b.json").read_text())["amount"] == 25
    return entries, []
"""


def _split_books(tmp_path: Path, *, regular_first: bool = False) -> Path:
    books = tmp_path / "books"
    for name in ("a", "b"):
        (books / name / "qa_bankdata").mkdir(parents=True)
        (books / name / "settings.bean").write_text('option "insert_pythonpath" "TRUE"\n')
    (books / "main.bean").write_text(SPLIT_LEDGER)
    (books / "a" / "qa_plugin.py").write_text(SPLIT_PLUGIN)
    (books / "a" / "qa_bankdata" / "a.json").write_text('{"amount": 100}\n')
    (books / "b" / "qa_bankdata" / "b.json").write_text('{"amount": 25}\n')
    if regular_first:
        (books / "a" / "qa_bankdata" / "__init__.py").write_text("")
    return books


def test_every_portion_of_a_namespace_package_travels(tmp_path: Path) -> None:
    books = _split_books(tmp_path)

    assert _export_and_check(tmp_path, books) == {
        "main.bean",
        "a/settings.bean",
        "b/settings.bean",
        "a/qa_plugin.py",
        "a/qa_bankdata/a.json",
        "b/qa_bankdata/b.json",
    }


def test_a_regular_package_found_first_keeps_later_directories_out(tmp_path: Path) -> None:
    books = _split_books(tmp_path, regular_first=True)
    (books / "a" / "qa_plugin.py").write_text(
        "__plugins__ = ['run']\ndef run(entries, options):\n    import qa_bankdata\n    return entries, []\n"
    )

    exported = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(tmp_path / "exp"))

    assert exported.returncode == 0, exported.stderr
    shipped = {str(p.relative_to(tmp_path / "exp")) for p in (tmp_path / "exp").rglob("*") if p.is_file()}
    assert "a/qa_bankdata/__init__.py" in shipped
    assert "b/qa_bankdata/b.json" not in shipped


# w5/970: the root and an included `plugins/` both on the module path.
NESTED_LEDGER = """option "insert_pythonpath" "TRUE"
option "operating_currency" "USD"
include "plugins/settings.bean"
plugin "qa_plugin"
2024-01-01 open Assets:Cash USD
"""


@pytest.mark.parametrize("package", [False, True], ids=["module", "package"])
@pytest.mark.parametrize("runtime", [False, True], ids=["module-scope", "runtime"])
def test_a_helper_beneath_an_overlapping_python_path_travels(tmp_path: Path, package: bool, runtime: bool) -> None:
    books = tmp_path / "books"
    leaf = books / "plugins"
    leaf.mkdir(parents=True)
    (books / "main.bean").write_text(NESTED_LEDGER)
    (leaf / "settings.bean").write_text('option "insert_pythonpath" "TRUE"\n')
    if package:
        (leaf / "qa_helper").mkdir()
        (leaf / "qa_helper" / "__init__.py").write_text("VALUE = 100\n")
        (leaf / "qa_helper" / "settings.json").write_text("{}\n")
    else:
        (leaf / "qa_helper.py").write_text("VALUE = 100\n")
    body = "import qa_helper\n    assert qa_helper.VALUE == 100\n"
    (leaf / "qa_plugin.py").write_text(
        "__plugins__ = ['run']\n"
        + ("" if runtime else "import qa_helper\n")
        + "def run(entries, options):\n    "
        + body
        + "    return entries, []\n"
    )

    shipped = _export_and_check(tmp_path, books)

    expected = {"main.bean", "plugins/settings.bean", "plugins/qa_plugin.py"}
    expected |= (
        {"plugins/qa_helper/__init__.py", "plugins/qa_helper/settings.json"} if package else {"plugins/qa_helper.py"}
    )
    assert shipped == expected
