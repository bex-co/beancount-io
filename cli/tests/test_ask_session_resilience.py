"""An `ask` session outlives a Ctrl-C and a failed turn, and owns its budget (w3/449, w3/454).

Three ways the flagship interactive surface used to die, all in the same five
lines of `repl.py`:

1. `KeyboardInterrupt` and `EOFError` shared one handler, so Ctrl-C — which the
   session's own `?` help and toolbar advertise as "cancel current input" — exited
   and discarded the conversation;
2. nothing caught what the turn could raise, so one 5xx from the proxy, or one
   tool the model could not get right, ended the process with the history lost;
3. the AI SDK's failures reached the user verbatim: a third-party limit name, a
   knob `bea` does not expose, and a link to another project's documentation.

And `ask` — the one command that costs money per call — never set a usage
ceiling, so a tool-calling loop spent the SDK's default 50 hosted requests.

The failures here are raised locally or answered by a local stub server, so what
these tests pin is bea's reaction, not the hosted service's behavior.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from pydantic_ai.exceptions import ModelHTTPError, UnexpectedModelBehavior, UsageLimitExceeded
from typer.testing import CliRunner

from cli.ask import repl
from cli.ask.agent import REQUEST_LIMIT, TOOL_CALLS_LIMIT, BqlDeps, translated_failures, usage_limits
from cli.errors import AuthError, BeaError
from cli.main import app
from tests.conftest import StubModel, model_answer, model_tool_call

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Opening"
  Assets:Cash 100.00 USD
  Equity:Opening
"""

#: What the SDK's own sentences leak, and must not reach a user.
SDK_LEAKS = ("ai.pydantic.dev", "request_limit", "max retries count", "Consider raising")


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


# ── the budget is the CLI's own, and so are the words when it trips ────────


def test_the_question_budget_is_set_rather_than_inherited() -> None:
    limits = usage_limits()

    assert limits.request_limit == REQUEST_LIMIT
    assert limits.tool_calls_limit == TOOL_CALLS_LIMIT
    assert REQUEST_LIMIT < 50, "the point is to be cheaper than the SDK's default"


def test_print_mode_spends_the_budget_it_declares(ledger: Path, logged_in: None) -> None:
    seen: dict[str, Any] = {}

    class _Recording:
        def run_sync(self, *args: object, **kwargs: object) -> object:
            seen.update(kwargs)
            return type("R", (), {"output": "ok"})()

    with patch("cli.ask.agent.make_agent", return_value=_Recording()):
        result = CliRunner().invoke(app, ["--file", str(ledger), "ask", "hi", "--print"])

    assert result.exit_code == 0, result.output
    assert seen["usage_limits"] == usage_limits()


@pytest.mark.parametrize(
    "exc",
    [
        pytest.param(UsageLimitExceeded("The next request would exceed the request_limit of 50."), id="usage-limit"),
        pytest.param(
            UnexpectedModelBehavior(
                "Tool 'run_bql_query' exceeded max retries count of 2. Consider raising the retry limit, "
                "or see the docs on tool retries: https://ai.pydantic.dev/tools-advanced/#tool-retries"
            ),
            id="retries-exhausted",
        ),
    ],
)
def test_sdk_run_failures_are_retold_in_the_cli_s_own_words(exc: Exception) -> None:
    with pytest.raises(BeaError) as caught:
        with translated_failures():
            raise exc

    message = str(caught.value)
    assert "nothing was written to your ledger" in message
    for leaked in SDK_LEAKS:
        assert leaked not in message, f"{leaked!r} leaked from the SDK exception"
    assert caught.value.exit_code == 1, "the documented catch-all code, unchanged"


def test_http_failures_keep_their_existing_translation() -> None:
    """The arms added for the SDK's run errors must not shadow the status table."""
    with pytest.raises(AuthError):
        with translated_failures():
            raise ModelHTTPError(status_code=401, model_name="gpt-4o", body={"message": "nope"})


# ── the session survives what one turn can raise ──────────────────────────


class _Session:
    """A prompt that replays a script: a string is typed, an exception is pressed."""

    def __init__(self, script: list[object]) -> None:
        self._script = list(script)

    def prompt(self, **kwargs: object) -> str:
        if not self._script:
            raise EOFError
        item = self._script.pop(0)
        if isinstance(item, BaseException):
            raise item
        return str(item)


class _Agent:
    """An agent whose turns are scripted: an exception, or an answer."""

    def __init__(self, outcomes: list[object]) -> None:
        self._outcomes = list(outcomes)
        self.histories: list[list[Any]] = []

    def run_sync(self, prompt: str, *, deps: object, message_history: list[Any], **kwargs: object) -> Any:
        self.histories.append(list(message_history))
        outcome = self._outcomes.pop(0)
        if isinstance(outcome, BaseException):
            raise outcome
        return type("R", (), {"output": str(outcome), "all_messages": lambda self: [prompt, outcome]})()


def _run(script: list[object], outcomes: list[object], ledger: Path, monkeypatch: pytest.MonkeyPatch) -> _Agent:
    agent = _Agent(outcomes)
    monkeypatch.setattr(repl, "_make_session", lambda hint, key_bindings=None: _Session(script))
    repl.run_repl(agent, BqlDeps(file=ledger))  # type: ignore[arg-type]
    return agent


def test_ctrl_c_at_the_prompt_clears_the_line_and_keeps_the_session(
    ledger: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    agent = _run(["first", KeyboardInterrupt(), "second"], ["one", "two"], ledger, monkeypatch)

    assert len(agent.histories) == 2, "the interrupt cost the line, not the session"
    assert agent.histories[1] == ["first", "one"], "the second turn still carries the first"
    assert "Goodbye." in capsys.readouterr().out, "Ctrl-D, at the end, still exits"


def test_ctrl_c_during_a_turn_abandons_only_that_turn(
    ledger: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    agent = _run(["first", "second", "third"], ["one", KeyboardInterrupt(), "three"], ledger, monkeypatch)

    assert len(agent.histories) == 3
    assert agent.histories[1] == agent.histories[2] == ["first", "one"], "the cancelled turn left no trace"
    assert "cancelled" in capsys.readouterr().out


def test_a_failed_turn_costs_the_turn_and_not_the_conversation(
    ledger: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    agent = _run(
        ["first", "second", "third"],
        ["one", BeaError("Server error (Upstream model provider failed.)."), "three"],
        ledger,
        monkeypatch,
    )

    assert len(agent.histories) == 3
    assert agent.histories[2] == ["first", "one"], "the failed turn did not poison the history"
    captured = capsys.readouterr()
    assert "Error: Server error" in captured.err
    assert "three" in captured.out, "the session answered the question after the failure"


def test_a_rejected_credential_ends_the_session_with_its_documented_code(
    ledger: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The one deliberate exception: every later turn would fail the same way."""
    with pytest.raises(AuthError) as caught:
        _run(["first", "second"], [AuthError("Not authorized. Run 'bea cloud login'.")], ledger, monkeypatch)

    assert caught.value.exit_code == 3


# ── end to end, on a real terminal and against a local stub ───────────────


def test_ctrl_c_on_a_real_terminal_keeps_the_session_and_its_history(
    ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    stub_model.reply = lambda n: model_answer(f"answer {n}")

    run = ask_on_a_terminal(
        ["--file", str(ledger), "ask"],
        [
            "what is my balance",
            "@ENTER",
            "@WAIT:answer 1",
            "@WAIT:❯",
            "@CTRL_C",
            "and last month",
            "@ENTER",
            "@WAIT:answer 2",
            "@WAIT:❯",
            "@CTRL_D",
        ],
    )

    assert run.status == 0, run.screen
    assert stub_model.count == 2, "both questions were asked despite the interrupt"
    assert "what is my balance" in " ".join(stub_model.prompts(1)), "the second turn carried the first"
    assert "answer 2" in run.screen


def test_a_tool_loop_stops_at_the_cli_s_own_ceiling_and_explains_itself(
    ledger: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    """A model that never stops calling tools: bounded, reported, and no write."""
    before = ledger.read_bytes()
    stub_model.reply = lambda n: model_tool_call("run_bql_query", {"query": "SELECT DISTINCT account"})

    run = ask_on_a_terminal(["--file", str(ledger), "ask", "--print", "loop"], [])

    assert run.status == 1, run.screen
    assert stub_model.count <= REQUEST_LIMIT, f"the ceiling did not hold: {stub_model.count} requests"
    assert stub_model.count > 1, "the loop should have been given room to be a loop"
    for leaked in SDK_LEAKS:
        assert leaked not in run.screen, f"{leaked!r} leaked to the terminal"
    assert "nothing was written to your ledger" in run.screen
    assert ledger.read_bytes() == before
