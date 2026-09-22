"""Tables pad by terminal columns, not code points (w3/391).

`output.table()` sized and padded with `len()` and `str.ljust()`, which count
characters. An East Asian Wide character occupies two terminal columns, so a
Japanese payee was padded short and every column to its right shifted — worst
in the import preview, where the amount slid out from under its own header
while the user was deciding whether to commit the write.

Precomposed accented Latin (`Ünïcödé Störé`) always aligned correctly, and it
is kept here as the control that makes the rule precise: the issue is display
width, not "non-ASCII".

These assert on computed column offsets rather than golden strings, so they
state the property instead of pinning today's spacing.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from cli.output import display_width

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-05 * "日本語商店" "ラーメンを食べた"
  Expenses:Food   12.34 USD
  Assets:Cash
2026-01-06 * "Cafe" "plain ascii narration"
  Expenses:Food    5.00 USD
  Assets:Cash
2026-01-07 * "Ünïcödé Störé" "accented"
  Expenses:Food    2.00 USD
  Assets:Cash
2026-01-08 * "🏪 emoji shop" "emoji payee"
  Expenses:Food    1.00 USD
  Assets:Cash
"""


class TestDisplayWidth:
    @pytest.mark.parametrize(
        ("text", "columns"),
        [
            pytest.param("", 0, id="empty"),
            pytest.param("Cafe", 4, id="ascii"),
            pytest.param("日本語商店", 10, id="cjk-wide"),
            pytest.param("ラーメン屋", 10, id="katakana-wide"),
            pytest.param("🏪", 2, id="emoji"),
            pytest.param("Ünïcödé Störé", 13, id="precomposed-latin"),
            # U+0301 COMBINING ACUTE renders onto the "e" before it.
            pytest.param("é", 1, id="combining-mark"),
            pytest.param("ＡＢＣ", 6, id="fullwidth-latin"),
        ],
    )
    def test_counts_terminal_columns(self, text: str, columns: int) -> None:
        assert display_width(text) == columns

    def test_wide_text_is_wider_than_its_character_count(self) -> None:
        """The specific disagreement that broke the padding."""
        assert len("日本語商店") == 5
        assert display_width("日本語商店") == 10


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


def _table_block(stdout: str, rows: int) -> list[str]:
    """The header, the rule and the next `rows` body lines, padding intact.

    The row count is passed in rather than inferred: what follows a table is
    not reliably blank — the import preview prints its write diff straight
    after the last row, and a diff's `---` header even looks like a rule.
    Lines are not stripped, because the trailing padding is the thing under
    test.
    """
    lines = stdout.splitlines()
    rule = next(i for i, line in enumerate(lines) if line.strip() and set(line) <= {"-", " "})
    return lines[rule - 1 : rule + 1 + rows]


def _assert_rows_line_up(stdout: str, rows: int) -> None:
    """Every line of a fully padded table occupies the same number of columns.

    That is what alignment *is* here: `table()` pads every cell, including the
    last, so a row whose padding was computed from code points instead of
    columns comes out wider than the header — which is exactly how the amount
    slid out from under its own heading.
    """
    block = _table_block(stdout, rows)
    assert len(block) == rows + 2, stdout
    measured = {line: display_width(line) for line in block}
    assert len(set(measured.values())) == 1, f"table lines have differing widths: {measured}"


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def test_every_row_shares_the_headers_column_boundaries(tmp_path: Path, ledger: Path) -> None:
    listed = _bea(tmp_path, "--file", str(ledger), "list", "transaction")
    assert listed.returncode == 0, listed.stderr

    _assert_rows_line_up(listed.stdout, rows=4)


def test_the_import_preview_lines_up(tmp_path: Path) -> None:
    """The consequential case: the amount must stay under its own header."""
    books = tmp_path / "main.bean"
    books.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Cash USD\n"
        "2026-01-01 open Expenses:Uncategorized USD\n",
        encoding="utf-8",
    )
    source = tmp_path / "cjk.csv"
    source.write_text(
        "Date,Amount,Description\n"
        "2026-02-01,-12.34,日本語商店\n"
        "2026-02-02,-5.00,Plain Cafe\n"
        "2026-02-03,-7.00,ラーメン屋\n",
        encoding="utf-8",
    )

    preview = _bea(
        tmp_path,
        "--no-input",
        "--file",
        str(books),
        "import",
        str(source),
        "--csv",
        "auto",
        "--account",
        "Assets:Cash",
    )
    assert preview.returncode == 0, preview.stderr

    _assert_rows_line_up(preview.stdout, rows=3)


def test_values_are_unchanged_only_the_spacing_moved(tmp_path: Path, ledger: Path) -> None:
    """Padding is presentation; nothing may be truncated or rewritten by it."""
    listed = _bea(tmp_path, "--file", str(ledger), "list", "transaction")

    assert listed.returncode == 0, listed.stderr
    for value in ("日本語商店", "ラーメンを食べた", "Ünïcödé Störé", "🏪 emoji shop", "Cafe"):
        assert value in listed.stdout


def test_json_mode_is_untouched(tmp_path: Path, ledger: Path) -> None:
    """`--json` returns before the table, so it neither gains nor loses anything."""
    import json

    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction")

    assert listed.returncode == 0, listed.stderr
    payees = {row["payee"] for row in json.loads(listed.stdout)["data"]}
    assert "日本語商店" in payees
