"""A refused URL include is reported, never read as a local file (w5/450).

A URL the managed-price policy refuses fell through to Beancount's file
glob, so `include "https://example.com/x.bean"` silently loaded a local
`./https:/example.com/x.bean` as the user's own entries and `check` passed.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def _bea(books: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(books / "config"),
        XDG_CACHE_HOME=str(books / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--offline", "-f", str(books / "main.bean"), *args],
        env=env,
        cwd=books,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _ledger(books: Path, target: str) -> None:
    (books / "main.bean").write_text(
        f'option "operating_currency" "USD"\ninclude "{target}"\n'
        "2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:O USD\n"
    )


@pytest.mark.skipif(os.name != "posix", reason="':' in a directory name")
def test_a_matching_local_path_is_not_loaded(tmp_path: Path) -> None:
    _ledger(tmp_path, "https://example.com/x.bean")
    (tmp_path / "https:" / "example.com").mkdir(parents=True)
    (tmp_path / "https:" / "example.com" / "x.bean").write_text(
        '2026-01-02 * "foreign"\n  Assets:Cash 8 USD\n  Equity:O\n'
    )

    checked = _bea(tmp_path, "check")
    assert checked.returncode == 1, checked.stderr
    assert 'main.bean:2: include "https://example.com/x.bean":' in checked.stderr
    assert "origin https://example.com is not allowlisted" in checked.stderr

    balance = _bea(tmp_path, "balance", "Cash", "--allow-errors")
    assert balance.returncode == 0, balance.stderr
    assert "8 USD" not in balance.stdout


@pytest.mark.parametrize(
    ("target", "reason"),
    [
        ("https://example.com/missing.bean", "origin https://example.com is not allowlisted"),
        ("https://beancount.io/prices/BTC-USD?x=1", "it must not carry a query string or fragment"),
    ],
)
def test_the_refusal_names_the_reason(tmp_path: Path, target: str, reason: str) -> None:
    _ledger(tmp_path, target)
    checked = _bea(tmp_path, "check")
    assert checked.returncode == 1, checked.stderr
    assert f'include "{target}":' in checked.stderr
    assert reason in checked.stderr
    assert "does not match any files" not in checked.stderr
    assert "matches no file" not in checked.stderr
