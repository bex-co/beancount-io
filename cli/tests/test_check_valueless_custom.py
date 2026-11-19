"""A `custom` with no values is reported at its own line, and the pads still apply (w1/299).

Beancount parses `custom "reminder"` with `values=None`; the pad plugin, which
runs on every ledger, iterates it and raises. `check` printed
`<ledger>:0: Plugin "beancount.ops.pad" failed while running: TypeError: ...`,
naming no file or line, and since no pad was applied it also failed the
correct balance the pad covers. Every read with `--allow-errors` showed the
unpadded balances.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 pad Assets:Bank Equity:Opening-Balances
2024-01-02 balance Assets:Bank 500.00 USD
2024-03-01 custom "reminder"
"""


def _bea(books: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(books.parent / "config"),
        XDG_CACHE_HOME=str(books.parent / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=books,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _books(tmp_path: Path, main: str = LEDGER, **files: str) -> Path:
    books = (tmp_path / "books").resolve()
    books.mkdir()
    (books / "main.bean").write_text(main)
    for name, text in files.items():
        (books / f"{name}.bean").write_text(text)
    return books


def _located(path: Path, line: int, kind: str = "reminder") -> str:
    return (
        f'{path}:{line}: custom "{kind}" has no values, which Beancount\'s pad plugin cannot read; '
        f'give it a value (custom "{kind}" "text") or delete the line.'
    )


def test_check_names_the_custom_line_and_no_false_balance_failure(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(books, "check")

    assert result.returncode == 1
    assert result.stderr.splitlines() == [
        f"Error: {books / 'main.bean'}: 1 error(s).",
        f"  {_located(books / 'main.bean', 6)}",
    ]


def test_json_check_carries_the_same_detail(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(books, "--json", "check")

    assert result.returncode == 1
    assert json.loads(result.stderr)["error"]["details"] == [_located(books / "main.bean", 6)]


def test_a_custom_in_an_included_file_is_named_in_that_file(tmp_path: Path) -> None:
    main = LEDGER.replace('2024-03-01 custom "reminder"\n', 'include "notes.bean"\n')
    books = _books(tmp_path, main, notes='2024-03-01 custom "renewals"\n\n2024-03-02 custom "reminder"\n')

    expected = [_located(books / "notes.bean", 1, "renewals"), _located(books / "notes.bean", 3)]

    text = _bea(books, "check")
    as_json = _bea(books, "--json", "check")

    assert (text.returncode, as_json.returncode) == (1, 1)
    assert text.stderr.splitlines()[1:] == [f"  {line}" for line in expected]
    assert json.loads(as_json.stderr)["error"]["details"] == expected


def test_bean_check_options_still_get_the_located_line(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(books, "check", "-v")

    assert result.returncode == 1
    assert _located(books / "main.bean", 6) in result.stderr
    assert "Traceback" not in result.stderr
    assert "plugin(s) failed to load" not in result.stderr


def test_a_balance_no_pad_covers_still_fails(tmp_path: Path) -> None:
    main = LEDGER + "2024-01-01 open Assets:Cash USD\n2024-01-02 balance Assets:Cash 10.00 USD\n"
    books = _books(tmp_path, main)

    result = _bea(books, "--json", "check")

    assert result.returncode == 1
    details = json.loads(result.stderr)["error"]["details"]
    assert details[0] == _located(books / "main.bean", 6)
    assert [line for line in details[1:] if "Balance failed" in line] == [
        f"{books / 'main.bean'}:8: Balance failed for 'Assets:Cash': "
        "expected 10.00 USD != accumulated 0 USD (10.00 too little)"
    ]
    assert len(details) == 2


def test_allow_errors_reads_the_padded_balance(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(books, "--json", "balance", "Assets:Bank", "--allow-errors")

    assert result.returncode == 0, result.stderr
    assert "500.00" in result.stdout
    assert _located(books / "main.bean", 6) in result.stderr


def test_a_custom_with_a_value_is_valid(tmp_path: Path) -> None:
    books = _books(tmp_path, LEDGER.replace('custom "reminder"', 'custom "reminder" "renew passport"'))

    assert _bea(books, "check").returncode == 0


def test_doctor_refuses_it_before_upstream_loads_past_it(tmp_path: Path) -> None:
    books = _books(tmp_path)

    result = _bea(books, "doctor", "missing-open", "main.bean")

    assert result.returncode == 1
    assert result.stderr.splitlines() == [
        f"Error: doctor missing-open cannot load main.bean: {_located(books / 'main.bean', 6)}"
    ]
