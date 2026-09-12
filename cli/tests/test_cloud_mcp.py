"""`bea cloud mcp config` — w2/m29:t003.

A CLI user who has run `bea cloud login` should get their MCP client configured
without visiting the dashboard. The properties worth pinning are the ones that
would quietly produce a broken or unsafe config: the endpoint comes from the
server rather than a guess, `--write` never destroys a neighbouring server, and
a key is never invented, written, or logged.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from cli import context
from cli.commands.cloud import mcp
from cli.commands.cloud.mcp import Client
from cli.errors import UsageError

ENDPOINT = "https://api.example.test/api-gateway/mcp"


def test_claude_code_command_carries_endpoint_and_key() -> None:
    assert mcp.claude_code_command(ENDPOINT, "bcio_abc") == (
        f'claude mcp add --transport http beancount {ENDPOINT} --header "Authorization: Bearer bcio_abc"'
    )


def test_client_json_is_what_cursor_and_claude_desktop_accept() -> None:
    assert json.loads(mcp.render(Client.CURSOR, ENDPOINT, "bcio_abc")) == {
        "mcpServers": {
            "beancount": {
                "type": "http",
                "url": ENDPOINT,
                "headers": {"Authorization": "Bearer bcio_abc"},
            }
        }
    }


def test_endpoint_comes_from_the_servers_own_manifest(monkeypatch: pytest.MonkeyPatch) -> None:
    """The dashboard and API may be different hosts; only the server knows."""
    import httpx

    monkeypatch.setenv("BEA_API_URL", "https://api.example.test")

    class Response:
        status_code = 200

        @staticmethod
        def json() -> dict[str, str]:
            return {"endpoint": "https://discovered.example.test/api-gateway/mcp"}

    monkeypatch.setattr(httpx, "get", lambda *a, **k: Response())
    assert mcp.discover_endpoint() == "https://discovered.example.test/api-gateway/mcp"


def test_endpoint_falls_back_to_the_documented_path(monkeypatch: pytest.MonkeyPatch) -> None:
    """A server that is up but has no manifest still serves MCP."""
    import httpx

    monkeypatch.setenv("BEA_API_URL", "https://api.example.test")

    def boom(*_a: object, **_k: object) -> object:
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(httpx, "get", boom)
    assert mcp.discover_endpoint() == ENDPOINT


def test_write_merges_rather_than_replacing(tmp_path: Path) -> None:
    """These files hold every MCP server a user has; replacing one is data loss."""
    path = tmp_path / ".mcp.json"
    path.write_text(
        json.dumps({"mcpServers": {"other": {"type": "http", "url": "https://elsewhere"}}}),
        encoding="utf-8",
    )
    _, after = mcp._merge_into(path, ENDPOINT, "bcio_abc")
    document = json.loads(after)
    assert set(document["mcpServers"]) == {"other", "beancount"}
    assert document["mcpServers"]["other"]["url"] == "https://elsewhere"
    assert document["mcpServers"]["beancount"]["url"] == ENDPOINT


def test_write_refuses_a_file_it_cannot_parse(tmp_path: Path) -> None:
    path = tmp_path / ".mcp.json"
    path.write_text("{not json", encoding="utf-8")
    with pytest.raises(UsageError, match="not valid JSON"):
        mcp._merge_into(path, ENDPOINT, "bcio_abc")


def test_write_refuses_without_a_real_key() -> None:
    """A placeholder written to disk is a config that cannot connect."""
    with pytest.raises(UsageError, match="needs a real key"):
        mcp._write_config(Client.CLAUDE_CODE, ENDPOINT, mcp.KEY_PLACEHOLDER, supplied_key=False)


def test_write_refuses_under_no_input_without_yes(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    context.configure(no_input=True)
    try:
        with pytest.raises(UsageError, match="--yes"):
            mcp._write_config(Client.CLAUDE_CODE, ENDPOINT, "bcio_abc", supplied_key=True)
    finally:
        context.configure()
    assert not (tmp_path / ".mcp.json").exists()


def test_write_creates_the_file_once_confirmed(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    context.configure(yes=True)
    try:
        mcp._write_config(Client.CLAUDE_CODE, ENDPOINT, "bcio_abc", supplied_key=True)
    finally:
        context.configure()
    written = json.loads((tmp_path / ".mcp.json").read_text(encoding="utf-8"))
    assert written["mcpServers"]["beancount"]["url"] == ENDPOINT


def test_config_path_follows_the_current_home(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Read per call, not baked in at import."""
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    assert mcp.client_config_path(Client.CURSOR) == tmp_path / ".cursor" / "mcp.json"
    # The project file is relative on purpose: it belongs to the project you
    # are standing in, not to your home directory.
    assert mcp.client_config_path(Client.CLAUDE_CODE) == Path(".mcp.json")


@pytest.mark.parametrize(
    ("platform", "expected_parent"),
    [("darwin", "Claude"), ("win32", "Claude")],
)
def test_claude_desktop_path_follows_the_platform(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, platform: str, expected_parent: str
) -> None:
    """Writing the macOS path on Windows produces a file the app never reads."""
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    monkeypatch.setattr(mcp.sys, "platform", platform)
    path = mcp.client_config_path(Client.CLAUDE_DESKTOP)
    assert path.name == "claude_desktop_config.json"
    assert path.parent.name == expected_parent
    assert str(path).startswith(str(tmp_path))


def test_claude_desktop_write_is_refused_where_it_has_no_home(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A config silently written where nothing reads it is worse than an error."""
    monkeypatch.setattr(mcp.sys, "platform", "linux")
    with pytest.raises(UsageError, match="no configuration path"):
        mcp.client_config_path(Client.CLAUDE_DESKTOP)


def test_write_is_refused_for_the_plain_json_client() -> None:
    with pytest.raises(UsageError, match="not --client json"):
        mcp.client_config_path(Client.JSON)


def test_a_bug_in_discovery_surfaces_rather_than_guessing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The fallback covers an unreachable server, not a broken module.

    A blanket `except Exception` would turn a refactoring mistake into a
    plausible-looking endpoint for the wrong server, which is the failure a
    user cannot diagnose.
    """
    import httpx

    monkeypatch.setenv("BEA_API_URL", "https://api.example.test")

    def broken(*_a: object, **_k: object) -> object:
        raise AttributeError("someone renamed a field")

    monkeypatch.setattr(httpx, "get", broken)
    with pytest.raises(AttributeError):
        mcp.discover_endpoint()
