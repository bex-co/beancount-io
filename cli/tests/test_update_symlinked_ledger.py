"""`bea update` writes through a symbolically linked ledger file, as `add` does (w1/363).

The loader names an entry by the path it read, through the link, and the
rewrite was installed by renaming the validated copy onto that name. The
rename replaced the link with a regular file: exit 0, `Updated 1 transaction`,
the linked file unchanged, and every later write through the same path landed
in the orphan copy.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from tests.report_helpers import bea

ROOT = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-01 open Expenses:Food USD
"""
ENTRY = """\
2026-01-10 ! "Grocer" "Weekly shop"
  import-id: "imp-2"
  Expenses:Uncategorized  52.30 USD
  Assets:Checking
"""
EDITED = ENTRY.replace(" ! ", " * ").replace("Uncategorized  52.30", "Food  52.30")
ROWS = [{"id": "imp-2", "account": "Expenses:Food", "flag": "*"}]


def _link(link: Path, real: Path) -> None:
    try:
        link.symlink_to(os.path.relpath(real, link.parent))
    except OSError:
        pytest.skip("filesystem cannot create a symlink")


def _layout(tmp_path: Path, linked: str) -> tuple[Path, Path, Path]:
    """The root to pass, the linked name, and the real file the entry lives in."""
    if linked == "include":
        books, shared = tmp_path / "books", tmp_path / "shared"
        books.mkdir()
        shared.mkdir()
        root = books / "main.bean"
        root.write_text(ROOT.replace("\n", '\ninclude "2026.bean"\n', 1))
        real = shared / "2026.bean"
        real.write_text(ENTRY)
        link = books / "2026.bean"
    else:
        home, store = tmp_path / "home", tmp_path / "real"
        home.mkdir()
        store.mkdir()
        real = store / "main.bean"
        real.write_text(ROOT + ENTRY)
        root = link = home / "main.bean"
    _link(link, real)
    return root, link, real


def _update(tmp_path: Path, root: Path, batch: bool, *options: str) -> list[str]:
    if batch:
        (tmp_path / "rows.json").write_text(json.dumps(ROWS))
        args = ["update", "transactions", "--from", str(tmp_path / "rows.json")]
    else:
        args = ["update", "transaction", "--id", "imp-2", "--account", "Expenses:Food", "--flag", "*"]
    return ["--no-input", "--offline", "--file", str(root), *args, *options]


@pytest.mark.parametrize("batch", [False, True], ids=["single", "batch"])
@pytest.mark.parametrize("linked", ["include", "root"])
def test_update_apply_writes_through_the_link(tmp_path: Path, linked: str, batch: bool) -> None:
    root, link, real = _layout(tmp_path, linked)
    before = real.read_text()
    argv = _update(tmp_path, root, batch, "--apply")

    result = bea(["--json", *argv], tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
    assert link.is_symlink(), "the update replaced the link with a regular file"
    assert real.read_text() == before.replace(ENTRY, EDITED)
    assert link.read_text() == real.read_text()
    envelope = json.loads(result.stdout)
    assert envelope["data"]["written"] == 1
    written = envelope["data"]["rows"][0]["target"] if batch else envelope["target"]["into"]
    assert Path(written).resolve() == real.resolve()
    assert not [p for p in tmp_path.rglob(".bea-*") if p.is_file()], "a staged copy was left behind"
    check = bea(["--no-input", "--offline", "--file", str(root), "check"], tmp_path)
    assert check.returncode == 0, check.stdout + check.stderr


@pytest.mark.parametrize("batch", [False, True], ids=["single", "batch"])
def test_update_names_the_linked_file_it_wrote(tmp_path: Path, batch: bool) -> None:
    root, link, real = _layout(tmp_path, "include")
    argv = _update(tmp_path, root, batch)

    preview = bea(["--json", *argv], tmp_path)
    applied = bea([*argv, "--apply"], tmp_path)

    assert preview.returncode == 0, preview.stdout + preview.stderr
    envelope = json.loads(preview.stdout)
    named = envelope["data"]["rows"][0]["target"] if batch else envelope["target"]["into"]
    assert named == str(real.resolve())
    assert applied.returncode == 0, applied.stdout + applied.stderr
    noun = "1 of 1 transactions" if batch else "1 transaction"
    assert f"Updated {noun} in {real.resolve()}." in applied.stdout + applied.stderr
    assert link.is_symlink() and real.read_text() == EDITED


def test_a_later_write_through_the_link_reaches_the_real_root(tmp_path: Path) -> None:
    root, link, real = _layout(tmp_path, "root")
    argv = _update(tmp_path, root, False, "--apply")
    assert bea(argv, tmp_path).returncode == 0

    added = bea(
        ["--no-input", "--offline", "--file", str(root), "add", "note", "--date", "2026-01-11"]
        + ["--account", "Assets:Checking", "--comment", "after the update"],
        tmp_path,
    )

    assert added.returncode == 0, added.stdout + added.stderr
    assert link.is_symlink()
    assert EDITED in real.read_text() and "after the update" in real.read_text()
