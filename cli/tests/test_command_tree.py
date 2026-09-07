"""The command tree: local verbs at the top level, hosted commands under `bea cloud`.

The tree is the product's local-first promise, so these tests pin its shape:
where commands resolve, that the pre-cloud spellings stay dead, and that
`--help` renders the local/cloud grouping the plain formatter builds.
"""

from __future__ import annotations

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
        for name in ("check", "format", "query", "ask", "add", "list", "report"):
            assert f"\n  {name} " in local_section, f"{name!r} missing from the local panel"
        assert "\n  cloud " in cloud_section

    def test_no_command_falls_into_an_unlabelled_panel(self) -> None:
        result = invoke("--help")

        assert "\nCommands:" not in result.stdout

    def test_cloud_help_names_the_login_prerequisite(self) -> None:
        result = invoke("cloud", "--help")

        assert result.exit_code == 0
        assert "bea cloud login" in result.stdout


class TestCloudWithoutCredentials:
    def test_status_fails_fast_and_points_at_login(self) -> None:
        result = invoke("cloud", "status")

        assert result.exit_code == 3
        assert "bea cloud login" in result.stderr
