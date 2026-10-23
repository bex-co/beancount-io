"""A ticker-shaped narration beside the account column does not become the tree (w5/990).

The scan consumed the character after a match's delimiter, which was the first
letter of the next column's account: with a narration of just `NYSE:IBM` the
account column was invisible to it, the narration won, and both real accounts
stayed flat under NYSE/IBM branches.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_treeify_unicode_accounts import _bea

PROFILES = {
    "bare": "NYSE:IBM",
    "word": "NYSE:IBM dividend",
    "plain": "IBM",
}


def _table(tmp_path: Path, narration: str, assets: str, income: str) -> str:
    option = (
        f'option "name_assets" "{assets}"\noption "name_income" "{income}"\n'
        if (assets, income) != ("Assets", "Income")
        else ""
    )
    (tmp_path / "main.bean").write_text(
        option
        + f"2024-01-01 open {assets}:Broker:Cash USD\n2024-01-01 open {income}:Dividends USD\n"
        + f'2024-01-02 * "{narration}"\n  {assets}:Broker:Cash 10.00 USD\n  {income}:Dividends -10.00 USD\n'
    )
    listed = _bea(tmp_path, "-f", str(tmp_path / "main.bean"), "query", "SELECT narration, account, position")
    assert listed.returncode == 0, listed.stderr
    return listed.stdout


@pytest.mark.parametrize(
    ("assets", "income"), [("Assets", "Income"), ("Aktiva", "Ertraege")], ids=["english", "renamed"]
)
@pytest.mark.parametrize("profile", list(PROFILES))
def test_the_account_column_is_the_tree(tmp_path: Path, profile: str, assets: str, income: str) -> None:
    table = _table(tmp_path, PROFILES[profile], assets, income)
    (tmp_path / "table.txt").write_text(table)

    from_file = _bea(tmp_path, "treeify", str(tmp_path / "table.txt"))
    from_stdin = _bea(tmp_path, "treeify", stdin=table)
    written = _bea(tmp_path, "treeify", str(tmp_path / "table.txt"), "-o", str(tmp_path / "tree.txt"))

    assert from_file.returncode == from_stdin.returncode == written.returncode == 0
    assert from_file.stdout == from_stdin.stdout == (tmp_path / "tree.txt").read_text()
    tree = from_file.stdout
    assert f"-- {assets}" in tree and f"-- {income}" in tree and "Broker" in tree and "Dividends" in tree
    # The narration stays a value beside the branches, never a branch itself.
    assert "`-- NYSE" not in tree
    assert tree.count(PROFILES[profile]) == 2
