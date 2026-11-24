"""`bea update transactions` costs about one ledger load, not one per row (w1/374).

A batch row located its entry, spanned its lines and diffed its file against
the whole ledger, and one rejected row made every row of its file validate
alone: a 500-row preview with one mistyped account took 134 s on a
5,000-transaction file. These tests count loads and compare bytes rather than
timing anything.
"""

from __future__ import annotations

import math
import random
import re
from pathlib import Path
from typing import Any
from unittest import mock

import pytest

from bea_engine import protocol
from bea_engine.ledger import reader, updating
from bea_engine.ledger import write as ledger_write
from bea_engine.ledger.text import FileDiffer, unified_file_diff

OPENS = (
    'option "operating_currency" "USD"\n'
    "2020-01-01 open Assets:Checking USD\n"
    "2020-01-01 open Expenses:Uncategorized USD\n"
    "2020-01-01 open Expenses:Groceries USD\n"
    "2020-01-01 open Expenses:Dining USD\n"
)


def _entries(count: int) -> str:
    # The holding leg sits after a posting every entry repeats, as a bank
    # import writes it, so the two lines a row rewrites have a common line
    # between them.
    return "".join(
        f'\n2021-{i % 12 + 1:02d}-{i % 28 + 1:02d} ! "Shop {i}"\n'
        f'  import-id: "id-{i}"\n'
        "  Assets:Checking -5.00 USD\n"
        "  Expenses:Uncategorized 5.00 USD\n"
        for i in range(count)
    )


def _ledger(tmp_path: Path, count: int, tail: str = "") -> Path:
    file = tmp_path / "main.bean"
    file.write_text(OPENS + _entries(count) + tail)
    return file


def _count(monkeypatch: pytest.MonkeyPatch, module: Any, name: str) -> mock.Mock:
    counted = mock.Mock(wraps=getattr(module, name))
    monkeypatch.setattr(module, name, counted)
    return counted


ROWS = 64


def _rows(changed: dict[int, str] | None = None) -> list[dict[str, str]]:
    """Every entry to Expenses:Groceries, except the rows `changed` sends elsewhere."""
    return [
        {"id": f"id-{i}", "account": (changed or {}).get(i, "Expenses:Groceries"), "flag": "*"} for i in range(ROWS)
    ]


class TestLoads:
    def test_one_mistyped_row_costs_three_validations_not_one_per_row(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        ledger = _ledger(tmp_path, ROWS)
        validations = _count(monkeypatch, ledger_write, "validate_candidate")
        data = updating.answer(ledger, "transactions", {"rows": _rows({0: "Expenses:Typo"})})
        assert [row["status"] for row in data["rows"]] == ["rejected"] + ["ok"] * (ROWS - 1)
        rejected = data["rows"][0]
        assert rejected["reason"] == "Row 1: The change would leave the ledger invalid."
        assert len(rejected["details"]) == 1
        assert rejected["details"][0].startswith(f"{ledger}:")
        assert "Invalid reference to unknown account 'Expenses:Typo'" in rejected["details"][0]
        # The batch, the named row alone, and the rest together; a trial per
        # row was ROWS + 2.
        assert validations.call_count == 3

    def test_apply_writes_the_rest_after_a_few_validations(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        ledger = _ledger(tmp_path, ROWS)
        validations = _count(monkeypatch, ledger_write, "validate_candidate")
        with pytest.raises(protocol.LedgerError) as caught:
            updating.answer(ledger, "transactions", {"rows": _rows({5: "Expenses:Typo"})}, apply=True)
        assert str(caught.value) == f"Updated {ROWS - 1} of {ROWS} transactions; 1 row was rejected."
        assert caught.value.result is not None
        assert caught.value.result["rejected_rows"] == [5]
        assert ledger.read_text().count("Expenses:Groceries 5.00 USD") == ROWS - 1
        assert validations.call_count == 4

    def test_a_row_breaking_an_assertion_elsewhere_is_found_by_halving(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # The refusal names the assertion's line, which no row's lines hold.
        ledger = _ledger(tmp_path, ROWS, tail="\n2022-01-01 balance Expenses:Dining 0.00 USD\n")
        validations = _count(monkeypatch, ledger_write, "validate_candidate")
        data = updating.answer(ledger, "transactions", {"rows": _rows({40: "Expenses:Dining"})})
        assert [row["status"] for row in data["rows"]] == (["ok"] * 40 + ["rejected"] + ["ok"] * (ROWS - 41))
        assert data["rows"][40]["reason"] == "Row 41: The change would leave the ledger invalid."
        assert any("Balance failed for 'Expenses:Dining'" in line for line in data["rows"][40]["details"])
        assert validations.call_count <= 2 * math.ceil(math.log2(ROWS)) + 3

    def test_rows_that_fail_only_together_are_still_named_together(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Rows 3 and 9 pass alone and break the ledger together; row 20 fails alone.
        ledger = _ledger(tmp_path, ROWS)
        real = updating._validate_text

        def together(target: Path, snapshot: Any, new_text: str, **kwargs: Any) -> list[str]:
            if '* "Shop 3"' in new_text and '* "Shop 9"' in new_text:
                raise protocol.LedgerError("The pair never loads together; nothing was written.")
            return real(target, snapshot, new_text, **kwargs)

        monkeypatch.setattr(updating, "_validate_text", together)
        rows = [{"id": f"id-{i}", "flag": "*"} for i in range(ROWS)]
        rows[20] = {"id": "id-20", "account": "Expenses:Typo"}
        data = updating.answer(ledger, "transactions", {"rows": rows})
        statuses = [row["status"] for row in data["rows"]]
        assert statuses.count("ok") == 0
        assert data["rows"][20]["reason"] == "Row 21: The change would leave the ledger invalid."
        named = ", ".join(f"row {i + 1}" for i in range(ROWS) if i != 20)
        assert (
            data["rows"][0]["reason"]
            == f"Row 1: valid alone, but {named} fail together: The pair never loads together."
        )

    def test_rows_that_load_together_are_written_together_beside_a_rejected_row(self, tmp_path: Path) -> None:
        # Each of the first two rows breaks the assertion alone and keeps it
        # together. They write as they do in a batch without the mistyped
        # third row, rather than being tried, and rejected, one by one.
        ledger = tmp_path / "main.bean"
        ledger.write_text(
            OPENS
            + "2020-01-01 open Expenses:Misc USD\n"
            + '\n2021-01-02 ! "Moved out"\n  import-id: "a"\n  Expenses:Misc 5.00 USD\n  Assets:Checking\n'
            + '\n2021-01-03 ! "Moved in"\n  import-id: "b"\n  Expenses:Dining 5.00 USD\n  Assets:Checking\n'
            + '\n2021-01-04 ! "Typo"\n  import-id: "c"\n  Expenses:Dining 1.00 USD\n  Assets:Checking\n'
            + "\n2022-01-01 balance Expenses:Misc 5.00 USD\n"
        )
        pair = [
            {"id": "a", "account": "Expenses:Misc=Expenses:Dining"},
            {"id": "b", "account": "Expenses:Dining=Expenses:Misc"},
        ]
        for row in pair:
            alone = updating.answer(ledger, "transactions", {"rows": [row]})
            assert [answered["status"] for answered in alone["rows"]] == ["rejected"]
        assert [row["status"] for row in updating.answer(ledger, "transactions", {"rows": pair})["rows"]] == [
            "ok",
            "ok",
        ]
        rows = [*pair, {"id": "c", "account": "Expenses:Dining=Expenses:Typo"}]
        data = updating.answer(ledger, "transactions", {"rows": rows})
        assert [row["status"] for row in data["rows"]] == ["ok", "ok", "rejected"]

    def test_the_ledger_is_indexed_once_per_batch(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        ledger = _ledger(tmp_path, ROWS)
        shared = _count(monkeypatch, reader, "shared_locations")
        generated = _count(monkeypatch, reader, "entry_generated")
        data = updating.answer(ledger, "transactions", {"rows": _rows()})
        assert data["ready"] == ROWS
        assert shared.call_count == 1
        # Once per entry (four opens and the transactions), not once per entry per row.
        assert generated.call_count == ROWS + 4

    def test_the_file_is_diffed_whole_once_per_batch(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        ledger = _ledger(tmp_path, ROWS)
        whole = _count(monkeypatch, updating, "unified_file_diff")
        data = updating.answer(ledger, "transactions", {"rows": _rows()})
        assert all(row["diff"] for row in data["rows"])
        # The combined diff only: each row's diff reads the lines around it.
        assert whole.call_count == 1


def _single_row_diff(ledger: Path, row: dict[str, Any]) -> str:
    """The whole-file diff the one-row command answers, which never diffs a window."""
    diff = updating.answer(ledger, "transaction", row)["diff"]
    assert isinstance(diff, str)
    return diff


class TestRowDiffs:
    @pytest.mark.parametrize("bom", [False, True], ids=["plain", "bom"])
    @pytest.mark.parametrize("final_newline", [True, False], ids=["newline", "no-newline"])
    def test_each_rows_diff_is_the_whole_file_diff_of_that_row_alone(
        self, tmp_path: Path, bom: bool, final_newline: bool
    ) -> None:
        ledger = tmp_path / "main.bean"
        first = (
            '2021-01-01 ! "First line" "of the file"\n'
            '  import-id: "first"\n'
            "  Expenses:Uncategorized 1.00 USD\n"
            "  Assets:Checking\n"
        )
        multiline = (
            '\n2021-02-01 ! "Two" "line\nnarration"\n'
            '  import-id: "multi"\n'
            "  Expenses:Uncategorized 2.00 USD\n"
            "  Assets:Checking\n"
        )
        # No metadata: only lines every entry repeats sit between the two
        # lines the first row rewrites, and after the line the second does.
        bare = (
            '\n2021-03-01 ! "Bare"\n  Assets:Checking -5.00 USD\n  Expenses:Uncategorized 5.00 USD\n'
            '\n2021-03-02 ! "Bare two"\n  Assets:Checking -5.00 USD\n  Expenses:Uncategorized 5.00 USD\n'
        )
        last = (
            '\n2021-12-31 ! "Last"\n  import-id: "last"\n  Assets:Checking -3.00 USD\n  Expenses:Uncategorized 3.00 USD'
        )
        head = first + OPENS + _entries(80)
        text = head + bare + multiline + _entries(80).replace("id-", "late-") + last
        ledger.write_bytes(("\ufeff" if bom else "").encode() + (text + ("\n" if final_newline else "")).encode())
        rows: list[dict[str, Any]] = [
            {"id": "first", "flag": "*"},
            {"id": "id-0", "account": "Expenses:Groceries", "flag": "*"},
            {"id": "id-1", "tags": ["reviewed"]},
            {"id": f"{ledger}:{head.count(chr(10)) + 2}", "flag": "*", "account": "Expenses:Dining"},
            {"id": f"{ledger}:{head.count(chr(10)) + 6}", "flag": "*"},
            {"id": "multi", "narration": "one line"},
            {"id": "late-79", "account": "Expenses:Dining"},
            {"id": "last", "flag": "*", "account": "Expenses:Groceries"},
        ]
        data = updating.answer(ledger, "transactions", {"rows": rows})
        assert [row["status"] for row in data["rows"]] == ["ok"] * len(rows)
        for row, answered in zip(rows, data["rows"], strict=True):
            assert answered["diff"] == _single_row_diff(ledger, row), row

    def test_a_window_matches_the_whole_file_diff_on_realistic_edits(self) -> None:
        generator = random.Random(374)
        for _ in range(400):
            text, bom, lines, edits = _realistic_edit(generator)
            expected = unified_file_diff(text, _edited(lines, edits), "main.bean", bom=bom)
            assert FileDiffer(text, "main.bean", bom=bom).diff(edits) == expected, edits

    def test_a_repetitive_file_gets_a_diff_that_applies(self) -> None:
        # With no metadata and every posting repeated, `difflib` can pair
        # lines across a one-line edit and report hundreds of lines; the
        # window answers the edit's own lines, which still apply.
        generator = random.Random(1)
        for _ in range(300):
            text, bom, lines, edits = _realistic_edit(generator, repetitive=True)
            diff = FileDiffer(text, "main.bean", bom=bom).diff(edits)
            prefix = "\ufeff" if bom else ""
            assert _apply(prefix + text, diff) == prefix + _edited(lines, edits)


_HEADER = re.compile(r"^\d{4}-\d\d-\d\d [!*] ")
_HUNK = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@$")


def _realistic_edit(
    generator: random.Random, *, rows: int = 1, repetitive: bool = False
) -> tuple[str, bool, list[str], dict[int, str | None]]:
    """A ledger, whether a byte-order mark leads it, its lines, and some rows' edits as `plan_lines` writes them."""
    lines = [""] if generator.random() < 0.2 else []
    lines.extend(OPENS.rstrip("\n").split("\n"))
    for i in range(generator.choice([3, 40, 300])):
        legs = [f"  Expenses:{generator.choice(['Uncategorized', 'Dining'])} {i % 3 + 1}.00 USD", "  Assets:Checking"]
        generator.shuffle(legs)
        narration = f'"Shop {i % 4 if repetitive else i}"'
        multiline = generator.random() < 0.1
        lines.append("")
        lines.append(f"2021-01-{i % 28 + 1:02d} {generator.choice('!*')} {narration}" + (' "two' if multiline else ""))
        if multiline:
            lines.append('lines"')
        if not repetitive:
            lines.append(f'  import-id: "id-{i}"')
        lines.extend(legs)
    text = "\n".join(lines) + ("\n" if generator.random() < 0.7 else "")
    lines = text.split("\n")
    headers = [number for number, line in enumerate(lines) if _HEADER.match(line)]
    edits: dict[int, str | None] = {}
    for header in generator.sample(headers, min(rows, len(headers))):
        _edit_entry(generator, lines, header, edits)
    return text, generator.random() < 0.2, lines, edits


def _edit_entry(generator: random.Random, lines: list[str], header: int, edits: dict[int, str | None]) -> None:
    """One row's edits of the entry whose header is at `header`."""
    planned = len(edits)
    rewritten = lines[header]
    if generator.random() < 0.5:
        rewritten = rewritten.replace(" ! ", " * ") if " ! " in rewritten else rewritten.replace(" * ", " ! ")
    if generator.random() < 0.2:
        rewritten += " #reviewed"
    if rewritten.endswith('"two') and generator.random() < 0.5:
        rewritten = rewritten.removesuffix(' "two') + ' "one line"'
        edits[header + 1] = None
    if rewritten != lines[header]:
        edits[header] = rewritten
    end = header + 1
    while end < len(lines) and lines[end] and not _HEADER.match(lines[end]):
        end += 1
    if len(edits) == planned or generator.random() < 0.6:
        posting = next(number for number in range(header + 1, end) if lines[number].startswith("  Expenses:"))
        account = lines[posting].split()[0]
        edits[posting] = lines[posting].replace(account, "Expenses:Groceries")


def _edited(lines: list[str], edits: dict[int, str | None]) -> str:
    """The text the edits leave: each edited line replaced, each `None` removed."""
    return "\n".join(line for number, old in enumerate(lines) if (line := edits.get(number, old)) is not None)


def _apply(text: str, diff: str) -> str:
    """`text` with a unified diff applied, checking every context and removed line."""
    old = text.split("\n")
    old_lines = [f"{line}\n" for line in old[:-1]] + ([old[-1]] if old[-1] else [])
    out: list[str] = []
    at = 0
    body = diff.split("\n")[2:]
    number = 0
    while number < len(body) and body[number]:
        match = _HUNK.match(body[number])
        assert match is not None, body[number]
        start = int(match.group(1)) - 1
        out.extend(old_lines[at:start])
        at = start
        number += 1
        while number < len(body) and body[number] and not body[number].startswith("@@"):
            mark, line = body[number][0], body[number][1:] + "\n"
            if number + 1 < len(body) and body[number + 1] == "\\ No newline at end of file":
                line = line[:-1]
                number += 1
            if mark in " -":
                assert old_lines[at] == line, (at, old_lines[at], line)
                at += 1
            if mark in " +":
                out.append(line)
            number += 1
    out.extend(old_lines[at:])
    return "".join(out)
