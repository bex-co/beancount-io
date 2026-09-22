"""Quoting reserved relations never edits the user's own text (w3/399).

w3/246 and w3/247 quote `FROM accounts|balances`, because unquoted those names
are BQL keywords: `accounts` binds to postings and `balances` is a parse error.
The rewrite ran as a global regex over the raw query, so it could not tell a
relation from words inside a literal. Searching for the narration
`transfer from accounts` became `transfer from "accounts"` and matched nothing
— a silent empty result for a transaction that exists — and a double-quoted
literal carrying more words after `balances` became a syntax error.

The rewrite now matches against a mask with literals and comments blanked to
spaces and splices by offset, so code is rewritten and text is returned
byte-for-byte. The table compatibility that motivated the rewrite is pinned
here as a control: fixing literals must not un-fix relations.

w3/398 extended this preparation to stored and interactive queries, so those
paths are covered too.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.query import _code_mask, _quote_reserved_tables

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-01 open Expenses:Food USD
2026-01-01 * "Opening"
  Assets:Cash  100 USD
  Equity:Opening
2026-01-02 * "transfer from accounts"
  Assets:Cash -10 USD
  Expenses:Food
2026-01-03 balance Assets:Cash 90 USD
2026-01-10 query "phrase" "SELECT 'from accounts' AS phrase LIMIT 1"
"""


class TestRewrite:
    """The transformation alone, so a failure says whether it or the CLI broke."""

    @pytest.mark.parametrize(
        ("query", "expected"),
        [
            pytest.param("SELECT count(*) FROM accounts", 'SELECT count(*) FROM "accounts"', id="relation"),
            pytest.param("SELECT * FROM balances", 'SELECT * FROM "balances"', id="balances"),
            pytest.param("select * from accounts", 'select * from "accounts"', id="lowercase-keyword"),
            pytest.param('SELECT * FROM "accounts"', 'SELECT * FROM "accounts"', id="already-quoted"),
        ],
    )
    def test_relations_are_quoted(self, query: str, expected: str) -> None:
        assert _quote_reserved_tables(query) == expected

    @pytest.mark.parametrize(
        "query",
        [
            pytest.param("SELECT narration WHERE narration = 'transfer from accounts'", id="single-quoted"),
            pytest.param('SELECT "from balances today" AS phrase', id="double-quoted"),
            pytest.param("SELECT 'it''s from accounts' AS x", id="doubled-quote-escape"),
            pytest.param("SELECT 1 -- from accounts", id="line-comment"),
            pytest.param("SELECT /* from balances */ 1", id="block-comment"),
            pytest.param("SELECT 'unterminated from accounts", id="unterminated-literal"),
        ],
    )
    def test_the_users_own_text_is_returned_unchanged(self, query: str) -> None:
        assert _quote_reserved_tables(query) == query

    def test_a_literal_and_a_relation_in_one_query(self) -> None:
        """The case a whole-string rule cannot get right: both appear at once."""
        query = "SELECT 'from accounts' AS label FROM accounts"

        assert _quote_reserved_tables(query) == "SELECT 'from accounts' AS label FROM \"accounts\""

    @pytest.mark.parametrize(
        "query",
        [
            "SELECT 'a' FROM accounts",
            'SELECT "b" FROM balances',
            "SELECT 1 -- trailing\nFROM accounts",
            "SELECT 'it''s' FROM accounts",
        ],
    )
    def test_the_mask_keeps_the_offsets_of_the_original(self, query: str) -> None:
        """Splicing by offset is only safe while the mask is the same length."""
        assert len(_code_mask(query)) == len(query)


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
    )


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _rows(tmp_path: Path, ledger: Path, sql: str) -> list:
    done = _bea(tmp_path, "--json", "--file", str(ledger), "query", sql)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)["data"]["rows"]


def test_a_narration_search_finds_its_transaction(tmp_path: Path, ledger: Path) -> None:
    """The reported symptom: a real transaction returned no rows."""
    rows = _rows(tmp_path, ledger, "SELECT narration WHERE narration = 'transfer from accounts'")

    assert rows == [["transfer from accounts"], ["transfer from accounts"]]


@pytest.mark.parametrize(
    ("sql", "value"),
    [
        pytest.param("SELECT 'from accounts' AS phrase LIMIT 1", "from accounts", id="single-quoted"),
        pytest.param('SELECT "from balances today" AS phrase LIMIT 1', "from balances today", id="double-quoted"),
    ],
)
def test_a_literal_projects_exactly_what_was_written(tmp_path: Path, ledger: Path, sql: str, value: str) -> None:
    assert _rows(tmp_path, ledger, sql) == [[value]]


def test_the_text_renderer_shows_the_literal_unchanged(tmp_path: Path, ledger: Path) -> None:
    """The output was wrong before formatting, so text and CSV showed it too."""
    for extra in ((), ("--format", "csv")):
        done = _bea(tmp_path, "--file", str(ledger), "query", "SELECT 'from accounts' AS phrase LIMIT 1", *extra)
        assert done.returncode == 0, done.stderr
        assert "from accounts" in done.stdout
        assert 'from "accounts"' not in done.stdout


@pytest.mark.parametrize(
    ("sql", "expected"),
    [
        pytest.param("SELECT count(*) AS total FROM accounts", 3, id="unquoted"),
        pytest.param('SELECT count(*) AS total FROM "accounts"', 3, id="quoted"),
    ],
)
def test_reserved_relations_still_resolve(tmp_path: Path, ledger: Path, sql: str, expected: int) -> None:
    """The control: w3/246 and w3/247's compatibility must survive this fix."""
    assert _rows(tmp_path, ledger, sql) == [[expected]]


def test_the_balances_relation_still_parses(tmp_path: Path, ledger: Path) -> None:
    rows = _rows(tmp_path, ledger, "SELECT account, amount FROM balances")

    assert rows and rows[0][0] == "Assets:Cash"


def test_a_stored_query_keeps_its_literal_too(tmp_path: Path, ledger: Path) -> None:
    """w3/398 routed stored queries through this rewrite; they must be safe here."""
    done = _bea(tmp_path, "--json", "--file", str(ledger), "query", ".run phrase")

    assert done.returncode == 0, done.stderr
    text = json.loads(done.stdout)["data"]["text"]
    assert "from accounts" in text
    assert 'from "accounts"' not in text
