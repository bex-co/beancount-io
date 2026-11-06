"""`bea mcp` — a local, read-only MCP server over stdio (w21/m8).

Design (see `docs/MCP.md`):

- Newline-delimited JSON-RPC 2.0 on stdin/stdout, hand-written: no MCP SDK
  dependency, nothing but protocol frames on stdout.
- One ledger, fixed when the server starts. No tool takes a path.
- Every tool is a fixed `bea --json` read, run as a child process, so its
  answer is the command's own envelope, byte for byte, and the frontend
  boundary (no Beancount in this process) holds. No tool writes: the argv
  templates below are the whole surface, and tests hash the ledger around
  every call.
- Option values travel as `--option=value` and positionals after `--`, so
  text from the model can never be read as an option.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, TextIO

import typer

from cli import context
from cli.errors import UsageError

LATEST_PROTOCOL = "2025-06-18"
SUPPORTED_PROTOCOLS = (LATEST_PROTOCOL, "2025-03-26", "2024-11-05")
MAX_RESULT_CHARS = 200_000
"""A tool answer longer than this is cut and says so; a model context is not a pipe."""
CALL_TIMEOUT_SECONDS = 120

REPORT_KINDS = (
    "overview",
    "income-statement",
    "balance-sheet",
    "trial-balance",
    "holdings",
    "register",
    "capital-gains",
    "cash-flow",
    "budget",
)
INTERVALS = ("monthly", "quarterly", "yearly", "weekly", "daily")

INSTRUCTIONS = (
    "Read-only access to one local Beancount ledger through bea. Tools return bea's own --json envelope. "
    "Reports value at market and fail with missing_prices when a commodity has no price; pass conversion "
    "'at_cost' for book value. Nothing here writes to the ledger."
)

_STRING: dict[str, Any] = {"type": "string"}
_TIME: dict[str, Any] = {"type": "string", "description": 'Period: 2026, 2026-08, or "2026-01 - 2026-06"'}
_ALLOW_ERRORS: dict[str, Any] = {
    "type": "boolean",
    "description": "Answer from a ledger that has load errors (the errors are returned too)",
}


class ToolError(Exception):
    """An argument problem the model can fix; reported as a tool error, not a protocol error."""


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    properties: dict[str, dict[str, Any]]
    required: tuple[str, ...]
    build: Callable[[dict[str, Any]], list[str]]

    def listing(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": {
                "type": "object",
                "properties": self.properties,
                "required": list(self.required),
                "additionalProperties": False,
            },
            "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        }


def _options(args: dict[str, Any], mapping: dict[str, str]) -> list[str]:
    """`--flag=value` for each given argument; booleans are bare flags when true."""
    argv: list[str] = []
    for key, flag in mapping.items():
        value = args.get(key)
        if value is None or value is False:
            continue
        argv.append(flag if value is True else f"{flag}={value}")
    return argv


def _check(args: dict[str, Any]) -> list[str]:
    return ["check"]


def _balance(args: dict[str, Any]) -> list[str]:
    argv = [
        "balance",
        *_options(args, {"time": "--time", "conversion": "--conversion", "allow_errors": "--allow-errors"}),
    ]
    accounts = args.get("accounts") or []
    return [*argv, "--", *accounts] if accounts else argv


def _query(args: dict[str, Any]) -> list[str]:
    text = args["query"]
    if not text.strip():
        raise ToolError("query is empty; pass a BQL statement such as SELECT account, sum(position) GROUP BY account.")
    if text.lstrip().startswith("."):
        raise ToolError("Shell utilities (.run, .output, …) are not available; pass a BQL statement.")
    return ["query", *_options(args, {"allow_errors": "--allow-errors"}), "--", text]


def _report(args: dict[str, Any]) -> list[str]:
    kind = args["kind"]
    argv = [
        "report",
        kind,
        *_options(
            args,
            {
                "time": "--time",
                "account": "--account",
                "interval": "--interval",
                "conversion": "--conversion",
                "group_by": "--group-by",
                "from_date": "--from-date",
                "to_date": "--to-date",
                "allow_errors": "--allow-errors",
            },
        ),
    ]
    if kind == "register":
        target = args.get("register_account")
        if not target:
            raise ToolError(
                "kind 'register' needs register_account, the account to list (for example Assets:Checking)."
            )
        argv += ["--", target]
    elif args.get("register_account"):
        raise ToolError("register_account applies to kind 'register' only.")
    return argv


def _list_transactions(args: dict[str, Any]) -> list[str]:
    mapping = {
        "limit": "--limit",
        "from_date": "--from-date",
        "to_date": "--to-date",
        "account": "--account",
        "flag": "--flag",
        "search": "--search",
        "sort": "--sort",
        "details": "--details",
    }
    return ["list", "transaction", *_options(args, mapping)]


TOOLS: tuple[Tool, ...] = (
    Tool("check", "Validate the ledger the way bean-check does; returns the errors, if any.", {}, (), _check),
    Tool(
        "balance",
        "Balances for accounts matching case-insensitive substrings; the whole trial balance when none are given.",
        {
            "accounts": {"type": "array", "items": _STRING, "description": "Account substrings"},
            "time": _TIME,
            "conversion": {"type": "string", "description": "A currency, or units / at_cost / at_value"},
            "allow_errors": _ALLOW_ERRORS,
        },
        (),
        _balance,
    ),
    Tool(
        "query",
        "Run one BQL statement (SELECT, BALANCES, JOURNAL, PRINT) against the ledger.",
        {"query": {"type": "string", "description": "A BQL statement"}, "allow_errors": _ALLOW_ERRORS},
        ("query",),
        _query,
    ),
    Tool(
        "report",
        "A financial report: overview, income-statement, balance-sheet, trial-balance, holdings, register "
        "(needs register_account), capital-gains, cash-flow (at cost, no conversion) or budget "
        "(budget versus actual, no conversion).",
        {
            "kind": {"type": "string", "enum": list(REPORT_KINDS)},
            "time": _TIME,
            "account": {"type": "string", "description": "A parent account or a regular expression"},
            "register_account": {"type": "string", "description": "The account a register lists"},
            "interval": {"type": "string", "enum": list(INTERVALS)},
            "conversion": {"type": "string", "description": "A currency, or units / at_cost / at_value"},
            "group_by": {"type": "string", "enum": ["account", "commodity"], "description": "holdings only"},
            "from_date": {"type": "string", "description": "YYYY-MM-DD; capital-gains and cash-flow"},
            "to_date": {"type": "string", "description": "YYYY-MM-DD; capital-gains and cash-flow"},
            "allow_errors": _ALLOW_ERRORS,
        },
        ("kind",),
        _report,
    ),
    Tool(
        "list_transactions",
        "Recent transactions, newest first by default; check `truncated` before treating a page as complete.",
        {
            "limit": {"type": "integer", "minimum": 1, "maximum": 500},
            "from_date": {"type": "string", "description": "YYYY-MM-DD"},
            "to_date": {"type": "string", "description": "YYYY-MM-DD"},
            "account": {"type": "string", "description": "Case-insensitive account substring"},
            "flag": {"type": "string", "description": "Transaction flag, for example ! for entries to review"},
            "search": {"type": "string", "description": "Text in payee or narration"},
            "sort": {"type": "string", "enum": ["newest", "oldest"]},
            "details": {"type": "boolean", "description": "Beancount syntax with every posting and metadata"},
        },
        (),
        _list_transactions,
    ),
)
_BY_NAME = {tool.name: tool for tool in TOOLS}

_TYPES: dict[str, type | tuple[type, ...]] = {"string": str, "boolean": bool, "integer": int, "array": list}


def _has_type(value: Any, expected: str) -> bool:
    """Whether a JSON value has the schema type; a bare true is not an integer."""
    return isinstance(value, _TYPES[expected]) and not (expected == "integer" and isinstance(value, bool))


def validate(tool: Tool, args: Any) -> dict[str, Any]:
    """Check `args` against the tool's schema; the model gets a message it can act on."""
    if args is None:
        args = {}
    if not isinstance(args, dict):
        raise ToolError("arguments must be an object.")
    unknown = sorted(set(args) - set(tool.properties))
    if unknown:
        raise ToolError(f"Unknown argument(s): {', '.join(unknown)}. Allowed: {', '.join(tool.properties) or 'none'}.")
    for name in tool.required:
        if name not in args:
            raise ToolError(f"Missing required argument: {name}.")
    for name, given in args.items():
        value: Any = given
        schema = tool.properties[name]
        expected = schema["type"]
        # bool is an int in Python; an integer argument is never a bare true.
        if not _has_type(value, expected):
            raise ToolError(f"Argument {name} must be a {expected}.")
        if expected == "array" and not all(isinstance(item, str) for item in value):
            raise ToolError(f"Argument {name} must be an array of strings.")
        if "enum" in schema and value not in schema["enum"]:
            raise ToolError(f"Argument {name} must be one of: {', '.join(schema['enum'])}.")
        if expected == "integer" and not schema["minimum"] <= value <= schema["maximum"]:
            raise ToolError(f"Argument {name} must be between {schema['minimum']} and {schema['maximum']}.")
        if expected == "string" and "\x00" in value:
            raise ToolError(f"Argument {name} contains a NUL byte.")
    return args


def _bea(ledger: Path, argv: list[str]) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "BEA_NO_UPDATE_NOTIFIER": "1", "NO_COLOR": "1"}
    command = [sys.executable, "-m", "cli.main", "--json", "--no-input", "--file", str(ledger), *argv]
    return subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=CALL_TIMEOUT_SECONDS,
        env=env,
        stdin=subprocess.DEVNULL,
        check=False,
    )


def call_tool(ledger: Path, name: str, arguments: Any) -> dict[str, Any]:
    """Run one tool and shape its MCP result. A failing read is an error result carrying bea's own error."""
    tool = _BY_NAME[name]
    try:
        argv = tool.build(validate(tool, arguments))
    except ToolError as exc:
        return {"content": [{"type": "text", "text": str(exc)}], "isError": True}
    try:
        done = _bea(ledger, argv)
    except subprocess.TimeoutExpired:
        message = f"{name} did not finish within {CALL_TIMEOUT_SECONDS} seconds."
        return {"content": [{"type": "text", "text": message}], "isError": True}
    # Under --json an error envelope is on stderr, a success on stdout.
    text = done.stdout if done.returncode == 0 else (done.stderr.strip() or done.stdout)
    if len(text) > MAX_RESULT_CHARS:
        text = f"{text[:MAX_RESULT_CHARS]}\n[truncated: {MAX_RESULT_CHARS} of {len(text)} characters shown]"
    return {"content": [{"type": "text", "text": text}], "isError": done.returncode != 0}


def _error(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def handle(ledger: Path, message: Any) -> dict[str, Any] | None:
    """The response to one JSON-RPC message; `None` for a notification."""
    if not isinstance(message, dict) or message.get("jsonrpc") != "2.0" or not isinstance(message.get("method"), str):
        return _error(message.get("id") if isinstance(message, dict) else None, -32600, "Invalid Request")
    method, params = message["method"], message.get("params") or {}
    if "id" not in message:
        return None  # a notification (initialized, cancelled, …) is never answered
    request_id = message["id"]
    if not isinstance(params, dict):
        return _error(request_id, -32602, "params must be an object")
    if method == "initialize":
        asked = params.get("protocolVersion")
        version = asked if asked in SUPPORTED_PROTOCOLS else LATEST_PROTOCOL
        result: dict[str, Any] = {
            "protocolVersion": version,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": "bea", "version": _version()},
            "instructions": INSTRUCTIONS,
        }
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": [tool.listing() for tool in TOOLS]}
    elif method == "tools/call":
        name = params.get("name")
        if not isinstance(name, str) or name not in _BY_NAME:
            return _error(request_id, -32602, f"Unknown tool: {name!r}")
        result = call_tool(ledger, name, params.get("arguments"))
    else:
        return _error(request_id, -32601, f"Method not found: {method}")
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


def _version() -> str:
    from cli.config import package_version

    return package_version()


def serve(ledger: Path, source: TextIO, sink: TextIO) -> None:
    """Answer messages from `source` until it closes. One JSON object per line, in and out."""
    for line in source:
        if not line.strip():
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            response: dict[str, Any] | None = _error(None, -32700, "Parse error")
        else:
            response = (
                _error(None, -32600, "Invalid Request: batches are not supported")
                if isinstance(message, list)
                else handle(ledger, message)
            )
        if response is not None:
            sink.write(json.dumps(response, ensure_ascii=False) + "\n")
            sink.flush()


def mcp() -> None:
    """Serve the ledger to a coding agent over MCP (stdio), read-only.

    Configure your agent to run `bea --file /path/to/main.bean mcp`. Tools:
    check, balance, query, report, list_transactions. Nothing writes to the
    ledger. Stdout carries protocol messages only.
    """
    ledger = context.current().entry_file()
    if not ledger.is_file():
        raise UsageError(f"Ledger not found: {ledger}. Pass --file or run from the ledger's directory.")
    # Frames only: line-buffered UTF-8, whatever the locale.
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)  # type: ignore[union-attr]
    try:
        serve(ledger, sys.stdin, sys.stdout)
    except BrokenPipeError:
        raise typer.Exit(0) from None
