"""Appends match the file's line endings and repair a missing final newline."""

from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
OPENS = "2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n"
ADD = ["add", "transaction", "--date", "2026-03-01", "--narration", "Tea"]


def _add(file: Path, *postings: str):
    args = ["--file", str(file), *ADD]
    for posting in postings:
        args += ["-p", posting]
    return runner.invoke(app, args)


def test_crlf_append_stays_crlf(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_bytes(OPENS.replace("\n", "\r\n").encode("utf-8"))

    result = _add(file, "Expenses:Food 2 USD", "Assets:Cash")

    assert result.exit_code == 0, result.output
    raw = file.read_bytes()
    assert raw.count(b"\r\n") == raw.count(b"\n") > 0
    assert runner.invoke(app, ["--file", str(file), "check"]).exit_code == 0


def test_missing_final_newline_is_repaired(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(OPENS.rstrip("\n"))
    assert not file.read_bytes().endswith(b"\n")

    result = _add(file, "Expenses:Food 2 USD", "Assets:Cash")

    assert result.exit_code == 0, result.output
    assert b"USD2026" not in file.read_bytes()
    assert runner.invoke(app, ["--file", str(file), "check"]).exit_code == 0


def test_failed_append_leaves_a_newlineless_file_untouched(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(OPENS.rstrip("\n"))
    before = file.read_bytes()

    result = _add(file, "Nope:Unknown 2 USD", "Assets:Cash")

    assert result.exit_code != 0, result.output
    assert file.read_bytes() == before


def test_lf_ledger_bytes_stay_verbatim(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(OPENS)
    before = file.read_bytes()

    result = _add(file, "Expenses:Food 2 USD", "Assets:Cash")

    assert result.exit_code == 0, result.output
    after = file.read_bytes()
    assert after.startswith(before)
    assert b"\r" not in after


def test_mixed_append_follows_the_dominant_ending(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_bytes(b"2020-01-01 open Assets:Cash USD\r\n2020-01-01 open Expenses:Food USD\r\n; note\n")
    before = file.read_bytes()

    result = _add(file, "Expenses:Food 2 USD", "Assets:Cash")

    assert result.exit_code == 0, result.output
    after = file.read_bytes()
    assert after.startswith(before)
    assert after[len(before) :].count(b"\r\n") == after[len(before) :].count(b"\n")


def test_format_in_place_converges_endings_and_reports(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_bytes(b"2020-01-01 open Assets:Cash USD\r\n2020-01-01 open Expenses:Food USD\n")

    check = runner.invoke(app, ["format", str(file), "--check"])
    assert check.exit_code == 1, check.output

    first = runner.invoke(app, ["format", str(file), "-i"])

    assert first.exit_code == 0, first.output
    assert b"\r" not in file.read_bytes()
    assert "1/1" in first.stdout

    again = runner.invoke(app, ["format", str(file), "-i"])
    assert again.exit_code == 0, again.output
    assert "0/1" in again.stdout
    assert runner.invoke(app, ["format", str(file), "--check"]).exit_code == 0
