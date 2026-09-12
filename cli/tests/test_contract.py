"""The automation contract: target resolution, exit codes, JSON output, and no-input behavior.

These are the promises `docs/USAGE.md` makes to a script or a coding agent, so
they are tested through the real command tree rather than against the helpers.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any
from unittest.mock import patch

import httpx
import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.main import app

FIXTURES = Path(__file__).parent / "fixtures"
VALID = FIXTURES / "valid.bean"
INVALID = FIXTURES / "invalid.bean"
UNPRICED = FIXTURES / "unpriced.bean"
EUR_PRECISION = FIXTURES / "eur-precision.bean"

V1 = "https://api.v3.beancount.io/api-gateway/v1"

runner = CliRunner()


def v1_error(code: str, message: str) -> dict[str, Any]:
    return {"ok": False, "error": {"code": code, "message": message}}


def ledger_item(full_name: str = "alice/books") -> dict[str, Any]:
    owner_less = full_name.split("/", 1)[1]
    return {
        "id": "1",
        "name": owner_less,
        "fullName": full_name,
        "httpUrl": f"https://example.test/{full_name}",
        "sshUrl": f"git@example.test:{full_name}.git",
        "private": True,
        "empty": False,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "size": 0,
    }


def envelope(result: Any) -> dict[str, Any]:
    """Parse stdout as the documented envelope, failing loudly if anything else was printed."""
    return json.loads(result.stdout)  # type: ignore[no-any-return]


def error_object(result: Any) -> dict[str, Any]:
    return json.loads(result.stderr)["error"]  # type: ignore[no-any-return]


class TestTargetResolution:
    def test_file_flag_beats_the_environment(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("BEA_FILE", str(INVALID))

        result = runner.invoke(app, ["--file", str(VALID), "--json", "check"])

        assert result.exit_code == 0
        assert envelope(result)["target"]["file"] == str(VALID.resolve())

    def test_environment_beats_the_working_directory(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        (tmp_path / "main.bean").write_text(INVALID.read_text())
        monkeypatch.chdir(tmp_path)
        monkeypatch.setenv("BEA_FILE", str(VALID))

        result = runner.invoke(app, ["--json", "check"])

        assert result.exit_code == 0
        assert envelope(result)["target"]["file"] == str(VALID.resolve())

    def test_working_directory_is_the_last_resort(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        (tmp_path / "main.bean").write_text(VALID.read_text())
        monkeypatch.chdir(tmp_path)

        result = runner.invoke(app, ["--json", "check"])

        assert result.exit_code == 0
        assert envelope(result)["target"]["file"] == str((tmp_path / "main.bean").resolve())

    def test_missing_file_exits_2_naming_every_source(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        monkeypatch.chdir(tmp_path)

        result = runner.invoke(app, ["check"])

        assert result.exit_code == 2
        assert "--file" in result.stderr
        assert "BEA_FILE" in result.stderr
        assert "main.bean" in result.stderr

    def test_relative_target_is_resolved_before_loading(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        # The beancount loader asserts on a relative entry path; resolving late
        # used to surface as an empty "Error:" with no message.
        (tmp_path / "books.bean").write_text(VALID.read_text())
        monkeypatch.chdir(tmp_path)

        result = runner.invoke(app, ["--file", "books.bean", "check"])

        assert result.exit_code == 0, result.stderr


class TestExitCodes:
    def test_0_on_success(self) -> None:
        assert runner.invoke(app, ["--file", str(VALID), "check"]).exit_code == 0

    def test_1_on_a_ledger_error(self) -> None:
        result = runner.invoke(app, ["--file", str(INVALID), "check"])

        assert result.exit_code == 1
        assert "does not balance" in result.stderr

    def test_1_when_a_report_would_total_an_unloadable_ledger(self) -> None:
        result = runner.invoke(app, ["--file", str(INVALID), "report", "balance-sheet"])

        assert result.exit_code == 1
        assert result.stdout == ""

    def test_allow_errors_returns_data_and_still_reports_the_errors(self) -> None:
        result = runner.invoke(app, ["--file", str(INVALID), "list", "transaction", "--allow-errors"])

        assert result.exit_code == 0
        assert "Blue Bottle" in result.stdout
        assert "does not balance" in result.stderr

    def test_2_on_a_usage_error(self) -> None:
        result = runner.invoke(
            app, ["--file", str(VALID), "add", "balance", "--date", "not-a-date", "--account", "A", "--amount", "1 USD"]
        )

        assert result.exit_code == 2

    def test_3_when_the_server_rejects_the_credential(self, logged_in: None, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(status_code=401, json=v1_error("UNAUTHENTICATED", "Bad token"))

        result = runner.invoke(app, ["cloud", "ledger", "list"])

        assert result.exit_code == 3

    def test_3_when_there_is_no_credential_at_all(self) -> None:
        result = runner.invoke(app, ["cloud", "ledger", "list"])

        assert result.exit_code == 3
        assert "bea cloud login" in result.stderr

    def test_4_when_a_write_times_out_with_an_unknown_outcome(self, logged_in: None, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_exception(httpx.ConnectTimeout("timed out"))

        result = runner.invoke(app, ["--yes", "cloud", "ledger", "delete", "alice/books"])

        assert result.exit_code == 4
        assert "outcome is unknown" in result.stderr

    @pytest.mark.parametrize(
        ("status", "exit_code"),
        [(400, 2), (402, 1), (404, 1), (409, 4), (429, 1), (500, 1)],
        ids=["validation", "payment-required", "not-found", "conflict", "rate-limited", "server-error"],
    )
    def test_every_http_status_maps_onto_the_documented_exit_table(
        self, logged_in: None, httpx_mock: HTTPXMock, status: int, exit_code: int
    ) -> None:
        httpx_mock.add_response(status_code=status, json=v1_error("SOME_CODE", "the server's own words"))

        result = runner.invoke(app, ["cloud", "ledger", "list"])

        assert result.exit_code == exit_code
        assert "the server's own words" in result.stderr

    def test_the_backend_request_id_survives_into_the_error(self, logged_in: None, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(
            status_code=401,
            json=v1_error("UNAUTHENTICATED", "Bad token"),
            headers={"x-request-id": "req-abc123"},
        )

        result = runner.invoke(app, ["--json", "cloud", "ledger", "list"])

        assert error_object(result)["request_id"] == "req-abc123"


class TestBulkAdd:
    ONE_GOOD_ONE_BAD = [
        {
            "date": "2024-03-01",
            "narration": "Good row",
            "postings": [
                {"account": "Expenses:Food", "units": {"number": "5.00", "currency": "USD"}},
                {"account": "Assets:Cash", "units": {"number": "-5.00", "currency": "USD"}},
            ],
        },
        {"date": "not-a-date", "narration": "Bad row", "postings": []},
    ]

    def _ledger_and_rows(self, tmp_path: Path, rows: list[dict[str, Any]]) -> tuple[Path, Path]:
        ledger = tmp_path / "main.bean"
        ledger.write_text(VALID.read_text())
        rows_file = tmp_path / "rows.json"
        rows_file.write_text(json.dumps(rows))
        return ledger, rows_file

    def test_an_invalid_row_leaves_the_ledger_byte_identical(self, tmp_path: Path) -> None:
        ledger, rows = self._ledger_and_rows(tmp_path, self.ONE_GOOD_ONE_BAD)
        before = ledger.read_bytes()

        result = runner.invoke(app, ["--file", str(ledger), "add", "transactions", "--from", str(rows)])

        assert result.exit_code == 1
        assert ledger.read_bytes() == before
        assert "Row 2, date" in result.stderr

    def test_partial_appends_the_valid_rows_and_still_fails(self, tmp_path: Path) -> None:
        ledger, rows = self._ledger_and_rows(tmp_path, self.ONE_GOOD_ONE_BAD)

        result = runner.invoke(app, ["--file", str(ledger), "add", "transactions", "--from", str(rows), "--partial"])

        assert result.exit_code == 1
        assert "Good row" in ledger.read_text()
        assert "Bad row" not in ledger.read_text()

    def test_a_clean_file_writes_every_row_and_succeeds(self, tmp_path: Path) -> None:
        ledger, rows = self._ledger_and_rows(tmp_path, self.ONE_GOOD_ONE_BAD[:1])

        result = runner.invoke(app, ["--file", str(ledger), "--json", "add", "transactions", "--from", str(rows)])

        assert result.exit_code == 0
        assert envelope(result)["data"] == {"written": 1, "rejected": []}
        assert "Good row" in ledger.read_text()


READ_SIDE_COMMANDS = [
    ["check"],
    ["query", "SELECT account, sum(position) GROUP BY account"],
    ["list", "transaction"],
    ["list", "note"],
    ["list", "price"],
    ["list", "event"],
    ["report", "overview"],
    ["report", "income-statement"],
    ["report", "balance-sheet"],
    ["report", "trial-balance"],
]


class TestJsonOutput:
    @pytest.mark.parametrize("command", READ_SIDE_COMMANDS, ids=lambda c: " ".join(c[:2]))
    def test_stdout_is_nothing_but_the_envelope(self, command: list[str]) -> None:
        result = runner.invoke(app, ["--file", str(VALID), "--json", *command])

        assert result.exit_code == 0, result.stderr
        parsed = envelope(result)
        assert set(parsed) >= {"bea", "target", "data", "truncated"}
        assert parsed["target"] == {"file": str(VALID.resolve())}

    def test_amounts_are_decimal_strings_not_floats(self) -> None:
        result = runner.invoke(app, ["--file", str(VALID), "--json", "list", "transaction", "--sort", "oldest"])

        units = envelope(result)["data"][0]["postings"][0]["units"]
        assert units == {"number": "1000.00", "currency": "USD"}

    def test_query_reports_column_names_and_types(self) -> None:
        result = runner.invoke(
            app, ["--file", str(VALID), "--json", "query", "SELECT account, sum(position) as total GROUP BY account"]
        )

        assert envelope(result)["data"]["columns"] == [
            {"name": "account", "type": "str"},
            {"name": "total", "type": "Inventory"},
        ]

    def test_a_bounded_list_says_when_it_truncated(self) -> None:
        truncated = runner.invoke(app, ["--file", str(VALID), "--json", "list", "transaction", "--limit", "1"])
        complete = runner.invoke(app, ["--file", str(VALID), "--json", "list", "transaction", "--limit", "50"])

        assert envelope(truncated)["truncated"] is True
        assert envelope(truncated)["limit"] == 1
        assert len(envelope(truncated)["data"]) == 1
        assert envelope(complete)["truncated"] is False

    def test_a_failure_writes_an_error_object_to_stderr_and_nothing_to_stdout(self) -> None:
        result = runner.invoke(app, ["--file", str(INVALID), "--json", "check"])

        assert result.exit_code == 1
        assert result.stdout == ""
        error = error_object(result)
        assert error["category"] == "validation"
        assert error["exit_code"] == 1
        assert any("does not balance" in detail for detail in error["details"])

    def test_a_usage_failure_is_categorised_as_usage(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        monkeypatch.chdir(tmp_path)

        result = runner.invoke(app, ["--json", "check"])

        assert error_object(result) | {"message": ""} == {
            "category": "usage",
            "exit_code": 2,
            "message": "",
        }

    def test_cloud_status_reports_where_the_credential_came_from(self, logged_in: None, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(
            url=f"{V1}/user-profile",
            json={
                "id": "u1",
                "email": "a@example.com",
                "locale": "en",
                "username": "alice",
                "tier": "free",
                "limits": {"ledgersUsed": 0, "ledgersMax": 1, "collaboratorsPerLedgerMax": 1, "maxDirectives": 100},
                "hasEverSubscribed": False,
            },
        )

        result = runner.invoke(app, ["--json", "cloud", "status"])

        assert result.exit_code == 0, result.stderr
        data = envelope(result)["data"]
        assert data["source"] == "environment"
        assert data["email"] == "a@example.com"

    def test_a_revoked_credential_reads_the_same_on_status_and_list(
        self, logged_in: None, httpx_mock: HTTPXMock
    ) -> None:
        # The profile endpoint answers a dead bearer with an empty body while
        # the ledger endpoints answer 401; both must surface as one auth story.
        httpx_mock.add_response(url=f"{V1}/user-profile", content=b"null", headers={"Content-Type": "application/json"})
        httpx_mock.add_response(
            url=f"{V1}/ledgers?page=1&limit=50", status_code=401, json=v1_error("UNAUTHENTICATED", "x")
        )

        status = runner.invoke(app, ["--json", "cloud", "status"])
        listing = runner.invoke(app, ["--json", "cloud", "ledger", "list"])

        assert status.exit_code == listing.exit_code == 3
        for result in (status, listing):
            assert error_object(result)["category"] == "auth"
            assert error_object(result)["message"].startswith("Not authorized (")
            assert "bea cloud login" in error_object(result)["message"]
        assert "environment" in error_object(status)["message"]

    def test_ledger_list_emits_the_envelope(self, logged_in: None, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(url=f"{V1}/ledgers?page=1&limit=50", json=[ledger_item()])

        result = runner.invoke(app, ["--json", "cloud", "ledger", "list"])

        assert result.exit_code == 0, result.stderr
        assert envelope(result)["data"][0]["full_name"] == "alice/books"

    def test_ledger_list_echoes_the_page_it_served(self, logged_in: None, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(url=f"{V1}/ledgers?page=2&limit=3", json=[ledger_item()] * 3)

        result = runner.invoke(app, ["--json", "cloud", "ledger", "list", "--page", "2", "--limit", "3"])

        assert result.exit_code == 0, result.stderr
        assert envelope(result)["page"] == 2
        assert envelope(result)["limit"] == 3
        assert envelope(result)["truncated"] is True


class TestNoInput:
    @pytest.mark.parametrize("command", ["show", "delete", "clone"])
    @pytest.mark.parametrize("signed_in", [True, False], ids=["signed-in", "signed-out"])
    def test_a_malformed_full_name_is_a_usage_error_before_confirmation_or_auth(
        self, monkeypatch: pytest.MonkeyPatch, command: str, signed_in: bool
    ) -> None:
        if signed_in:
            monkeypatch.setenv("BEA_TOKEN", "test-token")

        with patch("typer.confirm") as confirm:
            result = runner.invoke(app, ["--json", "cloud", "ledger", command, "open_ledger"])

        confirm.assert_not_called()
        assert result.exit_code == 2
        assert error_object(result)["message"] == "'open_ledger' is not a ledger full name; expected 'owner/name'."
        assert "--yes" not in error_object(result)["message"]

    def test_a_destructive_command_refuses_to_run_unconfirmed(self, logged_in: None) -> None:
        result = runner.invoke(app, ["cloud", "ledger", "delete", "alice/books"])

        assert result.exit_code == 2
        assert "--yes" in result.stderr

    def test_json_mode_never_prompts(self, logged_in: None) -> None:
        with patch("typer.confirm") as confirm:
            result = runner.invoke(app, ["--json", "cloud", "ledger", "delete", "alice/books"])

        confirm.assert_not_called()
        assert result.exit_code == 2

    def test_yes_confirms_without_asking(self, logged_in: None, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(method="DELETE", url=f"{V1}/ledgers/alice/books", json={"ledgerId": "alice/books"})

        with patch("typer.confirm") as confirm:
            result = runner.invoke(app, ["--yes", "cloud", "ledger", "delete", "alice/books"])

        confirm.assert_not_called()
        assert result.exit_code == 0

    def test_a_terminal_is_still_asked(self, logged_in: None, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)

        with patch("typer.confirm", return_value=False) as confirm:
            result = runner.invoke(app, ["cloud", "ledger", "delete", "alice/books"])

        confirm.assert_called_once()
        assert result.exit_code == 0
        assert "Cancelled" in result.stdout

    def test_an_interactive_query_shell_is_refused_without_a_terminal(self) -> None:
        result = runner.invoke(app, ["--file", str(VALID), "query"])

        assert result.exit_code == 2


class TestAskExtra:
    def test_a_missing_extra_names_the_install_command(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Poisoning the module entry is how the absent extra looks from here:
        # `from cli.ask.agent import ...` raises ImportError.
        monkeypatch.setitem(__import__("sys").modules, "cli.ask.agent", None)

        result = runner.invoke(app, ["--file", str(VALID), "ask", "anything", "--print"])

        assert result.exit_code == 2
        assert "beancount-io[ask]" in result.stderr


class TestTagsAndLinks:
    """Beancount's printer writes the sigil, so a value carrying one used to be doubled."""

    @pytest.mark.parametrize(
        ("tag", "link"),
        [("trip", "inv-001"), ("#trip", "^inv-001")],
        ids=["bare", "with-sigils"],
    )
    def test_either_spelling_produces_a_ledger_that_loads(self, tmp_path: Path, tag: str, link: str) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text("2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n")

        written = runner.invoke(
            app,
            # fmt: off
            [
                "--file",
                str(ledger),
                "add",
                "transaction",
                "--date",
                "2024-03-01",
                "--narration",
                "Coffee",
                "--posting",
                "Expenses:Food 12.50 USD",
                "--posting",
                "Assets:Cash -12.50 USD",
                "--tag",
                tag,
                "--link",
                link,
            ],
            # fmt: on
        )
        checked = runner.invoke(app, ["--file", str(ledger), "check"])

        assert written.exit_code == 0, written.stderr
        assert "#trip ^inv-001" in ledger.read_text()
        assert checked.exit_code == 0, checked.stderr


class TestLenientReads:
    """A terminal gets data plus a banner; automation keeps the refusal (w1/m13)."""

    def _terminal(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.context._stdout_is_a_terminal", lambda: True)

    def _piped(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.context._stdout_is_a_terminal", lambda: False)

    @pytest.mark.parametrize(
        "command",
        [
            ["list", "transaction"],
            ["query", "SELECT account, sum(position) GROUP BY account"],
            ["report", "balance-sheet"],
        ],
        ids=["list", "query", "report"],
    )
    def test_a_terminal_read_with_errors_exits_0_with_a_banner(
        self, monkeypatch: pytest.MonkeyPatch, command: list[str]
    ) -> None:
        self._terminal(monkeypatch)

        result = runner.invoke(app, ["--file", str(INVALID), *command])

        assert result.exit_code == 0
        assert "does not balance" in result.stderr

    @pytest.mark.parametrize(
        "command",
        [
            ["list", "transaction"],
            ["query", "SELECT account, sum(position) GROUP BY account"],
            ["report", "balance-sheet"],
        ],
        ids=["list", "query", "report"],
    )
    def test_json_piped_and_strict_reads_exit_1(self, monkeypatch: pytest.MonkeyPatch, command: list[str]) -> None:
        self._piped(monkeypatch)
        assert runner.invoke(app, ["--file", str(INVALID), "--json", *command]).exit_code == 1
        assert runner.invoke(app, ["--file", str(INVALID), *command]).exit_code == 1

        self._terminal(monkeypatch)
        assert runner.invoke(app, ["--file", str(INVALID), "--strict", *command]).exit_code == 1

    def test_check_always_exits_1_even_in_a_terminal(self, monkeypatch: pytest.MonkeyPatch) -> None:
        self._terminal(monkeypatch)

        assert runner.invoke(app, ["--file", str(INVALID), "check"]).exit_code == 1

    def test_allow_errors_in_a_strict_read_returns_data(self, monkeypatch: pytest.MonkeyPatch) -> None:
        self._piped(monkeypatch)

        result = runner.invoke(app, ["--file", str(INVALID), "--json", "list", "transaction", "--allow-errors"])

        assert result.exit_code == 0
        assert envelope(result)["data"][0]["payee"] == "Blue Bottle"


class TestToleratedWarningsStayParseable:
    """A JSON failure after `--allow-errors` is still one object on stderr."""

    @pytest.fixture
    def warned(self, tmp_path: Path) -> Path:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking USD\n2026-01-01 open Equity:Opening USD\n"
            '2026-02-01 * "Opening"\n  Assets:Checking 100 USD\n  Equity:Opening -100 USD\n'
            "2026-03-01 balance Assets:Checking 999 USD\n"
        )
        return file

    @pytest.mark.parametrize(
        "command",
        [["query", "SELECT does_not_exist"], ["report", "overview", "--time", "not-a-period"]],
        ids=["query", "report"],
    )
    def test_failure_after_tolerated_warnings_is_one_json_object(self, warned: Path, command: list[str]) -> None:
        result = runner.invoke(app, ["--file", str(warned), "--json", *command, "--allow-errors"])

        assert result.exit_code == 2, result.output
        assert result.stdout == ""
        error = error_object(result)  # would raise if the warning line preceded the object
        assert error["category"] == "usage"
        assert len(error["ledger_warnings"]) == 1 and "Balance failed" in error["ledger_warnings"][0]

    def test_success_after_tolerated_warnings_keeps_the_envelope_and_the_warnings(self, warned: Path) -> None:
        result = runner.invoke(app, ["--file", str(warned), "--json", "list", "transaction", "--allow-errors"])

        assert result.exit_code == 0, result.output
        assert envelope(result)["data"][0]["narration"] == "Opening"
        assert "Balance failed" in result.stderr and not result.stderr.startswith("{")

    def test_a_valid_ledger_failure_carries_no_warning_field(self) -> None:
        result = runner.invoke(app, ["--file", str(VALID), "--json", "query", "SELECT does_not_exist"])

        assert result.exit_code == 2
        assert "ledger_warnings" not in error_object(result)


class TestPartialValuation:
    """Reports convert what has a price and keep the rest in units (w1/m13)."""

    def _terminal(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.context._stdout_is_a_terminal", lambda: True)

    @pytest.mark.parametrize(
        "command", [["report", "overview"], ["report", "balance-sheet"], ["report", "trial-balance"]]
    )
    def test_an_unpriced_commodity_renders_in_units_in_a_terminal(
        self, monkeypatch: pytest.MonkeyPatch, command: list[str]
    ) -> None:
        self._terminal(monkeypatch)

        result = runner.invoke(app, ["--file", str(UNPRICED), *command])

        assert result.exit_code == 0, result.stderr
        assert "VACHR" in result.stdout
        summary = [line for line in result.stderr.splitlines() if "VACHR" in line]
        assert len(summary) == 1
        assert "no USD price at any date" in summary[0]

    def test_a_strict_read_refuses_with_the_summary_and_keeps_dated_triples(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("cli.context._stdout_is_a_terminal", lambda: False)

        result = runner.invoke(app, ["--file", str(UNPRICED), "--json", "report", "balance-sheet"])

        assert result.exit_code == 1
        assert result.stdout == ""
        error = error_object(result)
        assert len(error["details"]) == 1
        assert "VACHR" in error["details"][0]
        dated = error["result"]["missing_price_dates"]
        assert dated and all(set(item) >= {"from", "to", "date"} for item in dated)

    def test_a_stale_quote_values_each_interval_at_its_own_date(self, monkeypatch: pytest.MonkeyPatch) -> None:
        self._terminal(monkeypatch)

        result = runner.invoke(app, ["--file", str(EUR_PRECISION), "report", "income-statement"])

        assert result.exit_code == 0, result.stderr
        assert "4.50 EUR" in result.stdout
        assert "4.91 USD" in result.stdout
        assert "earlier rows shown in EUR" in result.stderr


class TestDisplayPrecision:
    """Text rounds converted amounts to the ledger's precision; JSON keeps it all (w1/m13)."""

    def _terminal(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("cli.context._stdout_is_a_terminal", lambda: True)

    def test_text_rounds_half_up_while_json_keeps_full_precision(self, monkeypatch: pytest.MonkeyPatch) -> None:
        self._terminal(monkeypatch)
        text = runner.invoke(app, ["--file", str(EUR_PRECISION), "report", "income-statement"])

        assert text.exit_code == 0, text.stderr
        assert "4.91 USD" in text.stdout
        assert "4.9050" not in text.stdout

        monkeypatch.setattr("cli.context._stdout_is_a_terminal", lambda: False)
        strobed = runner.invoke(
            app, ["--file", str(EUR_PRECISION), "--json", "report", "income-statement", "--allow-errors"]
        )

        assert strobed.exit_code == 0, strobed.stderr
        assert envelope(strobed)["data"]["expenses"]["balance_children"] == {"USD": "4.9050"}

    def test_query_output_ignores_report_precision(self, monkeypatch: pytest.MonkeyPatch) -> None:
        self._terminal(monkeypatch)

        result = runner.invoke(app, ["--file", str(VALID), "query", "SELECT account, sum(position) GROUP BY account"])

        assert result.exit_code == 0
        assert "1000.00 USD" in result.stdout


class TestVersion:
    def test_version_prints_the_version(self) -> None:
        result = runner.invoke(app, ["--version"])

        assert result.exit_code == 0
        assert result.stdout.startswith("bea ")

    def test_startup_loads_no_accounting_ai_or_network_code(self) -> None:
        """`bea --help` must stay cheap, in a subprocess so nothing else has pre-imported these.

        `pydantic_settings` is on the list because declaring a BaseSettings runs
        pydantic's plugin loader, which drags in logfire, OpenTelemetry, protobuf
        and requests — the AI stack's baggage, on every invocation, for anyone who
        installed the ask extra.
        """
        forbidden = [
            "beancount",
            "beanquery",
            "fava",
            "bea_engine",
            "openai",
            "pydantic_ai",
            "pydantic_settings",
            "logfire",
            "opentelemetry",
            "httpx",
        ]
        probe = f"import sys, cli.main;loaded=[m for m in {forbidden!r} if m in sys.modules];print(','.join(loaded))"
        result = subprocess.run([sys.executable, "-c", probe], capture_output=True, text=True, check=True)

        assert result.stdout.strip() == "", f"startup imported: {result.stdout.strip()}"


def test_query_reads_bql_from_stdin() -> None:
    result = runner.invoke(app, ["--file", str(VALID), "query"], input="SELECT account LIMIT 1;\n")
    assert result.exit_code == 0, result.output
    assert "Assets:" in result.stdout


def test_query_output_dash_means_stdout(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["--file", str(VALID), "query", "SELECT account LIMIT 1", "-o", "-"])
    assert result.exit_code == 0, result.output
    assert "Assets:" in result.stdout
    assert not (tmp_path / "-").exists()


def test_query_native_source_without_a_local_ledger(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["query", "--source", "beancount:" + str(VALID), "SELECT account LIMIT 1"])
    assert result.exit_code == 0, result.output
    assert "Assets:" in result.stdout
