"""Case-insensitive filters match Turkish `İ`/`ı` against `i`/`I` (w1/132).

`str.casefold()` folds `İ` to `i` plus U+0307 and leaves dotless `ı` alone, so
`--search istanbul`, `--account izmir` and `bea balance izmir` found nothing
in a Turkish ledger, while `report -a` and import rules (`re.IGNORECASE`)
matched. Both fold helpers now agree with them.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import unicodedata
from pathlib import Path

import pytest

from bea_engine.ledger.text import fold_account as engine_fold
from cli.utils import fold_account as frontend_fold

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "TRY"
2026-01-01 open Assets:Banka TRY
2026-01-01 open Expenses:İzmir TRY
2026-01-01 open Expenses:Gida TRY
2026-01-02 * "İSTANBUL KEBAP" "AKŞAM YEMEĞİ"
  Expenses:İzmir  10 TRY
  Assets:Banka
2026-01-03 * "ISPARTA GIDA" "market"
  Expenses:Gida  5 TRY
  Assets:Banka
"""


@pytest.mark.parametrize("fold", [engine_fold, frontend_fold], ids=["engine", "frontend"])
@pytest.mark.parametrize(
    ("needle", "haystack"),
    [("istanbul", "İSTANBUL KEBAP"), ("izmir", "Expenses:İzmir"), ("ısparta", "ISPARTA GIDA"), ("İZMİR", "izmir")],
)
def test_turkish_i_variants_fold_together(fold: object, needle: str, haystack: str) -> None:
    assert callable(fold)
    assert fold(needle) in fold(haystack)
    assert fold(unicodedata.normalize("NFD", needle)) in fold(unicodedata.normalize("NFD", haystack))


@pytest.mark.parametrize("fold", [engine_fold, frontend_fold], ids=["engine", "frontend"])
def test_nfc_and_nfd_spellings_still_match(fold: object) -> None:
    assert callable(fold)
    assert fold("Ünïcödé") == fold(unicodedata.normalize("NFD", "Ünïcödé"))


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    ledger = tmp_path / "tr.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


@pytest.mark.parametrize(
    ("args", "payee"),
    [
        (["--search", "istanbul"], "İSTANBUL KEBAP"),
        (["-a", "izmir"], "İSTANBUL KEBAP"),
        (["--search", "ısparta"], "ISPARTA GIDA"),
    ],
)
def test_list_filters_match_turkish_text(tmp_path: Path, args: list[str], payee: str) -> None:
    done = _bea(tmp_path, "list", "transaction", *args)
    assert done.returncode == 0, done.stderr
    assert [row["payee"] for row in json.loads(done.stdout)["data"]] == [payee]


def test_balance_matches_a_turkish_account(tmp_path: Path) -> None:
    done = _bea(tmp_path, "balance", "izmir")
    assert done.returncode == 0, done.stderr
    assert "Expenses:İzmir" in json.dumps(json.loads(done.stdout)["data"], ensure_ascii=False)
