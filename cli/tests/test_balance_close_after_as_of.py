"""A close dated after the report's as-of date does not hide the account (w1/250).

With no `--time`, `bea balance` reports through the ledger's last dated fact,
but it counted every `close` in the file. An account closed a month after that
as-of date read "No accounts match" while a longer explicit window, still
ending before the close, listed it. Only closes before the period's exclusive
end count; a window covering the close still hides an empty closed account.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Old USD
2026-01-01 open Assets:New USD
2026-01-01 open Assets:Zero USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "o"
  Assets:Old 100 USD
  Equity:Opening
2026-02-01 * "move"
  Assets:New 100 USD
  Assets:Old
2026-03-01 close Assets:Old
2026-03-01 close Assets:Zero
"""


def _balance(tmp_path: Path, *args: str) -> dict[str, object]:
    (tmp_path / "main.bean").write_text(LEDGER)
    result = _bea(tmp_path, "balance", *args)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]  # type: ignore[no-any-return]


def _accounts(tree: object) -> set[str]:
    if not isinstance(tree, dict):
        return set()
    names = {tree["account"]} if "account" in tree else set()
    for child in tree.get("children", []):
        names |= _accounts(child)
    return names


@pytest.mark.parametrize(("term", "account"), [("old", "Assets:Old"), ("zero", "Assets:Zero")])
def test_a_close_after_the_default_as_of_date_keeps_the_account(tmp_path: Path, term: str, account: str) -> None:
    data = _balance(tmp_path, term)

    assert data["as_of"] == "2026-02-01"
    assert data["account_filter_empty"] is False
    assert account in _accounts(data["assets"])


@pytest.mark.parametrize("term", ["old", "zero"])
def test_a_window_covering_the_close_still_excludes_the_empty_account(tmp_path: Path, term: str) -> None:
    data = _balance(tmp_path, term, "--time", "2026-01 - 2026-03")

    assert data["account_filter_empty"] is True
