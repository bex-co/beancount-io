"""A stopped in-place formatter accounts for every file without touching later ones."""

from __future__ import annotations

import codecs
import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.engine import launch
from cli.errors import ConflictError
from cli.main import app

runner = CliRunner()
ALIGNED = b"2026-01-01 open Assets:Cash USD\n"
MISALIGNED = b'2026-01-02 * "Coffee"\n   Expenses:Food 1.00 USD\n   Assets:Cash -1.00 USD\n'
INVALID = b"not beancount\n"


@pytest.mark.parametrize("as_json", [False, True], ids=["human", "json"])
@pytest.mark.parametrize("with_syntax_error", [False, True], ids=["write-failure", "syntax-and-write-failures"])
def test_partial_failure_reports_every_outcome_and_preserves_unattempted_bytes(
    tmp_path: Path, as_json: bool, with_syntax_error: bool
) -> None:
    tree = tmp_path / "tree"
    tree.mkdir()
    aligned = tree / "00-aligned.bean"
    first = tree / "10-first.bean"
    invalid = tree / "15-invalid.bean"
    read_only = tree / "20-read-only.bean"
    later = tree / "30-later.bean"
    before = {
        aligned: ALIGNED,
        first: MISALIGNED,
        read_only: MISALIGNED,
        later: codecs.BOM_UTF8 + MISALIGNED,
    }
    if with_syntax_error:
        before[invalid] = INVALID
    for path, content in before.items():
        path.write_bytes(content)
    read_only.chmod(0o444)
    try:
        result = runner.invoke(app, [*(["--json"] if as_json else []), "format", "-i", str(tree)])
    finally:
        read_only.chmod(0o644)

    assert result.exit_code == 3, result.output
    # The run rewrote a file before stopping: its headline must say so (w1/144).
    assert "nothing was written" not in result.stderr
    headline = json.loads(result.stderr)["error"]["message"] if as_json else result.stderr.splitlines()[0]
    assert "1 file(s) formatted" in headline
    assert "1 file(s) not attempted" in headline
    assert first.read_bytes() != before[first]
    for path in before.keys() - {first}:
        assert path.read_bytes() == before[path]
    assert later.read_bytes().startswith(codecs.BOM_UTF8)
    checked = runner.invoke(app, ["format", "--check", str(aligned), str(first)])
    assert checked.exit_code == 0, checked.output
    pending = runner.invoke(app, ["--json", "format", "--check", str(later)])
    assert pending.exit_code == 1, pending.output
    assert json.loads(pending.stderr)["error"]["result"]["formatted"] == [str(later)]
    assert later.read_bytes() == before[later]

    if as_json:
        error = json.loads(result.stderr)["error"]
        outcomes = error["result"]
        assert outcomes["formatted"] == [str(first)]
        failed = {entry["file"]: entry["errors"] for entry in outcomes["failed"]}
        assert set(failed) == {str(read_only), *([str(invalid)] if with_syntax_error else [])}
        assert any("read-only" in reason for reason in failed[str(read_only)])
        if with_syntax_error:
            assert any("Invalid token" in reason for reason in failed[str(invalid)])
        assert outcomes["not_attempted"] == [str(later)]
        assert outcomes["unchanged"] == [str(aligned)]
        represented = [*outcomes["formatted"], *outcomes["unchanged"], *outcomes["not_attempted"], *failed]
        assert len(represented) == outcomes["scanned"] == len(before)
        assert set(represented) == {str(path) for path in before}
    else:
        assert f"formatted: {first}" in result.stderr
        assert f"failed: {read_only}" in result.stderr
        assert "read-only" in result.stderr
        assert f"not attempted: {later}" in result.stderr
        assert f"unchanged: {aligned}" in result.stderr
        assert f"formatted: {later}" not in result.stderr
        if with_syntax_error:
            assert "cannot parse:" in result.stderr
            assert str(invalid) in result.stderr


def test_a_successful_bom_rewrite_is_fully_formatted_and_idempotent(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    original = codecs.BOM_UTF8 + MISALIGNED.replace(b"\n", b"\r\n")
    file.write_bytes(original)

    applied = runner.invoke(app, ["--json", "format", "-i", str(file)])

    assert applied.exit_code == 0, applied.output
    assert json.loads(applied.stdout)["data"]["formatted"] == [str(file)]
    formatted = file.read_bytes()
    assert formatted != original
    assert not formatted.startswith(codecs.BOM_UTF8)
    assert b"\r\n" not in formatted
    checked = runner.invoke(app, ["format", "--check", str(file)])
    assert checked.exit_code == 0, checked.output
    again = runner.invoke(app, ["--json", "format", "-i", str(file)])
    assert again.exit_code == 0, again.output
    assert json.loads(again.stdout)["data"]["formatted"] == []
    assert file.read_bytes() == formatted


def test_an_unknown_helper_outcome_does_not_invent_empty_progress(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    file = tmp_path / "main.bean"
    file.write_bytes(MISALIGNED)
    real = launch.helper_json

    def lose_response(args: Sequence[str], *, stdin: str | None = None, writes: bool = False) -> dict[str, Any]:
        if args[0] == "format":
            raise ConflictError("The engine response was lost; the write outcome is unknown.")
        return real(args, stdin=stdin, writes=writes)

    monkeypatch.setattr(launch, "helper_json", lose_response)
    result = runner.invoke(app, ["--json", "format", "-i", str(file)])

    assert result.exit_code == 4, result.output
    error = json.loads(result.stderr)["error"]
    assert "outcome is unknown" in error["message"]
    assert "result" not in error, "no response cannot establish an empty formatted list"
