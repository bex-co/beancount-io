"""The BQL tool survives a NUL and a leading dash, and sessions name writes on any failure (w5/744).

A NUL in the model's query made `Popen` raise `ValueError`, which only
`BeaError` was caught against: `--print` exited 1 with "embedded null
byte" and the model never saw a tool result, and a session printed the
failure without the "already wrote" note. A query starting with `-` was
parsed as an engine option, so the model got the engine's usage text.
The query now travels after `--`, a NUL comes back as a tool error to
fix, and the session names earlier writes on every failure path.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

from cli.ask import repl
from cli.ask.agent import BqlDeps
from tests.conftest import StubModel, model_answer, model_tool_call
from tests.test_into_glob_create import _env

LEDGER = 'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n'
NUL_QUERY = 'SELECT account WHERE payee = "a\x00b"'
DASH_QUERY = "-- Food total\nSELECT account"


def _ask(tmp_path: Path, ledger: Path, stub: StubModel) -> subprocess.CompletedProcess[str]:
    env = _env(tmp_path)
    env.update(BEA_TOKEN="stub-token", BEA_API_URL=stub.url, NO_PROXY="127.0.0.1,localhost")
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(ledger), "ask", "--print", "q"],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _tool_results(stub: StubModel, request: int) -> list[str]:
    messages = stub.requests[request].get("messages") or []
    return [str(message.get("content")) for message in messages if message.get("role") == "tool"]  # type: ignore[union-attr]


def test_a_nul_query_comes_back_as_a_tool_error(tmp_path: Path, stub_model: StubModel) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    stub_model.reply = lambda n: (
        model_tool_call("run_bql_query", {"query": NUL_QUERY}, "c1") if n == 1 else model_answer("ok")
    )

    result = _ask(tmp_path, ledger, stub_model)

    assert result.returncode == 0, result.stderr
    (tool,) = _tool_results(stub_model, 1)
    assert "NUL" in tool, tool
    assert "embedded null byte" not in tool and "Traceback" not in result.stderr


def test_a_leading_dash_query_gets_the_bql_error(tmp_path: Path, stub_model: StubModel) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    calls = {1: {"query": DASH_QUERY}, 2: {"query": "--help"}}
    stub_model.reply = lambda n: (
        model_tool_call("run_bql_query", calls[n], f"c{n}") if n in calls else model_answer("ok")
    )

    result = _ask(tmp_path, ledger, stub_model)

    assert result.returncode == 0, result.stderr
    for request in (1, 2):
        tool = _tool_results(stub_model, request)[-1]
        assert "syntax error" in tool, tool
        assert "No such option" not in tool, tool
        assert "bea-engine query" not in tool and "Usage:" not in tool, tool


def test_an_untranslated_failure_after_a_write_names_it(
    tmp_path: Path, stub_model: StubModel, ask_on_a_terminal: Any
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2024-01-01 open Assets:Checking USD\n"
        "2024-01-01 open Expenses:Food USD\n"
        "2024-01-01 open Equity:Opening USD\n"
        '2024-01-02 * "Opening"\n'
        "  Assets:Checking 100.00 USD\n"
        "  Equity:Opening\n",
        encoding="utf-8",
    )
    directive = '2024-03-01 * "Stub" "AI write"\n  Assets:Checking  -5 USD\n  Expenses:Food  5 USD\n'

    def reply(n: int) -> object:
        if n == 1:
            return model_tool_call("write_directive", {"directive": directive}, call_id="write_1")
        return model_tool_call("run_bql_query", {"query": NUL_QUERY}, call_id=f"call_{n}")

    stub_model.reply = reply
    run = ask_on_a_terminal(
        ["--file", str(ledger), "ask"],
        [
            "add it",
            "@ENTER",
            "@WAIT:Append this directive to the ledger",
            "y",
            "@ENTER",
            # The confirmation selector also contains ❯; wait past it before
            # treating the next arrow as the conversation's fresh prompt.
            "@WAIT:had already written 1 directive(s)",
            "@WAIT:❯",
            "@CTRL_D",
        ],
    )

    assert run.status == 0, run.screen
    assert ledger.read_text(encoding="utf-8").count('"AI write"') == 1, run.screen
    assert "had already written 1 directive(s)" in run.screen, run.screen
    assert "nothing was written" not in run.screen, run.screen


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


class _WriteThenBoom:
    """The first turn records an approved write, then fails with no translation.

    The failure is raised locally: every stub-reachable failure translates, so
    this pins bea's reaction to an SDK or host failure no arm knows.
    """

    def __init__(self, ledger: Path) -> None:
        self._ledger = ledger
        self._failed = False

    def run_sync(self, prompt: str, *, deps: Any, message_history: list[Any], **kwargs: object) -> Any:
        if not self._failed:
            self._failed = True
            deps.writes.append((1, str(self._ledger)))
            raise RuntimeError("boom-744")
        return type("R", (), {"output": "two", "all_messages": lambda self: [prompt, "two"]})()


def test_a_failure_no_arm_translates_still_names_the_write(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    monkeypatch.setattr(repl, "_make_session", lambda hint, key_bindings=None: _Session(["first", "second"]))

    repl.run_repl(_WriteThenBoom(ledger), BqlDeps(file=ledger))  # type: ignore[arg-type]

    captured = capsys.readouterr()
    assert "boom-744" in captured.err
    assert "had already written 1 directive(s)" in captured.err, captured.err
    assert "nothing was written" not in captured.err, captured.err
    assert "two" in captured.out, "the session answered the question after the failure"


def test_naming_writes_covers_failures_no_arm_translates(tmp_path: Path) -> None:
    from cli.ask.agent import BqlDeps, _naming_writes

    deps = BqlDeps(file=tmp_path / "main.bean")
    deps.writes.append((1, str(tmp_path / "main.bean")))

    named = _naming_writes(ValueError("embedded null byte"), deps)

    assert "embedded null byte" in str(named)
    assert "had already written 1 directive(s)" in str(named)


def test_naming_writes_adds_nothing_without_writes(tmp_path: Path) -> None:
    from cli.ask.agent import BqlDeps, _naming_writes

    named = _naming_writes(ValueError("boom"), BqlDeps(file=tmp_path / "main.bean"))

    assert str(named) == "boom"
