"""The spec-driven generation chain: committed output, annotation gate, drift check.

`bea cloud`'s mechanical commands are generated from `openapi/v1.json`; these
tests pin the properties that make that chain trustworthy — the committed
output matches what the generator produces today, an under-annotated operation
cannot become a command, and a stale pin cannot pass the gate.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

CLI_DIR = Path(__file__).parent.parent
GENERATOR = CLI_DIR / "scripts" / "gen_cloud_commands.py"
SPEC = CLI_DIR / "openapi" / "v1.json"
COMMITTED = CLI_DIR / "src" / "cli" / "commands" / "cloud" / "generated"

runner = CliRunner()


def generate(spec: Path, out: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(GENERATOR), "--spec", str(spec), "--out", str(out)],
        capture_output=True,
        text=True,
    )


def test_the_committed_output_matches_the_generator(tmp_path: Path) -> None:
    """A hand-edit to a generated file, or a forgotten `make codegen`, fails here."""
    result = generate(SPEC, tmp_path)

    assert result.returncode == 0, result.stderr
    # `make codegen` also runs ruff format over the output; normalize the same
    # way before comparing, so this asserts content rather than formatting.
    subprocess.run(
        [sys.executable, "-m", "ruff", "format", "--quiet", str(tmp_path)],
        check=True,
        capture_output=True,
    )
    for committed_file in COMMITTED.glob("*.py"):
        assert (tmp_path / committed_file.name).read_text() == committed_file.read_text(), (
            f"{committed_file.name} is stale — run 'make codegen' and commit the diff"
        )


def test_an_unannotated_operation_cannot_become_a_command(tmp_path: Path) -> None:
    spec = json.loads(SPEC.read_text())
    del spec["paths"]["/api-gateway/v1/ledgers/{owner}/{name}"]["delete"]["description"]
    scratch = tmp_path / "scratch.json"
    scratch.write_text(json.dumps(spec))

    result = generate(scratch, tmp_path / "out")

    assert result.returncode != 0
    assert "deleteLedger" in result.stderr
    assert "description" in result.stderr


def test_generated_help_carries_the_spec_annotations() -> None:
    result = runner.invoke(app, ["cloud", "ledger", "show", "--help"])

    assert result.exit_code == 0
    assert "Get one ledger" in result.stdout
    # The parameter help comes through the curated owner/name collapse.
    assert "username/my-ledger" in result.stdout


def test_a_drifted_pin_fails_spec_check(tmp_path: Path) -> None:
    drifted = tmp_path / "canonical.json"
    drifted.write_text("{}")

    result = subprocess.run(
        ["make", "spec-check", f"CANONICAL_SPEC={drifted}"],
        cwd=CLI_DIR,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "spec-sync" in result.stdout + result.stderr
