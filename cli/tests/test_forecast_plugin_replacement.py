"""A Beancount 2 `beancount.plugins.forecast` line names bea's bundled replacement (w1/362).

Beancount 3 dropped the forecast plugin, and bea bundles `fava.plugins.forecast`,
a drop-in reimplementation of its marker syntax. `bea init --existing` said to
remove the line or find "a Beancount 3 plugin that does the same", and `bea
check` said to check the spelling and the installation. Removing the line
books the `#` template as one real transaction, so the balances change with
no error. Both now name `plugin "fava.plugins.forecast"`, and making that edit
gives a ledger that passes with its projections back. Other dropped
`beancount.plugins.*` names keep the generic wording.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
plugin "{name}"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Electricity USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Checking  1000.00 USD
  Equity:Opening
2026-03-08 # "Electricity bill [MONTHLY REPEAT 3 TIMES]"
  Expenses:Electricity   50.10 USD
  Assets:Checking
"""
FORECAST = "beancount.plugins.forecast"
REPLACEMENT = 'plugin "fava.plugins.forecast"'
CHECK_HINT = f"Beancount 3 dropped this plugin; bea bundles a drop-in replacement: {REPLACEMENT}."
SPELLING = "Check the name is spelled right and the plugin is installed."


def _bea(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(cwd.parent / "config"),
        XDG_CACHE_HOME=str(cwd.parent / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _books(tmp_path: Path, name: str = FORECAST) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(LEDGER.format(name=name), encoding="utf-8")
    return books


def test_init_existing_names_the_bundled_replacement_in_text_and_json(tmp_path: Path) -> None:
    books = _books(tmp_path)
    before = (books / "main.bean").read_bytes()

    text = _bea(books, "--no-input", "init", "--existing", "main.bean")
    for written in ("AGENTS.md", "CLAUDE.md"):
        (books / written).unlink()
    as_json = _bea(books, "--json", "--no-input", "init", "--existing", "main.bean")

    assert text.returncode == 0, text.stderr
    lines = text.stdout.splitlines()
    assert (
        f"  main.bean:2: Plugin `{FORECAST}` was dropped in Beancount 3; bea bundles a drop-in replacement."
    ) in lines
    assert f"    Next: Change the line to {REPLACEMENT}." in lines
    assert "Remove the plugin line" not in text.stdout
    assert as_json.returncode == 0, as_json.stderr
    data = json.loads(as_json.stdout)["data"]
    assert [plugin["replacement"] for plugin in data["plugins"]] == ["fava.plugins.forecast"]
    assert data["attention"] == [
        {
            "kind": "plugin-not-in-beancount",
            "location": "main.bean:2",
            "subject": FORECAST,
            "message": f"Plugin `{FORECAST}` was dropped in Beancount 3; bea bundles a drop-in replacement.",
            "next": f"Change the line to {REPLACEMENT}.",
        }
    ]
    assert (books / "main.bean").read_bytes() == before


def test_check_names_the_bundled_replacement_in_text_and_json(tmp_path: Path) -> None:
    books = _books(tmp_path)
    expected = (
        f'{books / "main.bean"}:2: Cannot import plugin "{FORECAST}": ModuleNotFoundError: '
        f"No module named '{FORECAST}'. {CHECK_HINT}"
    )

    text = _bea(books, "check")
    as_json = _bea(books, "--json", "check")

    assert text.returncode == 1, text.stderr
    assert f"  {expected}" in text.stderr.splitlines()
    assert SPELLING not in text.stderr
    assert as_json.returncode == 1, as_json.stderr
    assert json.loads(as_json.stderr)["error"]["details"] == [expected]


def test_the_named_edit_passes_check_and_restores_the_projections(tmp_path: Path) -> None:
    books = _books(tmp_path)
    ledger = books / "main.bean"
    ledger.write_text(ledger.read_text(encoding="utf-8").replace(f'plugin "{FORECAST}"', REPLACEMENT), encoding="utf-8")

    check = _bea(books, "check")
    balance = _bea(books, "--json", "balance", "Checking", "-t", "2026")

    assert check.returncode == 0, check.stderr
    assert balance.returncode == 0, balance.stderr
    (checking,) = json.loads(balance.stdout)["data"]["assets"]["children"]
    # 1000.00 less the template and its two monthly projections, as Beancount 2 computed it.
    assert checking["balance"] == {"USD": "849.70"}


@pytest.mark.parametrize("name", ["beancount.plugins.forcast", "beancount.plugins.unrealized"])
def test_other_dropped_or_misspelled_names_keep_the_generic_wording(tmp_path: Path, name: str) -> None:
    books = _books(tmp_path, name=name)

    check = _bea(books, "check")
    report = _bea(books, "--json", "--no-input", "init", "--existing", "main.bean")

    assert check.returncode == 1, check.stderr
    assert check.stderr.rstrip().endswith(f"No module named '{name}'. {SPELLING}")
    assert "fava.plugins.forecast" not in check.stderr
    assert report.returncode == 0, report.stderr
    data = json.loads(report.stdout)["data"]
    assert [plugin["replacement"] for plugin in data["plugins"]] == [None]
    (item,) = data["attention"]
    assert item["message"] == (
        f"Plugin `{name}` is not part of Beancount {data['beancount_version']}; "
        "Beancount 2 shipped plugins that Beancount 3 dropped."
    )
    assert item["next"] == "Remove the plugin line, or replace it with a Beancount 3 plugin that does the same."
