"""A correction to an opening trade under the same bank id is reviewed, not skipped (w5/1089).

A labelled or negative opening that leaves its cost number to booking was
never completed from its cash, so a different trade under the same id matched
the original as an exact duplicate. With no lot of the other direction to
reduce, the cash determines the cost and the correction conflicts.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]
BASE = """option "operating_currency" "USD"
2023-01-01 open Assets:Cash USD
2023-01-01 open Assets:Stock HOOL
2023-01-01 open Equity:Opening USD
2023-12-01 * "Funding"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
"""
IMPORTER = """\
import datetime
import os
from decimal import Decimal
from beancount.core import amount, data, position
from beancount.core.number import MISSING


class Trade:
    name = "trade"

    def identify(self, filepath):
        return filepath.endswith(".txt")

    def account(self, filepath):
        return "Assets:Stock"

    def extract(self, filepath, existing):
        meta = data.new_metadata(filepath, 1)
        if not os.environ.get("NO_ID"):
            meta["fitid"] = "basis-ref"
        units = Decimal(os.environ["UNITS"])
        label = os.environ.get("LABEL") or None
        lot = position.CostSpec(MISSING, None, "USD", None, label, False)
        return [data.Transaction(meta, datetime.date(2024, 1, 2), "*", None, "trade", frozenset(), frozenset(), [
            data.Posting("Assets:Stock", amount.Amount(units, "HOOL"), lot, None, None, None),
            data.Posting("Assets:Cash", amount.Amount(Decimal(os.environ["CASH"]), "USD"), None, None, None, None)])]


CONFIG = [Trade()]
"""
# The trade as the ledger holds it once booked: a lot at 5 USD.
ORIGINAL = {
    "long": (
        '2024-01-02 * "trade"\n  fitid: "basis-ref"\n  Assets:Stock 5 HOOL {5 USD, "Lot A"}\n  Assets:Cash -25 USD\n'
    ),
    "short": '2024-01-02 * "trade"\n  fitid: "basis-ref"\n  Assets:Stock -5 HOOL {5 USD}\n  Assets:Cash 25 USD\n',
}
SAME = {"long": ("5", "-25", "Lot A"), "short": ("-5", "25", "")}
CHANGED = {"long": ("5", "-50", "Lot A"), "short": ("-5", "50", "")}


def _import(
    tmp_path: Path, trade: tuple[str, str, str], *flags: str, no_id: bool = False
) -> subprocess.CompletedProcess[str]:
    units, cash, label = trade
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
        UNITS=units,
        CASH=cash,
        LABEL=label,
        NO_ID="1" if no_id else "",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--no-input", "-f", "main.bean"]
        + ["import", "s.txt", "--config", "imp.py", *flags],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
        check=False,
    )


def _statuses(result: subprocess.CompletedProcess[str]) -> list[str]:
    payload = json.loads(result.stdout or result.stderr)
    data: Any = payload["data"] if "data" in payload else payload["error"]["result"]
    return [row["status"] for row in data["rows"]]


@pytest.fixture(params=["long", "short"])
def kind(request: pytest.FixtureRequest, tmp_path: Path) -> str:
    (tmp_path / "imp.py").write_text(IMPORTER)
    (tmp_path / "s.txt").write_text("statement\n")
    (tmp_path / "main.bean").write_text(BASE + ORIGINAL[request.param])
    return str(request.param)


def test_a_changed_opening_under_the_same_id_conflicts(tmp_path: Path, kind: str) -> None:
    before = (tmp_path / "main.bean").read_bytes()

    result = _import(tmp_path, CHANGED[kind], "--apply", "--duplicates", "skip")

    assert result.returncode == 4, result.stdout + result.stderr
    assert "duplicate" not in _statuses(result)
    assert (tmp_path / "main.bean").read_bytes() == before


def test_the_same_opening_is_still_an_exact_duplicate(tmp_path: Path, kind: str) -> None:
    before = (tmp_path / "main.bean").read_bytes()

    result = _import(tmp_path, SAME[kind], "--apply")

    assert result.returncode == 0, result.stdout + result.stderr
    assert _statuses(result) == ["duplicate"]
    assert (tmp_path / "main.bean").read_bytes() == before


def test_two_generated_id_trades_with_different_cash_are_both_written(tmp_path: Path, kind: str) -> None:
    (tmp_path / "main.bean").write_text(BASE)

    first = _import(tmp_path, SAME[kind], "--apply", no_id=True)
    second = _import(tmp_path, CHANGED[kind], "--apply", no_id=True)

    assert first.returncode == 0, first.stdout + first.stderr
    assert second.returncode == 0, second.stdout + second.stderr
    assert _statuses(second) != ["duplicate"]
    assert (tmp_path / "main.bean").read_text().count("Assets:Stock") == 3  # the open, then one posting per trade
