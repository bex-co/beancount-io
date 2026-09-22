"""Statement counting reads BQL comments as comments (w3/402).

`_split_statements` tracked quotes but not comments, and failed in both
directions:

- a `;` inside `/* … */` split a valid single query, which was then refused as
  two statements;
- an apostrophe inside a comment opened a string that swallowed the real
  separator, so two statements were forwarded, the engine ran only the first,
  and the caller got exit 0 and half an answer.

The grammar here was probed against the parser rather than assumed. BQL has
`/* */` block comments and escapes a quote by doubling it. It has **no**
line-comment form: `--`, `#` and a bare `;` are each a syntax error. An earlier
pass (w3/399) modelled `--` as a comment in the engine's `_code_mask`; that was
wrong and is corrected with this change, so both twins now describe the same
real grammar.

The frontend may not import the engine, so the rules live in two places. The
last test pins that they agree.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.query import _code_mask
from cli.commands.query import _split_statements

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "Lunch"
  Assets:Cash -10 USD
  Expenses:Food
"""


class TestSplitting:
    @pytest.mark.parametrize(
        "query",
        [
            pytest.param("/* explanation; one query */ SELECT count(*) AS n", id="semicolon-in-comment"),
            pytest.param("SELECT count(*) AS n /* note; one statement */", id="trailing-comment"),
            pytest.param("SELECT 'a;b' AS x", id="semicolon-in-literal"),
            pytest.param('SELECT "a;b" AS x', id="semicolon-in-double-quoted"),
            pytest.param("SELECT 'it''s; fine' AS x", id="doubled-quote-then-semicolon"),
            pytest.param("SELECT count(*) AS n;", id="trailing-separator"),
            pytest.param("/* don't split */ SELECT count(*) AS n", id="apostrophe-in-comment"),
        ],
    )
    def test_one_statement_stays_one(self, query: str) -> None:
        assert len(_split_statements(query)) == 1, _split_statements(query)

    @pytest.mark.parametrize(
        "query",
        [
            pytest.param("SELECT 1 AS a; SELECT 2 AS b", id="plain"),
            pytest.param("/* don't ignore the tail */ SELECT 1 AS a; SELECT 2 AS b", id="apostrophe-in-comment"),
            pytest.param("/* two; here */ SELECT 1 AS a; SELECT 2 AS b", id="semicolon-in-comment-too"),
            pytest.param("SELECT 'a;b' AS x; SELECT 2 AS b", id="after-a-literal"),
        ],
    )
    def test_two_statements_are_seen_as_two(self, query: str) -> None:
        assert len(_split_statements(query)) == 2, _split_statements(query)


def _bea(tmp_path: Path, ledger: Path, query: str) -> subprocess.CompletedProcess[str]:
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
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), "query", query],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def test_a_commented_query_runs(tmp_path: Path, ledger: Path) -> None:
    """The first reported direction: a valid query refused as two statements."""
    done = _bea(tmp_path, ledger, "/* explanation; one query */ SELECT count(*) AS n")

    assert done.returncode == 0, done.stderr
    assert json.loads(done.stdout)["data"]["rows"] == [[2]]


def test_a_comment_cannot_hide_a_second_statement(tmp_path: Path, ledger: Path) -> None:
    """The second, worse direction: half an answer at exit 0."""
    done = _bea(tmp_path, ledger, "/* don't ignore the tail */ SELECT 11 AS first LIMIT 1; SELECT 22 AS second LIMIT 1")

    assert done.returncode == 2, done.stdout
    assert "One BQL statement per invocation" in done.stderr


@pytest.mark.parametrize(
    ("query", "rows"),
    [
        pytest.param("SELECT 'a;b' AS x LIMIT 1", [["a;b"]], id="quoted-literal"),
        pytest.param("SELECT count(*) AS n;", [[2]], id="trailing-semicolon"),
        pytest.param("SELECT count(*) AS n /* note; one */", [[2]], id="trailing-comment"),
    ],
)
def test_existing_controls_still_work(tmp_path: Path, ledger: Path, query: str, rows: list) -> None:
    done = _bea(tmp_path, ledger, query)

    assert done.returncode == 0, done.stderr
    assert json.loads(done.stdout)["data"]["rows"] == rows


def test_real_multiple_statements_are_still_refused(tmp_path: Path, ledger: Path) -> None:
    """The guard exists because the engine silently runs only the first."""
    done = _bea(tmp_path, ledger, "SELECT 11 AS a LIMIT 1; SELECT 22 AS b LIMIT 1")

    assert done.returncode == 2
    assert "One BQL statement per invocation" in done.stderr


def test_a_dot_command_is_not_split(tmp_path: Path, ledger: Path) -> None:
    """`.run` legitimately replays a file of statements."""
    done = _bea(tmp_path, ledger, ".tables")

    assert done.returncode == 0, done.stderr


@pytest.mark.parametrize(
    "query",
    [
        "SELECT 'a;b' AS x",
        'SELECT "a;b" AS x',
        "/* a; b */ SELECT 1",
        "SELECT /* c */ 'it''s' AS x",
        "SELECT 1 -- not a comment in BQL",
        "SELECT 'unterminated",
        "SELECT /* unterminated",
        "",
    ],
)
def test_the_frontend_and_engine_rules_agree(query: str) -> None:
    """Two copies of one grammar; nothing but this keeps them in step.

    The mask blanks literals and comments to spaces, and the splitter refuses
    to break on a `;` inside one. So a `;` the splitter kept must be a `;` the
    mask also left visible, and vice versa — compare the positions each side
    considers code.
    """
    masked = _code_mask(query)
    assert len(masked) == len(query)

    visible = {index for index, char in enumerate(masked) if char == ";"}
    # Re-derive the splitter's view: the separators it acted on are exactly the
    # `;` characters not contained in the pieces it produced.
    kept = sum(piece.count(";") for piece in _split_statements(query))
    assert kept == query.count(";") - len(visible)
