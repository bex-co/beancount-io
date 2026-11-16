"""`check` and the reads on an included leaf name the root to read instead (w5/348).

A per-year file using accounts its root opens was refused with only "Pass
--allow-errors", which answers for part of the ledger; writes already named
the root that includes it.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MAIN = """option "operating_currency" "USD"
include "sub dir/extra.bean"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening
"""
LEAF = '2026-01-01 open Expenses:Rent USD\n2026-01-05 * "Rent"\n  Expenses:Rent  40 USD\n  Assets:Cash\n'
HINT = "extra.bean is included by {root}; on its own it lacks the accounts and options that root provides."


@pytest.fixture
def books(tmp_path: Path) -> Path:
    books = tmp_path / "my books"
    (books / "sub dir").mkdir(parents=True)
    (books / "main.bean").write_text(MAIN)
    (books / "sub dir" / "extra.bean").write_text(LEAF)
    return books


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
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


@pytest.mark.parametrize(
    "command",
    [("check",), ("balance",), ("list", "transaction"), ("query", "SELECT count(*)")],
    ids=["check", "balance", "list", "query"],
)
def test_the_leaf_names_its_root(tmp_path: Path, books: Path, command: tuple[str, ...]) -> None:
    result = _bea(tmp_path, "-f", str(books / "sub dir" / "extra.bean"), *command)
    assert result.returncode == 1
    assert HINT.format(root=books / "main.bean") in " ".join(result.stderr.split())


def test_json_check_carries_the_hint(tmp_path: Path, books: Path) -> None:
    result = _bea(tmp_path, "--json", "-f", str(books / "sub dir" / "extra.bean"), "check")
    assert result.returncode == 1
    details = json.loads(result.stdout or result.stderr)["error"]["details"]
    assert any(detail.startswith("extra.bean is included by") for detail in details)


def test_a_root_with_errors_gets_no_hint(tmp_path: Path) -> None:
    (tmp_path / "bad.bean").write_text(
        'option "operating_currency" "USD"\n2026-01-02 * "x"\n  Assets:Nope 1 USD\n  Equity:X\n'
    )
    for command in (("check",), ("balance",)):
        result = _bea(tmp_path, "-f", str(tmp_path / "bad.bean"), *command)
        assert result.returncode == 1
        assert "included by" not in result.stderr


@pytest.mark.parametrize("start", ["main.bean", "a.bean"])
@pytest.mark.parametrize(
    "command",
    [
        ["check"],
        ["--json", "check"],
        ["list", "open"],
        ["add", "note", "--date", "2026-01-03", "-a", "Assets:Cash", "-m", "hi", "--allow-errors"],
    ],
    ids=["check", "json-check", "list", "write"],
)
def test_an_include_cycle_names_no_root(tmp_path: Path, start: str, command: list[str]) -> None:
    """The climb came back to the file itself and told the user to run what they ran (w5/566)."""
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\ninclude "a.bean"\n'
    )
    (tmp_path / "a.bean").write_text('include "main.bean"\n')

    result = _bea(tmp_path, "--file", str(tmp_path / start), *command)

    assert "is included by" not in result.stdout + result.stderr, result.stdout + result.stderr
    assert "(an include cycle)" in result.stdout + result.stderr
