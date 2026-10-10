"""Document list filename must match relative add --path (w3/244)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
"""


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
        timeout=30,
    )


def test_relative_document_path_round_trips_list(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "receipt.pdf").write_bytes(b"x")
    added = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "document",
        "--date",
        "2024-03-01",
        "--account",
        "Assets:Bank:Checking",
        "--path",
        "receipt.pdf",
    )
    assert added.returncode == 0, added.stderr
    added_name = json.loads(added.stdout)["data"]["directive"]["filename"]
    assert added_name == "receipt.pdf"

    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "document")
    assert listed.returncode == 0, listed.stderr
    rows = json.loads(listed.stdout)["data"]
    assert rows
    assert rows[0]["filename"] == "receipt.pdf"


def test_absolute_document_path_refused_for_portability(tmp_path: Path) -> None:
    # w3/351: add document requires relative paths so ledger copies stay portable.
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    receipt = tmp_path / "abs-receipt.pdf"
    receipt.write_bytes(b"x")
    added = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "document",
        "--date",
        "2024-03-02",
        "--account",
        "Assets:Bank:Checking",
        "--path",
        str(receipt),
    )
    assert added.returncode == 2, added.stderr
    error = json.loads(added.stderr)["error"]
    assert error["category"] == "usage"
    assert "relative" in error["message"]


TREE_MAIN = '2026-01-01 open Assets:Cash USD\ninclude "year/entries.bean"\n'


def _tree(tmp_path: Path) -> Path:
    books = tmp_path / "books"
    (books / "year").mkdir(parents=True)
    (books / "receipts").mkdir()
    (books / "main.bean").write_text(TREE_MAIN, encoding="utf-8")
    (books / "year" / "entries.bean").write_text("; entries\n", encoding="utf-8")
    (tmp_path / "foreign").mkdir()
    return books


def _add_document(tmp_path: Path, books: Path, path: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        tmp_path / "foreign",
        *("--json", "--file", str(books / "main.bean"), "add", "document", "--date", "2026-01-02"),
        *("--account", "Assets:Cash", "--path", path, "--into", "year/entries.bean"),
    )


def _snapshot(books: Path) -> dict[str, bytes]:
    return {str(p.relative_to(books)): p.read_bytes() for p in sorted(books.rglob("*")) if p.is_file()}


@pytest.mark.parametrize(
    ("stored", "path"),
    [
        ("receipts/receipt.txt", "../receipts/receipt.txt"),
        ("receipts/my receipt 空白.txt", "../receipts/my receipt 空白.txt"),
        ("root-level.txt", "../root-level.txt"),
        ("year/local.txt", "local.txt"),
        ("year/sub/deep.txt", "sub/deep.txt"),
    ],
    ids=["sibling", "sibling-space-unicode", "parent", "same-directory", "descendant"],
)
def test_document_listed_from_an_include_is_reusable_as_add_input(tmp_path: Path, stored: str, path: str) -> None:
    """w5/066: a `../receipts/…` attachment listed as an absolute path, which `add document` refuses."""
    books = _tree(tmp_path)
    (books / stored).parent.mkdir(parents=True, exist_ok=True)
    (books / stored).write_text("synthetic receipt\n", encoding="utf-8")

    added = _add_document(tmp_path, books, path)
    assert added.returncode == 0, added.stderr
    assert json.loads(added.stdout)["data"]["directive"]["filename"] == path
    after_add = _snapshot(books)

    listed = _bea(tmp_path / "foreign", "--json", "--file", str(books / "main.bean"), "list", "document")
    assert listed.returncode == 0, listed.stderr
    assert [row["filename"] for row in json.loads(listed.stdout)["data"]] == [path]
    human = _bea(tmp_path / "foreign", "--file", str(books / "main.bean"), "list", "document")
    assert human.returncode == 0, human.stderr
    assert path in human.stdout
    assert str(books) not in human.stdout
    assert _snapshot(books) == after_add

    # The listed name goes straight back in, and the ledger still checks.
    again = _add_document(tmp_path, books, json.loads(listed.stdout)["data"][0]["filename"])
    assert again.returncode == 0, again.stderr
    check = _bea(tmp_path / "foreign", "--json", "--file", str(books / "main.bean"), "check")
    assert check.returncode == 0, check.stderr


@pytest.mark.skipif(sys.platform == "win32", reason="needs symlinks")
def test_a_symlinked_sibling_attachment_lists_under_its_own_name(tmp_path: Path) -> None:
    books = _tree(tmp_path)
    (books / "receipts" / "receipt.txt").write_text("synthetic receipt\n", encoding="utf-8")
    (books / "receipts" / "alias.txt").symlink_to("receipt.txt")

    added = _add_document(tmp_path, books, "../receipts/alias.txt")
    assert added.returncode == 0, added.stderr

    listed = _bea(tmp_path / "foreign", "--json", "--file", str(books / "main.bean"), "list", "document")
    assert listed.returncode == 0, listed.stderr
    assert [row["filename"] for row in json.loads(listed.stdout)["data"]] == ["../receipts/alias.txt"]
    assert (books / "receipts" / "alias.txt").is_symlink()


def test_a_document_outside_the_ledger_tree_keeps_its_absolute_path(tmp_path: Path) -> None:
    """Hand-written, outside the tree: nothing relative to offer, so the path is shown as resolved."""
    books = _tree(tmp_path)
    outside = tmp_path / "elsewhere" / "receipt.txt"
    outside.parent.mkdir()
    outside.write_text("synthetic receipt\n", encoding="utf-8")
    (books / "year" / "entries.bean").write_text(f'2026-01-02 document Assets:Cash "{outside}"\n', encoding="utf-8")

    listed = _bea(
        tmp_path / "foreign", "--json", "--file", str(books / "main.bean"), "list", "document", "--allow-errors"
    )

    assert listed.returncode == 0, listed.stderr
    assert [row["filename"] for row in json.loads(listed.stdout)["data"]] == [str(outside)]
