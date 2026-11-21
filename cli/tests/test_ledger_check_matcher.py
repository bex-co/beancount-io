"""The ledger-check problem matchers parse real `bea` output (w22/m5/t003).

`bea check` and `bea format --check` run against the committed
fixtures and a written ledger that takes `bea check` through both of
its output shapes: bean-check's own, and the two-space-indented list
`bea check` prints for errors it reports itself (w1/348). Every
finding line must match its owner pattern with the file, line, and
message groups wired, while context and success lines must match
nothing. If either command's output format drifts from the matcher,
these fail.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import pytest

from tests.report_helpers import CLI_ROOT, bea

MATCHER = json.loads((CLI_ROOT / "action" / "problem-matcher.json").read_text())


def _patterns(owner: str) -> list[re.Pattern[str]]:
    (matcher,) = [m for m in MATCHER["problemMatcher"] if m["owner"] == owner]
    return [re.compile(pattern["regexp"]) for pattern in matcher["pattern"]]


def _run(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return bea(list(args), tmp_path)


def _combined(proc: subprocess.CompletedProcess[str]) -> list[str]:
    return f"{proc.stdout}\n{proc.stderr}".splitlines()


def test_check_finding_matches_with_file_line_and_message(tmp_path: Path) -> None:
    fixture = CLI_ROOT / "docs" / "examples" / "ledger-check-broken.bean"
    proc = _run(tmp_path, "--no-input", "--file", str(fixture), "check")
    assert proc.returncode != 0
    (pattern,) = _patterns("bea-check")
    hits = [line for line in _combined(proc) if pattern.match(line)]
    assert len(hits) == 1, _combined(proc)
    found = pattern.match(hits[0])
    assert found is not None
    assert found.group(1) == str(fixture)
    assert found.group(2) == "7"
    assert "does not balance" in found.group(3)


def test_check_context_lines_match_nothing(tmp_path: Path) -> None:
    fixture = CLI_ROOT / "docs" / "examples" / "ledger-check-broken.bean"
    proc = _run(tmp_path, "--no-input", "--file", str(fixture), "check")
    (pattern,) = _patterns("bea-check")
    context = [line for line in _combined(proc) if "Lunch" in line or "Expenses:Food" in line]
    assert context, _combined(proc)
    assert [line for line in context if pattern.match(line)] == []


# An include left out of the commit, and a narration holding `<digits>: `.
_STANDUP = """\
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
include "2026/march.bean"

2026-01-02 * "Standup 9:30: coffee"
  Assets:Cash  -10 USD
  Expenses:Food  9 USD
"""


def _check_locations(tmp_path: Path) -> tuple[list[str], list[tuple[str, str, str]]]:
    """Run the action's own command from the ledger's directory; every match as (file, line, message)."""
    proc = _run(tmp_path, "--no-input", "--file", "main.bean", "check")
    assert proc.returncode == 1, _combined(proc)
    (pattern,) = _patterns("bea-check")
    found = [pattern.match(line) for line in _combined(proc)]
    return _combined(proc), [(m.group(1), m.group(2), m.group(3)) for m in found if m]


def test_check_own_error_list_lands_on_each_file_and_line(tmp_path: Path) -> None:
    """`bea check` lists a missing include itself, each error two spaces in: the indent is not the file (w1/348)."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(_STANDUP)
    lines, hits = _check_locations(tmp_path)
    assert any(line.startswith(f"  {ledger}:3: ") for line in lines), lines
    assert [(file, line) for file, line, _ in hits] == [(str(ledger), "3"), (str(ledger), "5")], lines
    assert "matches no file" in hits[0][2]
    assert "does not balance" in hits[1][2]


def test_check_context_line_holding_a_time_matches_nothing(tmp_path: Path) -> None:
    """bean-check's context block quotes the narration; `9:30: ` in it is no location (w1/348)."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(_STANDUP)
    (tmp_path / "2026").mkdir()
    (tmp_path / "2026" / "march.bean").write_text("")
    lines, hits = _check_locations(tmp_path)
    assert any("9:30: coffee" in line for line in lines), lines
    assert [(file, line) for file, line, _ in hits] == [(str(ledger), "5")], lines


@pytest.mark.parametrize(
    ("line", "file", "lineno"),
    [
        # A Windows runner's path holds a drive colon before the location.
        (r"  D:\a\books\main.bean:3: include matches no file", r"D:\a\books\main.bean", "3"),
        # The first location on the line wins over `<digits>: ` in the message.
        ('/books/main.bean:5: Payee "Standup 9:30: coffee" is unknown', "/books/main.bean", "5"),
    ],
)
def test_check_pattern_takes_the_first_location(line: str, file: str, lineno: str) -> None:
    (pattern,) = _patterns("bea-check")
    found = pattern.match(line)
    assert found is not None
    assert (found.group(1), found.group(2)) == (file, lineno)


def test_format_finding_matches_with_file(tmp_path: Path) -> None:
    fixture = CLI_ROOT / "docs" / "examples" / "ledger-check-broken.bean"
    proc = _run(tmp_path, "--no-input", "format", str(fixture), "--check")
    assert proc.returncode != 0
    (pattern,) = _patterns("bea-format")
    hits = [line for line in _combined(proc) if pattern.match(line)]
    assert len(hits) == 1, _combined(proc)
    found = pattern.match(hits[0])
    assert found is not None
    assert found.group(2) == str(fixture)
    assert found.group(1) == f"would format: {fixture}"


def test_clean_fixture_matches_nothing(tmp_path: Path) -> None:
    fixture = CLI_ROOT / "docs" / "examples" / "ledger-check-clean.bean"
    checked = _run(tmp_path, "--no-input", "--file", str(fixture), "check")
    assert checked.returncode == 0, checked.stderr
    formatted = _run(tmp_path, "--no-input", "format", str(fixture), "--check")
    assert formatted.returncode == 0, formatted.stderr
    patterns = _patterns("bea-check") + _patterns("bea-format")
    lines = _combined(checked) + _combined(formatted)
    assert lines, "expected some success output to guard"
    assert [line for line in lines if any(pattern.match(line) for pattern in patterns)] == []


def test_matcher_wires_file_line_and_message_groups() -> None:
    (check,) = [m for m in MATCHER["problemMatcher"] if m["owner"] == "bea-check"]
    assert check["severity"] == "error"
    assert check["pattern"][0]["file"] == 1
    assert check["pattern"][0]["line"] == 2
    assert check["pattern"][0]["message"] == 3
    (fmt,) = [m for m in MATCHER["problemMatcher"] if m["owner"] == "bea-format"]
    assert fmt["severity"] == "error"
    assert fmt["pattern"][0]["file"] == 2
    assert fmt["pattern"][0]["message"] == 1
