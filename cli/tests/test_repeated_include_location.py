"""A file loaded twice, or an include cycle, is reported at the include line (w1/273).

Beancount reports both as `<load>:0: Duplicate filename parsed: "PATH"`: no
file and no line, so nothing says which `include` to remove. The include that
loaded the file again is named, with where it was first included, and an
include leading back to a file still being loaded is called a cycle.
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


def _books(tmp_path: Path, b: str = '\n\ninclude "a.bean"\n') -> Path:
    books = tmp_path / "books"
    (books / "sub").mkdir(parents=True)
    (books / "main.bean").write_text('option "operating_currency" "USD"\ninclude "sub/a.bean"\ninclude "sub/b.bean"\n')
    (books / "sub" / "a.bean").write_text("2024-01-01 open Assets:Cash USD\n")
    (books / "sub" / "b.bean").write_text(b)
    return books.resolve()


def _repeated(books: Path) -> str:
    return (
        f'{books / "sub" / "b.bean"}:3: include "a.bean" loads {books / "sub" / "a.bean"}, '
        f"already included at {books / 'main.bean'}:2"
    )


def test_json_check_names_the_second_include_and_the_first(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(tmp_path, "--json", "check")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [_repeated(books)]


def test_plain_check_names_it_too(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(tmp_path, "check")

    assert result.returncode == 1
    assert result.stderr.splitlines() == [f"Error: {books / 'main.bean'}: 1 error(s).", f"  {_repeated(books)}"]


def test_reads_and_the_write_refusal_carry_the_location(tmp_path: Path) -> None:
    books = _books(tmp_path)
    before = (books / "main.bean").read_bytes()

    listed = _bea(tmp_path, "list", "open")
    added = _bea(tmp_path, "add", "open", "-a", "Assets:Bank", "-c", "USD", "--date", "2024-01-01")

    assert listed.returncode == 1
    assert f"  {_repeated(books)}" in listed.stderr.splitlines()
    assert added.returncode == 1
    assert "nothing was written" in added.stderr
    assert f"  {_repeated(books)}" in added.stderr.splitlines()
    assert (books / "main.bean").read_bytes() == before


def test_an_include_back_to_the_root_is_a_cycle(tmp_path: Path) -> None:
    books = _books(tmp_path, b='include "../main.bean"\n')

    result = _bea(tmp_path, "--json", "check")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [
        f'{books / "sub" / "b.bean"}:1: include "../main.bean" leads back to {books / "main.bean"}, '
        "which includes this file (an include cycle)"
    ]


def test_a_file_including_itself_is_a_cycle(tmp_path: Path) -> None:
    books = _books(tmp_path, b='include "b.bean"\n')

    result = _bea(tmp_path, "--json", "check")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [
        f'{books / "sub" / "b.bean"}:1: include "b.bean" includes this file itself (an include cycle)'
    ]


def test_native_options_keep_bean_check_output(tmp_path: Path) -> None:
    _books(tmp_path)

    result = _bea(tmp_path, "check", "--json")

    assert result.returncode == 1
    errors = json.loads(result.stdout)["errors"]
    assert errors[0]["filename"] == "<load>"
    assert errors[0]["message"].startswith("Duplicate filename parsed:")
