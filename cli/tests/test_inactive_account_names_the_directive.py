"""The inactive-account remedy names the directive being added, not always "transaction" (w5/393)."""

from __future__ import annotations

import json
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
EARLY = "2025-12-01"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        cwd=ROOT,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


@pytest.mark.parametrize(
    ("noun", "args"),
    [
        ("note", ("note", "--date", EARLY, "-a", "Assets:Cash", "-m", "early")),
        ("transaction", ("transaction", "X", "--date", EARLY, "-p", "Expenses:Food 5 USD", "-p", "Assets:Cash")),
    ],
)
def test_remedy_names_the_directive(tmp_path: Path, noun: str, args: tuple[str, ...]) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "-f", str(ledger), "add", *args)

    assert result.returncode == 1, result.stderr
    assert ledger.read_text() == LEDGER
    flat = " ".join(result.stderr.split())
    assert f"Account opened 2026-01-01 at {ledger}:2. Correct the {noun} date or edit that directive;" in flat


def test_json_document_refusal_names_the_document(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "r.pdf").write_bytes(b"%PDF-1.4\n")
    result = _bea(
        tmp_path,
        "--json",
        "-f",
        str(ledger),
        "add",
        "document",
        "--date",
        EARLY,
        "-a",
        "Assets:Cash",
        "--filename",
        "docs/r.pdf",
    )

    assert result.returncode == 1, result.stderr
    flat = json.dumps(json.loads(result.stdout or result.stderr))
    assert "Correct the document date or edit that directive;" in flat
    assert "Correct the transaction date" not in flat


def test_a_transaction_flagged_p_is_no_pad(tmp_path: Path) -> None:
    # Any capital letter is a flag: `P` on a transaction the user wrote does
    # not make it the padding of a pad the ledger lacks (w1/283).
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "-f",
        str(ledger),
        "add",
        "transaction",
        "Paid back",
        "--date",
        EARLY,
        "--flag",
        "P",
        "-p",
        "Expenses:Food 5 USD",
        "-p",
        "Assets:Cash",
    )

    assert result.returncode == 1, result.stderr
    assert ledger.read_text() == LEDGER
    flat = " ".join(result.stderr.split())
    assert f"Account opened 2026-01-01 at {ledger}:2. Correct the transaction date or edit that directive;" in flat
    assert f"Account opened 2026-01-01 at {ledger}:3. Correct the transaction date or edit that directive;" in flat
    assert "Correct the pad date" not in flat


def test_an_existing_transaction_flagged_p_is_no_pad(tmp_path: Path) -> None:
    # The same transaction already in the file is named the same way by any
    # later write's refusal (w1/283).
    content = LEDGER + f'\n{EARLY} P "Paid back"\n  Expenses:Food 5 USD\n  Assets:Cash\n'
    ledger = tmp_path / "main.bean"
    ledger.write_text(content)
    result = _bea(tmp_path, "-f", str(ledger), "add", "note", "--date", "2026-02-01", "-a", "Assets:Cash", "-m", "x")

    assert result.returncode == 1, result.stderr
    assert ledger.read_text() == content
    flat = " ".join(result.stderr.split())
    assert f"{ledger}:5: Invalid reference to inactive account 'Assets:Cash'" in flat
    assert "Correct the transaction date or edit that directive;" in flat
    assert "Correct the pad date" not in flat


def test_a_real_pad_is_still_named_a_pad(tmp_path: Path) -> None:
    # Control: Beancount's padding transaction for a pad before the open is
    # the pad's, one paragraph with it (w1/118), named "pad" (w5/393).
    content = (
        LEDGER
        + "2026-01-01 open Equity:Opening USD\n"
        + f"{EARLY} pad Assets:Cash Equity:Opening\n2026-01-02 balance Assets:Cash 100 USD\n"
    )
    ledger = tmp_path / "main.bean"
    ledger.write_text(content)
    result = _bea(tmp_path, "-f", str(ledger), "add", "note", "--date", "2026-02-01", "-a", "Assets:Cash", "-m", "x")

    assert result.returncode == 1, result.stderr
    assert ledger.read_text() == content
    flat = " ".join(result.stderr.split())
    assert flat.count("Invalid reference to inactive account 'Assets:Cash'") == 1, flat
    assert flat.count("Invalid reference to inactive account 'Equity:Opening'") == 1, flat
    assert f"{ledger}:5: Invalid reference to inactive account 'Assets:Cash'" in flat
    assert "Correct the pad date or edit that directive;" in flat
    assert "Correct the transaction date" not in flat
