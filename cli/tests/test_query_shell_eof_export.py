"""Leaving the query shell keeps an export to query results only (w1/265).

Upstream's `do_EOF` printed `exit` to the shell's `outfile`, so a session with
`--output FILE` or `.output FILE` ended on Ctrl-D with a bogus last row `exit`
in the export, and the terminal was left on the prompt line. A file opened by
`.output` was also never closed, so leaving the shell printed a
`ResourceWarning` at interpreter shutdown.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Equity:Opening
2026-01-02 * "Opening"
  Assets:Bank  100.00 USD
  Equity:Opening
"""
QUERY = "SELECT account, sum(position) AS total GROUP BY account ORDER BY account"
CTRL_D = b"\x04"


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _run(tmp_path: Path, args: list[str], commands: list[str], *, leave: str) -> tuple[int, str]:
    with QueryTerminal(tmp_path, args) as terminal:
        terminal.read("beanquery>")
        for command in commands:
            terminal.send(command)
            terminal.read("beanquery>")
        if leave == "eof":
            os.write(terminal.fd, CTRL_D)
        else:
            terminal.send(".exit")
        screen = terminal.read()
        status = terminal.process.wait(timeout=10)
    return status, screen


def _assert_rows_only(export: Path) -> None:
    lines = export.read_text().splitlines()
    assert lines[-1] != "exit", lines
    assert "exit" not in lines, lines
    assert [line.split(",")[0].strip() for line in lines[1:]] == ["Assets:Bank", "Equity:Opening"], lines


@pytest.mark.parametrize("source", [False, True], ids=["ledger", "source"])
@pytest.mark.parametrize("leave", ["eof", "exit"])
@pytest.mark.parametrize("redirect", ["flag", "dot-output"])
def test_leaving_the_shell_writes_nothing_into_the_export(
    tmp_path: Path, ledger: Path, source: bool, leave: str, redirect: str
) -> None:
    export = tmp_path / "out.csv"
    args = ["query", "--source", "main.bean"] if source else ["--file", str(ledger), "query"]
    commands = [".format csv", QUERY]
    if redirect == "flag":
        args += ["-o", str(export)]
    else:
        commands.insert(0, f".output {export}")

    status, screen = _run(tmp_path, args, commands, leave=leave)

    assert status == 0, screen
    _assert_rows_only(export)
    assert "ResourceWarning" not in screen, screen
    if leave == "eof":
        # The prompt line is ended on the terminal, as upstream does without an export.
        assert screen.rstrip().endswith("exit"), screen
