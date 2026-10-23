"""An inferred cost part is solved beside a second, fully costed posting (w5/994).

The helper stopped at any other posting with a cost, so the open part stayed
unresolved: two purchases at different cash prices got one generated id and the
second was skipped even under `--duplicates include`, and the single-add answer
reported the part as null, which did not replay.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_inferred_cost_identity import IMPORTER
from tests.test_import_source_facts import _bea

LEDGER = (
    "2024-01-01 open Assets:Broker HOOL\n2024-01-01 open Assets:Other OTHER\n"
    "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
)
TRADE = (
    '2024-01-02 * "Trade"\n  Assets:Broker 2 HOOL {cost}\n  Assets:Other 1 OTHER {{10 USD}}\n  Assets:Cash {cash} USD\n'
)
FORMS = ["{# 0.50 USD}", "{5 # USD}"]


@pytest.mark.parametrize("cost", FORMS)
def test_two_trades_at_different_cash_prices_are_both_written(tmp_path: Path, cost: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importer.py").write_text(IMPORTER.format(bank=False))
    (tmp_path / "a.trade").write_text(TRADE.format(cost=cost, cash="-20.50"))
    (tmp_path / "b.trade").write_text(TRADE.format(cost=cost, cash="-30.50"))

    first = _bea(tmp_path, "import", "a.trade", "--config", "importer.py", "--apply")
    second = _bea(tmp_path, "import", "b.trade", "--config", "importer.py", "--apply")
    repeat = _bea(tmp_path, "import", "b.trade", "--config", "importer.py", "--apply")

    assert json.loads(first.stdout)["data"]["written"] == 1
    assert json.loads(second.stdout)["data"]["written"] == 1
    assert json.loads(repeat.stdout)["data"]["written"] == 0
    cash = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Cash'")
    assert json.loads(cash.stdout)["data"]["rows"] == [["949.00"]]


@pytest.mark.parametrize("cost", FORMS)
def test_the_single_add_answer_replays(tmp_path: Path, cost: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "copy.bean").write_text(LEDGER)

    added = _bea(
        tmp_path, "add", "transaction", "--date", "2024-01-02", "--narration", "Trade",
        "--posting", f"Assets:Broker 2 HOOL {cost}",
        "--posting", "Assets:Other 1 OTHER {10 USD}",
        "--posting", "Assets:Cash -20.50 USD",
    )  # fmt: skip
    assert added.returncode == 0, added.stderr
    directive = json.loads(added.stdout)["data"]["directive"]
    (tmp_path / "rows.json").write_text(json.dumps([directive]))
    replay = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "rows.json"), ledger="copy.bean")

    assert replay.returncode == 0, replay.stderr
    assert _bea(tmp_path, "check", ledger="copy.bean").returncode == 0
