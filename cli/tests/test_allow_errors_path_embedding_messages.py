"""`--allow-errors` tolerates existing errors whose message embeds a path (w1/135).

The after-load of a write reads staged copies, so an error message that quotes
a file path (a lot-matching error's posting repr, a duplicate include) differed
from the same error in the before-load. Keyed on the raw message, every such
pre-existing error read as newly introduced and blocked every write.
"""

from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LOT_MISMATCH = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
2020-01-01 open Assets:Broker HOOL "FIFO"
2020-01-02 * "buy"
  Assets:Broker  1 HOOL {100 USD}
  Assets:Cash
2020-01-03 * "sell"
  Assets:Broker  -1 HOOL {200 USD}
  Assets:Cash
"""


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
        timeout=120,
    )


def _lot_mismatch(tmp_path: Path) -> Path:
    path = tmp_path / "bk.bean"
    path.write_text(LOT_MISMATCH, encoding="utf-8")
    return path


def _duplicate_include(tmp_path: Path) -> Path:
    (tmp_path / "inc.bean").write_text(
        "2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n", encoding="utf-8"
    )
    path = tmp_path / "main.bean"
    path.write_text('option "operating_currency" "USD"\ninclude "inc.bean"\ninclude "inc.bean"\n', encoding="utf-8")
    return path


def _add(tmp_path: Path, ledger: Path, debit: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--allow-errors",
        "--date",
        "2020-02-01",
        "--narration",
        "food",
        "--posting",
        f"{debit} 5 USD",
        "--posting",
        "Assets:Cash -5 USD",
    )


@pytest.mark.parametrize(
    ("build", "existing"),
    [
        pytest.param(_lot_mismatch, "No position matches", id="lot-mismatch"),
        pytest.param(_duplicate_include, "Duplicate filename parsed", id="duplicate-include"),
    ],
)
def test_an_existing_path_embedding_error_is_tolerated(
    tmp_path: Path, build: Callable[[Path], Path], existing: str
) -> None:
    ledger = build(tmp_path)
    assert _bea(tmp_path, "--file", str(ledger), "check").returncode == 1, "the ledger starts with an error"

    done = _add(tmp_path, ledger, "Expenses:Food")

    assert done.returncode == 0, done.stderr
    assert existing in done.stdout + done.stderr
    assert '2020-02-01 * "food"' in ledger.read_text()


@pytest.mark.parametrize("build", [_lot_mismatch, _duplicate_include])
def test_a_genuinely_new_error_is_still_refused(tmp_path: Path, build: Callable[[Path], Path]) -> None:
    ledger = build(tmp_path)
    before = ledger.read_bytes()

    done = _add(tmp_path, ledger, "Expenses:Nope")

    assert done.returncode == 1, done.stdout
    assert "1 new ledger error" in done.stderr
    assert "Expenses:Nope" in done.stderr
    assert ledger.read_bytes() == before
