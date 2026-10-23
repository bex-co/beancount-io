"""`bea treeify` reads a query table by terminal column, not character offset (w5/939).

`query` pads its tables in display columns, so a wide CJK account or narration
shifts the character offsets of every column after it. treeify compared
character offsets: a table with a wide account was "not hierarchical", and a
wide narration left the other rows' accounts flat, exit 0.
"""

from __future__ import annotations

from pathlib import Path

from tests.test_treeify_unicode_accounts import _bea

WIDE = "Assets:B" + "银行" * 14
LEDGER = f"""2024-01-01 open Assets:LongAccountNameForCheckingAccount USD
2024-01-01 open {WIDE} USD
2024-01-01 open Equity:Opening USD
2024-02-01 * "Opening"
  Assets:LongAccountNameForCheckingAccount 100.00 USD
  {WIDE} 200.00 USD
  Equity:Opening -300.00 USD
"""
NARRATIONS = """2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Expenses:Rent USD
2024-02-01 * "超市"
  Assets:Cash -10.00 USD
  Expenses:Food 10.00 USD
2024-02-02 * "Rent"
  Assets:Cash -20.00 USD
  Expenses:Rent 20.00 USD
"""


def _table(tmp_path: Path, ledger: str, select: str) -> str:
    (tmp_path / "main.bean").write_text(ledger, encoding="utf-8")
    queried = _bea(tmp_path, "-f", str(tmp_path / "main.bean"), "query", select)
    assert queried.returncode == 0, queried.stderr
    return queried.stdout


def _columns(char: str) -> int:
    return 2 if char in "银行超市" else 1


def _display_offset(line: str, text: str) -> int:
    return sum(_columns(c) for c in line[: line.index(text)])


def test_a_table_with_a_wide_account_becomes_a_whole_tree(tmp_path: Path) -> None:
    table = _table(tmp_path, LEDGER, "SELECT account, sum(position) GROUP BY account ORDER BY account")

    tree = _bea(tmp_path, "treeify", stdin=table)

    assert tree.returncode == 0, tree.stderr
    lines = tree.stdout.splitlines()
    assert any(line.endswith("-- Assets") for line in lines)
    assert any(WIDE.split(":")[1] in line and "200.00 USD" in line for line in lines)
    assert any("Equity" in line for line in lines) and any(
        "Opening" in line and "-300.00 USD" in line for line in lines
    )
    assert not any("Assets:" in line for line in lines)


def test_file_stdin_and_output_agree(tmp_path: Path) -> None:
    table = _table(tmp_path, LEDGER, "SELECT account, sum(position) GROUP BY account ORDER BY account")
    (tmp_path / "balances.txt").write_text(table, encoding="utf-8")

    streamed = _bea(tmp_path, "treeify", stdin=table)
    from_file = _bea(tmp_path, "treeify", str(tmp_path / "balances.txt"))
    written = _bea(tmp_path, "treeify", str(tmp_path / "balances.txt"), "-o", str(tmp_path / "tree.txt"))

    assert streamed.returncode == from_file.returncode == written.returncode == 0
    assert streamed.stdout == from_file.stdout
    assert (tmp_path / "tree.txt").read_text(encoding="utf-8") == streamed.stdout


def test_amounts_stay_aligned_in_terminal_columns(tmp_path: Path) -> None:
    table = _table(tmp_path, LEDGER, "SELECT account, sum(position) GROUP BY account ORDER BY account")

    tree = _bea(tmp_path, "treeify", stdin=table).stdout

    amounts = [_display_offset(line, "USD") for line in tree.splitlines() if "USD" in line]
    assert len(set(amounts)) == 1, tree


def test_a_wide_narration_does_not_leave_other_rows_flat(tmp_path: Path) -> None:
    table = _table(tmp_path, NARRATIONS, "SELECT narration, account, position ORDER BY account,narration")

    tree = _bea(tmp_path, "treeify", stdin=table)

    assert tree.returncode == 0, tree.stderr
    assert "Assets:Cash" not in tree.stdout and "Expenses:Rent" not in tree.stdout
    assert tree.stdout.count("Rent") >= 2 and "超市" in tree.stdout
    assert "-20.00 USD" in tree.stdout and "-10.00 USD" in tree.stdout


def test_an_ascii_table_is_unchanged(tmp_path: Path) -> None:
    table = "account  sum\nAssets:Cash  1 USD\nAssets:Bank  2 USD\n"

    tree = _bea(tmp_path, "treeify", stdin=table)

    assert tree.returncode == 0, tree.stderr
    assert "|-- Assets" in tree.stdout or "`-- Assets" in tree.stdout
