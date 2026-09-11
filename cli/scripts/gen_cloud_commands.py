#!/usr/bin/env python3
"""Generate `bea cloud` command stubs from the pinned v1 OpenAPI spec.

The spec is the source of truth for what a command says and validates: help
text comes from each operation's `summary`/`description`, option help from
parameter descriptions, and destructive operations (DELETE, or any operation
marked `x-cli-destructive`) get the standard confirmation gate. Generation
FAILS when a registered operation is missing a summary, a description, or a
parameter description — an unannotated operation would become an undocumented
command, and the gate exists so that can never ship silently.

What stays curated lives in `COMMANDS` below (column layouts, defaults,
message templates, the owner+name → `OWNER/NAME` argument collapse) or in the
hand-written command modules (multi-step flows like create-and-clone, clone,
and login). Run through `make codegen`; the output is committed.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cli.utils import snake_case as snake

CLI_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SPEC = CLI_DIR / "openapi" / "v1.json"
DEFAULT_OUT = CLI_DIR / "src" / "cli" / "commands" / "cloud" / "generated"


@dataclass
class Column:
    header: str
    attr: str
    kind: str = "text"  # "text" | "bool" (yes/no) | "date" (YYYY-MM-DD)


@dataclass
class Command:
    operation_id: str
    group: str
    name: str
    # Curated presentation: which columns an array result renders as a table.
    columns: list[Column] = field(default_factory=list)
    # Query-parameter defaults the CLI applies (the server may have its own).
    defaults: dict[str, int] = field(default_factory=dict)
    # Message templates; `{full_name}` is the collapsed path argument.
    confirm: str | None = None
    success: str | None = None
    write_action: str | None = None


COMMANDS: list[Command] = [
    Command(
        operation_id="accessibleLedgers",
        group="ledger",
        name="list",
        columns=[
            Column("NAME", "name"),
            Column("FULLNAME", "fullName"),
            Column("PRIVATE", "private", kind="bool"),
            Column("CREATED", "createdAt", kind="date"),
        ],
        defaults={"limit": 50, "page": 1},
    ),
    Command(operation_id="getLedger", group="ledger", name="show"),
    Command(
        operation_id="deleteLedger",
        group="ledger",
        name="delete",
        confirm="Permanently delete ledger '{full_name}'?",
        success="Ledger '{full_name}' deleted.",
        write_action="Deleting ledger '{full_name}'",
    ),
]


def fail(message: str) -> None:
    raise SystemExit(f"gen_cloud_commands: {message}")


def find_operation(spec: dict[str, Any], operation_id: str) -> tuple[str, str, dict[str, Any]]:
    for path, methods in spec["paths"].items():
        for method, op in methods.items():
            if isinstance(op, dict) and op.get("operationId") == operation_id:
                return path, method, op
    fail(f"operation '{operation_id}' not found in the spec — is the pin current?")
    raise AssertionError("unreachable")


def require_annotations(operation_id: str, op: dict[str, Any]) -> None:
    """The gate: an operation ships as a command only fully described."""
    for fld in ("summary", "description"):
        if not str(op.get(fld) or "").strip():
            fail(f"operation '{operation_id}' has no {fld}; annotate it in backend-v2 before generating a command")
    for param in op.get("parameters", []):
        if not str(param.get("description") or "").strip():
            fail(
                f"operation '{operation_id}' parameter '{param.get('name')}' has no description; "
                "annotate it in backend-v2 before generating a command"
            )


def is_destructive(method: str, op: dict[str, Any]) -> bool:
    return bool(op.get("x-cli-destructive")) or method == "delete"


def path_params(op: dict[str, Any]) -> list[dict[str, Any]]:
    return [p for p in op.get("parameters", []) if p.get("in") == "path"]


def query_params(op: dict[str, Any]) -> list[dict[str, Any]]:
    return [p for p in op.get("parameters", []) if p.get("in") == "query"]


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def emit_command(cmd: Command, spec: dict[str, Any]) -> str:
    path, method, op = find_operation(spec, cmd.operation_id)
    require_annotations(cmd.operation_id, op)

    p_params = path_params(op)
    collapses_full_name = [p["name"] for p in p_params] == ["owner", "name"]
    if p_params and not collapses_full_name:
        fail(f"operation '{cmd.operation_id}' has path params {[p['name'] for p in p_params]}; only owner+name is supported")

    destructive = is_destructive(method, op)
    if destructive and not cmd.confirm:
        fail(f"operation '{cmd.operation_id}' is destructive; add a `confirm` template to its registry entry")
    if method != "get" and not (cmd.write_action and cmd.success):
        fail(f"operation '{cmd.operation_id}' is a write; add `write_action` and `success` templates to its registry entry")

    module = snake(cmd.operation_id)
    help_text = esc(f"{op['summary']}.\n\n{op['description']}") if op["summary"] != op["description"] else esc(op["summary"])

    signature: list[str] = []
    call_args: list[str] = []
    body: list[str] = []

    if collapses_full_name:
        signature.append(
            '    full_name: Annotated[str, typer.Argument(help="Ledger full name (e.g. username/my-ledger)")],'
        )
        body.append("    owner, name = owner_and_name(full_name)")
        call_args.extend(["owner", "name"])

    for param in query_params(op):
        py_name = snake(param["name"])
        default = cmd.defaults.get(param["name"])
        if default is None:
            fail(f"operation '{cmd.operation_id}' query param '{param['name']}' needs a CLI default in the registry")
        help_ = esc(param["description"])
        signature.append(f'    {py_name}: Annotated[int, typer.Option("--{py_name}", help="{help_}")] = {default},')
        call_args.append(f"{py_name}={py_name}")

    fn = f"{cmd.group}_{cmd.name}"
    lines = [f'@{cmd.group}_app.command("{cmd.name}", help="{help_text}")']
    lines.append(f"def {fn}(")
    lines.extend(signature)
    lines.append(") -> None:")

    # Path arguments are validated first: a malformed name is a usage error
    # whether or not anyone is there to confirm, and a garbage target must not
    # be answered with "pass --yes".
    lines.extend(body)

    if cmd.confirm:
        lines.append(f'    if not context.current().confirm(f"{esc(cmd.confirm)}"):')
        lines.append('        output.success("Cancelled.")')
        lines.append("        return")

    lines.append("    from cli.api.client import authenticated_client, unwrap")
    lines.append(f"    from cli.api.rest_client.api.ledger_v_1 import {module}")

    call = f"{module}.sync_detailed({', '.join(call_args)}{', ' if call_args else ''}client=authenticated_client())"
    if method == "get":
        lines.append(f"    result = unwrap({call})")
    else:
        lines.append("    import httpx")
        lines.append("")
        lines.append("    from cli.errors import unknown_write_outcome")
        lines.append("")
        lines.append("    try:")
        lines.append(f"        result = unwrap({call})")
        lines.append("    except (httpx.TimeoutException, httpx.TransportError) as e:")
        lines.append(f'        raise unknown_write_outcome(f"{esc(cmd.write_action or "")}", e) from e')

    lines.append("    data = result if isinstance(result, list) else [result]")
    lines.append("    rows = [snake_keys(item.to_dict()) for item in data]")

    if cmd.columns:
        names = {p["name"] for p in query_params(op)}
        truncated = "truncated=len(rows) >= limit, limit=limit" if "limit" in names else ""
        if truncated and "page" in names:
            truncated += ", page=page"
        lines.append("    if context.current().json_output:")
        lines.append(f"        output.emit(rows, target=output.server_target(){', ' + truncated if truncated else ''})")
        lines.append("        return")
        headers = [c.header for c in cmd.columns]
        cells = ", ".join(_cell_expr(c) for c in cmd.columns)
        lines.append(f"    output.table({headers!r}, [[{cells}] for row in rows])")
    elif method == "get":
        lines.append("    if context.current().json_output:")
        lines.append("        output.emit(rows[0], target=output.server_target())")
        lines.append("        return")
        lines.append("    for key, value in rows[0].items():")
        lines.append('        typer.echo(f"{key}: {value}")')
    else:
        lines.append("    if context.current().json_output:")
        lines.append("        output.emit(rows[0], target=output.server_target())")
        lines.append("        return")
        lines.append(f'    output.success(f"{esc(cmd.success or "")}")')

    return "\n".join(lines) + "\n"


def _cell_expr(column: Column) -> str:
    raw = f'row["{snake(column.attr)}"]'
    if column.kind == "date":
        return f"str({raw})[:10]"
    if column.kind == "bool":
        return f'"yes" if {raw} else "no"'
    return f"str({raw})"


HEADER = '''"""GENERATED by scripts/gen_cloud_commands.py from openapi/v1.json — DO NOT EDIT.

Regenerate with `make codegen`. Help text, validation, and confirmation gates
come from the spec's annotations; presentation choices come from the
generator's registry. Imports inside command bodies keep startup free of
network code, like every hand-written command.
"""

from __future__ import annotations

from typing import Annotated

import typer

from cli import context, output
from cli.utils import owner_and_name, snake_keys

'''


def generate(spec_path: Path, out_dir: Path) -> dict[str, str]:
    spec = json.loads(spec_path.read_text())
    groups = sorted({cmd.group for cmd in COMMANDS})
    files: dict[str, str] = {"__init__.py": ""}
    for group in groups:
        parts = [HEADER.replace("GENERATED", f"`bea cloud {group}` commands: GENERATED", 1)]
        parts.append(f"def register_{group}_commands({group}_app: typer.Typer) -> None:\n")
        for cmd in (c for c in COMMANDS if c.group == group):
            block = emit_command(cmd, spec)
            parts.append("    " + block.replace("\n", "\n    ").rstrip() + "\n\n")
        files[f"{group}.py"] = "\n".join(parts)
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        (out_dir / name).write_text(content)
    return files


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", type=Path, default=DEFAULT_SPEC)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    files = generate(args.spec, args.out)
    print(f"gen_cloud_commands: wrote {len(files)} file(s) to {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
