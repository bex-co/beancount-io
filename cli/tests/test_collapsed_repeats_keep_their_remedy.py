"""A refusal folds errors into one paragraph only when they share a remedy, and says it the same way every run (w1/281).

A note's or a pad's inactive-account error was folded into a transaction's
paragraph, so one directive was told to "Correct the transaction date". With a
pad, which errors folded depended on the hash seed, because upstream reports
one entry's accounts by iterating a set.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
#: Seeds that, before the fix, ordered the pad's and the transaction's errors differently.
SEEDS = ("3", "8")
OPENS = "2026-01-01 open Assets:Bank USD\n2026-01-01 open Expenses:Food USD\n"
LUNCH = '2025-12-16 * "Lunch"\n  Expenses:Food  5 USD\n  Assets:Bank\n'
REMEDY = " or edit that directive; for new books use bea init --date YYYY-MM-DD."


def _refusal(tmp_path: Path, content: str, seed: str, *flags: str) -> tuple[str, list[str]]:
    """Refuse an unrelated `add open` on books that already break; return the human text and the JSON details."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(content)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        PYTHONHASHSEED=seed,
        TERM="dumb",
        NO_COLOR="1",
        COLUMNS="4000",
    )
    outputs = []
    for mode in ((), ("--json",)):
        result = subprocess.run(
            [sys.executable, "-m", "cli.main", *mode, "-f", str(ledger), "add", "open"]
            + ["--date", "2026-01-05", "--account", "Expenses:Fun", *flags],
            cwd=ROOT,
            env=env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        assert result.returncode == 1, result.stdout + result.stderr
        assert ledger.read_text() == content
        outputs.append(result.stderr)
    human, envelope = outputs
    return human, json.loads(envelope)["error"]["details"]


def _inactive(ledger: Path, line: int, account: str, opened: int, noun: str) -> str:
    return (
        f"{ledger}:{line}: Invalid reference to inactive account '{account}' "
        f"Account opened 2026-01-01 at {ledger}:{opened}. Correct the {noun} date{REMEDY}"
    )


def _same_every_run(tmp_path: Path, content: str, *flags: str) -> list[str]:
    runs = [_refusal(tmp_path, content, seed, *flags) for seed in SEEDS]
    assert all(run == runs[0] for run in runs), runs
    human, details = runs[0]
    flat = " ".join(human.split())
    assert all(" ".join(detail.split()) in flat for detail in details), (human, details)
    return details


def test_a_note_keeps_its_own_remedy_beside_a_transaction(tmp_path: Path) -> None:
    content = OPENS + '\n2025-12-10 note Assets:Bank "Called the bank"\n\n' + LUNCH
    ledger = tmp_path.resolve() / "main.bean"
    assert _same_every_run(tmp_path, content) == [
        _inactive(ledger, 4, "Assets:Bank", 1, "note"),
        _inactive(ledger, 6, "Assets:Bank", 1, "transaction"),
        _inactive(ledger, 6, "Expenses:Food", 2, "transaction"),
    ]


def test_a_note_and_a_document_after_a_transaction_are_not_its_repeats(tmp_path: Path) -> None:
    (tmp_path / "statement.pdf").write_bytes(b"%PDF-1.4\n")
    content = (
        OPENS + "\n" + LUNCH + '\n2025-12-10 note Assets:Bank "Called the bank"\n'
        '2025-12-11 document Assets:Bank "statement.pdf"\n'
    )
    ledger = tmp_path.resolve() / "main.bean"
    assert _same_every_run(tmp_path, content) == [
        _inactive(ledger, 8, "Assets:Bank", 1, "note"),
        _inactive(ledger, 9, "Assets:Bank", 1, "document"),
        _inactive(ledger, 4, "Assets:Bank", 1, "transaction"),
        _inactive(ledger, 4, "Expenses:Food", 2, "transaction"),
    ]


PADDED = (
    OPENS
    + "2026-01-01 open Equity:Opening USD\n\n"
    + LUNCH
    + "\n2025-12-20 pad Assets:Bank Equity:Opening\n2026-01-02 balance Assets:Bank 100 USD\n"
)


def test_a_pad_keeps_its_remedy_and_hint_whatever_the_hash_seed(tmp_path: Path) -> None:
    ledger = tmp_path.resolve() / "main.bean"
    assert _same_every_run(tmp_path, PADDED) == [
        _inactive(ledger, 5, "Assets:Bank", 1, "transaction"),
        _inactive(ledger, 5, "Expenses:Food", 2, "transaction"),
        # The pad and its padding transaction are one paragraph (w1/118).
        _inactive(ledger, 9, "Assets:Bank", 1, "pad"),
        "Pad accounts must be open on the pad date, 2025-12-20.",
        _inactive(ledger, 9, "Equity:Opening", 3, "pad"),
    ]


def test_a_pad_refused_under_allow_errors_reads_the_same_every_run(tmp_path: Path) -> None:
    ledger = tmp_path.resolve() / "main.bean"
    assert _same_every_run(tmp_path, PADDED, "--allow-errors") == [
        _inactive(ledger, 9, "Assets:Bank", 1, "pad"),
        "Pad accounts must be active, even with --allow-errors.",
        _inactive(ledger, 9, "Equity:Opening", 3, "pad"),
    ]


@pytest.mark.parametrize("seed", SEEDS)
def test_two_transactions_with_one_remedy_still_fold(tmp_path: Path, seed: str) -> None:
    # Control: the same remedy on two lines is one problem. It held before
    # w1/281 too, in an order the seed picked, so the order is not pinned here.
    content = OPENS + "\n" + LUNCH + "\n" + LUNCH.replace("12-16", "12-17")
    ledger = tmp_path.resolve() / "main.bean"
    _, details = _refusal(tmp_path, content, seed)
    assert sorted(details) == [
        _inactive(ledger, 4, "Assets:Bank", 1, "transaction") + " Same problem on 1 more line: 8.",
        _inactive(ledger, 4, "Expenses:Food", 2, "transaction") + " Same problem on 1 more line: 8.",
    ]
