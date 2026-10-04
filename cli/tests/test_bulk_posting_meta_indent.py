"""Posting metadata is written nested under its posting (w1/094).

Appends are re-indented to the destination's posting indent. That used to
flatten every indented line, so posting metadata sat at posting depth and read
as transaction metadata, and `format --check` never corrected it.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.ledger.write import appended_content

ROOT = Path(__file__).resolve().parents[1]

ROWS = [
    {
        "date": "2021-01-02",
        "narration": "x",
        "meta": {"tx": "T"},
        "postings": [
            {"account": "Expenses:Food", "amount": "5 USD", "meta": {"receipt": "R-1"}},
            {"account": "Assets:Cash", "meta": {"cleared": True}},
        ],
    }
]


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
        timeout=60,
    )


@pytest.mark.parametrize("indent", ["  ", "    "], ids=["two", "four"])
def test_bulk_posting_meta_is_nested_under_its_posting(tmp_path: Path, indent: str) -> None:
    ledger = tmp_path / "main.bean"
    original = (
        "2020-01-01 open Expenses:Food USD\n2020-01-01 open Assets:Cash USD\n"
        f'2020-01-02 * "seed"\n{indent}Expenses:Food   1 USD\n{indent}Assets:Cash    -1 USD\n'
    )
    ledger.write_text(original)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps(ROWS))

    added = _bea(tmp_path, "--file", str(ledger), "add", "transactions", "--from", str(rows))

    assert added.returncode == 0, added.stderr
    appended = ledger.read_text()[len(original) :].strip("\n").splitlines()
    assert appended == [
        '2021-01-02 * "x"',
        f'{indent}tx: "T"',
        f"{indent}Expenses:Food   5 USD",
        f'{indent}{indent}receipt: "R-1"',
        f"{indent}Assets:Cash",
        f"{indent}{indent}cleared: TRUE",
    ]
    if indent == "  ":
        # `bea format` writes two-space postings, so only that file can be clean.
        check = _bea(tmp_path, "format", "--check", str(ledger))
        assert check.returncode == 0, check.stdout + check.stderr

    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction")
    assert listed.returncode == 0, listed.stderr
    item = next(i for i in json.loads(listed.stdout)["data"] if i["narration"] == "x")
    assert item["meta"] == {"tx": "T"}
    assert [p["meta"] for p in item["postings"]] == [{"receipt": "R-1"}, {"cleared": True}]


def test_only_deeper_lines_nest() -> None:
    """Relative depth is kept; the entry's own metadata and postings stay at posting depth."""
    text = '2021-01-02 * "x"\n  tx: "T"\n  Expenses:Food  5 USD\n    receipt: "R-1"\n  Assets:Cash\n'
    appended = appended_content(b"", [text]).splitlines()
    assert appended[2:] == ['  tx: "T"', "  Expenses:Food  5 USD", '    receipt: "R-1"', "  Assets:Cash"]
