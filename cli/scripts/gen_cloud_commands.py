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
import re
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
    # Row text for the group listing: the spec summary is still the --help
    # body, but a summary past the 80-column row truncates there (w5/752).
    row: str | None = None
    # Message templates; `{full_name}` is the collapsed path argument.
    confirm: str | None = None
    success: str | None = None
    write_action: str | None = None
    # A boolean request-body field that turns the call into a preview, exposed
    # as `--dry-run`. A preview destroys nothing, so it skips the confirmation
    # gate and renders the response's `preview` object; `preview_done` is the
    # closing line that says nothing changed.
    dry_run: str | None = None
    preview_done: str | None = None


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
        row="List accessible ledgers",
    ),
    Command(operation_id="getLedger", group="ledger", name="show"),
    Command(
        operation_id="deleteLedger",
        group="ledger",
        name="delete",
        confirm="Permanently delete ledger '{full_name}'?",
        success="Ledger '{full_name}' deleted.",
        write_action="Deleting ledger '{full_name}'",
        dry_run="dryRun",
        preview_done="Dry run: ledger '{full_name}' was not deleted.",
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


def body_fields(op: dict[str, Any]) -> dict[str, dict[str, Any]]:
    content = (op.get("requestBody") or {}).get("content", {})
    schema = content.get("application/json", {}).get("schema", {})
    return dict(schema.get("properties", {}))


def cli_description(cmd: Command, op: dict[str, Any]) -> str:
    """The spec description with body fields named as their CLI options.

    The spec speaks wire names (`Pass dryRun to preview`); a command whose
    help names a field it has no option for promises something the user
    cannot do (w1/272), so generation fails instead.
    """
    text = str(op["description"])
    options = {cmd.dry_run: "--dry-run"} if cmd.dry_run else {}
    for wire, option in options.items():
        text = re.sub(rf"`?\b{re.escape(wire)}\b`?", option, text)
    for wire in body_fields(op):
        if re.search(rf"\b{re.escape(wire)}\b", text):
            fail(
                f"operation '{cmd.operation_id}' description names body field '{wire}', "
                "which has no CLI option; add one to its registry entry or reword the description in backend-v2"
            )
    return text


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def emit_command(cmd: Command, spec: dict[str, Any]) -> str:
    path, method, op = find_operation(spec, cmd.operation_id)
    require_annotations(cmd.operation_id, op)

    p_params = path_params(op)
    collapses_full_name = [p["name"] for p in p_params] == ["owner", "name"]
    if p_params and not collapses_full_name:
        fail(
            f"operation '{cmd.operation_id}' has path params {[p['name'] for p in p_params]}; "
            "only owner+name is supported"
        )

    destructive = is_destructive(method, op)
    if destructive and not cmd.confirm:
        fail(f"operation '{cmd.operation_id}' is destructive; add a `confirm` template to its registry entry")
    if method != "get" and not (cmd.write_action and cmd.success):
        fail(
            f"operation '{cmd.operation_id}' is a write; "
            "add `write_action` and `success` templates to its registry entry"
        )

    if cmd.dry_run:
        field_schema = body_fields(op).get(cmd.dry_run)
        if field_schema is None or field_schema.get("type") != "boolean":
            fail(f"operation '{cmd.operation_id}' has no boolean body field '{cmd.dry_run}' for --dry-run")
        if not str(field_schema.get("description") or "").strip():
            fail(
                f"operation '{cmd.operation_id}' body field '{cmd.dry_run}' has no description; "
                "annotate it in backend-v2 before generating a command"
            )
        if not cmd.preview_done:
            fail(f"operation '{cmd.operation_id}' has --dry-run; add a `preview_done` template to its registry entry")

    module = snake(cmd.operation_id)
    headline = cmd.row or op["summary"]
    description = cli_description(cmd, op)
    help_text = esc(f"{headline}.\n\n{description}") if headline != description else esc(headline)

    signature: list[str] = []
    call_args: list[str] = []
    body: list[str] = []
    names = {p["name"] for p in query_params(op)}
    paged = method == "get" and bool(cmd.columns) and {"page", "limit"} <= names

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
        schema = param.get("schema", {})
        bounds = "".join(
            f", {option}={schema[key]!r}"
            for key, option in (("minimum", "min"), ("maximum", "max"))
            if schema.get(key) is not None
        )
        signature.append(
            f'    {py_name}: Annotated[int, typer.Option("--{py_name}", help="{help_}"{bounds})] = {default},'
        )
        call_args.append(f"{py_name}={py_name}")

    if cmd.dry_run:
        help_ = esc(str(body_fields(op)[cmd.dry_run]["description"]))
        signature.append(f'    dry_run: Annotated[bool, typer.Option("--dry-run", help="{help_}")] = False,')

    fn = f"{cmd.group}_{cmd.name}"
    # Single-value parsing: `--page 1 --page 3` sent `page=3` with exit 0, the
    # last value winning (w5/846), where `create` refuses the repeat.
    lines = [f'@{cmd.group}_app.command("{cmd.name}", cls=SingleValueCommand, help="{help_text}")']
    lines.append(f"def {fn}(")
    lines.extend(signature)
    lines.append(") -> None:")

    # Path arguments are validated first: a malformed name is a usage error
    # whether or not anyone is there to confirm, and a garbage target must not
    # be answered with "pass --yes".
    lines.extend(body)

    lines.append("    from cli.api.client import authenticated_client, call, unwrap")
    lines.append(f"    from cli.api.rest_client.api.ledger_v_1 import {module}")

    if cmd.dry_run:
        body_class = f"{cmd.operation_id[0].upper()}{cmd.operation_id[1:]}Body"
        preview_args = ", ".join([*call_args, "client=authenticated_client()"])
        lines.append(f"    from cli.api.rest_client.models.{module}_body import {body_class}")
        lines.append("")
        lines.append("    if dry_run:")
        lines.append("        # A preview destroys nothing: no confirmation, and a lost answer is not an unknown outcome.")
        lines.append(f'        preview_body = {body_class}.from_dict({{"{cmd.dry_run}": True}})')
        lines.append(f"        answer = unwrap(call({module}.sync_detailed, {preview_args}, body=preview_body))")
        lines.append("        row = snake_keys(answer.to_dict())")
        lines.append('        summary = snake_keys(row.get("preview") or {})')
        lines.append('        row["preview"] = summary')
        lines.append("        if context.current().json_output:")
        lines.append("            output.emit(row, target=output.server_target())")
        lines.append("            return")
        lines.append('        warnings = summary.pop("warnings", None) or []')
        lines.append("        output.fields(summary)")
        lines.append("        for warning in warnings:")
        lines.append('            output.fields({"warning": warning})')
        lines.append(f'        output.success(f"{esc(cmd.preview_done or "")}")')
        lines.append("        return")

    # Resolve credentials before the destructive confirmation gate so a
    # signed-out agent sees exit 3 (auth) instead of exit 2 (pass --yes).
    if cmd.confirm:
        lines.append("    client = authenticated_client()")
        lines.append(f'    if not context.current().confirm(f"{esc(cmd.confirm)}"):')
        lines.append('        output.success("Cancelled.")')
        lines.append("        return")
        client_expr = "client"
    elif paged:
        lines.append("    client = authenticated_client()")
        client_expr = "client"
    else:
        client_expr = "authenticated_client()"

    call = f"call({module}.sync_detailed, {', '.join(call_args)}{', ' if call_args else ''}client={client_expr})"
    if method == "get":
        lines.append(f"    result = unwrap({call})")
    else:
        lines.append("    import httpx")
        lines.append("")
        lines.append("    from cli.errors import GatewayTimeout, UnreadableSuccess, unknown_write_outcome")
        lines.append("")
        lines.append("    try:")
        lines.append(f"        result = unwrap({call})")
        lines.append("    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ProxyError):")
        lines.append("        # No request left the machine (or the proxy), so nothing happened: not unknown.")
        lines.append("        raise")
        unknown = "httpx.TimeoutException, httpx.TransportError, UnreadableSuccess, GatewayTimeout"
        lines.append(f"    except ({unknown}) as e:")
        lines.append(f'        raise unknown_write_outcome(f"{esc(cmd.write_action or "")}", e) from e')

    lines.append("    data = result if isinstance(result, list) else [result]")
    lines.append("    rows = [snake_keys(item.to_dict()) for item in data]")

    if cmd.columns:
        truncated = "truncated=len(rows) >= limit, limit=limit" if "limit" in names else ""
        if truncated and "page" in names:
            truncated += ", page=page"
        lines.append("    if context.current().json_output:")
        if paged:
            following_args = [arg for arg in call_args if arg not in {"page=page", "limit=limit"}]
            following_args += ["page=page * limit + 1", "limit=1", "client=client"]
            following_call = f"call({module}.sync_detailed, {', '.join(following_args)})"
            lines.append("        truncated = False")
            lines.append("        if len(rows) == limit:")
            lines.append("            # A full page alone cannot distinguish a final page from a middle one.")
            lines.append(f"            truncated = bool(unwrap({following_call}))")
            truncated = "truncated=truncated, limit=limit, page=page"
        lines.append(f"        output.emit(rows, target=output.server_target(){', ' + truncated if truncated else ''})")
        lines.append("        return")
        headers = [c.header for c in cmd.columns]
        cells = ", ".join(_cell_expr(c) for c in cmd.columns)
        lines.append(f"    output.table({headers!r}, [[{cells}] for row in rows])")
    elif method == "get":
        lines.append("    if context.current().json_output:")
        lines.append("        output.emit(rows[0], target=output.server_target())")
        lines.append("        return")
        lines.append("    output.fields(rows[0])")
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
from cli.single_value import SingleValueCommand
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
