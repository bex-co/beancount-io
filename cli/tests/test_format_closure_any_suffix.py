"""A root's include closure is formatted whatever its members' suffixes (w1/041).

`.bean`/`.beancount` is the rule for finding ledgers in a directory; a file an
`include` reaches is already part of the ledger and must not be filtered out.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
OPENS = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
UNALIGNED = '2024-01-02 * "Lunch"\n  Assets:Cash -12.50 USD\n  Expenses:Food 12.50 USD\n'
GARBAGE = "this is not a directive\n"


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
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _ledger(tmp_path: Path, shape: str, suffix: str, content: str) -> tuple[Path, Path]:
    """A root ledger and the one child its include graph reaches."""
    books = tmp_path / "books"
    books.mkdir()
    root = books / "main.bean"
    if shape == "direct":
        child = books / f"entries{suffix}"
        root.write_text(f'{OPENS}include "entries{suffix}"\n')
    elif shape == "glob":
        (books / "parts").mkdir()
        child = books / "parts" / f"january{suffix}"
        root.write_text(f'{OPENS}include "parts/*"\n')
    else:
        middle = books / "middle.bean"
        child = books / f"grandchild{suffix}"
        root.write_text(f'{OPENS}include "middle.bean"\n')
        middle.write_text(f'include "grandchild{suffix}"\n')
    child.write_text(content)
    return root, child


SHAPES = ["direct", "glob", "nested"]
SUFFIXES = [".inc", ".data", ".bean"]


@pytest.mark.parametrize("suffix", SUFFIXES)
@pytest.mark.parametrize("shape", SHAPES)
def test_unaligned_member_fails_check_then_in_place_aligns_it(tmp_path: Path, shape: str, suffix: str) -> None:
    root, child = _ledger(tmp_path, shape, suffix, UNALIGNED)

    for mode in ("--check", "--dry-run"):
        result = _bea(tmp_path, "--json", "format", str(root), mode)
        scan = json.loads(result.stdout)["data"] if result.stdout else json.loads(result.stderr)["error"]["result"]
        assert scan["scanned"] == (3 if shape == "nested" else 2), (mode, scan)
        assert str(child) in scan["formatted"], (mode, result.stdout, result.stderr)
        assert child.read_text() == UNALIGNED
    check = _bea(tmp_path, "format", str(root), "--check")
    assert check.returncode == 1, check.stdout + check.stderr

    fixed = _bea(tmp_path, "--file", str(root), "format", "-i")
    assert fixed.returncode == 0, fixed.stdout + fixed.stderr
    assert child.read_text() != UNALIGNED
    assert "Assets:Cash    -12.50 USD" in child.read_text()

    green = _bea(tmp_path, "format", str(root), "--check")
    assert green.returncode == 0, green.stdout + green.stderr
    assert f"checked: {child}" in green.stdout


@pytest.mark.parametrize("suffix", SUFFIXES)
@pytest.mark.parametrize("shape", SHAPES)
def test_unparseable_member_fails_check_and_in_place_by_path(tmp_path: Path, shape: str, suffix: str) -> None:
    root, child = _ledger(tmp_path, shape, suffix, GARBAGE)

    for mode in ("--check", "-i"):
        result = _bea(tmp_path, "--json", "format", str(root), mode)
        assert result.returncode == 1, (mode, result.stdout, result.stderr)
        failed = json.loads(result.stderr)["error"]["result"]["failed"]
        assert [entry["file"] for entry in failed] == [str(child)], mode
        assert child.read_text() == GARBAGE


def test_directory_walk_still_ignores_other_suffixes(tmp_path: Path) -> None:
    """Naming a directory keeps the `.bean`/`.beancount` discovery rule."""
    _, child = _ledger(tmp_path, "direct", ".inc", UNALIGNED)
    result = _bea(tmp_path, "--json", "format", str(tmp_path / "books"), "--check")
    assert result.returncode == 0, result.stdout + result.stderr
    assert json.loads(result.stdout)["data"]["scanned"] == 1
    assert child.read_text() == UNALIGNED
