"""The command tree: local verbs at the top level, hosted commands under `bea cloud`.

The tree is the product's local-first promise, so these tests pin its shape:
where commands resolve, that the pre-cloud spellings stay dead, and that
`--help` renders the local/cloud grouping the plain formatter builds.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.main import _CLOUD_PANEL, _LOCAL_PANEL, app

runner = CliRunner()


def invoke(*args: str) -> Any:
    return runner.invoke(app, list(args))


class TestCloudResolution:
    @pytest.mark.parametrize("command", [["login"], ["logout"], ["status"]])
    def test_account_commands_sit_directly_under_cloud(self, command: list[str]) -> None:
        assert invoke("cloud", *command, "--help").exit_code == 0

    @pytest.mark.parametrize("command", ["list", "create", "delete", "clone"])
    def test_ledger_commands_live_under_cloud_ledger(self, command: str) -> None:
        assert invoke("cloud", "ledger", command, "--help").exit_code == 0

    @pytest.mark.parametrize("old_path", [["auth", "login"], ["auth", "status"], ["ledger", "list"]])
    def test_the_pre_cloud_spellings_stay_dead(self, old_path: list[str]) -> None:
        # The CLI shipped with `cloud` from day one; a resurrected `bea auth`
        # would mean two spellings for the same thing forever. Only the exit
        # being nonzero is asserted: the unknown-command exit *category* is a
        # pre-existing gap tracked on the board, not this tree's contract.
        result = invoke(*old_path)

        assert result.exit_code != 0
        assert "No such command" in result.stderr


class TestHelpPanels:
    def test_every_command_renders_in_its_panel(self) -> None:
        result = invoke("--help")

        assert result.exit_code == 0
        local_at = result.stdout.index(_LOCAL_PANEL)
        cloud_at = result.stdout.index(_CLOUD_PANEL)
        local_section = result.stdout[local_at:cloud_at]
        cloud_section = result.stdout[cloud_at:]
        for name in ("check", "balance", "format", "query", "ask", "add", "list", "report"):
            assert f"\n  {name} " in local_section, f"{name!r} missing from the local panel"
        assert "\n  cloud " in cloud_section

    def test_help_first_lines_fit_without_truncation(self) -> None:
        blurbs = (
            "Balances for matching accounts.",
            "Create main.bean with common accounts.",
            "Preview bank-export entries; write with --apply.",
            "Run BQL queries against a local ledger.",
            "Ask about a local ledger via hosted AI.",
            "Hosted ledgers and AI proxy; see 'cloud login'.",
        )
        assert all(len(blurb) < 60 for blurb in blurbs)
        result = invoke("--help")

        assert result.exit_code == 0
        for blurb in blurbs:
            assert blurb in result.stdout, blurb

    def test_no_command_falls_into_an_unlabelled_panel(self) -> None:
        result = invoke("--help")

        assert "\nCommands:" not in result.stdout

    def test_cloud_help_names_the_login_prerequisite(self) -> None:
        result = invoke("cloud", "--help")

        assert result.exit_code == 0
        assert "cloud login" in result.stdout


class TestCloudWithoutCredentials:
    def test_status_fails_fast_and_points_at_login(self) -> None:
        result = invoke("cloud", "status")

        assert result.exit_code == 3
        assert "bea cloud login" in result.stderr


class TestGeneratedReference:
    """`docs/REFERENCE.md` is generated from this tree, so it cannot drift."""

    @staticmethod
    def generator() -> Any:
        import importlib.util

        path = Path(__file__).resolve().parents[1] / "scripts" / "gen_reference.py"
        spec = importlib.util.spec_from_file_location("gen_reference", path)
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_reference_covers_every_leaf_command(self) -> None:
        import re

        import typer.main

        gen = self.generator()
        root = typer.main.get_command(app)
        _, leaves = gen.walk(root)
        reference = (Path(__file__).resolve().parents[1] / "docs" / "REFERENCE.md").read_text()
        sections = set(re.findall(r"^### `(.+?)`", reference, re.M))
        assert {path for _, path, _, _ in leaves} == sections

    def test_reference_matches_the_generator(self) -> None:
        gen = self.generator()
        reference = Path(__file__).resolve().parents[1] / "docs" / "REFERENCE.md"
        assert gen.render() == reference.read_text()

    def test_help_change_resurfaces_in_the_reference(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import typer.main

        gen = self.generator()
        root = typer.main.get_command(app)
        _, leaves = gen.walk(root)
        leaf = next(leaf for _, path, leaf, _ in leaves if path == "bea import")
        option = next(p for p in leaf.params if "--csv" in p.opts)
        option.help = "SCRATCH help text for the drift test"
        monkeypatch.setattr(typer.main, "get_command", lambda app_: root)
        after = gen.render()
        assert "SCRATCH help text for the drift test" in after
