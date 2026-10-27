"""treeify keeps an account separator before a component that starts with a combining mark (w5/1059).

The column-width adapter folded a zero-width mark into the preceding `:`, so
`Assets:Bank:` + U+0301 `Cafe` lost that separator and rendered as one
`Bank:́Cafe` branch under Assets instead of a Bank parent with a Cafe leaf.
"""

from __future__ import annotations

from pathlib import Path

from tests.test_treeify_unicode_accounts import _bea

ACCOUNTS = ["Assets:Bank:́Cafe", "Assets:Bank:̈Food"]
LEDGER = (
    'option "operating_currency" "USD"\n'
    + "".join(f"2024-01-01 open {a} USD\n" for a in [*ACCOUNTS, "Equity:Opening"])
    + '2024-02-01 * "Opening"\n'
    + f"  {ACCOUNTS[0]} 10 USD\n  {ACCOUNTS[1]} 20 USD\n  Equity:Opening -30 USD\n"
)


def test_the_bank_parent_and_its_leaves_are_separate_nodes(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER, encoding="utf-8")
    table = _bea(
        tmp_path,
        "-f",
        str(tmp_path / "main.bean"),
        "query",
        "SELECT account, sum(position) GROUP BY account ORDER BY account",
    )
    assert table.returncode == 0, table.stderr

    tree = _bea(tmp_path, "treeify", stdin=table.stdout)

    assert tree.returncode == 0, tree.stderr
    lines = tree.stdout.splitlines()
    assert any(line.rstrip().endswith("-- Bank") for line in lines), tree.stdout
    assert any("́Cafe" in line and "10" in line and ":" not in line.split("--")[-1] for line in lines)
    assert any("̈Food" in line and "20" in line and ":" not in line.split("--")[-1] for line in lines)
