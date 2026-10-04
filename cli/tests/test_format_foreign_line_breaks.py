"""Formatting counts lines the way Beancount's lexer does: on `\\n` alone (w1/048).

`str.splitlines` also breaks on U+2028, U+0085, form feed and friends. Splitting
that way put every later line off by one against the lexer's line numbers, so
string protection and the posting reindent hit the wrong lines: a newline was
injected into the narration on every pass and `--check` never went green.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
HEADER = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Open USD\n\n"
BREAKS = {"u2028": "\u2028", "u0085": "\u0085", "form-feed": "\x0c"}


def _bea(work: Path, *args: str) -> subprocess.CompletedProcess[bytes]:
    env = {key: value for key, value in os.environ.items() if not key.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(work / "config"),
        XDG_CACHE_HOME=str(work / "cache"),
        XDG_DATA_HOME=str(work / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=work,
        capture_output=True,
        stdin=subprocess.DEVNULL,
        timeout=60,
    )


def _ledger(char: str, indent: str) -> str:
    return (
        HEADER
        + f'2024-01-02 * "Shop" "multi\nmid{char}dle\nend"\n'
        + f"{indent}Assets:Cash   10.00 USD\n"
        + f"{indent}Equity:Open\n"
        + f'2024-01-03 note Assets:Cash "one{char}line" ; tail{char}comment\n'
    )


def _narrations(work: Path, ledger: Path) -> list[str]:
    result = _bea(work, "--json", "--file", str(ledger), "list", "transaction")
    assert result.returncode == 0, result.stderr
    return [row["narration"] for row in json.loads(result.stdout)["data"]]


@pytest.mark.parametrize("char", BREAKS.values(), ids=BREAKS.keys())
def test_destinations_agree_and_strings_survive(tmp_path: Path, char: str) -> None:
    ledger = tmp_path / "main.bean"
    original = _ledger(char, "    ")
    expected = _ledger(char, "  ").replace("   10.00", "  10.00").encode()
    ledger.write_bytes(original.encode())
    exported = tmp_path / "formatted.bean"

    streamed = _bea(tmp_path, "format", str(ledger))
    written = _bea(tmp_path, "format", str(ledger), "-o", str(exported))
    checked = _bea(tmp_path, "format", "--check", str(ledger))
    assert ledger.read_bytes() == original.encode()
    applied = _bea(tmp_path, "format", "-i", str(ledger))

    for result in (streamed, written, applied):
        assert result.returncode == 0, result.stderr
    assert checked.returncode == 1, checked.stdout or checked.stderr
    assert (streamed.stdout, exported.read_bytes(), ledger.read_bytes()) == (expected, expected, expected)
    assert _narrations(tmp_path, ledger) == [f"multi\nmid{char}dle\nend"]


@pytest.mark.parametrize("char", BREAKS.values(), ids=BREAKS.keys())
def test_reformatting_converges(tmp_path: Path, char: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(_ledger(char, "    "), encoding="utf-8")
    assert _bea(tmp_path, "format", "-i", str(ledger)).returncode == 0
    settled = ledger.read_bytes()

    for flag in ("--check", "--dry-run", "-i"):
        result = _bea(tmp_path, "--json", "format", flag, str(ledger))
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["data"]["formatted"] == []
        assert ledger.read_bytes() == settled
