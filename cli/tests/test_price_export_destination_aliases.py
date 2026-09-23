"""`price export` never writes back into the ledger it is exporting (w3/412).

The destination guard canonicalized only paths that already existed:
`target.resolve() if target.exists() else target.absolute()`. `absolute()`
leaves `..` in place, so `books/not-created/..` compared unequal to `books` and
slipped past — then `mkdir(parents=True)` created the missing component and the
writes followed `..` straight back into the source, replacing the customer's
`main.bean` and turning its `include "parts/*.bean"` glob into two fixed
includes. Exit 0, empty stderr.

`resolve()` is now used unconditionally. It normalizes `..` *and* resolves
symlinks in the ancestors that do exist, so a destination reached through a
symlinked parent is compared as the directory it truly names — which stripping
`..` textually would not have done.

w1/m29/t005 requires that exporting never modify the customer's ledger; every
test here asserts the source bytes directly.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

MAIN = """include "parts/*.bean"
2026-01-02 * "Opening"
  Assets:Cash 5 USD
  Equity:Opening
"""
PART_A = "2026-01-01 open Assets:Cash USD\n"
PART_B = "2026-01-01 open Equity:Opening USD\n"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def books(tmp_path: Path) -> Path:
    root = tmp_path / "books"
    (root / "parts").mkdir(parents=True)
    (root / "main.bean").write_text(MAIN, encoding="utf-8")
    (root / "parts" / "a.bean").write_text(PART_A, encoding="utf-8")
    (root / "parts" / "b.bean").write_text(PART_B, encoding="utf-8")
    return root / "main.bean"


#: The ledger's own files, named explicitly. Globbing the tree would also pick
#: up a legitimate export written into a new subdirectory of it, and report
#: that as the source having changed.
SOURCE_FILES = ("main.bean", "parts/a.bean", "parts/b.bean")


def _source_digests(ledger: Path) -> dict[str, str]:
    root = ledger.parent
    return {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in SOURCE_FILES}


def _export(tmp_path: Path, ledger: Path, output: str) -> subprocess.CompletedProcess[str]:
    return _bea(tmp_path, "--json", "--offline", "--file", str(ledger), "price", "export", "--output", output)


@pytest.mark.parametrize(
    ("suffix", "note"),
    [
        pytest.param("not-created/..", "the reported bypass", id="nonexistent-parent"),
        pytest.param("x/y/../..", "two levels up through two missing components", id="two-levels"),
        pytest.param("parts/nope/..", "back into an included directory", id="into-parts"),
        pytest.param(".", "the plain self-reference", id="dot"),
        pytest.param("", "the source directory itself", id="direct"),
    ],
)
def test_an_alias_of_the_source_is_refused(tmp_path: Path, books: Path, suffix: str, note: str) -> None:
    before = _source_digests(books)
    target = str(books.parent / suffix) if suffix else str(books.parent)

    done = _export(tmp_path, books, target)

    assert done.returncode == 2, f"{note}: {done.stdout}"
    assert _source_digests(books) == before, f"{note}: the source was modified"


def test_the_refusal_creates_no_directory(tmp_path: Path, books: Path) -> None:
    """The guard must run before `mkdir(parents=True)`, not after."""
    _export(tmp_path, books, str(books.parent / "not-created" / ".."))

    assert not (books.parent / "not-created").exists()


def test_the_include_glob_survives(tmp_path: Path, books: Path) -> None:
    """The rewrite also replaced the glob, changing which files it can ever load."""
    _export(tmp_path, books, str(books.parent / "not-created" / ".."))

    assert 'include "parts/*.bean"' in books.read_text(encoding="utf-8")


def test_a_symlinked_ancestor_is_resolved_not_trusted(tmp_path: Path, books: Path) -> None:
    """Stripping `..` textually would miss this; resolving the ancestors does not."""
    link = tmp_path / "link"
    link.symlink_to(books.parent)
    before = _source_digests(books)

    done = _export(tmp_path, books, str(link / "nope" / ".."))

    assert done.returncode == 2, done.stdout
    assert _source_digests(books) == before


def test_a_separate_destination_still_exports(tmp_path: Path, books: Path) -> None:
    """The control: a dedicated directory works and the source is untouched."""
    before = _source_digests(books)
    destination = tmp_path / "snapshot"

    done = _export(tmp_path, books, str(destination))

    assert done.returncode == 0, done.stderr
    assert _source_digests(books) == before
    assert (destination / "main.bean").exists()
    assert {path.name for path in (destination / "parts").iterdir()} == {"a.bean", "b.bean"}

    checked = _bea(tmp_path, "--json", "--file", str(destination / "main.bean"), "check")
    assert checked.returncode == 0, checked.stderr


def test_a_new_subdirectory_inside_the_tree_is_still_allowed(tmp_path: Path, books: Path) -> None:
    """Only aliases of a directory holding source files are refused."""
    before = _source_digests(books)

    done = _export(tmp_path, books, str(books.parent / "snap"))

    assert done.returncode == 0, done.stderr
    assert _source_digests(books) == before


# A destination file that *is* a source file — a symlink or a hard link to it —
# was written straight through into the books (w4/172). Hard links share an
# inode under an unrelated path, so identity is compared, not spelling.


@pytest.mark.parametrize("link", ["symlink", "hardlink"])
def test_a_destination_linked_to_a_source_file_is_refused(tmp_path: Path, books: Path, link: str) -> None:
    out = tmp_path / "output"
    out.mkdir()
    alias = out / "main.bean"
    if link == "symlink":
        alias.symlink_to(books)
    else:
        os.link(books, alias)
    before = {path: path.read_bytes() for path in books.parent.rglob("*.bean")}

    result = _bea(tmp_path, "--json", "--file", str(books), "price", "export", "--output", str(out))

    assert result.returncode == 2, result.stdout
    assert str(books) in result.stderr
    assert "Nothing was written" in result.stderr
    assert {path: path.read_bytes() for path in books.parent.rglob("*.bean")} == before
    assert sorted(p.name for p in out.iterdir()) == ["main.bean"]
