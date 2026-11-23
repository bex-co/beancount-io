"""A refused lone `add pad` prints a remedy for that ledger and that pad (w1/371).

The hint was `bea add balance --pad-from ACCOUNT --date YYYY-MM-DD …`: no
`--file`, so pasted from another folder it wrote the pair into whatever
ledger discovery found there, exit 0; and no `--pad-date`, so the pad
landed the day before the balance instead of on the date asked for.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Savings USD
2026-01-01 open Assets:Wallet USD,EUR
2026-01-01 open Equity:Opening-Balances
"""


def _bea(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(cwd.parent / "config"),
        XDG_CACHE_HOME=str(cwd.parent / "cache"),
        XDG_DATA_HOME=str(cwd.parent / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", *args],
        env=env,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _remedy(cwd: Path, account: str, *options: str, ledger: str | None = None) -> list[str]:
    """The refused pad's atomic remedy from the JSON envelope, as argv."""
    selected = ("--file", ledger) if ledger else ()
    pad = ("add", "pad", "--date", "2026-03-30", "-a", account, "--source", "Equity:Opening-Balances", *options)
    result = _bea(cwd, "--json", *selected, *pad)
    assert result.returncode == 1, result.stderr
    (detail,) = json.loads(result.stdout or result.stderr)["error"]["details"]
    assert "Unused Pad entry. Add both directives atomically, with a balance --date after 2026-03-30: " in detail
    found = re.search(r": (bea .*)\.$", detail)
    assert found is not None, detail
    return shlex.split(found.group(1))


def test_pasted_remedy_writes_the_pad_asked_for_into_the_file_ledger(tmp_path: Path) -> None:
    home, client = tmp_path / "home", tmp_path / "client"
    home.mkdir()
    client.mkdir()
    (home / "main.bean").write_text(LEDGER)
    (client / "main.bean").write_text(LEDGER)

    argv = _remedy(home, "Assets:Savings", ledger="../client/main.bean")
    assert argv[:2] == ["bea", "--file"] and Path(argv[2]).resolve() == (client / "main.bean").resolve()
    assert argv[3:] == [
        *("add", "balance", "--account", "Assets:Savings", "--pad-from", "Equity:Opening-Balances"),
        *("--pad-date", "2026-03-30", "--date", "YYYY-MM-DD", "--amount", "NUMBER USD"),
    ]
    assert (client / "main.bean").read_text() == LEDGER

    filled = [{"YYYY-MM-DD": "2026-03-31", "NUMBER USD": "100 USD"}.get(arg, arg) for arg in argv[1:]]
    result = _bea(home, *filled)
    assert result.returncode == 0, result.stderr
    assert (home / "main.bean").read_text() == LEDGER
    written = (client / "main.bean").read_text()
    assert "2026-03-30 pad Assets:Savings Equity:Opening-Balances" in written
    assert "2026-03-31 balance Assets:Savings" in written


def test_discovered_ledger_stays_bare_and_an_into_file_is_named(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text('option "operating_currency" "USD"\ninclude "accounts.bean"\n')
    (books / "accounts.bean").write_text(LEDGER.split("\n", 1)[1])

    argv = _remedy(books, "Assets:Savings", "--into", "accounts.bean")
    assert argv[:3] == ["bea", "add", "balance"]
    assert argv[-2:] == ["--into", "accounts.bean"]
    assert "--file" not in argv


def test_currency_stays_a_placeholder_when_the_open_allows_several(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(LEDGER)

    argv = _remedy(books, "Assets:Wallet")
    assert argv[argv.index("--account") + 1] == "Assets:Wallet"
    assert argv[argv.index("--amount") + 1] == "NUMBER CURRENCY"
