"""`bea cloud ledger delete --dry-run` previews through the API's dryRun flag (w1/272).

The help used to say "Pass dryRun to preview" for a command with no such
option, so the only way to see what a delete removes was to delete.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.main import app

URL = "https://api.example/api-gateway/v1/ledgers/alice/books"
PREVIEW = {
    "ledgerId": "alice/books",
    "dryRun": True,
    "preview": {
        "ledgerId": "alice/books",
        "name": "books",
        "description": None,
        "private": True,
        "empty": False,
        "size": 2048,
        "warnings": ["Deleting a ledger is permanent.", "Linked bank connections are removed."],
    },
}


@pytest.fixture
def api(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BEA_API_URL", "https://api.example")


def test_help_names_the_dry_run_option() -> None:
    result = CliRunner().invoke(app, ["cloud", "ledger", "delete", "--help"])

    assert result.exit_code == 0
    assert "--dry-run" in result.stdout
    # Click may wrap at the option's hyphen ("--dry-\n  run"); compare unwrapped.
    unwrapped = " ".join(result.stdout.split()).replace("--dry- run", "--dry-run")
    assert "Pass --dry-run to preview" in unwrapped
    assert "dryRun" not in result.stdout


@pytest.mark.parametrize("as_json", [False, True])
def test_dry_run_sends_the_flag_without_prompting_and_renders_the_preview(
    logged_in: None, api: None, httpx_mock: HTTPXMock, as_json: bool
) -> None:
    httpx_mock.add_response(method="DELETE", url=URL, json=PREVIEW)

    # --no-input without --yes: a preview must not need confirmation.
    args = ["--no-input", *(["--json"] if as_json else []), "cloud", "ledger", "delete", "alice/books", "--dry-run"]
    result = CliRunner().invoke(app, args)

    assert result.exit_code == 0, result.stderr
    request = httpx_mock.get_request()
    assert request is not None
    assert json.loads(request.content) == {"dryRun": True}
    assert "--yes" not in result.stderr
    if as_json:
        data = json.loads(result.stdout)["data"]
        assert data["dry_run"] is True
        assert data["preview"]["ledger_id"] == "alice/books"
        assert data["preview"]["warnings"] == PREVIEW["preview"]["warnings"]  # type: ignore[index]
    else:
        assert "name: books\n" in result.stdout
        assert "private: yes\n" in result.stdout
        assert "size: 2048\n" in result.stdout
        assert "warning: Deleting a ledger is permanent.\n" in result.stdout
        assert "was not deleted" in result.stdout
        assert "' deleted." not in result.stdout


def test_plain_delete_still_confirms_and_sends_no_dry_run(logged_in: None, api: None, httpx_mock: HTTPXMock) -> None:
    refused = CliRunner().invoke(app, ["--no-input", "cloud", "ledger", "delete", "alice/books"])
    assert refused.exit_code == 2
    assert "--yes" in refused.stderr
    assert httpx_mock.get_requests() == []

    httpx_mock.add_response(method="DELETE", url=URL, json={"ledgerId": "alice/books"})
    result = CliRunner().invoke(app, ["--yes", "cloud", "ledger", "delete", "alice/books"])

    assert result.exit_code == 0, result.stderr
    request = httpx_mock.get_request()
    assert request is not None
    assert b"dryRun" not in request.content
    assert "Ledger 'alice/books' deleted." in result.stdout


def test_a_description_naming_an_unexposed_body_field_fails_generation(tmp_path: Path) -> None:
    import subprocess
    import sys

    cli_dir = Path(__file__).parent.parent
    spec = json.loads((cli_dir / "openapi" / "v1.json").read_text())
    op = spec["paths"]["/api-gateway/v1/ledgers/{owner}/{name}"]["delete"]
    op["description"] += " Or pass dry_run."
    scratch = tmp_path / "scratch.json"
    scratch.write_text(json.dumps(spec))

    result = subprocess.run(
        [
            sys.executable,
            str(cli_dir / "scripts" / "gen_cloud_commands.py"),
            "--spec",
            str(scratch),
            "--out",
            str(tmp_path / "out"),
        ],
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "dry_run" in result.stderr
