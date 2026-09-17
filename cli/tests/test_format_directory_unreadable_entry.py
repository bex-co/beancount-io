"""A directory walk names an unreadable .bean entry instead of dropping it (w3/362)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = 'include "txns/jan.bean"\ninclude "txns/feb.bean"\n'
JAN = """2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD

2020-01-02 * "jan"
  Expenses:Food   1.00 USD
  Assets:Cash    -1.00 USD
"""
FEB = """2020-01-03 * "feb"
  Expenses:Food   2.00 USD
  Assets:Cash    -2.00 USD
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
        timeout=60,
    )


def _books(tmp_path: Path) -> Path:
    books = tmp_path / "books"
    (books / "txns").mkdir(parents=True)
    (books / "main.bean").write_text(MAIN)
    (books / "txns" / "jan.bean").write_text(JAN)
    return books


def test_broken_symlink_stops_the_walk_and_is_named(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "txns" / "feb.bean").symlink_to("/missing/feb.bean")
    result = _bea(tmp_path, "format", str(books), "--check")
    assert result.returncode == 2
    assert "feb.bean" in result.stderr
    assert "/missing/feb.bean" in result.stderr


def test_json_callers_get_the_same_refusal(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "txns" / "feb.bean").symlink_to("/missing/feb.bean")
    result = _bea(tmp_path, "--json", "format", str(books), "--check")
    assert result.returncode == 2
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "feb.bean" in error["message"]


def test_a_readable_tree_still_scans_every_file(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "txns" / "feb.bean").write_text(
        '2020-01-03 * "feb"\n  Expenses:Food   2.00 USD\n  Assets:Cash    -2.00 USD\n'
    )
    result = _bea(tmp_path, "--json", "format", str(books), "--check")
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["scanned"] == 3


def test_a_symlink_pointing_outside_the_tree_is_still_skipped(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "txns" / "feb.bean").write_text(
        '2020-01-03 * "feb"\n  Expenses:Food   2.00 USD\n  Assets:Cash    -2.00 USD\n'
    )
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "ext.bean").write_text("2020-01-01 open Assets:Other USD\n")
    (books / "txns" / "ext.bean").symlink_to(outside / "ext.bean")
    result = _bea(tmp_path, "--json", "format", str(books), "--check")
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["scanned"] == 3
