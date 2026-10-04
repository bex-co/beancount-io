"""A turn that fails after an approved write says so, and remembers it (w1/095).

The failure sentences `ask` prints were written for `--print`, where a write is
impossible, so each ended "nothing was written to your ledger" unconditionally.
In a session the user can approve a write and the turn can then fail — a loop
that hits the question budget, a quota refusal, tool arguments the model cannot
get right, a 5xx, a Ctrl-C — and the session then denied the entry it had just
added. It also dropped the failed turn from the conversation, so the next
question went out without the "Added …" tool result: both the user and the model
were set up to add the entry a second time.

The model is a local stub; nothing here describes the hosted AI service.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import pytest
from pydantic_ai.exceptions import ModelHTTPError, UnexpectedModelBehavior, UsageLimitExceeded

from cli.ask.agent import BqlDeps, translated_failures
from cli.errors import BeaError
from tests.conftest import StubModel, model_answer, model_tool_call

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Opening"
  Assets:Checking 100.00 USD
  Equity:Opening
"""
DIRECTIVE = '2024-03-01 * "Stub" "AI write"\n  Assets:Checking  -5 USD\n  Expenses:Food  5 USD\n'
FOLLOW_UP = "what did you just add"
DENIAL = "nothing was written"
APPROVE = ["add it", "@ENTER", "@WAIT:Append this directive to the ledger", "@ENTER"]


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _bad_arguments(n: int) -> dict[str, object]:
    """A tool call whose arguments are not JSON, however often it is retried."""
    call = model_tool_call("run_bql_query", {}, call_id=f"call_{n}")
    call["message"]["tool_calls"][0]["function"]["arguments"] = "{not json"  # type: ignore[index]
    return call


FAILURES: dict[str, Any] = {
    "usage-limit": lambda n: model_tool_call("run_bql_query", {"query": "SELECT DISTINCT account"}, f"call_{n}"),
    "quota": lambda n: (429, {"error": {"code": "QUOTA_EXCEEDED", "message": "API usage quota exceeded"}}),
    "bad-arguments": _bad_arguments,
    "server-error": lambda n: (500, {"message": "upstream boom"}),
}


def _tool_results(request: dict[str, object]) -> list[str]:
    messages: list[dict[str, object]] = request.get("messages") or []  # type: ignore[assignment]
    return [str(message.get("content")) for message in messages if message.get("role") == "tool"]


def _follow_up_request(stub: StubModel) -> dict[str, object]:
    for request in stub.requests:
        messages: list[dict[str, object]] = request.get("messages") or []  # type: ignore[assignment]
        if messages and messages[-1].get("content") == FOLLOW_UP:
            return request
    raise AssertionError("the follow-up question never reached the model")


def _answers_the_follow_up(stub: StubModel, failure: Any) -> Any:
    def reply(n: int) -> object:
        messages: list[dict[str, object]] = stub.requests[-1].get("messages") or []  # type: ignore[assignment]
        if messages and messages[-1].get("content") == FOLLOW_UP:
            return model_answer("You added one entry.")
        if n == 1:
            return model_tool_call("write_directive", {"directive": DIRECTIVE}, call_id="write_1")
        return failure(n)

    return reply


@pytest.mark.parametrize("failure", list(FAILURES))
def test_a_turn_that_fails_after_a_write_names_it_and_keeps_it(
    failure: str, ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    stub_model.reply = _answers_the_follow_up(stub_model, FAILURES[failure])

    run = ask_on_a_terminal(
        ["--file", str(ledger), "ask"],
        [*APPROVE, "@WAIT:Error", "@WAIT:❯", FOLLOW_UP, "@ENTER", "@WAIT:You added", "@WAIT:❯", "@CTRL_D"],
    )

    assert run.status == 0, run.screen
    assert ledger.read_text(encoding="utf-8").count('"AI write"') == 1, "the approved write landed once"
    error = run.screen[run.screen.index("Error") :]
    assert DENIAL not in error, f"the failure denied the write that happened: {run.screen}"
    assert "1 directive(s)" in error and "main.bean" in error, run.screen
    assert any("Added 1 directive(s)" in result for result in _tool_results(_follow_up_request(stub_model))), (
        "the next question went out without the write's tool result"
    )


def test_ctrl_c_after_a_write_names_it_and_keeps_it(
    ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    def slow(n: int) -> object:
        time.sleep(10)
        return model_answer("too late")

    stub_model.reply = _answers_the_follow_up(stub_model, slow)

    run = ask_on_a_terminal(
        ["--file", str(ledger), "ask"],
        [
            *APPROVE,
            "@REQUESTS:2",
            "@CTRL_C",
            "@WAIT:cancelled",
            "@WAIT:❯",
            FOLLOW_UP,
            "@ENTER",
            "@WAIT:You added",
            "@WAIT:❯",
            "@CTRL_D",
        ],
    )

    assert run.status == 0, run.screen
    assert ledger.read_text(encoding="utf-8").count('"AI write"') == 1
    cancelled = run.screen[run.screen.index("cancelled") :]
    assert "1 directive(s)" in cancelled and "main.bean" in cancelled, run.screen
    assert any("Added 1 directive(s)" in result for result in _tool_results(_follow_up_request(stub_model)))


# ── the sentences themselves ───────────────────────────────────────────────


@pytest.mark.parametrize(
    "exc",
    [
        pytest.param(UsageLimitExceeded("limit"), id="usage-limit"),
        pytest.param(UnexpectedModelBehavior("bad tool"), id="agent-run-error"),
        pytest.param(
            ModelHTTPError(status_code=429, model_name="m", body={"error": {"code": "QUOTA_EXCEEDED"}}), id="quota"
        ),
        pytest.param(ModelHTTPError(status_code=500, model_name="m", body={"message": "boom"}), id="server-error"),
    ],
)
def test_a_write_recorded_this_turn_is_named_instead_of_denied(exc: Exception, tmp_path: Path) -> None:
    deps = BqlDeps(file=tmp_path / "main.bean")

    with pytest.raises(BeaError) as caught:
        with translated_failures(deps):
            deps.writes.append((1, "/books/main.bean"))
            raise exc

    message = str(caught.value)
    assert DENIAL not in message
    assert "1 directive(s) to /books/main.bean" in message


def test_the_record_is_per_turn(tmp_path: Path) -> None:
    deps = BqlDeps(file=tmp_path / "main.bean", writes=[(1, "/books/main.bean")])

    with pytest.raises(BeaError) as caught:
        with translated_failures(deps):
            raise UsageLimitExceeded("limit")

    assert "nothing was written to your ledger" in str(caught.value), "a previous turn's write is not this one's"
