"""`bea cloud mcp` — point an MCP client at the server you are logged in to.

A curated command, not a generated one: the endpoint comes from the server's
own discovery manifest, the output shape differs per client, and `--write`
edits a file on disk. None of that is derivable from the OpenAPI spec.

The CLI cannot mint a key — the server refuses to let a key mint a key — so
this command takes one the caller already has and never invents or prints one
it was not given.
"""

from __future__ import annotations

import json
import sys
from enum import StrEnum
from pathlib import Path
from typing import Any

import typer

from cli import context, output
from cli.errors import UsageError

mcp_app = typer.Typer(
    help="Configure an MCP client for the hosted server.",
    no_args_is_help=True,
    rich_markup_mode=None,
)


class Client(StrEnum):
    """The clients this command can configure.

    An enum rather than a string list so Typer validates the choice, renders it
    in `--help`, and `docs/REFERENCE.md` picks it up — the same shape every
    other choice option in this CLI uses.
    """

    CLAUDE_CODE = "claude-code"
    CURSOR = "cursor"
    CLAUDE_DESKTOP = "claude-desktop"
    JSON = "json"


#: Shown instead of a key when the caller supplied none, so the output is
#: still copy-pasteable and obviously incomplete.
KEY_PLACEHOLDER = "bcio_your_token"


def client_config_path(client: Client) -> Path:
    """Where a client keeps its server list, on this platform.

    Resolved per call rather than at import: `Path.home()` read once at module
    load bakes in whatever `HOME` was then, which is wrong for anyone who
    changes it and untestable for everyone.

    `claude-code` is the odd one out — its file is per project, and dropping a
    `.mcp.json` into the project you are standing in is what a user wants.

    Claude Desktop's location is platform-specific. Writing the macOS path on
    Linux would produce a file the app never reads, and a configuration that
    silently does nothing is worse than an error.
    """
    if client is Client.CLAUDE_CODE:
        return Path(".mcp.json")
    if client is Client.CURSOR:
        return Path.home() / ".cursor" / "mcp.json"
    if client is Client.CLAUDE_DESKTOP:
        if sys.platform == "darwin":
            return Path.home() / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json"
        if sys.platform == "win32":
            return Path.home() / "AppData" / "Roaming" / "Claude" / "claude_desktop_config.json"
        # Claude Desktop has no Linux build, so there is no file to write.
        raise UsageError(
            "Claude Desktop has no configuration path on this platform. "
            "Print the JSON without --write and add it wherever your client reads it."
        )
    raise UsageError("--write needs a real client, not --client json.")


def discover_endpoint() -> str:
    """The MCP endpoint this server advertises.

    Read from `/.well-known/mcp.json` rather than composed from `api_url`,
    because the manifest is the deployment's own answer and a self-host may
    mount the API under a path prefix. Falls back to the conventional path
    when the manifest cannot be read — a server that is up but has no manifest
    still serves MCP at the documented address.
    """
    from cli.config import settings

    base = settings().api_url.rstrip("/")
    fallback = f"{base}/api-gateway/mcp"
    import httpx

    try:
        response = httpx.get(f"{base}/.well-known/mcp.json", timeout=10.0)
        if response.status_code != 200:
            return fallback
        endpoint = response.json().get("endpoint")
        return endpoint if isinstance(endpoint, str) and endpoint else fallback
    except (httpx.HTTPError, ValueError, KeyError):
        # Discovery is advisory: an unreachable or malformed manifest must not
        # stop a user from getting a configuration they can paste. Narrow on
        # purpose — a bug in this module should surface, not silently hand back
        # a plausible-looking endpoint for the wrong server.
        return fallback


def server_entry(endpoint: str, key: str) -> dict[str, Any]:
    """The `mcpServers` entry every JSON-configured client accepts."""
    return {
        "type": "http",
        "url": endpoint,
        "headers": {"Authorization": f"Bearer {key}"},
    }


def claude_code_command(endpoint: str, key: str) -> str:
    return f'claude mcp add --transport http beancount {endpoint} --header "Authorization: Bearer {key}"'


def render(client: Client, endpoint: str, key: str) -> str:
    if client is Client.CLAUDE_CODE:
        return claude_code_command(endpoint, key)
    return json.dumps({"mcpServers": {"beancount": server_entry(endpoint, key)}}, indent=2)


def _merge_into(path: Path, endpoint: str, key: str) -> tuple[str, str]:
    """The file's current and proposed contents, with our server merged in.

    Merged rather than overwritten: these files hold every MCP server the user
    has configured, and replacing one to add another is data loss.
    """
    before = path.read_text(encoding="utf-8") if path.is_file() else ""
    try:
        document = json.loads(before) if before.strip() else {}
    except json.JSONDecodeError as exc:
        raise UsageError(f"{path} is not valid JSON ({exc}); fix or move it before writing.") from exc
    if not isinstance(document, dict):
        raise UsageError(f"{path} does not hold a JSON object; refusing to rewrite it.")
    servers = document.get("mcpServers")
    if not isinstance(servers, dict):
        servers = {}
    servers["beancount"] = server_entry(endpoint, key)
    document["mcpServers"] = servers
    return before, json.dumps(document, indent=2) + "\n"


@mcp_app.command("config")
def mcp_config(
    client: Client = typer.Option(
        Client.CLAUDE_CODE,
        "--client",
        help="Which client to configure.",
    ),
    key: str | None = typer.Option(
        None,
        "--key",
        envvar="BEA_MCP_KEY",
        help="A bcio_ personal access token. Mint one in the dashboard; the CLI cannot.",
    ),
    write: bool = typer.Option(
        False,
        "--write",
        help="Write the configuration into the client's config file after showing the diff.",
    ),
    show_key: bool = typer.Option(
        False,
        "--show-key",
        help="Include the key in --json output. Off by default so a logged transcript does not leak it.",
    ),
) -> None:
    """Print (or write) the MCP client configuration for the logged-in server."""
    ctx = context.current()
    endpoint = discover_endpoint()
    effective_key = key or KEY_PLACEHOLDER
    rendered = render(client, endpoint, effective_key)

    if write:
        if client == "json":
            raise UsageError("--write needs a real client (--client claude-code, cursor, or claude-desktop).")
        _write_config(client, endpoint, effective_key, supplied_key=key is not None)
        return

    if ctx.json_output:
        output.emit(
            {
                "endpoint": endpoint,
                "client": client.value,
                # The key is the one value in this payload worth protecting,
                # and `--json` output is the one most likely to be piped into
                # a log. Redacted unless the caller asks for it back.
                "configuration": rendered if show_key or key is None else rendered.replace(effective_key, "bcio_***"),
                "keyProvided": key is not None,
            },
            target=output.server_target(),
        )
        return

    typer.echo(rendered)
    if key is None:
        from cli.config import settings

        output.note(
            f"No key supplied. Mint one at {settings().dashboard_url.rstrip('/')}/settings/api-keys "
            "and pass it with --key, or set BEA_MCP_KEY."
        )


def _write_config(client: Client, endpoint: str, key: str, *, supplied_key: bool) -> None:
    ctx = context.current()
    if not supplied_key:
        raise UsageError(
            "--write needs a real key: pass --key or set BEA_MCP_KEY. "
            "Writing a placeholder would leave a config that cannot connect."
        )
    path = client_config_path(client)
    before, after = _merge_into(path, endpoint, key)
    if before == after:
        output.success(f"{path} already points at {endpoint}.")
        return

    import difflib

    diff = "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=f"a/{path}",
            tofile=f"b/{path}",
        )
    )
    # Shown before the prompt, never after: a confirmation for a change the
    # user has not seen is not a confirmation.
    typer.echo(diff or f"(new file) {path}")
    if not ctx.confirm(f"Write this configuration to {path}?"):
        output.note("Not written.")
        return

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(after, encoding="utf-8")
    output.success(f"Wrote {path}.")
