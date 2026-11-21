"""An untagged JSON float in bulk metadata is refused, not rounded into the ledger (w5/420).

w3/230 coerced it through `Decimal(str(value))`, recording its binary value:
`12345678901234567890.123` became `12345678901234567000` and `0.3`-style
values kept their noise, while the same float in a tagged object or an
amount is refused.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
"""


def _add(books: Path, rows: str) -> subprocess.CompletedProcess[str]:
    (books / "main.bean").write_text(LEDGER)
    (books / "in.json").write_text(rows)
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
        [sys.executable, "-m", "cli.main", "-f", str(books / "main.bean"), "add", "transactions", "--from", "in.json"],
        env=env,
        cwd=books,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _row(meta: str, posting_meta: str = "") -> str:
    extra = f',"meta":{{{posting_meta}}}' if posting_meta else ""
    return (
        f'[{{"date":"2026-01-02","meta":{{{meta}}},'
        f'"postings":[{{"account":"Expenses:Food","amount":"5 USD"{extra}}},{{"account":"Assets:Cash"}}]}}]'
    )


@pytest.mark.parametrize(
    ("rows", "line"),
    [
        (
            _row('"rate":12345678901234567890.123'),
            "Row 1, meta.rate: JSON float 12345678901234567890.123 cannot represent a decimal exactly. "
            'Send a tagged number instead, such as {"kind":"number","value":"12345678901234567890.123"}.',
        ),
        (
            _row('"rr":0.30000000000000004'),
            "Row 1, meta.rr: JSON float 0.30000000000000004 cannot represent a decimal exactly. "
            'Send a tagged number instead, such as {"kind":"number","value":"0.30000000000000004"}.',
        ),
        (
            _row('"nn":5', '"pp":1e2'),
            "Row 1, postings.0.meta.pp: JSON float 1e2 cannot represent a decimal exactly. "
            'Send a tagged number instead, such as {"kind":"number","value":"100"}.',
        ),
        (_row('"xx":NaN'), "Row 1, meta.xx: nan is not a finite number, so it has no decimal form"),
    ],
    ids=["large", "noise", "posting-meta", "nan"],
)
def test_an_untagged_float_is_refused_by_field(tmp_path: Path, rows: str, line: str) -> None:
    result = _add(tmp_path, rows)
    assert result.returncode == 1, result.stderr
    assert line in result.stderr
    assert (tmp_path / "main.bean").read_text() == LEDGER


def test_an_integer_is_still_written_exactly(tmp_path: Path) -> None:
    result = _add(tmp_path, _row('"nn":12345678901234567890'))
    assert result.returncode == 0, result.stderr
    assert "  nn: 12345678901234567890\n" in (tmp_path / "main.bean").read_text()
