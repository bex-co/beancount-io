"""The frontend include scan reads `include` strings the way Beancount's lexer does (w1/159).

Upstream loads `data.bean` for `include"data.bean"`, `include "d\\ata.bean"` and
`include "data\\.bean"`: the keyword may touch its string, and a backslash
before an ordinary character yields that character. The textual scan behind
the `-o` guards and the `format` closure required a space and globbed the raw
escapes, so it missed the include — `format -o` and `query --source -o`
replaced it, and `format --check` neither scanned it nor stopped reporting it
missing.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli import output
from cli.main import app

runner = CliRunner()

DATA = '2026-01-01 open Assets:Cash USD\n2026-01-05 * "Pay"\n  Assets:Cash  5 USD\n  Income:Job\n'
DATA += "2026-01-01 open Income:Job USD\n"
MISALIGNED = DATA.replace("  Assets:Cash  5 USD", "      Assets:Cash    5 USD")
SPELLINGS = ['include"data.bean"', 'include "d\\ata.bean"', 'include "data\\.bean"']


def _books(tmp_path: Path, include: str, data: str = DATA) -> tuple[Path, Path]:
    main = tmp_path / "main.bean"
    main.write_text(include + "\n", encoding="utf-8")
    included = tmp_path / "data.bean"
    included.write_text(data, encoding="utf-8")
    return main, included


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.mark.parametrize("include", SPELLINGS)
def test_the_closure_reaches_every_lexer_spelling(tmp_path: Path, include: str) -> None:
    main, included = _books(tmp_path, include)
    assert [path.resolve() for path in output.ledger_closure(main)] == [main.resolve(), included.resolve()]
    assert output.missing_includes(main) == []


@pytest.mark.parametrize(
    ("escaped", "name"),
    [("a\\\\b.bean", "a\\b.bean"), ('q\\"x.bean', 'q"x.bean'), ("tab\\tx.bean", "tab\tx.bean")],
    ids=["backslash", "quote", "tab"],
)
def test_escapes_unescape_like_the_lexer(tmp_path: Path, escaped: str, name: str) -> None:
    main = tmp_path / "main.bean"
    main.write_text(f'include "{escaped}"\n', encoding="utf-8")
    (tmp_path / name).write_text("2026-01-01 open Assets:Cash USD\n", encoding="utf-8")
    assert [path.name for path in output.ledger_closure(main)] == ["main.bean", name]


@pytest.mark.parametrize("include", SPELLINGS)
@pytest.mark.parametrize(
    "argv",
    [
        ["format", "main.bean", "-o", "data.bean"],
        ["query", "--source", "main.bean", "-o", "data.bean", "SELECT account, sum(position) GROUP BY account"],
        ["treeify", "main.bean", "-o", "data.bean", "--force"],
    ],
    ids=["format", "query-source", "treeify"],
)
def test_output_guards_refuse_the_include(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, include: str, argv: list[str]
) -> None:
    _, included = _books(tmp_path, include)
    before = _digest(included)
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(app, argv)

    assert result.exit_code == 2, result.output
    assert "would overwrite the ledger it reads" in result.output
    assert _digest(included) == before


@pytest.mark.parametrize("include", SPELLINGS)
def test_format_check_scans_and_flags_the_include(tmp_path: Path, include: str) -> None:
    main, included = _books(tmp_path, include, MISALIGNED)

    result = runner.invoke(app, ["--json", "format", "--check", str(main)])

    assert result.exit_code == 1, result.output
    scan = json.loads(result.stderr)["error"]["result"]
    assert scan["scanned"] == 2
    assert scan["formatted"] == [str(included.resolve())]
    assert scan["missing"] == []
