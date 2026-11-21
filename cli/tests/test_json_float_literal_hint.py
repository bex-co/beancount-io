"""A refused JSON float's hint quotes the literal as typed (w5/735).

The frontend parsed the JSON into a `float` before the engine saw it, so
the hint reported Python's shortest repr: `1.10` was told `'1.1'` — and
following that wrote a transaction 3 cents out of balance at exit 0 —
long decimals lost digits, and `1E400` was called `inf`. Floats now
cross into the engine with their source text, and the hint quotes it.
An exponent literal is written out instead, since its spelling is refused
too (w1/346, `test_bulk_float_hint.py`).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
"""


def _add(tmp_path: Path, rows: str) -> subprocess.CompletedProcess[str]:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "in.json").write_text(rows)
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
        [sys.executable, "-m", "cli.main", "-f", "main.bean", "add", "transactions", "--from", "in.json"],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _row(postings: str, meta: str = "") -> str:
    extra = f',"meta":{{{meta}}}' if meta else ""
    return f'[{{"date":"2026-02-01","narration":"n"{extra},"postings":[{postings}]}}]'


def _units(number: str) -> str:
    return (
        f'{{"account":"Expenses:Food","units":{{"number":{number},"currency":"USD"}}}},{{"account":"Assets:Checking"}}'
    )


@pytest.mark.parametrize(
    ("rows", "location", "literal"),
    [
        (
            _row(_units("1.10")),
            "Row 1, postings.0.units.number",
            "1.10",
        ),
        (
            _row(_units("1.234567890123456789")),
            "Row 1, postings.0.units.number",
            "1.234567890123456789",
        ),
        (
            _row(_units("12345678901234567890.123456789")),
            "Row 1, postings.0.units.number",
            "12345678901234567890.123456789",
        ),
        (
            _row(
                '{"account":"Expenses:Food","amount":"5 USD"},{"account":"Assets:Checking"}',
                '"rate":{"kind":"number","value":1.10}',
            ),
            "Row 1, meta.rate",
            "1.10",
        ),
    ],
    ids=["trailing-zero", "long-decimal", "big-decimal", "meta-number"],
)
def test_the_hint_quotes_the_literal_as_typed(tmp_path: Path, rows: str, location: str, literal: str) -> None:
    result = _add(tmp_path, rows)

    assert result.returncode == 1, result.stderr
    assert f"{location}: " in result.stderr, result.stderr
    assert f"such as '{literal}'" in result.stderr, result.stderr
    assert (tmp_path / "main.bean").read_text() == LEDGER


def test_following_the_hint_writes_the_typed_amount(tmp_path: Path) -> None:
    refused = _add(tmp_path, _row(_units("1.10")))

    assert refused.returncode == 1, refused.stderr
    assert "such as '1.10'" in refused.stderr, refused.stderr
    followed = _add(
        tmp_path,
        _row(
            _units('"1.10"').replace(
                '{"account":"Assets:Checking"}', '{"account":"Assets:Checking","amount":"-1.10 USD"}'
            )
        ),
    )
    assert followed.returncode == 0, followed.stderr
    assert "1.10 USD" in (tmp_path / "main.bean").read_text()
