"""A query writes to the target approved before launch, even if its output link moves."""

from __future__ import annotations

import csv
import io
import json
import os
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.engine import launch
from cli.main import app


@pytest.mark.skipif(os.name != "posix", reason="POSIX symlinks")
@pytest.mark.parametrize("export_format", ["text", "csv", "json"])
def test_retargeting_the_output_link_after_preflight_cannot_redirect_the_export(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, export_format: str
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text('option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n')
    original_ledger = ledger.read_bytes()
    reports = tmp_path / "reports"
    reports.mkdir()
    safe_target = reports / f"safe.{export_format}"
    safe_target.write_text("previous export\n")
    output_link = tmp_path / f"report.{export_format}"
    output_link.symlink_to(Path("reports") / safe_target.name)
    real_helper = launch.helper_json

    def retarget_then_launch(args: Sequence[str], *, stdin: str | None = None, writes: bool = False) -> dict[str, Any]:
        output_link.unlink()
        output_link.symlink_to(ledger.name)
        return real_helper(args, stdin=stdin, writes=writes)

    monkeypatch.setattr(launch, "helper_json", retarget_then_launch)
    args = ["--no-input", "--file", str(ledger)]
    if export_format == "json":
        args.append("--json")
    args.extend(["query", "SELECT account FROM #accounts", "--output", str(output_link)])
    if export_format != "json":
        args.extend(["--format", export_format])

    result = CliRunner().invoke(app, args)

    assert result.exit_code == 0, result.output
    assert result.stdout == ""
    assert ledger.read_bytes() == original_ledger
    assert output_link.is_symlink()
    assert output_link.readlink() == Path(ledger.name)
    text = safe_target.read_text()
    if export_format == "json":
        assert json.loads(text)["data"]["rows"] == [["Assets:Cash"]]
    elif export_format == "csv":
        assert list(csv.reader(io.StringIO(text))) == [["account"], ["Assets:Cash"]]
    else:
        assert "Assets:Cash" in text
        assert "previous export" not in text
