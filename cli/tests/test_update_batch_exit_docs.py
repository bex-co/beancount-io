"""`bea update transactions` documents the exit statuses it returns (w1/353).

A batch preview that rejects a row writes nothing, reports the rejection in its
row statuses and `rejected` count, and exits 0; `--apply` writes the valid rows
and exits 1. The help and `docs/USAGE.md` said any rejected row exits 1, with no
exception for previews, so an agent that gated an apply on the preview's exit
status read 0 as "every row is valid". Each test runs the command and requires
the text a caller reads to state the exit statuses the command just returned.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
USAGE = Path(__file__).resolve().parents[1] / "docs" / "USAGE.md"

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-01 open Expenses:Groceries USD

2026-01-03 ! "Whole Foods" "card purchase"
  import-id: "aaa1"
  Assets:Bank  -45.10 USD
  Expenses:Uncategorized  45.10 USD
"""


def _flat(text: str) -> str:
    return re.sub(r"\s+", " ", text)


def _observed_exits(tmp_path: Path) -> tuple[int, int]:
    """Preview, then apply, one valid row and one unknown id; return both exit codes."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    mapping = tmp_path / "rows.csv"
    mapping.write_text("id,account,flag\naaa1,Expenses:Groceries,*\nzzz9,Expenses:Groceries,*\n")
    args = ["--json", "--file", str(ledger), "update", "transactions", "--from", str(mapping)]
    preview = runner.invoke(app, args)
    data = json.loads(preview.stdout)["data"]
    assert (data["ready"], data["rejected"], data["written"]) == (1, 1, 0), preview.output
    assert ledger.read_text() == LEDGER
    applied = runner.invoke(app, [*args, "--apply"])
    assert "Expenses:Groceries  45.10 USD" in ledger.read_text(), applied.output
    return preview.exit_code, applied.exit_code


def test_help_states_the_preview_and_apply_exit_statuses(tmp_path: Path) -> None:
    preview_exit, apply_exit = _observed_exits(tmp_path)
    result = runner.invoke(app, ["update", "transactions", "--help"])
    assert result.exit_code == 0, result.output
    help_text = _flat(result.output)
    apply_rule = (
        "With --apply, every valid row writes and a rejected row never aborts the valid ones,"
        f" but the exit status is still {apply_exit} whenever any row was rejected"
    )
    assert apply_rule in help_text, help_text
    assert f"A preview writes nothing and exits {preview_exit} even when it rejects rows" in help_text, help_text
    assert "in the `rejected` count (`data.rejected` under --json)" in help_text, help_text


def test_usage_states_the_preview_and_apply_exit_statuses(tmp_path: Path) -> None:
    preview_exit, apply_exit = _observed_exits(tmp_path)
    usage = _flat(USAGE.read_text(encoding="utf-8"))
    paragraph = usage.split("JSON rows use the single-row fields; pass `--from -`", 1)[1].split(" ## ", 1)[0]
    assert f"With `--apply`, any rejection exits **{apply_exit}**" in paragraph, paragraph
    assert f"A preview writes nothing and exits {preview_exit} even when it rejects rows" in paragraph, paragraph
    assert "`rejected` count (`data.rejected` under `--json`)" in paragraph, paragraph
    assert "Any rejection exits" not in paragraph, paragraph
