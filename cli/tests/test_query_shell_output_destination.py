"""The query shell's `.output` reads a destination the way `-o` does (w1/303).

The argument reached `open()` raw: `.output -` sent every later result into a
file named `-` instead of back to the terminal, `.output "my out.csv"` kept the
quotes in the file name, and `.output ~/out.csv` failed because nothing
expanded `~`. One pair of matching quotes is now removed, `-` restores the
original stream, `~` expands, and the ledger guards check the resolved path.
"""

from __future__ import annotations

import io
from pathlib import Path

import pytest

from bea_engine.query import build_shell
from tests.query_terminal import QueryTerminal

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Open
2024-01-02 * "Seed"
  Assets:Cash  10 USD
  Equity:Open
"""


@pytest.fixture
def home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "home"
    path.mkdir()
    monkeypatch.setenv("HOME", str(path))
    return path


@pytest.mark.parametrize("native", [False, True], ids=["managed", "source"])
def test_dash_quotes_and_tilde_name_the_destination_in_a_real_shell(tmp_path: Path, native: bool) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    home = tmp_path / "home"
    home.mkdir()
    args = ["query", "--source", "main.bean"] if native else ["--file", "main.bean", "query"]
    with QueryTerminal(tmp_path, args, env={"HOME": str(home)}) as shell:
        shell.read("beanquery>")
        for command in (".output out.csv", "SELECT 'to the file' AS t LIMIT 1", ".output -"):
            shell.send(command)
            shell.read("beanquery>")
        shell.send("SELECT 'back on the terminal' AS t LIMIT 1")
        assert "back on the terminal\n" in shell.read("beanquery>")
        for command in (
            '.output "my out.csv"',
            "SELECT 'quoted' AS t LIMIT 1",
            ".output ~/home-out.csv",
            "SELECT 'home' AS t LIMIT 1",
            ".output",
        ):
            shell.send(command)
            shell.read("beanquery>")
        assert shell.finish() == 0
        assert "Cannot write" not in shell.screen, shell.screen

    assert not (tmp_path / "-").exists()
    assert "to the file" in (tmp_path / "out.csv").read_text()
    assert "back on the terminal" not in (tmp_path / "out.csv").read_text()
    assert "quoted" in (tmp_path / "my out.csv").read_text()
    assert not list(tmp_path.glob('"*'))
    assert "home" in (home / "home-out.csv").read_text()
    assert not (tmp_path / "~").exists()


@pytest.mark.parametrize(
    "spelling", ["'{name}'", '"{name}"', "{path}", '"{path}"', "~/books/{name}", "'~/books/{name}'"]
)
def test_a_quoted_or_tilde_spelling_of_the_ledger_is_refused(
    home: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], spelling: str
) -> None:
    books = home / "books"
    books.mkdir()
    ledger = books / "main.bean"
    ledger.write_text(LEDGER)
    monkeypatch.chdir(books)
    stream = io.StringIO()
    shell = build_shell(ledger, stream)

    shell.onecmd(".output " + spelling.format(name=ledger.name, path=ledger))
    shell.onecmd("SELECT 'still here' AS t LIMIT 1")

    assert "Refusing to write query output" in capsys.readouterr().err
    assert ledger.read_text() == LEDGER
    assert "still here" in stream.getvalue()


def test_dash_after_a_file_restores_the_stream_and_writes_no_dash_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    monkeypatch.chdir(tmp_path)
    stream = io.StringIO()
    shell = build_shell(ledger, stream)

    shell.onecmd(".output out.txt")
    shell.onecmd("SELECT 'exported' AS t LIMIT 1")
    shell.onecmd(".output -")
    shell.onecmd("SELECT 'restored' AS t LIMIT 1")

    assert shell.outfile is stream
    assert "restored" in stream.getvalue() and "exported" not in stream.getvalue()
    assert "exported" in (tmp_path / "out.txt").read_text()
    assert not (tmp_path / "-").exists()


def test_dot_slash_dash_still_names_a_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    monkeypatch.chdir(tmp_path)
    stream = io.StringIO()
    shell = build_shell(ledger, stream)

    shell.onecmd(".output ./-")
    shell.onecmd("SELECT 'into dash' AS t LIMIT 1")
    shell.onecmd(".output")

    assert "into dash" in (tmp_path / "-").read_text()


def test_an_unknown_home_keeps_the_current_destination(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    monkeypatch.chdir(tmp_path)
    stream = io.StringIO()
    shell = build_shell(ledger, stream)

    shell.onecmd(".output ~no-such-user-w1303/out.csv")
    shell.onecmd("SELECT 'kept' AS t LIMIT 1")

    assert "Cannot write to ~no-such-user-w1303/out.csv" in capsys.readouterr().err
    assert shell.outfile is stream
    assert "kept" in stream.getvalue()
    assert not (tmp_path / "~no-such-user-w1303").exists()
