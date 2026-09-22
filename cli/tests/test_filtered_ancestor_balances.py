"""An ancestor kept for structure contributes none of its own balance (w3/396).

`_prune_tree` keeps a node when it matches *or* when a child survived, but it
always rolled `node.balance` into the subtree total. So filtering to a child
account still counted the parent's own direct postings: `bea balance Fund`
reported 125.00 USD for a fund holding 25.00, the extra 100.00 belonging to the
`Assets:Brokerage` parent that is on screen only to show where the fund sits.

Two fixtures, because the two surfaces reach the bug differently. With the
parent and child in one transaction, both `balance` and the report trees show
it. With them in separate transactions the report's entry filter hides the
parent-only transaction first, so only `balance` — which builds the whole tree
before pruning — was wrong. Both must be right.

Filtering to the parent is the control that keeps the fix honest: `Brokerage`
matches, so its own 100.00 *does* belong, alongside the child's 25.00.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

HEADER = """option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD
2026-01-01 open Assets:Brokerage:Fund USD
2026-01-01 open Equity:Opening USD
"""

COMBINED = (
    HEADER
    + """2026-01-02 * "Both"
  Assets:Brokerage 100.00 USD
  Assets:Brokerage:Fund 25.00 USD
  Equity:Opening
"""
)

SEPARATE = (
    HEADER
    + """2026-01-02 * "Parent only"
  Assets:Brokerage 100.00 USD
  Equity:Opening
2026-01-03 * "Child only"
  Assets:Brokerage:Fund 25.00 USD
  Equity:Opening
"""
)


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


def _ledger(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(body, encoding="utf-8")
    return path


def _assets(tmp_path: Path, ledger: Path, *args: str) -> dict:
    done = _bea(tmp_path, "--json", "--file", str(ledger), "report", "trial-balance", *args)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)["data"]["assets"]


def _balance_rows(stdout: str) -> dict[str, str]:
    """Account name to amount, from the human balance tree."""
    rows: dict[str, str] = {}
    for line in stdout.splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[2] == "USD":
            rows[parts[0]] = parts[1]
    return rows


@pytest.mark.parametrize("body", [COMBINED, SEPARATE], ids=["one-transaction", "separate-transactions"])
def test_balance_excludes_an_unmatched_parents_own_postings(tmp_path: Path, body: str) -> None:
    ledger = _ledger(tmp_path, body)

    done = _bea(tmp_path, "--file", str(ledger), "balance", "Fund")

    assert done.returncode == 0, done.stderr
    rows = _balance_rows(done.stdout)
    assert rows == {"Assets": "25.00", "Brokerage": "25.00", "Fund": "25.00"}, done.stdout


@pytest.mark.parametrize("body", [COMBINED, SEPARATE], ids=["one-transaction", "separate-transactions"])
def test_report_trees_exclude_them_too(tmp_path: Path, body: str) -> None:
    ledger = _ledger(tmp_path, body)

    assets = _assets(tmp_path, ledger, "-a", "Fund")

    assert assets["balance_children"] == {"USD": "25.00"}


def test_a_structural_ancestor_reports_nothing_of_its_own(tmp_path: Path) -> None:
    """The node itself must agree with the rollup, not just the total."""
    ledger = _ledger(tmp_path, COMBINED)

    assets = _assets(tmp_path, ledger, "-a", "Fund")
    brokerage = assets["children"][0]
    fund = brokerage["children"][0]

    assert brokerage["account"] == "Assets:Brokerage"
    assert brokerage["balance"] == {}, "its own posting is out of scope"
    assert brokerage["has_txns"] is False, "no in-scope transaction of its own"
    assert brokerage["balance_children"] == {"USD": "25.00"}
    assert fund["balance"] == {"USD": "25.00"}, "the matched leaf keeps its own balance"


def test_the_overview_agrees(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, COMBINED)

    done = _bea(tmp_path, "--json", "--file", str(ledger), "report", "overview", "-t", "2026", "-a", "Fund")

    assert done.returncode == 0, done.stderr
    data = json.loads(done.stdout)["data"]
    assert data["totals"]["assets"] == {"USD": "25.00"}
    assert {json.dumps(point["balance"]) for point in data["series"]["assets"]} == {json.dumps({"USD": "25.00"})}


@pytest.mark.parametrize("body", [COMBINED, SEPARATE], ids=["one-transaction", "separate-transactions"])
def test_filtering_to_the_parent_keeps_its_own_postings(tmp_path: Path, body: str) -> None:
    """The control: `Brokerage` matches, so its 100.00 belongs in the answer."""
    ledger = _ledger(tmp_path, body)

    human = _bea(tmp_path, "--file", str(ledger), "balance", "Brokerage")
    assert human.returncode == 0, human.stderr
    assert _balance_rows(human.stdout) == {"Assets": "125.00", "Brokerage": "125.00", "Fund": "25.00"}

    assert _assets(tmp_path, ledger, "-a", "Assets:Brokerage")["balance_children"] == {"USD": "125.00"}


@pytest.mark.parametrize("body", [COMBINED, SEPARATE], ids=["one-transaction", "separate-transactions"])
def test_unfiltered_values_are_unchanged(tmp_path: Path, body: str) -> None:
    ledger = _ledger(tmp_path, body)

    assert _assets(tmp_path, ledger)["balance_children"] == {"USD": "125.00"}

    human = _bea(tmp_path, "--file", str(ledger), "balance")
    assert human.returncode == 0, human.stderr
    assert _balance_rows(human.stdout)["Brokerage"] == "125.00"


def test_the_bql_control_still_agrees_with_the_filtered_leaf(tmp_path: Path) -> None:
    """The independent oracle the report cited: the fund holds 25.00."""
    ledger = _ledger(tmp_path, COMBINED)

    done = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "query",
        "SELECT account, sum(position) WHERE account = 'Assets:Brokerage:Fund' GROUP BY account",
    )

    assert done.returncode == 0, done.stderr
    assert "25.00" in done.stdout and "125.00" not in done.stdout
