"""An include that matches no file is reported at its own line, with the path searched (w1/269).

Beancount reports the miss as `<load>:0: File glob "PATTERN" does not match
any files`: no file, no line, and a pattern relative to a directory it does
not name. A nested `include "accounts.bean"` in `sub/a.bean` is matched in
`sub/`, so creating `accounts.bean` beside the root left the same error.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path / "books",
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _books(tmp_path: Path) -> Path:
    books = tmp_path / "books"
    (books / "sub").mkdir(parents=True)
    (books / "main.bean").write_text('include "sub/a.bean"\ninclude "sub/b.bean"\n2024-01-01 open Assets:Cash USD\n')
    (books / "sub" / "a.bean").write_text('include "accounts.bean"\n')
    (books / "sub" / "b.bean").write_text("2024-01-01 open Expenses:X USD\n")
    return books.resolve()


def _located(books: Path) -> str:
    return (
        f'{books / "sub" / "a.bean"}:1: include "accounts.bean" matches no file '
        f"(looked for {books / 'sub' / 'accounts.bean'})"
    )


def test_json_check_names_the_nested_include_line(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(tmp_path, "--json", "check")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [_located(books)]


def test_plain_check_names_it_too(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(tmp_path, "check")

    assert result.returncode == 1
    assert result.stderr.splitlines() == [f"Error: {books / 'main.bean'}: 1 error(s).", f"  {_located(books)}"]


def test_a_file_beside_the_root_does_not_satisfy_it(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "accounts.bean").touch()

    result = _bea(tmp_path, "check")

    assert result.returncode == 1
    assert f"  {_located(books)}" in result.stderr.splitlines()


def test_reads_and_the_write_refusal_carry_the_location(tmp_path: Path) -> None:
    books = _books(tmp_path)
    before = (books / "main.bean").read_bytes()

    listed = _bea(tmp_path, "list", "open")
    added = _bea(tmp_path, "add", "open", "-a", "Assets:Y", "--date", "2024-01-01")

    assert listed.returncode == 1
    assert f"  {_located(books)}" in listed.stderr.splitlines()
    assert added.returncode == 1
    assert "nothing was written" in added.stderr
    assert f"  {_located(books)}" in added.stderr.splitlines()
    assert (books / "main.bean").read_bytes() == before


def test_a_root_include_and_every_includer_of_one_pattern_are_named(tmp_path: Path) -> None:
    books = _books(tmp_path)
    (books / "main.bean").write_text('include "sub/a.bean"\ninclude "accounts.bean"\n')

    result = _bea(tmp_path, "--json", "check")

    assert result.returncode == 1, result.stderr
    details = json.loads(result.stderr)["error"]["details"]
    assert len(details) == 2
    expected = (
        f'{books / "main.bean"}:2: include "accounts.bean" matches no file (looked for {books / "accounts.bean"})'
        f"; also {books / 'sub' / 'a.bean'}:1 (looked for {books / 'sub' / 'accounts.bean'})"
    )
    assert details == [expected, expected]


def test_native_options_keep_bean_check_output(tmp_path: Path) -> None:
    _books(tmp_path)

    result = _bea(tmp_path, "check", "--json")

    assert result.returncode == 1
    assert json.loads(result.stdout)["errors"][0]["filename"] == "<load>"
