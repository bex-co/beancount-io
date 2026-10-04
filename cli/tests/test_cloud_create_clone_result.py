"""A clone failure retains the confirmed remote creation in both output modes."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.main import app
from tests.conftest import GitRemote


@pytest.fixture(autouse=True)
def cloud_credentials(logged_in: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BEA_API_URL", "https://api.example")


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
@pytest.mark.parametrize("clone", ["none", "success", "failure"])
def test_create_result_survives_the_clone_step(
    tmp_path: Path, httpx_mock: HTTPXMock, git_remote: GitRemote, json_output: bool, clone: str
) -> None:
    origin = git_remote.url
    wire = {
        "id": "ledger-created",
        "name": "books",
        "fullName": "alice/books",
        "httpUrl": "https://example.test/alice/books",
        "sshUrl": origin,
        "private": True,
        "empty": True,
        "size": 0,
        "createdAt": "2026-10-02T00:00:00Z",
        "updatedAt": "2026-10-02T00:00:00Z",
    }
    httpx_mock.add_response(method="POST", url="https://api.example/api-gateway/v1/ledgers", json=wire)
    target = tmp_path / "checkout"
    if clone == "failure":
        target.mkdir()
        (target / "keep.txt").write_text("original\n")
    args = [*(["--json"] if json_output else []), "cloud", "ledger", "create", "books"]
    if clone != "none":
        args.extend(["--clone", "--dir", str(target)])

    result = CliRunner().invoke(app, args)

    failed = clone == "failure"
    assert result.exit_code == (1 if failed else 0), result.output
    assert len(httpx_mock.get_requests()) == 1
    if json_output:
        envelope = json.loads(result.stderr if failed else result.stdout)
        if failed:
            assert result.stdout == ""
            assert envelope["error"]["category"] == "validation"
            assert envelope["error"]["exit_code"] == 1
        data = envelope["error"]["result"] if failed else envelope["data"]
        assert data == {
            "id": "ledger-created",
            "name": "books",
            "full_name": "alice/books",
            "http_url": "https://example.test/alice/books",
            "ssh_url": origin,
            "private": True,
            "empty": True,
            "size": 0,
            "created_at": "2026-10-02T00:00:00Z",
            "updated_at": "2026-10-02T00:00:00Z",
        }
    else:
        assert "fullName: alice/books" in result.stdout
        assert f"sshUrl:   {origin}" in result.stdout
        assert "private:  yes" in result.stdout
    if failed:
        assert "was created but could not be cloned" in result.stderr
        assert f"git clone {origin}" in result.stderr
        assert list(target.iterdir()) == [target / "keep.txt"]
        assert (target / "keep.txt").read_text() == "original\n"
    elif clone == "success":
        assert (target / ".git").is_dir()
    else:
        assert not target.exists()


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_unconfirmed_creation_has_no_created_result(httpx_mock: HTTPXMock, json_output: bool) -> None:
    httpx_mock.add_exception(httpx.ReadTimeout("response lost"), method="POST")

    result = CliRunner().invoke(app, [*(["--json"] if json_output else []), "cloud", "ledger", "create", "books"])

    assert result.exit_code == 4
    assert result.stdout == ""
    assert "outcome" in result.stderr.lower()
    if json_output:
        assert "result" not in json.loads(result.stderr)["error"]
