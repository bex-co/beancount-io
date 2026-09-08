"""The update notice: who may see it, how often, and everything that silences it.

The rules only earn their keep if the suppressed cases really make no request,
so the tests run against a local stand-in for PyPI and assert on what it was
asked, not only on what got printed.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli import update
from cli.main import app

from .conftest import FakeIndex

FIXTURES = Path(__file__).parent / "fixtures"
VALID = FIXTURES / "valid.bean"

runner = CliRunner()


@pytest.fixture(autouse=True)
def no_pending_check() -> Iterator[None]:
    """Never let one test's unfinished check answer for the next one."""
    update._pending = None
    yield
    update._pending = None


@pytest.fixture
def in_a_terminal(monkeypatch: pytest.MonkeyPatch) -> None:
    """Look like a person's session: a terminal on stderr, and a terminal on stdin."""
    monkeypatch.setattr("cli.update._stderr_is_a_terminal", lambda: True)
    monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)


def check_ledger(*args: str) -> Any:
    return runner.invoke(app, ["--file", str(VALID), *args, "check"])


class TestVersionComparison:
    @pytest.mark.parametrize("version", ["1.2.3", "0.0.0", "10.20.30"])
    def test_a_canonical_release_is_readable(self, version: str) -> None:
        assert update.is_release(version)

    @pytest.mark.parametrize(
        "version",
        ["0+unknown", "1.2.3.dev1", "1.2.3rc1", "1.2", "1.2.3.4", "1.2.3+local", "", "v1.2.3"],
    )
    def test_anything_else_is_not_a_release(self, version: str) -> None:
        assert not update.is_release(version)

    def test_newer_is_strict(self) -> None:
        assert update.newer("1.2.3", "1.2.4")
        assert update.newer("1.2.3", "2.0.0")
        assert not update.newer("1.2.3", "1.2.3")
        assert not update.newer("1.2.4", "1.2.3")

    def test_an_unreadable_version_is_never_newer(self) -> None:
        # A development checkout must not be told it is out of date, and a
        # malformed answer from the index must not start a nag.
        assert not update.newer("1.2.3.dev1", "1.2.4")
        assert not update.newer("1.2.3", "not-a-version")


class TestSuppression:
    """Every documented reason the notice stays quiet, asserted as "asked nobody"."""

    def test_json_mode_never_checks(self, fake_index: FakeIndex, in_a_terminal: None) -> None:
        result = check_ledger("--json")

        assert result.exit_code == 0
        assert fake_index.requests == []

    def test_no_input_never_checks(self, fake_index: FakeIndex, in_a_terminal: None) -> None:
        check_ledger("--no-input")

        assert fake_index.requests == []

    def test_ci_never_checks(self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CI", "true")

        check_ledger()

        assert fake_index.requests == []

    def test_the_opt_out_variable_never_checks(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("BEA_NO_UPDATE_NOTIFIER", "1")

        check_ledger()

        assert fake_index.requests == []

    def test_without_a_terminal_it_never_checks(self, fake_index: FakeIndex) -> None:
        # No `in_a_terminal`: this is how a pipe, a cron job, or an agent runs.
        check_ledger()

        assert fake_index.requests == []

    def test_a_development_version_never_checks(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.update.package_version", lambda: "0.1.0.dev1")

        check_ledger()

        assert fake_index.requests == []


class TestDailyCache:
    def test_homebrew_checks_the_tap_and_keeps_its_cache_separate(self, fake_index: FakeIndex) -> None:
        update.write_cache(1000.0, "20.0.0")
        assert update.latest_version(channel="homebrew", now=1000.0) == "9.9.9"
        assert fake_index.requests == ["/bea.rb"]
        assert update.latest_version(now=1000.0) == "20.0.0"
        fake_index.version = "10.0.0"
        assert update.latest_version(channel="homebrew", now=1001.0) == "9.9.9"
        assert update.latest_version(channel="homebrew", use_cache=False, now=1001.0) == "10.0.0"
        assert fake_index.requests == ["/bea.rb", "/bea.rb"]

    def test_the_answer_is_reused_for_a_day(self, fake_index: FakeIndex) -> None:
        assert update.latest_version(now=1_000.0) == "9.9.9"
        fake_index.version = "10.0.0"

        assert update.latest_version(now=1_000.0 + update.CACHE_MAX_AGE_SECONDS - 1) == "9.9.9"
        assert len(fake_index.requests) == 1

    def test_a_day_later_it_asks_again(self, fake_index: FakeIndex) -> None:
        update.latest_version(now=1_000.0)
        fake_index.version = "10.0.0"

        assert update.latest_version(now=1_000.0 + update.CACHE_MAX_AGE_SECONDS) == "10.0.0"
        assert len(fake_index.requests) == 2

    def test_a_clock_that_went_backwards_is_treated_as_stale(self, fake_index: FakeIndex) -> None:
        update.latest_version(now=1_000.0)

        update.latest_version(now=500.0)

        assert len(fake_index.requests) == 2

    def test_a_failure_is_cached_so_an_offline_machine_retries_once_a_day(self, fake_index: FakeIndex) -> None:
        fake_index.version = None  # the index answers HTTP 500

        assert update.latest_version(now=1_000.0) is None
        assert update.latest_version(now=1_001.0) is None
        assert len(fake_index.requests) == 1
        assert json.loads(update.cache_path().read_text())["version"] == ""

    def test_an_explicit_check_goes_past_the_cache(self, fake_index: FakeIndex) -> None:
        update.latest_version(now=1_000.0)
        fake_index.version = "10.0.0"

        assert update.latest_version(use_cache=False, now=1_000.0) == "10.0.0"

    def test_an_unwritable_cache_does_not_break_the_check(
        self, fake_index: FakeIndex, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        blocked = tmp_path / "not-a-directory"
        blocked.write_text("")
        monkeypatch.setenv("BEA_CONFIG_DIR", str(blocked / "bea"))

        assert update.latest_version() == "9.9.9"


class TestTheNotice:
    def test_it_appears_after_the_command(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.update.package_version", lambda: "0.1.0")

        result = check_ledger()

        assert result.exit_code == 0
        assert "bea 9.9.9 is available" in result.stderr
        assert "bea upgrade" in result.stderr
        assert "no errors" in result.stdout

    def test_it_says_nothing_when_the_installed_version_is_current(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.update.package_version", lambda: "9.9.9")

        result = check_ledger()

        assert fake_index.requests != []
        assert "is available" not in result.stderr

    def test_a_second_run_the_same_day_asks_nothing(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.update.package_version", lambda: "0.1.0")

        first = check_ledger()
        second = check_ledger()

        assert len(fake_index.requests) == 1
        assert "bea 9.9.9 is available" in first.stderr
        assert "bea 9.9.9 is available" in second.stderr

    def test_a_hanging_index_prints_nothing_and_still_succeeds(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.update.package_version", lambda: "0.1.0")
        monkeypatch.setattr("cli.update.TIMEOUT_SECONDS", 0.2)
        fake_index.delay = 1.0

        result = check_ledger()

        assert result.exit_code == 0
        assert "is available" not in result.stderr
        assert "no errors" in result.stdout

    def test_a_failing_command_is_not_followed_by_a_notice(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.update.package_version", lambda: "0.1.0")

        result = runner.invoke(app, ["--file", str(FIXTURES / "invalid.bean"), "check"])

        assert result.exit_code == 1
        assert "is available" not in result.stderr


class TestVersionHint:
    def test_homebrew_does_not_announce_a_pypi_only_release(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        from cli.commands.upgrade import HOMEBREW

        monkeypatch.setattr("cli.main.current_channel", lambda: HOMEBREW)
        monkeypatch.setattr("cli.config.package_version", lambda: "0.1.0")
        update.write_cache(0.0, "9.9.9")
        update.write_cache(0.0, "0.1.0", "homebrew")
        result = runner.invoke(app, ["--version"])
        assert result.stdout.strip() == "bea 0.1.0"
        assert result.stderr == ""
        assert fake_index.requests == []

    def test_the_hint_comes_from_the_cache_and_asks_nothing(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.config.package_version", lambda: "0.1.0")
        update.write_cache(0.0, "9.9.9")

        result = runner.invoke(app, ["--version"])

        assert result.exit_code == 0
        assert fake_index.requests == []
        assert "bea 9.9.9 is available" in result.stderr

    def test_stdout_stays_one_parseable_line(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.config.package_version", lambda: "0.1.0")
        update.write_cache(0.0, "9.9.9")

        result = runner.invoke(app, ["--version"])

        assert result.stdout.strip() == "bea 0.1.0"

    def test_no_hint_under_ci(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.config.package_version", lambda: "0.1.0")
        monkeypatch.setenv("CI", "true")
        update.write_cache(0.0, "9.9.9")

        result = runner.invoke(app, ["--version"])

        assert "is available" not in result.stderr

    @pytest.mark.parametrize("flag", ["--json", "--no-input"])
    def test_no_hint_in_machine_mode(
        self, flag: str, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # `--version` answers before the run context exists, so the mode flags
        # are read from argv; this is the test that keeps that honest.
        monkeypatch.setattr("cli.config.package_version", lambda: "0.1.0")
        monkeypatch.setattr("sys.argv", ["bea", flag, "--version"])
        update.write_cache(0.0, "9.9.9")

        result = runner.invoke(app, [flag, "--version"])

        assert result.stdout.strip() == "bea 0.1.0"
        assert "is available" not in result.stderr

    def test_no_hint_when_nothing_was_ever_checked(
        self, fake_index: FakeIndex, in_a_terminal: None, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.config.package_version", lambda: "0.1.0")

        result = runner.invoke(app, ["--version"])

        assert fake_index.requests == []
        assert "is available" not in result.stderr
