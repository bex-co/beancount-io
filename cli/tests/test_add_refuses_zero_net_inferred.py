"""Refuse zero-net adds with an inferred balancing leg (w3/339)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
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
        timeout=60,
    )


def test_add_refuses_zero_net_inferred_balancing_posting(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    before = ledger.read_text()

    refused = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-05-01",
        "--narration",
        "z",
        "--posting",
        "Expenses:Food 0 USD",
        "--posting",
        "Assets:Cash",
    )
    assert refused.returncode == 2, refused.stderr or refused.stdout
    assert "zero-net" in (refused.stderr + refused.stdout).lower()
    assert ledger.read_text() == before

    explicit = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-05-01",
        "--narration",
        "z",
        "--posting",
        "Expenses:Food 0 USD",
        "--posting",
        "Assets:Cash 0 USD",
    )
    assert explicit.returncode == 0, explicit.stderr or explicit.stdout
    listed = _bea(tmp_path, "--file", str(ledger), "list", "transaction")
    assert listed.returncode == 0
    assert "Assets:Cash" in listed.stdout
    assert "Expenses:Food" in listed.stdout

    inferred = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-05-02",
        "--narration",
        "food",
        "--posting",
        "Expenses:Food 5 USD",
        "--posting",
        "Assets:Cash",
    )
    assert inferred.returncode == 0, inferred.stderr or inferred.stdout


# Weights, not units, decide whether the inferred leg is zero (w4/165): a sale
# and a repurchase cancel in HOOL but leave a gain in USD to infer.
BROKER = """2024-01-01 open Assets:Broker HOOL
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Gains USD
2024-01-02 * "Buy"
  Assets:Broker 1 HOOL {50 USD}
  Assets:Cash -50 USD
"""


def _add(tmp_path: Path, ledger: Path, *postings: str) -> subprocess.CompletedProcess[str]:
    args = ["--json", "--file", str(ledger), "add", "transaction", "Trade", "--date", "2024-03-01"]
    for posting in postings:
        args += ["-p", posting]
    return _bea(tmp_path, *args)


def _gains(tmp_path: Path, ledger: Path) -> list[list[str]]:
    import json

    result = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT number WHERE account = 'Income:Gains'")
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]["rows"]


@pytest.mark.parametrize(
    ("postings", "gain"),
    [
        (("Assets:Broker -1 HOOL {50 USD} @ 60 USD", "Assets:Broker 1 HOOL {60 USD}"), "-10"),
        (("Assets:Broker -1 HOOL {50 USD} @@ 60 USD", "Assets:Broker 1 HOOL @@ 70 USD"), "-20"),
        (("Assets:Broker -1 HOOL {50 USD}", "Assets:Broker 1 HOOL {45 # 15 USD}"), "-10"),
    ],
    ids=["sale-and-repurchase", "total-prices", "per-and-total-cost"],
)
def test_a_nonzero_weight_is_inferred_even_when_units_cancel(
    tmp_path: Path, postings: tuple[str, str], gain: str
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(BROKER)
    added = _add(tmp_path, ledger, *postings, "Income:Gains")
    assert added.returncode == 0, added.stderr
    assert _gains(tmp_path, ledger) == [[gain]]
    assert _bea(tmp_path, "--file", str(ledger), "check").returncode == 0


def test_a_zero_weight_across_costs_is_still_refused(tmp_path: Path) -> None:
    # Units never cancel here (HOOL against USD), yet the weights do:
    # -1 x 50 USD at cost plus 50 USD is zero, so the inferred leg would vanish.
    ledger = tmp_path / "main.bean"
    ledger.write_text(BROKER)
    before = ledger.read_bytes()
    zero = _add(tmp_path, ledger, "Assets:Broker -1 HOOL {50 USD}", "Assets:Cash 50 USD", "Income:Gains")
    assert zero.returncode == 2, zero.stdout
    assert "zero-net" in zero.stderr
    assert ledger.read_bytes() == before


# Bulk rows get the same lost-leg refusal as a single add (w4/166).
ZERO_ROW = {
    "date": "2024-03-01",
    "narration": "Zero",
    "postings": [{"account": "Expenses:Food", "amount": "0 USD"}, {"account": "Assets:Cash"}],
}
LUNCH_ROW = {
    "date": "2024-03-02",
    "narration": "Lunch",
    "postings": [{"account": "Expenses:Food", "amount": "12 USD"}, {"account": "Assets:Cash"}],
}
FOOD = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
"""


def _bulk(tmp_path: Path, ledger: Path, rows: list[dict], *extra: str) -> subprocess.CompletedProcess[str]:
    import json

    source = tmp_path / "rows.json"
    source.write_text(json.dumps(rows))
    return _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(source), *extra)


def _postings(tmp_path: Path, ledger: Path) -> list[list[str]]:
    import json

    result = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT narration, account, number ORDER BY date")
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]["rows"]


def test_bulk_refuses_a_zero_inferred_row_and_writes_nothing(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(FOOD)
    before = ledger.read_bytes()
    refused = _bulk(tmp_path, ledger, [LUNCH_ROW, ZERO_ROW])
    assert refused.returncode != 0, refused.stdout
    assert "Row 2: Refusing a zero-net transaction" in refused.stderr
    assert "'Assets:Cash 0 USD'" in refused.stderr
    assert ledger.read_bytes() == before


def test_bulk_partial_writes_the_other_rows_and_reports_the_zero_one(tmp_path: Path) -> None:
    import json

    ledger = tmp_path / "main.bean"
    ledger.write_text(FOOD)
    partial = _bulk(tmp_path, ledger, [ZERO_ROW, LUNCH_ROW], "--partial")
    assert partial.returncode != 0, partial.stdout
    error = json.loads(partial.stderr)["error"]
    assert error["result"]["written_rows"] == [1]
    assert error["result"]["rejected_rows"] == [0]
    assert _postings(tmp_path, ledger) == [["Lunch", "Expenses:Food", "12"], ["Lunch", "Assets:Cash", "-12"]]


def test_bulk_keeps_explicit_zeros_and_cost_aware_inference(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(BROKER)
    explicit = {
        "date": "2024-03-01",
        "narration": "Zero",
        "postings": [{"account": "Income:Gains", "amount": "0 USD"}, {"account": "Assets:Cash", "amount": "0 USD"}],
    }
    trade = {
        "date": "2024-03-02",
        "narration": "Trade",
        "postings": [
            {"account": "Assets:Broker", "amount": "-1 HOOL {50 USD} @ 60 USD"},
            {"account": "Assets:Broker", "amount": "1 HOOL {60 USD}"},
            {"account": "Income:Gains"},
        ],
    }
    added = _bulk(tmp_path, ledger, [explicit, trade])
    assert added.returncode == 0, added.stderr
    rows = _postings(tmp_path, ledger)
    assert ["Zero", "Assets:Cash", "0"] in rows
    assert ["Zero", "Income:Gains", "0"] in rows
    assert ["Trade", "Income:Gains", "-10"] in rows
