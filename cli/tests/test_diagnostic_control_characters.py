"""Ledger-controlled paths in diagnostics cannot drive the terminal (w1/134).

A document name or include path is quoted verbatim by loader errors, warning
banners, `list transaction --details` source lines and `format` progress. Text
output must show its control characters as visible `\\x1b`, as tables already
do (w3/392); JSON keeps the exact value.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from tests.test_control_character_sanitization import _assert_inert, _child_env, _on_a_terminal

EVIL = "\x1b]52;c;SElKQUNL\x07\x1b]0;PWNED\x07"
RAW = (b"\x1b", b"\x07")


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        "2024-01-01 open Assets:Cash USD\n"
        "2024-01-01 open Expenses:Food USD\n"
        f'2024-03-05 document Assets:Cash "r{EVIL}.pdf"\n'
        f'include "inc{EVIL}.bean"\n',
        encoding="utf-8",
    )
    (tmp_path / f"inc{EVIL}.bean").write_text(
        '2024-03-06 * "x"\n   Expenses:Food 1 USD\n   Assets:Cash\n', encoding="utf-8"
    )
    return ledger


def _assert_no_raw(emitted: bytes) -> None:
    _assert_inert(emitted)
    for byte in RAW:
        assert byte not in emitted, f"raw {byte!r} reached the terminal"
    assert b"\\x1b]52" in emitted, "the escape should stay visible"


def test_loader_warnings_and_failures_are_inert(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_bytes()

    listed = _on_a_terminal(tmp_path, ["--file", str(ledger), "list", "open"])
    added = _on_a_terminal(
        tmp_path, ["--file", str(ledger), "add", "note", "--date", "2024-04-01", "--account", "Assets:Cash", "-m", "hi"]
    )

    assert b"File does not exist" in listed
    assert b"would leave the ledger invalid" in added
    _assert_no_raw(listed)
    _assert_no_raw(added)
    assert ledger.read_bytes() == before


def test_details_source_lines_and_format_progress_are_inert(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    details = _on_a_terminal(tmp_path, ["--file", str(ledger), "list", "transaction", "--details"])
    checked = _on_a_terminal(tmp_path, ["format", "--check", str(ledger)])

    assert b"inc\\x1b]52" in details
    assert b"would format:" in checked
    _assert_no_raw(details)
    _assert_no_raw(checked)


def test_json_keeps_the_exact_value(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    done = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--json",
            "--file",
            str(ledger),
            "add",
            "note",
            "--date",
            "2024-04-01",
            "--account",
            "Assets:Cash",
            "-m",
            "hi",
        ],
        env=_child_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert done.returncode == 1
    details = json.loads(done.stderr)["error"]["details"]
    assert any(f"r{EVIL}.pdf" in detail for detail in details)
