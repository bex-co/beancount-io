"""A read filter keeps a trailing Unicode space that belongs to an account name (w5/956).

`account_filter` and the `balance` terms stripped every Unicode whitespace
character, so `Assets:Cash ` selected the bare `Assets:Cash` instead. Only
the ASCII padding a shell or a paste adds around a value is removed.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_init_creates_missing_ledger import _bea

SPACES = [" ", "　", " "]


def _books(tmp_path: Path, space: str) -> str:
    target = f"Assets:Cash{space}"
    (tmp_path / "main.bean").write_text(
        f"""option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open {target} USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Bare account"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
2024-01-02 * "Target account"
  {target} 200.00 USD
  Equity:Opening -200.00 USD
""",
        encoding="utf-8",
    )
    return target


def _run(tmp_path: Path, *args: str) -> object:
    return _bea(tmp_path, "--json", "-f", str(tmp_path / "main.bean"), *args)


@pytest.mark.parametrize("space", SPACES)
def test_lists_select_only_the_exact_account(tmp_path: Path, space: str) -> None:
    target = _books(tmp_path, space)

    transactions = _run(tmp_path, "list", "transaction", "--account", target, "--limit", "100")
    opens = _run(tmp_path, "list", "open", "--account", target, "--limit", "100")

    assert [row["narration"] for row in json.loads(transactions.stdout)["data"]] == ["Target account"]  # type: ignore[attr-defined]
    assert len(json.loads(opens.stdout)["data"]) == 1  # type: ignore[attr-defined]


@pytest.mark.parametrize("space", SPACES)
def test_reports_and_balance_select_the_exact_account(tmp_path: Path, space: str) -> None:
    target = _books(tmp_path, space)

    overview = _run(tmp_path, "report", "overview", "--time", "2024", "--conversion", "USD", "--account", target)
    balance = _run(tmp_path, "balance", target, "--time", "2024", "--conversion", "USD")

    data = json.loads(overview.stdout)["data"]  # type: ignore[attr-defined]
    assert data["account_filter"] == target
    assert data["totals"]["assets"]["USD"] == "200.00"
    assert json.loads(balance.stdout)["data"]["account_filter"] == target  # type: ignore[attr-defined]


def test_ascii_padding_is_still_stripped(tmp_path: Path) -> None:
    _books(tmp_path, " ")

    padded = _run(tmp_path, "list", "transaction", "--account", " Assets:Cash\t", "--limit", "100")
    bare = _run(tmp_path, "balance", "  Assets:Cash ", "--time", "2024", "--conversion", "USD")

    assert padded.returncode == 0 and bare.returncode == 0  # type: ignore[attr-defined]
    assert json.loads(bare.stdout)["data"]["account_filter"] == "Assets:Cash"  # type: ignore[attr-defined]


@pytest.mark.parametrize("blank", ["", "   ", " "])
def test_a_blank_filter_is_still_refused(tmp_path: Path, blank: str) -> None:
    _books(tmp_path, " ")

    result = _run(tmp_path, "list", "transaction", "--account", blank)

    assert result.returncode == 2, result.stdout  # type: ignore[attr-defined]
