"""`bea mcp` over a real stdio pipe (w21/m8).

A scripted client speaks newline-delimited JSON-RPC to the server process.
Each tool's answer must equal the `bea --json` command it wraps, nothing but
protocol frames may reach stdout, and no call may change the ledger.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

from cli.commands import mcp as mcp_module
from tests.report_helpers import CLI_ROOT, bea, run_env, write_ledger

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Open"
  Assets:Bank 5000 USD
  Equity:Opening
2026-01-05 * "Eat"
  Expenses:Food 120.50 USD
  Assets:Bank
2026-01-06 * "Coffee"
  Expenses:Food 4.50 USD
  Assets:Bank
"""

INIT = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}


class Server:
    """One `bea mcp` process and a client that waits for each reply."""

    def __init__(self, tmp_path: Path, ledger: Path | None) -> None:
        argv = [sys.executable, "-m", "cli.main"]
        argv += ["--file", str(ledger)] if ledger is not None else []
        self.process = subprocess.Popen(
            [*argv, "mcp"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=run_env(tmp_path),
            cwd=tmp_path,
        )
        self.frames: list[str] = []
        self._next = 100

    def send(self, message: Any) -> None:
        assert self.process.stdin is not None
        self.process.stdin.write((message if isinstance(message, str) else json.dumps(message)) + "\n")
        self.process.stdin.flush()

    def receive(self) -> dict[str, Any]:
        assert self.process.stdout is not None
        line = self.process.stdout.readline()
        assert line, "the server closed stdout before answering"
        self.frames.append(line)
        return json.loads(line)

    def request(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        self._next += 1
        self.send({"jsonrpc": "2.0", "id": self._next, "method": method, "params": params or {}})
        reply = self.receive()
        assert reply["id"] == self._next
        return reply

    def call(self, name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        reply = self.request("tools/call", {"name": name, "arguments": arguments or {}})
        return reply["result"]

    def close(self) -> tuple[int, str]:
        assert self.process.stdin is not None
        self.process.stdin.close()
        code = self.process.wait(timeout=30)
        assert self.process.stderr is not None
        return code, self.process.stderr.read()


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    return write_ledger(tmp_path, LEDGER)


@pytest.fixture
def server(tmp_path: Path, ledger: Path):
    running = Server(tmp_path, ledger)
    assert running.request("initialize", INIT["params"])["result"]["serverInfo"]["name"] == "bea"
    running.send({"jsonrpc": "2.0", "method": "notifications/initialized"})
    yield running
    running.close()


def _ledger_files(directory: Path) -> dict[str, str]:
    """Every ledger-like file under the directory, with its content hash (config and cache excluded)."""
    return {
        str(path.relative_to(directory)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(directory.glob("*"))
        if path.is_file()
    }


def _command(tmp_path: Path, ledger: Path, *argv: str) -> str:
    run = bea(["--json", "--no-input", "--file", str(ledger), *argv], tmp_path)
    assert run.returncode == 0, run.stderr
    return run.stdout


def test_the_handshake_negotiates_a_version_and_advertises_tools(tmp_path: Path, ledger: Path) -> None:
    server = Server(tmp_path, ledger)
    result = server.request("initialize", {"protocolVersion": "2024-11-05"})["result"]
    assert result["protocolVersion"] == "2024-11-05"
    assert result["capabilities"] == {"tools": {"listChanged": False}}
    other = server.request("initialize", {"protocolVersion": "1999-01-01"})["result"]
    assert other["protocolVersion"] == mcp_module.LATEST_PROTOCOL
    code, stderr = server.close()
    assert code == 0, stderr


def test_a_notification_gets_no_reply_and_ping_answers(server: Server) -> None:
    server.send({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 5}})
    assert server.request("ping")["result"] == {}


def test_every_listed_tool_is_read_only_with_a_closed_schema(server: Server) -> None:
    tools = server.request("tools/list")["result"]["tools"]
    assert [tool["name"] for tool in tools] == ["check", "balance", "query", "report", "list_transactions"]
    for tool in tools:
        assert tool["annotations"]["readOnlyHint"] is True
        assert tool["inputSchema"]["additionalProperties"] is False


def test_each_tool_answers_with_the_command_it_wraps(server: Server, ledger: Path, tmp_path: Path) -> None:
    cases = [
        ("check", {}, ["check"]),
        ("balance", {"accounts": ["food"]}, ["balance", "--", "food"]),
        ("balance", {"time": "2026-01"}, ["balance", "--time=2026-01"]),
        (
            "query",
            {"query": "SELECT account, sum(position) GROUP BY account"},
            ["query", "--", "SELECT account, sum(position) GROUP BY account"],
        ),
        ("report", {"kind": "trial-balance"}, ["report", "trial-balance"]),
        (
            "report",
            {"kind": "register", "register_account": "Expenses:Food"},
            ["report", "register", "--", "Expenses:Food"],
        ),
        ("list_transactions", {"limit": 1}, ["list", "transaction", "--limit=1"]),
    ]
    for name, arguments, argv in cases:
        result = server.call(name, arguments)
        assert result["isError"] is False, (name, result)
        assert result["content"][0]["text"] == _command(tmp_path, ledger, *argv), name


def test_no_call_changes_the_ledger_or_adds_files_beside_it(server: Server, ledger: Path) -> None:
    before = _ledger_files(ledger.parent)
    for name, arguments in [
        ("check", {}),
        ("balance", {}),
        ("query", {"query": "SELECT date, narration"}),
        ("report", {"kind": "overview"}),
        ("report", {"kind": "budget"}),
        ("list_transactions", {"details": True}),
    ]:
        assert server.call(name, arguments)["isError"] is False, name
    assert _ledger_files(ledger.parent) == before


def test_option_text_cannot_become_an_option(server: Server, ledger: Path, tmp_path: Path) -> None:
    target = tmp_path / "leak.csv"
    attacks = [
        ("report", {"kind": "trial-balance", "time": f"2026 --output={target}"}),
        ("balance", {"accounts": ["--output", str(target)]}),
        ("query", {"query": f"--output={target}"}),
        ("report", {"kind": "register", "register_account": f"--output={target}"}),
    ]
    for name, arguments in attacks:
        server.call(name, arguments)
    assert not target.exists()


@pytest.mark.parametrize(
    ("name", "arguments"),
    [
        ("balance", {"accounts": ["--help"]}),
        ("query", {"query": "--help"}),
        ("report", {"kind": "register", "register_account": "--help"}),
    ],
)
def test_a_dashed_value_is_data_never_a_flag(server: Server, name: str, arguments: dict) -> None:
    # Read as a flag, --help would answer with the command's usage text.
    assert "Usage:" not in server.call(name, arguments)["content"][0]["text"]


@pytest.mark.parametrize(
    ("name", "arguments", "fragment"),
    [
        ("check", {"file": "/etc/passwd"}, "Unknown argument"),
        ("query", {}, "Missing required argument: query"),
        ("query", {"query": "  "}, "query is empty"),
        ("query", {"query": ".run x"}, "Shell utilities"),
        ("report", {"kind": "nope"}, "must be one of"),
        ("report", {"kind": "register"}, "needs register_account"),
        ("report", {"kind": "overview", "register_account": "Assets"}, "register_account applies"),
        ("list_transactions", {"limit": 0}, "between 1 and 500"),
        ("list_transactions", {"limit": True}, "must be a integer"),
        ("balance", {"accounts": "food"}, "must be a array"),
        ("balance", {"accounts": [1]}, "array of strings"),
        ("balance", {"time": "2026\x00"}, "NUL"),
    ],
)
def test_a_bad_argument_is_a_tool_error_the_model_can_read(
    server: Server, name: str, arguments: dict, fragment: str
) -> None:
    result = server.call(name, arguments)
    assert result["isError"] is True
    assert fragment in result["content"][0]["text"]


def test_a_failing_read_is_an_error_result_carrying_beas_message(tmp_path: Path) -> None:
    broken = write_ledger(tmp_path, LEDGER + '2026-01-07 * "Bad"\n  Expenses:Nowhere 1 USD\n  Assets:Bank\n')
    server = Server(tmp_path, broken)
    server.request("initialize", INIT["params"])
    result = server.call("report", {"kind": "trial-balance"})
    assert result["isError"] is True
    assert "error" in result["content"][0]["text"].lower()
    allowed = server.call("report", {"kind": "trial-balance", "allow_errors": True})
    assert allowed["isError"] is False
    server.close()


def test_protocol_errors_use_json_rpc_codes_and_the_loop_survives(server: Server) -> None:
    server.send("not json")
    assert server.receive()["error"]["code"] == -32700
    server.send([{"jsonrpc": "2.0", "id": 1, "method": "ping"}])
    assert server.receive()["error"]["code"] == -32600
    server.send({"id": 2, "method": "ping"})
    assert server.receive()["error"]["code"] == -32600
    assert server.request("no/such/method")["error"]["code"] == -32601
    assert server.request("tools/call", {"name": "write_file"})["error"]["code"] == -32602
    server.send({"jsonrpc": "2.0", "id": 9, "method": "tools/list", "params": [1]})
    assert server.receive()["error"]["code"] == -32602
    assert server.request("ping")["result"] == {}


def test_stdout_carries_only_json_frames_and_closing_stdin_exits_cleanly(tmp_path: Path, ledger: Path) -> None:
    server = Server(tmp_path, ledger)
    server.request("initialize", INIT["params"])
    server.call("check")
    server.call("report", {"kind": "overview"})
    code, stderr = server.close()
    assert code == 0, stderr
    assert server.process.stdout is not None
    assert server.process.stdout.read() == ""
    assert all(json.loads(frame)["jsonrpc"] == "2.0" for frame in server.frames)


def test_an_oversized_answer_is_cut_and_says_so(monkeypatch: pytest.MonkeyPatch, ledger: Path) -> None:
    monkeypatch.setattr(mcp_module, "MAX_RESULT_CHARS", 80)
    result = mcp_module.call_tool(ledger, "list_transactions", {"details": True})
    text = result["content"][0]["text"]
    assert text.startswith('{"bea"') or text.startswith("{")
    assert "[truncated: 80 of " in text


def test_a_missing_ledger_is_refused_before_serving(tmp_path: Path) -> None:
    run = subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(tmp_path / "absent.bean"), "mcp"],
        capture_output=True,
        text=True,
        env=run_env(tmp_path),
        cwd=CLI_ROOT,
        stdin=subprocess.DEVNULL,
        timeout=60,
        check=False,
    )
    assert run.returncode == 2
    assert run.stdout == ""
    assert "No ledger file" in run.stderr
