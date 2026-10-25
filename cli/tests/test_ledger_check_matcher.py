"""The ledger-check problem matchers parse real `bea` output (w22/m5/t003).

`bea check` and `bea format --check` run against the committed
fixtures; every finding line must match its owner pattern with the
file, line, and message groups wired, while context and success
lines must match nothing. If either command's output format drifts
from the matcher, these fail.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

CLI_ROOT = Path(__file__).resolve().parents[1]
MATCHER = json.loads((CLI_ROOT / "action" / "problem-matcher.json").read_text())


def _patterns(owner: str) -> list[re.Pattern[str]]:
    (matcher,) = [m for m in MATCHER["problemMatcher"] if m["owner"] == owner]
    return [re.compile(pattern["regexp"]) for pattern in matcher["pattern"]]


def _run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["uv", "run", "--quiet", "--project", str(CLI_ROOT), "--no-sync", "python", "-m", "cli.main", *args],
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )


def _combined(proc: subprocess.CompletedProcess[str]) -> list[str]:
    return f"{proc.stdout}\n{proc.stderr}".splitlines()


def test_check_finding_matches_with_file_line_and_message() -> None:
    fixture = CLI_ROOT / "docs" / "examples" / "ledger-check-broken.bean"
    proc = _run("--no-input", "--file", str(fixture), "check")
    assert proc.returncode != 0
    (pattern,) = _patterns("bea-check")
    hits = [line for line in _combined(proc) if pattern.match(line)]
    assert len(hits) == 1, _combined(proc)
    found = pattern.match(hits[0])
    assert found is not None
    assert found.group(1) == str(fixture)
    assert found.group(2) == "7"
    assert "does not balance" in found.group(3)


def test_check_context_lines_match_nothing() -> None:
    fixture = CLI_ROOT / "docs" / "examples" / "ledger-check-broken.bean"
    proc = _run("--no-input", "--file", str(fixture), "check")
    (pattern,) = _patterns("bea-check")
    context = [line for line in _combined(proc) if "Lunch" in line or "Expenses:Food" in line]
    assert context, _combined(proc)
    assert [line for line in context if pattern.match(line)] == []


def test_format_finding_matches_with_file() -> None:
    fixture = CLI_ROOT / "docs" / "examples" / "ledger-check-broken.bean"
    proc = _run("--no-input", "format", str(fixture), "--check")
    assert proc.returncode != 0
    (pattern,) = _patterns("bea-format")
    hits = [line for line in _combined(proc) if pattern.match(line)]
    assert len(hits) == 1, _combined(proc)
    found = pattern.match(hits[0])
    assert found is not None
    assert found.group(2) == str(fixture)
    assert found.group(1) == f"would format: {fixture}"


def test_clean_fixture_matches_nothing() -> None:
    fixture = CLI_ROOT / "docs" / "examples" / "ledger-check-clean.bean"
    checked = _run("--no-input", "--file", str(fixture), "check")
    assert checked.returncode == 0, checked.stderr
    formatted = _run("--no-input", "format", str(fixture), "--check")
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
