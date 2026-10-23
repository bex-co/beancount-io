"""`price export` carries what a plugin imports only when it runs (w5/880).

A helper imported inside the plugin function was missing from the export once
a cached check had skipped the plugin, and a namespace package (no
`__init__.py`, so no `__file__`) was never recognized at all. Either way the
export exited 0 for a snapshot that failed `check`.
"""

from __future__ import annotations

from pathlib import Path

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
