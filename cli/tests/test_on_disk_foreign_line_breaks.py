"""Source-line lookups count lines on `\\n` alone, as Beancount's lexer does (w1/049).

`str.splitlines` also breaks on U+2028, U+0085, form feed and friends. One such
character in a string or comment shifted every later line by one against the
loader's line numbers, so every later directive in that file was reported
`generated` and vanished from `--on-disk`, and a plugin failure was reported at
the wrong line.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BREAKS = {"u2028": "\u2028", "u0085": "\u0085", "form-feed": "\x0c"}
KINDS = ("open", "transaction", "note", "price")


def _bea(work: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        text=True,
        stdin=subprocess.DEVNULL,
        timeout=60,
    )


def _ledger(char: str) -> str:
    return (
        "2024-01-01 open Assets:Cash USD\n"
        "2024-01-01 open Equity:Open USD\n\n"
        f'2024-01-02 * "Shop" "pasted{char}text" ; a{char}comment\n'
        "  Assets:Cash   10.00 USD\n"
        "  Equity:Open\n\n"
        '2024-01-03 * "Cafe" "coffee"\n'
        "  Assets:Cash   5.00 USD\n"
        "  Equity:Open\n"
        f'2024-01-04 note Assets:Cash "hello{char}there"\n'
        "2024-01-05 open Assets:Bank USD\n"
        "2024-01-05 price USD 1.0 EUR\n"
    )


@pytest.mark.parametrize("char", BREAKS.values(), ids=BREAKS.keys())
def test_every_written_directive_is_on_disk(tmp_path: Path, char: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(_ledger(char), encoding="utf-8")
    expected = {"open": 3, "transaction": 2, "note": 1, "price": 1}

    for kind in KINDS:
        listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", kind)
        on_disk = _bea(tmp_path, "--json", "--file", str(ledger), "list", kind, "--on-disk")
        assert listed.returncode == 0, listed.stderr
        assert on_disk.returncode == 0, on_disk.stderr
        rows = json.loads(listed.stdout)["data"]
        assert len(rows) == expected[kind], kind
        assert not any(row.get("generated") for row in rows), (kind, rows)
        assert len(json.loads(on_disk.stdout)["data"]) == expected[kind], kind


@pytest.mark.parametrize("char", BREAKS.values(), ids=BREAKS.keys())
def test_plugin_failure_names_its_own_line(tmp_path: Path, char: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        f'; pasted{char}comment\n2024-01-01 open Assets:Cash USD\nplugin "beancount.plugins.no_such_plugin"\n',
        encoding="utf-8",
    )

    result = _bea(tmp_path, "--json", "--file", str(ledger), "check")

    assert result.returncode == 1, result.stdout or result.stderr
    (detail,) = json.loads(result.stderr)["error"]["details"]
    assert detail.startswith(f"{ledger}:3: "), detail
