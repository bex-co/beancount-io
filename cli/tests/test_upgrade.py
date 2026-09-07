"""`bea upgrade`: which manager owns an install, and what the command does about it.

Detection is driven with the paths each channel really produces, so the table
can be checked on any machine — a Homebrew case has to pass on Linux CI too.
"""

from __future__ import annotations

import json
import subprocess
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.commands import upgrade as upgrade_command
from cli.main import app

from .conftest import FakeIndex

runner = CliRunner()

HOMEBREW_ARM = "/opt/homebrew/Cellar/bea/1.2.3/libexec"
HOMEBREW_INTEL = "/usr/local/Cellar/bea/1.2.3/libexec"
LINUXBREW = "/home/linuxbrew/.linuxbrew/Cellar/bea/1.2.3/libexec"
UV_TOOL = "/home/alice/.local/share/uv/tools/beancount-io"
PIPX = "/home/alice/.local/pipx/venvs/beancount-io"
PROJECT_VENV = "/home/alice/books/.venv"


def site_packages(prefix: str) -> str:
    """Where a normal (non-editable) install puts the `cli` package."""
    return f"{prefix}/lib/python3.12/site-packages/cli"


class TestChannelDetection:
    @pytest.mark.parametrize("prefix", [HOMEBREW_ARM, HOMEBREW_INTEL, LINUXBREW])
    def test_homebrew(self, prefix: str) -> None:
        channel = upgrade_command.detect_channel(prefix, site_packages(prefix), {})

        assert channel is upgrade_command.HOMEBREW
        assert channel.command == ("brew", "upgrade", "bea")

    def test_uv_tool(self) -> None:
        channel = upgrade_command.detect_channel(UV_TOOL, site_packages(UV_TOOL), {})

        assert channel is upgrade_command.UV_TOOL
        assert channel.command == ("uv", "tool", "upgrade", "beancount-io")

    def test_a_relocated_uv_tool_directory(self) -> None:
        prefix = "/opt/tools/beancount-io"

        channel = upgrade_command.detect_channel(prefix, site_packages(prefix), {"UV_TOOL_DIR": "/opt/tools"})

        assert channel is upgrade_command.UV_TOOL

    def test_pipx(self) -> None:
        channel = upgrade_command.detect_channel(PIPX, site_packages(PIPX), {})

        assert channel is upgrade_command.PIPX
        assert channel.command == ("pipx", "upgrade", "beancount-io")

    def test_a_relocated_pipx_home(self) -> None:
        prefix = "/opt/pipx-home/venvs/beancount-io"

        channel = upgrade_command.detect_channel(prefix, site_packages(prefix), {"PIPX_HOME": "/opt/pipx-home"})

        assert channel is upgrade_command.PIPX

    def test_an_editable_install_is_a_checkout_whoever_created_it(self) -> None:
        # `make install-tool` produces exactly this: a uv-owned environment
        # whose code is a working tree, where `git pull` is the update.
        channel = upgrade_command.detect_channel(UV_TOOL, "/home/alice/src/beancount-io/cli/src/cli", {})

        assert channel is upgrade_command.CHECKOUT
        assert channel.command == ()

    def test_a_plain_project_virtualenv_is_unknown(self) -> None:
        channel = upgrade_command.detect_channel(PROJECT_VENV, site_packages(PROJECT_VENV), {})

        assert channel is upgrade_command.UNKNOWN
        assert channel.unknown

    def test_this_very_process_is_classified(self) -> None:
        # Not a fixed answer — a developer runs from a checkout, CI from a
        # synced venv — but it must never crash on a real path.
        assert upgrade_command.current_channel().name in {
            "homebrew",
            "uv-tool",
            "pipx",
            "checkout",
            "unknown",
        }


class TestCheck:
    def test_it_reports_the_command_without_running_anything(
        self, fake_index: FakeIndex, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.HOMEBREW)
        _refuse_to_run(monkeypatch)

        result = runner.invoke(app, ["upgrade", "--check"])

        assert result.exit_code == 0
        assert "brew upgrade bea" in result.stdout
        assert "9.9.9" in result.stdout

    def test_it_reports_the_uv_command_for_a_uv_tool_install(
        self, fake_index: FakeIndex, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.UV_TOOL)
        _refuse_to_run(monkeypatch)

        result = runner.invoke(app, ["upgrade", "--check"])

        assert "uv tool upgrade beancount-io" in result.stdout

    def test_it_asks_the_index_even_when_the_daily_cache_is_warm(
        self, fake_index: FakeIndex, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.HOMEBREW)
        _refuse_to_run(monkeypatch)
        runner.invoke(app, ["upgrade", "--check"])
        fake_index.version = "10.0.0"

        result = runner.invoke(app, ["upgrade", "--check"])

        assert "10.0.0" in result.stdout

    def test_an_unreachable_index_still_reports_the_command(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # No `fake_index`: the endpoint is a closed port, as it is offline.
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.HOMEBREW)
        _refuse_to_run(monkeypatch)

        result = runner.invoke(app, ["upgrade", "--check"])

        assert result.exit_code == 0
        assert "Latest release: unknown" in result.stdout
        assert "brew upgrade bea" in result.stdout

    def test_json_reports_the_same_answer_as_an_envelope(
        self, fake_index: FakeIndex, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.HOMEBREW)
        _refuse_to_run(monkeypatch)

        result = runner.invoke(app, ["--json", "upgrade", "--check"])

        data = _envelope(result)["data"]
        assert data["channel"] == "homebrew"
        assert data["command"] == ["brew", "upgrade", "bea"]
        assert data["latest"] == "9.9.9"


class TestRunning:
    def test_it_runs_the_owning_managers_command(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.UV_TOOL)
        ran = _record_runs(monkeypatch, returncode=0)

        result = runner.invoke(app, ["upgrade"])

        assert result.exit_code == 0
        assert ran == [("uv", "tool", "upgrade", "beancount-io")]

    def test_a_failing_manager_is_reported_and_nothing_is_claimed(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.HOMEBREW)
        _record_runs(monkeypatch, returncode=1)

        result = runner.invoke(app, ["upgrade"])

        assert result.exit_code == 1
        assert "bea was not changed" in result.stderr

    def test_a_missing_manager_is_a_usage_error(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.PIPX)

        def missing(*args: object, **kwargs: object) -> None:
            raise FileNotFoundError("pipx")

        monkeypatch.setattr(subprocess, "run", missing)

        result = runner.invoke(app, ["upgrade"])

        assert result.exit_code == 2
        assert "not on PATH" in result.stderr

    def test_a_checkout_is_told_how_to_update_and_succeeds(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.CHECKOUT)
        _refuse_to_run(monkeypatch)

        result = runner.invoke(app, ["upgrade"])

        assert result.exit_code == 0
        assert "git pull" in result.stdout

    def test_it_does_not_also_print_the_passive_notice(
        self, fake_index: FakeIndex, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # The notice would compare against the version this process started
        # with, announcing the release `brew upgrade` just installed.
        monkeypatch.setattr("cli.update._stderr_is_a_terminal", lambda: True)
        monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)
        monkeypatch.setattr("cli.update.package_version", lambda: "0.1.0")
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.UV_TOOL)
        _record_runs(monkeypatch, returncode=0)

        result = runner.invoke(app, ["upgrade"])

        assert result.exit_code == 0
        assert "is available" not in result.stderr

    def test_an_unknown_channel_exits_2_with_both_commands(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.commands.upgrade.current_channel", lambda: upgrade_command.UNKNOWN)
        _refuse_to_run(monkeypatch)

        result = runner.invoke(app, ["upgrade"])

        assert result.exit_code == 2
        assert "brew upgrade bea" in result.stderr
        assert "uv tool upgrade beancount-io" in result.stderr


def _record_runs(monkeypatch: pytest.MonkeyPatch, *, returncode: int) -> list[tuple[str, ...]]:
    """Capture the manager command instead of running it."""
    ran: list[tuple[str, ...]] = []

    def fake_run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
        ran.append(tuple(command))
        return subprocess.CompletedProcess(command, returncode)

    monkeypatch.setattr(subprocess, "run", fake_run)
    return ran


def _refuse_to_run(monkeypatch: pytest.MonkeyPatch) -> None:
    """Turn shelling out into a failure, for the paths that must run nothing."""

    def forbidden(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
        raise AssertionError(f"nothing should have been run, but got {command}")

    monkeypatch.setattr(subprocess, "run", forbidden)


def _envelope(result: Any) -> dict[str, Any]:
    return json.loads(result.stdout)  # type: ignore[no-any-return]
