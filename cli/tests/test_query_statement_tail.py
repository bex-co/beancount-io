"""No query path silently drops a trailing BQL statement (w1/042).

Beanquery parses the first statement of its input and ignores everything after
a `;` — even text that is not BQL. The frontend's one-shot guard refused that
for `--file` queries, but three other paths reached Beanquery without it:

- native `query --source` one-shots, dispatched before the guard ran;
- stored `query` directives replayed by `.run NAME` / `.run *`, whose SQL the
  frontend never sees;
- BQL typed at the managed interactive prompt, and engine callers such as
  `ask`'s query tool that skip the frontend command.

All of them answered half and exited 0. The native dispatch now runs the same
guard, and the engine refuses a statement tail where it executes BQL, so the
stored and interactive paths are covered too. Quote and comment rules, a
trailing separator, and `.run *` over several separate stored queries are
unchanged.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal

ROOT = Path(__file__).resolve().parents[1]
BASE = """2025-01-01 open Assets:Cash USD
2025-01-01 open Equity:Opening USD
2025-01-02 * "opening"
  Assets:Cash 1 USD
  Equity:Opening -1 USD
"""
TAIL_REFUSAL = "One BQL statement per"


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _run(tmp_path: Path, module: str, *args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", module, *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        input=stdin,
        stdin=subprocess.DEVNULL if stdin is None else None,
    )


def _bea(tmp_path: Path, *args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    return _run(tmp_path, "cli.main", *args, stdin=stdin)


def _ledger(tmp_path: Path, *stored: tuple[str, str]) -> Path:
    path = tmp_path / "main.bean"
    lines = [BASE, *(f'2025-01-03 query "{name}" "{body}"\n' for name, body in stored)]
    path.write_text("".join(lines))
    return path


# --- native `--source` one-shots ---------------------------------------------------


@pytest.mark.parametrize("spelling", ["{path}", "beancount:{path}"], ids=["path", "uri"])
@pytest.mark.parametrize("query", ["SELECT 1; SELECT 2", "SELECT 1; garbage"], ids=["two-selects", "garbage-tail"])
@pytest.mark.parametrize("via", ["argv", "stdin"])
def test_native_statement_tail_is_refused(tmp_path: Path, spelling: str, query: str, via: str) -> None:
    ledger = _ledger(tmp_path)
    source = spelling.format(path=ledger)
    if via == "argv":
        result = _bea(tmp_path, "--no-input", "query", "--source", source, query)
    else:
        result = _bea(tmp_path, "--no-input", "query", "--source", source, stdin=query)

    assert result.returncode == 2, result.stdout + result.stderr
    assert TAIL_REFUSAL in result.stderr
    assert result.stdout == ""


def test_native_refusal_preserves_an_existing_export(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    export = tmp_path / "export.txt"
    export.write_text("previous export\n")
    result = _bea(tmp_path, "query", "--source", str(ledger), "--output", str(export), "SELECT 1; SELECT 2")

    assert result.returncode == 2, result.stdout + result.stderr
    assert export.read_text() == "previous export\n"


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        pytest.param("SELECT 7 AS n;", "7", id="trailing-separator"),
        pytest.param("SELECT ';' AS x", ";", id="quoted-semicolon"),
        pytest.param("SELECT 7 AS n /* ; */", "7", id="commented-semicolon"),
    ],
)
def test_native_single_statements_still_answer(tmp_path: Path, query: str, expected: str) -> None:
    ledger = _ledger(tmp_path)
    result = _bea(tmp_path, "--no-input", "query", "--source", str(ledger), query)

    assert result.returncode == 0, result.stderr
    assert expected in result.stdout.splitlines()


# --- managed stored queries ---------------------------------------------------------


@pytest.mark.parametrize("body", ["SELECT 1; SELECT 2", "SELECT 1; garbage"], ids=["two-selects", "garbage-tail"])
@pytest.mark.parametrize("command", [".run multi", ".run *"], ids=["named", "wildcard"])
@pytest.mark.parametrize("json_mode", [True, False], ids=["json", "text"])
def test_stored_statement_tail_is_refused(tmp_path: Path, body: str, command: str, json_mode: bool) -> None:
    ledger = _ledger(tmp_path, ("multi", body), ("saved", "SELECT 2"))
    before = ledger.read_bytes()
    result = _bea(tmp_path, *(("--json",) if json_mode else ()), "--file", str(ledger), "query", command)

    assert result.returncode == 2, result.stdout + result.stderr
    assert TAIL_REFUSAL in result.stderr
    assert result.stdout == ""
    if json_mode:
        assert json.loads(result.stderr)["error"]["category"] == "usage"
    assert ledger.read_bytes() == before


@pytest.mark.parametrize(
    "body",
    [
        pytest.param("SELECT 7 AS n;", id="trailing-separator"),
        pytest.param("SELECT 7 AS n /* ; */", id="commented-semicolon"),
    ],
)
def test_stored_single_statements_still_answer(tmp_path: Path, body: str) -> None:
    ledger = _ledger(tmp_path, ("one", body))
    result = _bea(tmp_path, "--json", "--file", str(ledger), "query", ".run one")

    assert result.returncode == 0, result.stderr
    assert "7" in json.loads(result.stdout)["data"]["text"].split()


def test_wildcard_still_runs_separate_stored_queries(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, ("first", "SELECT 11 AS n"), ("second", "SELECT 22 AS n;"))
    result = _bea(tmp_path, "--json", "--file", str(ledger), "query", ".run *")

    assert result.returncode == 0, result.stderr
    text = json.loads(result.stdout)["data"]["text"]
    assert "first:" in text and "11" in text
    assert "second:" in text and "22" in text


# --- engine callers that skip the frontend command ----------------------------------


def test_engine_rows_answer_refuses_a_tail(tmp_path: Path) -> None:
    """`ask`'s query tool calls the helper directly with `--format json`."""
    ledger = _ledger(tmp_path)
    result = _run(tmp_path, "bea_engine", "query", "--file", str(ledger), "SELECT 1; SELECT 2", "--format", "json")

    assert result.returncode == 2, result.stdout + result.stderr
    assert TAIL_REFUSAL in result.stdout + result.stderr


# --- managed interactive shell ------------------------------------------------------


def test_interactive_tail_is_a_recoverable_usage_error(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, ("multi", "SELECT 1; SELECT 2"))
    with QueryTerminal(tmp_path, ["--file", str(ledger), "query"]) as shell:
        shell.read("beanquery>")
        shell.send("SELECT 1; SELECT 2")
        typed = shell.read("beanquery>")
        assert TAIL_REFUSAL in typed
        shell.send(".run multi")
        stored = shell.read("beanquery>")
        assert TAIL_REFUSAL in stored
        shell.send("SELECT count(*) AS n")
        assert "\n2\n" in shell.read("beanquery>")
        assert shell.finish() == 0
        assert "Traceback" not in shell.screen


@pytest.mark.parametrize(
    "query",
    [
        "SELECT 1",
        "SELECT 1;",
        "SELECT 1; SELECT 2",
        "SELECT 1; garbage",
        "SELECT ';' AS x",
        "SELECT 1 /* ; */",
        "/* don't */ SELECT 1; SELECT 2",
        "SELECT 'it''s; fine'",
        "SELECT 1; /* trailing */",
        ";;",
    ],
)
def test_engine_and_frontend_count_statements_alike(query: str) -> None:
    """The engine guard restates the frontend splitter's rules; pin that they agree."""
    from bea_engine import protocol
    from bea_engine.query import _refuse_statement_tail
    from cli.commands.query import _split_statements

    try:
        _refuse_statement_tail(query)
        engine_refuses = False
    except protocol.UsageError:
        engine_refuses = True
    assert engine_refuses == (len(_split_statements(query)) > 1)
