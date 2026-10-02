"""Formatting preserves string contents and agrees across previews and destinations."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
HEADER = 'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n\n'
POSTINGS = "  Assets:Cash      1 USD\n  Equity:Opening  -1 USD\n"
STRING_BODY = 'Address: \\"quoted\\"\n    221B Baker Street\n\tApartment 2\n    Assets:Fake 12 USD'
STRING_VALUE = 'Address: "quoted"\n    221B Baker Street\n\tApartment 2\n    Assets:Fake 12 USD'
MULTILINE_LEDGERS = {
    "note": HEADER + f'2026-01-02 note Assets:Cash "{STRING_BODY}"\n',
    "narration": HEADER + f'2026-01-02 * "{STRING_BODY}"\n' + POSTINGS,
    "transaction-metadata": HEADER + f'2026-01-02 * "Purchase"\n  address: "{STRING_BODY}"\n' + POSTINGS,
    "posting-metadata": (
        HEADER
        + '2026-01-02 * "Purchase"\n'
        + "  Assets:Cash      1 USD\n"
        + f'    address: "{STRING_BODY}"\n'
        + "  Equity:Opening  -1 USD\n"
    ),
}


def _bea(work: Path, *args: str, stdin: bytes | None = None) -> subprocess.CompletedProcess[bytes]:
    env = {key: value for key, value in os.environ.items() if not key.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(work / "config"),
        XDG_CACHE_HOME=str(work / "cache"),
        XDG_DATA_HOME=str(work / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=work,
        capture_output=True,
        input=stdin,
        timeout=30,
    )


@pytest.mark.parametrize("kind", MULTILINE_LEDGERS)
@pytest.mark.parametrize("destination", ["stdout", "output", "in-place"])
def test_multiline_strings_survive_every_destination(tmp_path: Path, kind: str, destination: str) -> None:
    ledger = tmp_path / "main.bean"
    original = MULTILINE_LEDGERS[kind].encode()
    ledger.write_bytes(original)
    exported = tmp_path / "formatted.bean"
    flags = {"stdout": [], "output": ["-o", str(exported)], "in-place": ["-i"]}[destination]

    result = _bea(tmp_path, "format", str(ledger), *flags)

    assert result.returncode == 0, result.stderr
    actual = (
        result.stdout if destination == "stdout" else (exported if destination == "output" else ledger).read_bytes()
    )
    assert actual == original
    assert ledger.read_bytes() == original
    if kind == "note" and destination == "in-place":
        listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "note")
        assert listed.returncode == 0, listed.stderr
        assert json.loads(listed.stdout)["data"][0]["comment"] == STRING_VALUE


@pytest.mark.parametrize("kind", MULTILINE_LEDGERS)
def test_already_formatted_multiline_text_is_unchanged_in_previews(tmp_path: Path, kind: str) -> None:
    ledger = tmp_path / "main.bean"
    original = MULTILINE_LEDGERS[kind].encode()
    ledger.write_bytes(original)

    for flag in ("--check", "--dry-run"):
        result = _bea(tmp_path, "--json", "format", flag, str(ledger))
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["data"]["formatted"] == []
        assert ledger.read_bytes() == original


@pytest.mark.parametrize("destination", ["stdout", "output", "in-place"])
def test_posting_metadata_retains_its_four_space_indent(tmp_path: Path, destination: str) -> None:
    ledger = tmp_path / "main.bean"
    original = (
        HEADER
        + '2026-01-02 * "Purchase"\n'
        + "  Assets:Cash      1 USD\n"
        + '    receipt: "receipt.pdf"\n'
        + "  Equity:Opening  -1 USD\n"
    ).encode()
    ledger.write_bytes(original)
    exported = tmp_path / "formatted.bean"
    flags = {"stdout": [], "output": ["-o", str(exported)], "in-place": ["-i"]}[destination]

    result = _bea(tmp_path, "format", str(ledger), *flags)

    assert result.returncode == 0, result.stderr
    actual = (
        result.stdout if destination == "stdout" else (exported if destination == "output" else ledger).read_bytes()
    )
    assert actual == original


@pytest.mark.parametrize("indent", ["\t", " "], ids=["tab", "single-space"])
def test_previews_report_posting_indent_changes(tmp_path: Path, indent: str) -> None:
    ledger = tmp_path / "main.bean"
    original = (
        HEADER
        + '2026-01-02 * "Purchase"\n'
        + POSTINGS.replace("  Assets", indent + "Assets").replace("  Equity", indent + "Equity")
    ).encode()
    ledger.write_bytes(original)

    checked = _bea(tmp_path, "--json", "format", "--check", str(ledger))
    preview = _bea(tmp_path, "--json", "format", "--dry-run", str(ledger))

    assert checked.returncode == 1, checked.stdout or checked.stderr
    assert json.loads(checked.stderr)["error"]["result"]["formatted"] == [str(ledger)]
    assert preview.returncode == 0, preview.stderr
    assert json.loads(preview.stdout)["data"]["formatted"] == [str(ledger)]
    assert ledger.read_bytes() == original


@pytest.mark.parametrize("indent", ["\t", " "], ids=["tab", "single-space"])
def test_posting_indent_destinations_agree_and_reformatting_is_a_noop(tmp_path: Path, indent: str) -> None:
    ledger = tmp_path / "main.bean"
    expected = (HEADER + '2026-01-02 * "Purchase"\n' + POSTINGS).encode()
    original = expected.replace(b"  Assets", (indent + "Assets").encode()).replace(
        b"  Equity", (indent + "Equity").encode()
    )
    ledger.write_bytes(original)
    exported = tmp_path / "formatted.bean"

    streamed = _bea(tmp_path, "format", str(ledger))
    written = _bea(tmp_path, "format", str(ledger), "-o", str(exported))
    assert ledger.read_bytes() == original
    applied = _bea(tmp_path, "format", str(ledger), "-i")

    for result in (streamed, written, applied):
        assert result.returncode == 0, result.stderr
    assert (streamed.stdout, exported.read_bytes(), ledger.read_bytes()) == (expected, expected, expected)
    for flag in ("--check", "--dry-run", "-i"):
        result = _bea(tmp_path, "--json", "format", flag, str(ledger))
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["data"]["formatted"] == []
        assert ledger.read_bytes() == expected


def test_stdin_preserves_multiline_strings_and_normalizes_postings(tmp_path: Path) -> None:
    expected = MULTILINE_LEDGERS["narration"].encode()
    original = expected.replace(b"  Assets:Cash", b"\tAssets:Cash").replace(b"  Equity:Opening", b" Equity:Opening")
    result = _bea(tmp_path, "format", stdin=original)
    assert result.returncode == 0, result.stderr
    assert result.stdout == expected


def test_stdout_preserves_ansi_bytes_inside_a_string(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    original = (HEADER + '2026-01-02 note Assets:Cash "red \x1b[31mcontent\x1b[0m"\n').encode()
    ledger.write_bytes(original)
    result = _bea(tmp_path, "format", str(ledger))
    assert result.returncode == 0, result.stderr
    assert result.stdout == original


def test_final_multiline_string_keeps_the_formatters_terminal_newline(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    expected = MULTILINE_LEDGERS["note"].encode()
    ledger.write_bytes(expected.rstrip(b"\n"))
    checked = _bea(tmp_path, "format", "--check", str(ledger))
    assert checked.returncode == 1
    result = _bea(tmp_path, "format", "-i", str(ledger))
    assert result.returncode == 0, result.stderr
    assert ledger.read_bytes() == expected


@pytest.mark.parametrize("flag", ["!", "*", "#", "P"])
def test_flagged_postings_normalize_without_changing_account_metadata(tmp_path: Path, flag: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        HEADER + f'2026-01-02 * "Purchase"\n\t{flag} Assets:Cash 1 USD\n'
        "    counterparty: Assets:Other\n Equity:Opening\n"
    )
    result = _bea(tmp_path, "format", "-i", str(ledger))
    assert result.returncode == 0, result.stderr
    assert f"\n  {flag} Assets:Cash" in ledger.read_text()
    assert "\n    counterparty: Assets:Other\n  Equity:Opening\n" in ledger.read_text()
