"""The transaction table escapes a lot label the way Beancount spells it (w5/060).

The table wrapped the label in quotes as-is, so `lot "A"` printed as
`{10 USD, 2026-02-01, "lot "A""}` and `lot\\A` with a single backslash —
neither the string the ledger holds nor what `--details` shows.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LABELS = [
    ('lot "A"', r'"lot \"A\""'),
    ("lot\\A", r'"lot\\A"'),
    ('a\\"b', r'"a\\\"b"'),
    ("lot-A", '"lot-A"'),
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
        COLUMNS="200",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


@pytest.mark.parametrize(("label", "spelled"), LABELS, ids=["quotes", "backslash", "backslash-quote", "plain"])
@pytest.mark.parametrize("filtered", [(), ("--account", "Assets:Stock")], ids=["all", "account"])
def test_table_spells_the_lot_label_as_details_and_the_ledger_do(
    tmp_path: Path, label: str, spelled: str, filtered: tuple[str, ...]
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text("2026-01-01 open Assets:Stock HOOL\n2026-01-01 open Assets:Cash USD\n", encoding="utf-8")
    rows = tmp_path / "rows.json"
    row = {
        "date": "2026-02-01",
        "narration": "Label",
        "postings": [
            {
                "account": "Assets:Stock",
                "units": {"number": "1", "currency": "HOOL"},
                "cost": {"number": "10", "currency": "USD", "label": label},
            },
            {"account": "Assets:Cash", "amount": "-10.00 USD"},
        ],
    }
    rows.write_text(json.dumps([row]), encoding="utf-8")
    added = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert added.returncode == 0, added.stderr or added.stdout
    written = ledger.read_bytes()
    cost = f"1 HOOL {{10 USD, 2026-02-01, {spelled}}}"

    table = _bea(tmp_path, "--file", str(ledger), "list", "transaction", *filtered)
    assert table.returncode == 0, table.stderr
    assert cost in table.stdout

    # The ledger and --details already spell it this way; the value itself is untouched.
    assert f"{spelled}}}" in ledger.read_text(encoding="utf-8")
    details = _bea(tmp_path, "--file", str(ledger), "list", "transaction", "--details")
    assert details.returncode == 0, details.stderr
    assert f"{spelled}}}" in details.stdout
    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction")
    assert listed.returncode == 0, listed.stderr
    assert json.loads(listed.stdout)["data"][0]["postings"][0]["cost"]["label"] == label
    assert ledger.read_bytes() == written
