"""Blank questions never spend a model request or prefill the interactive prompt."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from typer.testing import CliRunner

from cli.main import app
from tests.conftest import StubModel

runner = CliRunner()
REQUIRED = "A question is required without a terminal (or with --print)."


@pytest.mark.parametrize("question", ["   ", "\t\n", "\u00a0\u2003"])
@pytest.mark.parametrize("options", [["--print"], []], ids=["print", "piped"])
def test_blank_question_never_constructs_an_agent(tmp_bean_file: Path, question: str, options: list[str]) -> None:
    with patch("cli.ask.agent.make_agent") as make_agent:
        result = runner.invoke(app, ["--file", str(tmp_bean_file), "ask", *options, question])

    assert result.exit_code == 2, result.output
    assert REQUIRED in result.stderr
    make_agent.assert_not_called()


def test_blank_question_never_reaches_the_model(
    tmp_bean_file: Path, stub_model: StubModel, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("BEA_TOKEN", "stub-token")
    monkeypatch.setenv("BEA_API_URL", stub_model.url)

    result = runner.invoke(app, ["--file", str(tmp_bean_file), "ask", "--print", "   "])

    assert result.exit_code == 2, result.output
    assert REQUIRED in result.stderr
    assert stub_model.count == 0


def test_blank_interactive_default_leaves_the_prompt_empty(tmp_bean_file: Path, logged_in: None) -> None:
    session = Mock()
    session.prompt.side_effect = EOFError
    with (
        patch("cli.context._stdin_is_a_terminal", return_value=True),
        patch("cli.ask.repl._make_session", return_value=session),
    ):
        result = runner.invoke(app, ["--file", str(tmp_bean_file), "ask", "   "])

    assert result.exit_code == 0, result.output
    assert session.prompt.call_args.kwargs["default"] == ""
    assert "Goodbye" in result.output


def test_nonblank_print_question_is_sent_without_rewriting_it(
    tmp_bean_file: Path, stub_model: StubModel, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("BEA_TOKEN", "stub-token")
    monkeypatch.setenv("BEA_API_URL", stub_model.url)
    question = "  What is my balance?\n"

    result = runner.invoke(app, ["--file", str(tmp_bean_file), "ask", "--print", question])

    assert result.exit_code == 0, result.output
    assert stub_model.count == 1
    assert question in stub_model.prompts(0)
    assert "stub answer" in result.output
