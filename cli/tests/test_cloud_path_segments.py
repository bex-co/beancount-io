"""Dot segments never leave a cloud command's endpoint (w1/088).

`quote(..., safe="")` leaves `.` and `..` intact and httpx resolves dot
segments client-side, so `bea cloud ledger delete ../account` used to send
`DELETE /api-gateway/v1/account`. Every `owner_and_name` caller must refuse
such a target as a usage error before credentials, a prompt, or a request;
`call` refuses a dot-segment path parameter for every generated operation.
"""

from __future__ import annotations

import importlib
import inspect
import json
import os
import pkgutil
import re
import subprocess
import sys
import threading
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import ModuleType
from unittest.mock import patch

import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

import cli.api.rest_client.api as rest_api
from cli.api.client import bearer_client, call
from cli.errors import UsageError
from cli.main import app
from cli.utils import owner_and_name

ROOT = Path(__file__).resolve().parents[1]
runner = CliRunner()

ESCAPING = ["../account", "../x", "alice/..", "../..", "alice/.", "./x", "./.", "../my-books"]
INVALID = ["alice/My-Books", "alice/my books", "al ice/books", "alice/" + "a" * 101, "alice/%2e%2e", "ali%ce/books"]


class TestOwnerAndName:
    @pytest.mark.parametrize("full_name", ["alice/my-books", "a.b-c_D9/x_1-2", "alice/" + "a" * 100, "..a/b", "a../b"])
    def test_spec_valid_full_names_pass(self, full_name: str) -> None:
        assert owner_and_name(full_name) == tuple(full_name.split("/"))

    @pytest.mark.parametrize("full_name", ESCAPING + INVALID)
    def test_dot_segments_and_off_spec_segments_are_usage_errors(self, full_name: str) -> None:
        with pytest.raises(UsageError, match="is not a ledger full name"):
            owner_and_name(full_name)


class TestEveryCallerRefusesBeforeAnyRequest:
    @pytest.mark.parametrize("full_name", ESCAPING)
    @pytest.mark.parametrize("command", ["show", "delete", "clone"])
    @pytest.mark.parametrize("yes", [True, False], ids=["yes", "terminal"])
    def test_exit_2_with_zero_requests_and_no_prompt(
        self,
        logged_in: None,
        httpx_mock: HTTPXMock,
        monkeypatch: pytest.MonkeyPatch,
        command: str,
        full_name: str,
        yes: bool,
    ) -> None:
        monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)
        flags = ["--json", "--yes"] if yes else ["--json"]

        with patch("typer.confirm", return_value=True) as confirm:
            result = runner.invoke(app, [*flags, "cloud", "ledger", command, full_name])

        assert result.exit_code == 2, result.output
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "usage"
        assert "is not a ledger full name" in error["message"]
        confirm.assert_not_called()
        assert httpx_mock.get_requests() == []

    def test_manager_get_ledger_refuses_without_a_request(self, httpx_mock: HTTPXMock) -> None:
        from cli.commands.cloud.ledger import manager

        with pytest.raises(UsageError):
            manager.get_ledger(bearer_client("test-token"), "../account")
        assert httpx_mock.get_requests() == []

    def test_a_valid_full_name_still_reaches_its_ledger(self, logged_in: None, httpx_mock: HTTPXMock) -> None:
        httpx_mock.add_response(
            url="https://api.v3.beancount.io/api-gateway/v1/ledgers/alice/my-books",
            json={
                "id": "1",
                "name": "my-books",
                "fullName": "alice/my-books",
                "httpUrl": "https://example.test/alice/my-books",
                "sshUrl": "git@example.test:alice/my-books.git",
                "private": True,
                "empty": False,
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z",
                "size": 0,
            },
        )

        result = runner.invoke(app, ["--json", "cloud", "ledger", "show", "alice/my-books"])

        assert result.exit_code == 0, result.stderr
        assert json.loads(result.stdout)["data"]["full_name"] == "alice/my-books"


def _operations() -> list[ModuleType]:
    modules = (
        importlib.import_module(m.name) for m in pkgutil.walk_packages(rest_api.__path__, rest_api.__name__ + ".")
    )
    return [m for m in modules if hasattr(m, "sync_detailed")]


def _positional(module: ModuleType) -> list[str]:
    params = inspect.signature(module.sync_detailed).parameters.values()
    return [p.name for p in params if p.kind is inspect.Parameter.POSITIONAL_OR_KEYWORD]


PATH_OPERATIONS = [m for m in _operations() if _positional(m)]


class TestCallBackstop:
    def test_generated_operations_take_exactly_their_path_parameters_positionally(self) -> None:
        # `call` inspects positional arguments; that only covers every path
        # parameter while the generator keeps them positional and alone there.
        for module in _operations():
            source = inspect.getsource(module._get_kwargs)
            url = re.search(r'"url": f?"([^"]+)"', source)
            assert url, module.__name__
            placeholders = [snake for snake in re.findall(r"\{(\w+)\}", url.group(1))]
            assert sorted(_positional(module)) == sorted(placeholders), module.__name__
        assert PATH_OPERATIONS

    @pytest.mark.parametrize("segment", [".", ".."])
    @pytest.mark.parametrize("module", PATH_OPERATIONS, ids=lambda m: m.__name__.rsplit(".", 1)[-1])
    def test_every_path_parameter_refuses_a_dot_segment(
        self, httpx_mock: HTTPXMock, module: ModuleType, segment: str
    ) -> None:
        names = _positional(module)
        for index in range(len(names)):
            args = ["ok"] * len(names)
            args[index] = segment
            with pytest.raises(UsageError, match="cannot be a path segment"):
                call(module.sync_detailed, *args, client=bearer_client("test-token"))
        assert httpx_mock.get_requests() == []


class _Recorder(BaseHTTPRequestHandler):
    def _answer(self) -> None:
        self.server.paths.append(f"{self.command} {self.path}")  # type: ignore[attr-defined]
        body = b'{"ok": true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    do_GET = do_DELETE = _answer  # noqa: N815 - BaseHTTPRequestHandler's spelling

    def log_message(self, *args: object) -> None:
        """Keep the access log out of test output."""


@pytest.fixture
def stub_server() -> Iterator[tuple[str, list[str]]]:
    server = ThreadingHTTPServer(("127.0.0.1", 0), _Recorder)
    server.paths = []  # type: ignore[attr-defined]
    threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}", server.paths  # type: ignore[attr-defined]
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.parametrize("full_name", ["../account", "alice/..", "alice/.", "./x"])
def test_the_note_repro_sends_nothing_to_a_real_server(
    tmp_path: Path, stub_server: tuple[str, list[str]], full_name: str
) -> None:
    url, paths = stub_server
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_API_URL=url,
        BEA_TOKEN="fake",
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        BEA_NO_UPDATE_NOTIFIER="1",
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    result = subprocess.run(
        [sys.executable, "-m", "cli.main", "--yes", "cloud", "ledger", "delete", full_name],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )

    assert result.returncode == 2, result.stderr
    assert "is not a ledger full name" in result.stderr
    assert paths == []
