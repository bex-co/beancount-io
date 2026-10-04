"""What a ledger query looks like by the time the model reads it (w3/447, w3/455, w3/448, w3/446).

`ask` handed the model the engine's rendered text table, unbounded and untyped.
Three wrong answers came out of that one decision, and all three are pinned here:

* a zero total rendered as a blank cell, so "what is my net worth as of
  2024-03-01?" was answered "there are no entries in your ledger" on a ledger
  worth 4500.00 USD, and "how much EUR do I hold?" with "there is no EUR
  balance" on one holding 800.00 EUR (w3/447);
* nothing said what a row was, so "how many transactions?" was answered with the
  posting count — 22 for 11 transactions — and nothing steered "largest" to
  `ORDER BY … DESC` (w3/455);
* nothing bounded the result, so enumerating a real-sized ledger put megabytes
  into the request body and the gateway refused it (w3/448).

The queries below run against the real engine on the note's own fixture, so what
they pin is the number the model is shown, not a prompt's wording — the prompt
may be reworded, the 11 and the 1200.00 may not. The model's own side is a
**simulation**: the stub server answers the OpenAI protocol from localhost, so
the transport and budget tests pin `bea`'s reaction rather than the hosted
service's behavior.
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.ask import results
from cli.ask.agent import MAX_OUTPUT_TOKENS, BqlDeps, make_agent, model_settings
from cli.main import app
from tests.conftest import StubModel, model_answer, model_tool_call

# The 11-transaction, 22-posting multi-currency fixture from w3/455, holding
# 800.00 EUR in Assets:Bank:Euro and 2,414.75 USD in checking.
MULTI = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Assets:Bank:Euro EUR
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Salary USD
2024-01-01 open Expenses:Rent USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Expenses:Travel USD
2024-01-01 open Expenses:Utilities USD
2024-01-01 open Equity:Opening-Balances

2024-01-01 * "Opening" "seed usd"
  Assets:Bank:Checking   2000.00 USD
  Equity:Opening-Balances
2024-01-01 * "Opening" "seed eur"
  Assets:Bank:Euro   800.00 EUR
  Equity:Opening-Balances
2024-01-15 * "ACME Corp" "January salary"
  Assets:Bank:Checking   4000.00 USD
  Income:Salary
2024-02-01 * "Landlord" "February rent"
  Expenses:Rent   1200.00 USD
  Assets:Bank:Checking
2024-02-03 * "Whole Foods" "groceries"
  Expenses:Food   150.25 USD
  Assets:Bank:Checking
2024-02-14 * "Trattoria" "dinner"
  Expenses:Food   64.75 USD
  Assets:Cash
2024-02-20 * "City Power" "electricity"
  Expenses:Utilities   95.00 USD
  Assets:Bank:Checking
2024-03-02 * "United" "flight to Denver"
  Expenses:Travel   430.00 USD
  Assets:Bank:Checking
2024-03-10 * "Landlord" "March rent"
  Expenses:Rent   1200.00 USD
  Assets:Bank:Checking
2024-03-18 * "Whole Foods" "groceries"
  Expenses:Food   210.00 USD
  Assets:Bank:Checking
2024-03-25 * "ATM" "cash withdrawal"
  Assets:Cash   300.00 USD
  Assets:Bank:Checking
"""


@pytest.fixture
def multi(tmp_path: Path) -> Path:
    path = tmp_path / "multi.bean"
    path.write_text(MULTI, encoding="utf-8")
    return path


def query_tool(file: Path) -> Any:
    """The `run_bql_query` tool, callable the way the model calls it."""
    agent = make_agent("gpt-4o", "http://unused", "test")
    function = agent._function_toolset.tools["run_bql_query"].function
    ctx = SimpleNamespace(deps=BqlDeps(file=file))

    def run(query: str) -> str:
        return str(function(ctx, query))

    return run


# ── w3/447: a zero total is a zero, and says so ────────────────────────────


def test_a_total_that_nets_to_zero_is_a_visible_zero_and_not_a_blank(multi: Path) -> None:
    """The cell the model read as "no data". It is one row, and the row says 0."""
    answer = query_tool(multi)("SELECT sum(position) WHERE currency = 'EUR'")

    assert "1 row(s)" in answer, "the row count is what tells a zero from no rows"
    assert "0" in answer
    assert not any(line.strip() == "" for line in answer.splitlines()), "no whitespace-only cell survives"
    assert "cancel out" in answer, "and the result explains why the zero is not missing data"


def test_the_zero_result_points_at_the_query_that_answers_the_question(multi: Path) -> None:
    """A blank told the model nothing; a zero plus a filter hint is actionable."""
    answer = query_tool(multi)("SELECT sum(position) WHERE date <= 2024-03-01")

    assert "account ~ '^(Assets|Liabilities)'" in answer


def test_the_holdings_the_zero_hid_are_reachable_and_correct(multi: Path) -> None:
    """The right query on the same file: 800.00 EUR, which `ask` denied existed."""
    answer = query_tool(multi)("SELECT account, sum(position) WHERE account = 'Assets:Bank:Euro' GROUP BY account")

    assert "800.00 EUR" in answer


def test_no_rows_is_reported_as_no_rows_rather_than_as_a_zero(multi: Path) -> None:
    answer = query_tool(multi)("SELECT date, narration WHERE narration = 'no such thing'")

    assert "0 row(s)" in answer
    assert "not an error and not a zero" in answer


# ── w3/455: the numbers the prompt promises, on the note's fixture ──────────


def test_counting_entries_and_counting_postings_are_told_apart(multi: Path) -> None:
    run = query_tool(multi)

    postings = run("SELECT count(*)")
    entries = run("SELECT count(*) FROM #entries WHERE type = 'transaction'")

    assert "22" in postings
    assert "counts postings, not transactions" in postings, "22 must not be readable as 22 transactions"
    assert "11" in entries
    assert "from the entries table" in entries


def test_the_largest_expense_is_the_largest(multi: Path) -> None:
    """The ranking query the prompt now documents returns 1200.00, not 64.75."""
    answer = query_tool(multi)(
        "SELECT date, payee, narration, number WHERE account ~ '^Expenses' ORDER BY number DESC LIMIT 1"
    )

    assert "1200.00" in answer
    assert "Landlord" in answer
    assert "64.75" not in answer, "ascending order is what named the smallest expense"


def test_the_grain_of_a_row_travels_with_every_result(multi: Path) -> None:
    answer = query_tool(multi)("SELECT date, payee WHERE account ~ '^Expenses'")

    assert "row(s) from the postings table" in answer
    assert "one row per posting" in answer


def test_balances_and_period_totals_still_come_back_right(multi: Path) -> None:
    """The question shapes w3/455 recorded as correct, which must not regress."""
    run = query_tool(multi)

    assert "2414.75 USD" in run("SELECT sum(position) WHERE account = 'Assets:Bank:Checking'")
    assert "1510.00 USD" in run(
        "SELECT sum(position) WHERE account ~ '^Expenses' AND date >= 2024-02-01 AND date < 2024-03-01"
    )
    accounts = run("SELECT account, sum(position) WHERE account ~ '^Assets' GROUP BY account")
    for holding in ("2414.75 USD", "800.00 EUR", "235.25 USD"):
        assert holding in accounts


def test_the_documented_prompt_examples_all_run(multi: Path) -> None:
    """An example the engine rejects is worse than no example (w3/455 item 3)."""
    run = query_tool(multi)
    for query in (
        "SELECT count(*) FROM #entries WHERE type = 'transaction'",
        "SELECT date, payee, narration, number WHERE account ~ '^Expenses' ORDER BY number DESC LIMIT 1",
        "SELECT sum(position) FROM CLOSE ON 2024-03-01 WHERE account ~ '^(Assets|Liabilities)'",
        "SELECT account, sum(position) WHERE account ~ '^(Assets|Liabilities)' AND date <= 2024-03-01 GROUP BY account",
        "SELECT account, sum(position) WHERE currency = 'EUR' AND account ~ '^(Assets|Liabilities)' GROUP BY account",
    ):
        answer = run(query)
        assert "row(s)" in answer, query


# ── w3/448: the result is bounded, and says that it was ────────────────────


def _rows(count: int) -> dict[str, object]:
    return {
        "columns": [{"name": "date", "type": "date"}, {"name": "narration", "type": "str"}],
        "rows": [["2024-01-01", f"purchase number {index}"] for index in range(count)],
        "errors": [],
    }


def test_an_enormous_result_is_truncated_with_its_disclosure() -> None:
    answer = results.format_result("SELECT date, narration", _rows(15_000))

    assert len(answer) <= results.MAX_CHARS + 500, "the character budget is what the gateway refuses past"
    assert "15000 rows" in answer, "the model is told how much it is not seeing"
    assert "truncated" in answer
    assert "Say in your answer that the result was truncated" in answer


def test_the_row_cap_holds_even_when_the_rows_are_tiny() -> None:
    answer = results.format_result("SELECT date", {"columns": [{"name": "d", "type": "str"}], "rows": [["x"]] * 5_000})

    assert len([line for line in answer.splitlines() if line == "x"]) == results.MAX_ROWS


def test_a_result_that_fits_is_not_truncated_and_says_nothing_about_it() -> None:
    answer = results.format_result("SELECT date, narration", _rows(3))

    assert "truncated" not in answer
    assert "3 row(s)" in answer


def test_an_enumeration_of_a_real_ledger_stays_within_budget_on_the_wire(
    tmp_path: Path, stub_model: StubModel, monkeypatch: pytest.MonkeyPatch, logged_in: None
) -> None:
    """End to end: the tool result that reaches the request body is bounded."""
    ledger = tmp_path / "big.bean"
    lines = [
        'option "operating_currency" "USD"',
        "2024-01-01 open Assets:Bank:Checking USD",
        "2024-01-01 open Expenses:Misc USD",
        "2024-01-01 open Equity:Opening USD",
        '2024-01-01 * "Opening" "seed"\n  Assets:Bank:Checking 100000.00 USD\n  Equity:Opening',
    ]
    for index in range(600):
        lines.append(
            f'2024-02-01 * "Vendor {index}" "purchase number {index}"\n'
            "  Expenses:Misc 12.34 USD\n  Assets:Bank:Checking"
        )
    ledger.write_text("\n".join(lines) + "\n", encoding="utf-8")
    monkeypatch.setenv("BEA_API_URL", stub_model.url)
    stub_model.reply = lambda n: (
        model_tool_call("run_bql_query", {"query": "SELECT date, payee, narration, number, account"})
        if n == 1
        else model_answer("Here are the first rows; the result was truncated.")
    )

    result = CliRunner().invoke(app, ["--file", str(ledger), "ask", "list every transaction", "--print"])

    assert result.exit_code == 0, result.output
    tool_results = [
        str(message.get("content"))
        for message in stub_model.requests[1]["messages"]  # type: ignore[union-attr]
        if message.get("role") == "tool"  # type: ignore[union-attr]
    ]
    assert tool_results, stub_model.requests[1]
    assert "truncated" in tool_results[0]
    assert len(tool_results[0]) <= results.MAX_CHARS + 500
    assert len(str(stub_model.requests[1])) < 100_000, "the body the gateway refused was megabytes"


# ── w1/096: one long cell cannot carry a result past the budget ────────────

HUGE = 300_000


def _one_column(*values: str) -> dict[str, object]:
    return {"columns": [{"name": "narration", "type": "str"}], "rows": [[value] for value in values]}


@pytest.mark.parametrize("trailing_rows", [0, 3], ids=["alone", "first-of-four"])
def test_a_first_row_over_budget_is_cut_and_says_so(trailing_rows: int) -> None:
    answer = results.format_result("SELECT narration", _one_column("x" * HUGE, *["short"] * trailing_rows))

    assert len(answer) <= results.MAX_CHARS + 500, "one cell carried the result past the budget"
    assert f"…({HUGE - answer.count('x')} chars cut)" in answer, "the cut is not marked where it was made"
    assert "truncated" in answer
    assert "Say in your answer that the result was truncated" in answer
    assert f"showing the first 1 of {1 + trailing_rows} rows" in answer


def test_a_long_row_that_fits_is_left_whole() -> None:
    value = "y" * (results.MAX_CHARS // 2)

    answer = results.format_result("SELECT narration", _one_column(value))

    assert value in answer
    assert "cut" not in answer and "truncated" not in answer


def test_one_huge_narration_stays_within_budget_on_the_wire(
    tmp_path: Path, stub_model: StubModel, monkeypatch: pytest.MonkeyPatch, logged_in: None
) -> None:
    ledger = tmp_path / "huge.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2024-01-01 open Assets:Checking USD\n"
        "2024-01-01 open Expenses:Food USD\n"
        f'2024-02-01 * "Big" "{"x" * HUGE}"\n  Expenses:Food 5.00 USD\n  Assets:Checking\n',
        encoding="utf-8",
    )
    monkeypatch.setenv("BEA_API_URL", stub_model.url)
    stub_model.reply = lambda n: (
        model_tool_call("run_bql_query", {"query": "SELECT narration WHERE payee = 'Big'"})
        if n == 1
        else model_answer("It is very long; the result was truncated.")
    )

    result = CliRunner().invoke(app, ["--file", str(ledger), "ask", "query the big row", "--print"])

    assert result.exit_code == 0, result.output
    assert stub_model.count == 2
    assert len(str(stub_model.requests[1])) < 30_000, "the whole cell rode along in the next request"


# ── w3/446: every request carries an explicit output cap ───────────────────


def test_the_output_cap_is_declared_rather_than_left_to_the_model_default() -> None:
    assert model_settings()["max_tokens"] == MAX_OUTPUT_TOKENS
    assert 0 < MAX_OUTPUT_TOKENS < 4096, "big enough for an answer, small enough to fit a window"


def test_the_cap_is_on_the_wire(
    tmp_path: Path, stub_model: StubModel, monkeypatch: pytest.MonkeyPatch, logged_in: None
) -> None:
    """Read from the outbound body, because the note's claim was about the body."""
    ledger = tmp_path / "main.bean"
    ledger.write_text("2024-01-01 open Assets:Cash USD\n", encoding="utf-8")
    monkeypatch.setenv("BEA_API_URL", stub_model.url)
    stub_model.reply = lambda n: model_answer("ok")

    result = CliRunner().invoke(app, ["--file", str(ledger), "ask", "hello", "--print"])

    assert result.exit_code == 0, result.output
    body = stub_model.requests[0]
    # The SDK spells the cap with the chat-completions API's current key; either
    # name is the cap, and the defect was that neither was sent at all.
    cap = body.get("max_completion_tokens", body.get("max_tokens"))
    assert cap == MAX_OUTPUT_TOKENS, body


# ── w3/448: a connection failure reads the same in `ask` and in `cloud` ────


def test_a_dead_proxy_gets_the_network_sentence_the_rest_of_the_cli_uses(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, logged_in: None
) -> None:
    """`ask` said `Connection error.`; `bea cloud status` said what had happened."""
    ledger = tmp_path / "main.bean"
    ledger.write_text("2024-01-01 open Assets:Cash USD\n", encoding="utf-8")
    monkeypatch.setenv("BEA_API_URL", "http://127.0.0.1:9")
    runner = CliRunner()

    asked = runner.invoke(app, ["--file", str(ledger), "ask", "hello", "--print"])
    status = runner.invoke(app, ["cloud", "status"])

    assert asked.exit_code == 1, asked.output
    assert "Could not reach the server" in asked.output
    assert "Connection error." not in asked.output, "the SDK's own sentence is the defect"
    assert "Could not reach the server" in status.output, "the control the note compared against"


def test_a_quota_refusal_names_the_quota_and_when_it_returns() -> None:
    """The proxy's own code, read wherever the envelope happens to nest it."""
    from pydantic_ai.exceptions import ModelHTTPError

    from cli.ask.agent import translated_failures
    from cli.errors import BeaError

    body = {
        "ok": False,
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": '{"success":false,"error":{"code":"QUOTA_EXCEEDED","message":"API usage quota exceeded",'
            '"exhaustedWindows":["FIVE_HOUR"],"blockedUntil":"2026-09-26T13:06:15Z"}}',
        },
    }

    with pytest.raises(BeaError) as caught:
        with translated_failures():
            raise ModelHTTPError(status_code=402, model_name="gpt-4o", body=body)

    message = str(caught.value)
    assert "quota" in message
    assert "2026-09-26T13:06:15Z" in message
    assert "bea query" in message, "there is something to do while the window is closed"
    assert "gpt-4o" not in message
