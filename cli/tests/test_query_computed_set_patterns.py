"""Computed ambiguous regex sets get the same BQL refusal as literals (w5/683)."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import warnings
from pathlib import Path
from typing import Any

import pytest

from bea_engine import protocol, query
from tests.query_terminal import QueryTerminal

ROOT = Path(__file__).resolve().parents[1]
LEDGER = (
    "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
    '2024-01-05 * "Pay a b p q x" #trip\n  Expenses:Food 5 USD\n  Assets:Cash\n'
)
PATTERNS = [
    pytest.param("[A&&B]", "set intersection", id="intersection"),
    pytest.param("[P||Q]", "set union", id="union"),
    pytest.param("[A~~B]", "set symmetric difference", id="symmetric-difference"),
    pytest.param("[A-Z--X]", "set difference", id="difference"),
]
FORMS = {
    "match": "SELECT narration WHERE account = 'Expenses:Food' AND narration ~ lower('{pattern}')",
    "not-match": "SELECT narration WHERE account = 'Expenses:Food' AND narration !~ lower('{pattern}')",
    "grep": "SELECT grep(lower('{pattern}'), narration) AS g WHERE account = 'Expenses:Food'",
    "grepn": "SELECT grepn(lower('{pattern}'), narration, 0) AS g WHERE account = 'Expenses:Food'",
    "subst": "SELECT subst(lower('{pattern}'), '-', narration) AS g WHERE account = 'Expenses:Food'",
    "findfirst": "SELECT findfirst(lower('{pattern}'), tags) AS g WHERE account = 'Expenses:Food'",
}


def _ledger(tmp_path: Path, stored: str | None = None) -> Path:
    root = tmp_path / "main.bean"
    text = LEDGER
    if stored is not None:
        text += f'2024-01-06 query "unsafe" {json.dumps(stored)}\n'
    root.write_text(text)
    return root


def _args(root: Path, native: bool) -> list[str]:
    return ["query", "--source", str(root)] if native else ["--file", str(root), "query"]


def _bea(
    root: Path, statement: str, *, json_output: bool = False, native: bool = False
) -> subprocess.CompletedProcess[str]:
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("BEA_") and key not in {"CI", "BEANCOUNT_LOAD_CACHE_FILENAME"}
    }
    env.update(
        BEA_CONFIG_DIR=str(root.parent / "config"),
        XDG_CACHE_HOME=str(root.parent / "cache"),
        XDG_DATA_HOME=str(root.parent / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *(["--json"] if json_output else []), *_args(root, native), statement],
        env=env,
        cwd=root.parent,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _friendly(text: str, problem: str) -> None:
    assert "Python's regex reads a pattern differently from what it says" in text, text
    assert f"Possible {problem}" in text, text
    assert "backslashes" in text and "&, ~ or |" in text, text
    for raw in ("FutureWarning", "warning:", "site-packages", "query_compile.py", "query_env.py", "Traceback"):
        assert raw not in text, text


def _refusal(result: subprocess.CompletedProcess[str], statement: str, json_output: bool, problem: str) -> None:
    assert result.returncode == 2, result.stdout + result.stderr
    assert result.stdout == "", result.stdout
    if json_output:
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "usage" and error["exit_code"] == 2, error
        _friendly(error["message"], problem)
        assert statement in " ".join(error["details"]), error
    else:
        _friendly(result.stderr, problem)


@pytest.mark.parametrize(("pattern", "problem"), PATTERNS)
@pytest.mark.parametrize("form", ["match", "grep"])
@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
def test_computed_set_operations_refuse_in_operators_and_functions(
    tmp_path: Path, pattern: str, problem: str, form: str, json_output: bool
) -> None:
    root = _ledger(tmp_path)
    before = root.read_bytes()
    statement = FORMS[form].format(pattern=pattern)

    _refusal(_bea(root, statement, json_output=json_output), statement, json_output, problem)

    assert root.read_bytes() == before


@pytest.mark.parametrize("form", ["not-match", "grepn", "subst", "findfirst"])
@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
def test_other_regex_consumers_also_refuse_computed_set_operations(
    tmp_path: Path, form: str, json_output: bool
) -> None:
    root = _ledger(tmp_path)
    statement = FORMS[form].format(pattern="[A&&B]")

    _refusal(_bea(root, statement, json_output=json_output), statement, json_output, "set intersection")


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
@pytest.mark.parametrize(
    ("expression", "expected"),
    [
        (r"grep(lower('[A\&\&B]'), narration)", "a"),
        (r"grep(lower('[P\|\|Q]'), narration)", "p"),
        (r"grep(lower('[A\~\~B]'), narration)", "a"),
        (r"grep(lower('[A-Z\-\-X]'), narration)", "a"),
        ("grep('P.y', narration)", "Pay"),
        ("grep(upper('pay'), upper(narration))", "PAY"),
    ],
    ids=[
        "escaped-intersection",
        "escaped-union",
        "escaped-symmetric-difference",
        "escaped-difference",
        "plain",
        "computed-plain",
    ],
)
def test_escaped_operators_and_plain_patterns_keep_their_actual_results(
    tmp_path: Path, json_output: bool, expression: str, expected: str
) -> None:
    root = _ledger(tmp_path)
    statement = f"SELECT {expression} AS g WHERE account = 'Expenses:Food'"

    result = _bea(root, statement, json_output=json_output)

    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stderr == "", result.stderr
    if json_output:
        assert json.loads(result.stdout)["data"]["rows"] == [[expected]]
    else:
        assert result.stdout.splitlines()[-1].strip() == expected, result.stdout


@pytest.mark.parametrize("surface", ["source-direct", "source-stored", "file-stored"])
@pytest.mark.parametrize(
    ("pattern", "problem", "form"), [("[A&&B]", "set intersection", "match"), ("[P||Q]", "set union", "grep")]
)
def test_native_and_stored_queries_use_the_same_runtime_guard(
    tmp_path: Path, surface: str, pattern: str, problem: str, form: str
) -> None:
    statement = FORMS[form].format(pattern=pattern)
    root = _ledger(tmp_path, stored=statement)
    asked = statement if surface == "source-direct" else ".run unsafe"

    result = _bea(root, asked, native=surface.startswith("source"))

    _refusal(result, statement, False, problem)


@pytest.mark.parametrize(("pattern", "problem"), [*PATTERNS, pytest.param("[[A]", "nested set", id="nested-set")])
def test_an_actual_bql_literal_refusal_cannot_seed_a_cache_bypass_for_a_computed_pattern(
    tmp_path: Path, pattern: str, problem: str
) -> None:
    root = _ledger(tmp_path)
    connection = query.connect(root)
    literal = f"SELECT grep('{pattern.lower()}', narration) AS g"
    computed = f"SELECT grep(lower('{pattern}'), narration) AS g"
    try:
        with pytest.raises(protocol.UsageError):
            query._executed(connection, literal, connection.execute, [], file=root)
        # Both executions use the same real connection and Python regex cache.
        with pytest.raises(protocol.UsageError) as caught:
            query._executed(connection, computed, connection.execute, [], file=root)
        _friendly(str(caught.value), problem)
    finally:
        re.purge()


@pytest.mark.parametrize(
    ("category", "message"),
    [(FutureWarning, "An unrelated future change"), (UserWarning, "Possible set intersection from another component")],
)
def test_unrelated_warnings_keep_their_category_and_do_not_become_query_errors(
    category: type[Warning], message: str
) -> None:
    def run() -> Any:
        warnings.warn(message, category, stacklevel=1)
        return "actual result"

    with pytest.warns(category, match=re.escape(message)):
        assert query._compiled(run, "SELECT 1", list) == "actual result"


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_interactive_queries_refuse_each_set_operation_and_keep_answering(tmp_path: Path, native: bool) -> None:
    root = _ledger(tmp_path)
    with QueryTerminal(tmp_path, _args(root, native)) as shell:
        shell.read("beanquery>")
        for pattern, problem in [parameter.values for parameter in PATTERNS]:
            shell.send(FORMS["grep"].format(pattern=pattern))
            reply = shell.read("beanquery>")
            _friendly(reply, problem)
        # Native Beanquery's narrow mode truncates headings to the data width.
        shell.send("SELECT 17 AS ok LIMIT 1")
        reply = shell.read("beanquery>")
        lines = [line.strip() for line in reply.splitlines()]
        assert "ok" in lines and "17" in lines, reply
        assert shell.finish() == 0
