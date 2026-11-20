"""A transaction a plugin made at line 0 lists with no written location (w1/342).

A plugin commonly stamps the transaction it makes with a file and line 0, a
line no file has. `list transaction` copied that stamp into `source`, so JSON
read `source.lineno: 0` and `--details` headed the row `; main.bean:0`, while
`entry_generated` and `list document` (w1/341) already read below line 1 as no
location.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = textwrap.dedent(
    """
    import datetime
    from decimal import Decimal
    from beancount.core import data
    __plugins__ = ["run"]
    def run(entries, options_map, config=None):
        made = []
        for narration, filename in (("root line 0", options_map["filename"]), ("pseudo file", "<lineless>")):
            fee = [
                data.Posting("Expenses:Fees", data.Amount(Decimal("1"), "USD"), None, None, None, None),
                data.Posting("Assets:Cash", data.Amount(Decimal("-1"), "USD"), None, None, None, None),
            ]
            made.append(data.Transaction(
                data.new_metadata(filename, 0), datetime.date(2026, 1, 9), "*", "Plugin", narration,
                frozenset(), frozenset(), fee,
            ))
        return entries + made, []
    """
)
LEDGER = """plugin "lineless"
option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Fees USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "seed"
  Assets:Cash 1000 USD
  Equity:Opening
"""


def _list(books: Path, *args: str, json_output: bool = False) -> str:
    (books / "plugins").mkdir(exist_ok=True)
    (books / "plugins" / "lineless.py").write_text(PLUGIN)
    (books / "main.bean").write_text(LEDGER)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(books / "config"),
        XDG_CACHE_HOME=str(books / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=os.pathsep.join([str(ROOT / "src"), str(books / "plugins")]),
        TERM="dumb",
        NO_COLOR="1",
    )
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            *(["--json"] if json_output else []),
            "-f",
            str(books / "main.bean"),
            "list",
            "transaction",
            *args,
        ],
        env=env,
        cwd=books,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0, result.stderr
    return result.stdout


def test_json_gives_a_lineless_plugin_transaction_no_source(tmp_path: Path) -> None:
    rows: list[dict[str, Any]] = json.loads(_list(tmp_path, json_output=True))["data"]

    by_narration = {row["narration"]: row for row in rows}
    assert by_narration["seed"]["source"] == {"filename": str(tmp_path / "main.bean"), "lineno": 6}
    assert "generated" not in by_narration["seed"]
    for narration in ("root line 0", "pseudo file"):
        # Line 0 of a file is not where anything was written.
        assert by_narration[narration]["source"] is None
        assert by_narration[narration]["generated"] is True


def test_details_marks_the_row_generated_without_line_0(tmp_path: Path) -> None:
    out = _list(tmp_path, "--details")

    assert "main.bean:0" not in out and "<lineless>:0" not in out
    headings = [line for line in out.splitlines() if line.startswith(";")]
    assert headings == ["; (generated)", "; (generated)", f"; {tmp_path / 'main.bean'}:6"]
