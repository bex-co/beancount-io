"""A write `--into` an included file locates broken includes and plugins (w1/275).

The write's destination is not the ledger's root: the include walk and the
plugin lookup that relocate Beancount's `<load>:0` and `<ledger>:0` errors
start from the root, or they never see the line at fault. The same ledger
reads located with and without `--into`.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOTE = ("add", "note", "--date", "2024-01-05", "-a", "Assets:Cash", "-m", "hi")


def _bea(tmp_path: Path, books: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(books / "main.bean"), *args],
        env=env,
        cwd=books,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _books(tmp_path: Path, main: str, leaf: str = "2024-01-02 open Expenses:Food USD\n") -> Path:
    books = tmp_path / "books"
    (books / "sub").mkdir(parents=True)
    (books / "main.bean").write_text(main)
    (books / "sub" / "a.bean").write_text(leaf)
    return books.resolve()


HEAD = 'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\ninclude "sub/a.bean"\n'


def _missing(books: Path) -> str:
    return f'{books / "main.bean"}:4: include "nope.bean" matches no file (looked for {books / "nope.bean"})'


def test_refusal_names_the_missing_include_line(tmp_path: Path) -> None:
    books = _books(tmp_path, HEAD + 'include "nope.bean"\n')
    leaf = (books / "sub" / "a.bean").read_text()

    result = _bea(tmp_path, books, "--json", *NOTE, "--into", "sub/a.bean")

    assert result.returncode == 1, result.stderr
    details = json.loads(result.stderr)["error"]["details"]
    assert details == [_missing(books)]
    assert (books / "sub" / "a.bean").read_text() == leaf

    text = _bea(tmp_path, books, *NOTE, "--into", "sub/a.bean")
    assert _missing(books) in text.stderr
    assert "<load>:0" not in text.stderr


def test_allow_errors_warning_names_the_missing_include_line(tmp_path: Path) -> None:
    books = _books(tmp_path, HEAD + 'include "nope.bean"\n')

    result = _bea(tmp_path, books, *NOTE, "--into", "sub/a.bean", "--allow-errors")

    assert result.returncode == 0, result.stderr
    assert _missing(books) in result.stdout + result.stderr
    assert "<load>:0" not in result.stdout + result.stderr
    assert 'note Assets:Cash "hi"' in (books / "sub" / "a.bean").read_text()


def test_refused_allow_errors_write_names_the_tolerated_include_line(tmp_path: Path) -> None:
    books = _books(tmp_path, HEAD + 'include "nope.bean"\n')
    args = ("add", "note", "--date", "2024-01-05", "-a", "Assets:Nope", "-m", "hi")

    result = _bea(tmp_path, books, "--json", *args, "--into", "sub/a.bean", "--allow-errors")

    assert result.returncode == 1, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["ledger_warnings"] == [_missing(books)]


def test_repeated_include_names_both_lines(tmp_path: Path) -> None:
    books = _books(tmp_path, HEAD + 'include "sub/a.bean"\n')

    result = _bea(tmp_path, books, "--json", *NOTE, "--into", "sub/a.bean")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [
        f'{books / "main.bean"}:4: include "sub/a.bean" loads {books / "sub" / "a.bean"}, '
        f"already included at {books / 'main.bean'}:3"
    ]


def test_include_cycle_names_the_include_line(tmp_path: Path) -> None:
    books = _books(tmp_path, HEAD, '2024-01-02 open Expenses:Food USD\ninclude "../main.bean"\n')

    result = _bea(tmp_path, books, "--json", *NOTE, "--into", "sub/a.bean")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [
        f'{books / "sub" / "a.bean"}:2: include "../main.bean" leads back to {books / "main.bean"}, '
        "which includes this file (an include cycle)"
    ]


def test_missing_plugin_names_the_plugin_line(tmp_path: Path) -> None:
    books = _books(
        tmp_path,
        'option "operating_currency" "USD"\nplugin "nonexistent.plugin"\n'
        '2024-01-01 open Assets:Cash USD\ninclude "sub/a.bean"\n',
    )

    result = _bea(tmp_path, books, "--json", *NOTE, "--into", "sub/a.bean")

    assert result.returncode == 1, result.stderr
    (detail,) = json.loads(result.stderr)["error"]["details"]
    assert detail.startswith(f'{books / "main.bean"}:2: Cannot import plugin "nonexistent.plugin"')
