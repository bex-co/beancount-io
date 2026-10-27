"""`price export` carries a local plugin package's resources, not only its modules (w5/868).

The export copied a package's `.py` files only, so a plugin reading its own
`settings.json` through `importlib.resources` exported with exit 0 and the
snapshot failed `check` with `FileNotFoundError`.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

from tests.test_price_export_plugin_siblings import _bea

LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "{plugin}"
2026-01-01 open Assets:Cash USD
"""
READS_SETTINGS = """import json
from importlib.resources import files

CONFIG = json.loads(files(__package__).joinpath("settings.json").read_text())
__plugins__ = ["run"]

def run(entries, options):
    return entries, []
"""


def _export(tmp_path: Path, books: Path) -> tuple[int, str, set[str]]:
    exported = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(tmp_path / "exp"))
    out = tmp_path / "exp"
    files = {str(path.relative_to(out)) for path in out.rglob("*") if path.is_file()} if out.exists() else set()
    return exported.returncode, exported.stderr, files


def _package_books(tmp_path: Path) -> Path:
    books = tmp_path / "books"
    (books / "pkgplug" / "__pycache__").mkdir(parents=True)
    (books / "main.bean").write_text(LEDGER.format(plugin="pkgplug"))
    (books / "pkgplug" / "__init__.py").write_text(READS_SETTINGS)
    (books / "pkgplug" / "settings.json").write_text('{"label": "Synthetic"}\n')
    (books / "pkgplug" / "__pycache__" / "stale.cpython-312.pyc").write_bytes(b"\0")
    (books / "unrelated.json").write_text("{}\n")
    return books


def test_a_package_resource_travels_and_the_snapshot_loads(tmp_path: Path) -> None:
    books = _package_books(tmp_path)

    code, stderr, files = _export(tmp_path, books)

    assert code == 0, stderr
    # The bytecode cache and the file beside the root stay behind.
    assert files == {"main.bean", "pkgplug/__init__.py", "pkgplug/settings.json"}
    assert (tmp_path / "exp" / "pkgplug" / "settings.json").read_text() == '{"label": "Synthetic"}\n'
    check = _bea(tmp_path, "-f", str(tmp_path / "exp" / "main.bean"), "check")
    assert check.returncode == 0, check.stderr


def test_an_inlined_config_still_exports_the_package_alone(tmp_path: Path) -> None:
    books = _package_books(tmp_path)
    (books / "pkgplug" / "__init__.py").write_text(
        'CONFIG = {"label": "Synthetic"}\n__plugins__ = ["run"]\ndef run(entries, options):\n    return entries, []\n'
    )
    (books / "pkgplug" / "settings.json").unlink()

    code, stderr, files = _export(tmp_path, books)

    assert code == 0, stderr
    assert files == {"main.bean", "pkgplug/__init__.py"}
    assert _bea(tmp_path, "-f", str(tmp_path / "exp" / "main.bean"), "check").returncode == 0


def test_a_helper_package_resource_travels_too(tmp_path: Path) -> None:
    books = tmp_path / "books"
    (books / "helperpkg" / "data").mkdir(parents=True)
    (books / "main.bean").write_text(LEDGER.format(plugin="myplug"))
    (books / "myplug.py").write_text(
        'import helperpkg\n__plugins__ = ["run"]\ndef run(entries, options):\n    return entries, []\n'
    )
    (books / "helperpkg" / "__init__.py").write_text(
        'from importlib.resources import files\nLABEL = files(__package__).joinpath("data/label.txt").read_text()\n'
    )
    (books / "helperpkg" / "data" / "label.txt").write_text("Synthetic\n")

    code, stderr, files = _export(tmp_path, books)

    assert code == 0, stderr
    assert files == {"main.bean", "myplug.py", "helperpkg/__init__.py", "helperpkg/data/label.txt"}
    check = _bea(tmp_path, "-f", str(tmp_path / "exp" / "main.bean"), "check")
    assert check.returncode == 0, check.stderr


def test_a_resource_linked_from_outside_the_tree_is_refused(tmp_path: Path) -> None:
    books = _package_books(tmp_path)
    outside = tmp_path / "outside.json"
    outside.write_text('{"label": "Synthetic"}\n')
    (books / "pkgplug" / "settings.json").unlink()
    (books / "pkgplug" / "settings.json").symlink_to(outside)

    code, stderr, files = _export(tmp_path, books)

    assert code == 2, stderr
    assert "outside the ledger tree" in stderr
    assert files == set()


@pytest.mark.skipif(sys.platform == "win32", reason="named pipes and directory links are POSIX here")
@pytest.mark.parametrize("shape", ["fifo", "linked-directory"])
def test_a_package_entry_that_cannot_travel_as_a_file_is_refused(tmp_path: Path, shape: str) -> None:
    books = _package_books(tmp_path)
    if shape == "fifo":
        os.mkfifo(books / "pkgplug" / "feed")
        expected = "is not a regular file"
    else:
        (books / "shared").mkdir()
        (books / "pkgplug" / "data").symlink_to(books / "shared")
        expected = "a linked directory"

    code, stderr, files = _export(tmp_path, books)

    assert code == 2, stderr
    assert "plugin package 'pkgplug'" in stderr and expected in stderr
    assert files == set()


@pytest.mark.skipif(sys.platform == "win32" or os.geteuid() == 0, reason="needs POSIX modes a non-root user obeys")
def test_a_package_directory_that_cannot_be_listed_is_refused(tmp_path: Path) -> None:
    """A searchable but unlistable directory was skipped, so its resources never travelled (w5/879)."""
    books = _package_books(tmp_path)
    data = books / "pkgplug" / "data"
    data.mkdir()
    (data / "extra.json").write_text("{}\n")
    data.chmod(0o111)
    try:
        code, stderr, files = _export(tmp_path, books)
    finally:
        data.chmod(0o755)

    assert code == 2, stderr
    assert "plugin package 'pkgplug'" in stderr
    assert f"{data}, a directory this user cannot list" in stderr
    assert files == set()
    assert not (tmp_path / "exp").exists()


LISTS_RULES = """import json
from importlib.resources import files

__plugins__ = ["run"]

def run(entries, options):
    for rule in files(__package__).joinpath("{rules}").iterdir():
        if rule.name.endswith(".json"):
            json.loads(rule.read_text())
    return entries, []
"""


@pytest.mark.parametrize("helper", [False, True])
@pytest.mark.parametrize("marker", [False, True])
def test_an_empty_package_directory_travels(tmp_path: Path, helper: bool, marker: bool) -> None:
    """A required empty resource directory was left out, so the snapshot failed `check` (w5/868)."""
    books = tmp_path / "books"
    rules = "data/rules" if helper else "rules"
    (books / "rulepkg" / rules / "__pycache__").mkdir(parents=True)
    (books / "rulepkg" / "__init__.py").write_text(LISTS_RULES.format(rules=rules))
    if marker:
        (books / "rulepkg" / rules / "README.txt").write_text("No active rules.\n")
    if helper:
        (books / "entry.py").write_text('from rulepkg import run\n__plugins__ = ["run"]\n')
    (books / "main.bean").write_text(LEDGER.format(plugin="entry" if helper else "rulepkg"))

    code, stderr, files = _export(tmp_path, books)

    assert code == 0, stderr
    assert files == {"main.bean", "rulepkg/__init__.py"} | ({"entry.py"} if helper else set()) | (
        {f"rulepkg/{rules}/README.txt"} if marker else set()
    )
    assert (tmp_path / "exp" / "rulepkg" / rules).is_dir()
    assert not (tmp_path / "exp" / "rulepkg" / rules / "__pycache__").exists()
    check = _bea(tmp_path, "-f", str(tmp_path / "exp" / "main.bean"), "check")
    assert check.returncode == 0, check.stderr


def test_a_file_where_an_empty_package_directory_goes_is_refused(tmp_path: Path) -> None:
    books = tmp_path / "books"
    (books / "rulepkg" / "rules").mkdir(parents=True)
    (books / "rulepkg" / "__init__.py").write_text(LISTS_RULES.format(rules="rules"))
    (books / "main.bean").write_text(LEDGER.format(plugin="rulepkg"))
    (tmp_path / "exp" / "rulepkg").mkdir(parents=True)
    (tmp_path / "exp" / "rulepkg" / "rules").write_text("in the way\n")

    exported = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(tmp_path / "exp"), "--force")

    assert exported.returncode == 2, exported.stderr
    assert "where the export needs a directory" in exported.stderr
    assert not (tmp_path / "exp" / "main.bean").exists()
