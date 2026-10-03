"""Native `query --source` refuses to write over the files it reads (w4/181).

`--source` hands the query to native Beanquery, which opens `--output`
itself, and that branch returned before the alias guard `--file` runs:
`bea query --source main.bean --output main.bean '…'` replaced the books with
an ASCII table and exited 0. The source is now resolved the way upstream does
and checked, includes and links included, before the native writer starts.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal

ROOT = Path(__file__).resolve().parents[1]
MAIN = 'include "child.bean"\n2024-01-02 * "Start"\n  Assets:Cash 1000 USD\n  Equity:OpeningBalances\n'
CHILD = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:OpeningBalances USD\n"


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
        stdin=subprocess.DEVNULL,
    )


def _digest(tmp_path: Path) -> dict[str, str]:
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(tmp_path.glob("*.*")) if p.is_file()}


@pytest.fixture
def books(tmp_path: Path) -> Path:
    (tmp_path / "main.bean").write_text(MAIN)
    (tmp_path / "child.bean").write_text(CHILD)
    (tmp_path / "t.csv").write_text("a,b\n1,2\n")
    (tmp_path / "sym.bean").symlink_to(tmp_path / "main.bean")
    os.link(tmp_path / "main.bean", tmp_path / "hard.bean")
    return tmp_path / "main.bean"


@pytest.mark.parametrize(
    ("source", "destination", "query"),
    [
        ("{main}", "main.bean", "SELECT account"),
        ("beancount:{main}", "main.bean", "SELECT account"),
        ("{main}", "sym.bean", "SELECT account"),
        ("{main}", "hard.bean", "SELECT account"),
        ("{main}", "child.bean", "SELECT account"),
        ("csv:{csv}", "t.csv", "SELECT a FROM t"),
    ],
    ids=["path", "beancount-uri", "symlink", "hardlink", "include", "csv"],
)
def test_output_onto_a_source_file_is_refused(
    tmp_path: Path, books: Path, source: str, destination: str, query: str
) -> None:
    before = _digest(tmp_path)
    spec = source.format(main=books, csv=tmp_path / "t.csv")
    result = _bea(tmp_path, "query", "--source", spec, "--output", str(tmp_path / destination), query)

    assert result.returncode == 2, result.stdout + result.stderr
    assert "would overwrite" in result.stderr
    assert _digest(tmp_path) == before
    assert _bea(tmp_path, "--file", str(books), "check").returncode == 0


def test_a_distinct_destination_still_exports(tmp_path: Path, books: Path) -> None:
    out = tmp_path / "result.txt"
    result = _bea(tmp_path, "query", "--source", str(books), "--output", str(out), "SELECT account LIMIT 1")
    assert result.returncode == 0, result.stderr
    assert "Assets:Cash" in out.read_text()
    assert books.read_text() == MAIN


@pytest.mark.parametrize(
    ("source", "destination"),
    [
        ("{main}", "main.bean"),
        ("beancount:{main}", "main.bean"),
        ("{main}", "child.bean"),
        ("{main}", "sym.bean"),
        ("{main}", "hard.bean"),
        ("csv:{csv}", "t.csv"),
        ("{main}", "unused.txt"),
    ],
)
def test_native_one_shot_output_refuses_before_opening(
    tmp_path: Path, books: Path, source: str, destination: str
) -> None:
    before = _digest(tmp_path)
    spec = source.format(main=books, csv=tmp_path / "t.csv")
    result = _bea(tmp_path, "query", "--source", spec, f".output {tmp_path / destination}")

    assert result.returncode == 2, result.stdout + result.stderr
    assert "One-shot `.output` writes nothing" in result.stderr
    assert _digest(tmp_path) == before


@pytest.mark.parametrize(
    ("source", "destination", "query"),
    [
        ("{main}", "main.bean", "SELECT 73 AS n LIMIT 1"),
        ("beancount:{main}", "child.bean", "SELECT 73 AS n LIMIT 1"),
        ("{main}", "sym.bean", "SELECT 73 AS n LIMIT 1"),
        ("{main}", "hard.bean", "SELECT 73 AS n LIMIT 1"),
        ("{main}", "settings.bean", "SELECT 73 AS n LIMIT 1"),
        ("csv:{csv}", "t.csv", "SELECT 73 AS n FROM t"),
    ],
)
def test_native_shell_preserves_source_and_recovers(
    tmp_path: Path, books: Path, source: str, destination: str, query: str
) -> None:
    with books.open("a") as stream:
        stream.write('include "settings.bean"\n')
    (tmp_path / "settings.bean").write_text('; no entries\noption "title" "QA"\n')
    before = _digest(tmp_path)
    spec = source.format(main=books, csv=tmp_path / "t.csv")
    export = tmp_path / "export.txt"
    with QueryTerminal(tmp_path, ["query", "--source", spec]) as shell:
        shell.read("beanquery>")
        shell.send(f".output {tmp_path / destination}")
        refused = shell.read("beanquery>")
        assert "Refusing to write query output" in refused
        shell.send(query)
        assert "\n73\n" in shell.read("beanquery>")
        assert _digest(tmp_path) == before
        shell.send(f".output {export}")
        shell.read("beanquery>")
        shell.send(query)
        shell.read("beanquery>")
        shell.send(".output")
        shell.read("beanquery>")
        shell.send(query)
        assert "\n73\n" in shell.read("beanquery>")
        assert shell.finish() == 0
        assert "Traceback" not in shell.screen
    assert "73" in export.read_text()
    assert {name: digest for name, digest in _digest(tmp_path).items() if name != "export.txt"} == before


def test_native_non_file_source_does_not_protect_a_fake_input(tmp_path: Path) -> None:
    export = tmp_path / "export.txt"
    export.write_text("previous export\n")
    with QueryTerminal(tmp_path, ["query", "--source", "test:export.txt"]) as shell:
        shell.read("beanquery>")
        shell.send(f".output {export}")
        assert "Refusing" not in shell.read("beanquery>")
        shell.send("SELECT 73 AS n FROM test LIMIT 1")
        shell.read("beanquery>")
        shell.send(".output")
        shell.read("beanquery>")
        assert shell.finish() == 0
    assert "73" in export.read_text()
