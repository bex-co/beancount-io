"""Server-supplied `sshUrl` and `name` never become git options or paths outside cwd (w1/089).

The API response is simulated with pytest-httpx; the clone itself runs real
git against a local bare repository (see the `git_remote` fixture).
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest
from pytest_httpx import HTTPXMock
from typer.testing import CliRunner

from cli.commands.cloud.ledger import manager
from cli.main import app
from tests.conftest import GitRemote

_API = "https://api.example"


@pytest.fixture(autouse=True)
def _cloud(logged_in: None, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    monkeypatch.setenv("BEA_API_URL", _API)
    # The note's repro runs inside an existing repository: with name "." git
    # would treat cwd as the repository and run the injected upload-pack.
    workdir = tmp_path / "work" / "repo"
    workdir.mkdir(parents=True)
    subprocess.run(["git", "init", "-q", str(workdir)], check=True, capture_output=True)
    monkeypatch.chdir(workdir)
    return workdir


def _ledger(name: str, ssh_url: str) -> dict[str, object]:
    return {
        "id": "ledger-1",
        "name": name,
        "fullName": "alice/books",
        "httpUrl": "https://example.test/alice/books",
        "sshUrl": ssh_url,
        "private": True,
        "empty": True,
        "size": 0,
        "createdAt": "2026-10-03T00:00:00Z",
        "updatedAt": "2026-10-03T00:00:00Z",
    }


def _marker(tmp_path: Path) -> Path:
    return tmp_path / "PWNED"


def _hostile_urls(tmp_path: Path) -> list[str]:
    marker = _marker(tmp_path)
    return [
        f"--upload-pack=touch {marker}; git-upload-pack",
        "--version",
        f"ext::sh -c touch% {marker}",
        f"-c core.sshCommand=touch {marker} git@example.test:alice/books.git",
        f"ssh://-oProxyCommand=touch {marker}/alice/books.git",
        "file:///etc",
        "/srv/alice/books.git",
    ]


@pytest.mark.parametrize("index", range(7))
@pytest.mark.parametrize("name", [".", "books"])
def test_clone_refuses_a_hostile_url(httpx_mock: HTTPXMock, tmp_path: Path, index: int, name: str) -> None:
    url = _hostile_urls(tmp_path)[index]
    httpx_mock.add_response(method="GET", url=f"{_API}/api-gateway/v1/ledgers/alice/books", json=_ledger(name, url))
    before = sorted(p.name for p in Path.cwd().iterdir())

    result = CliRunner().invoke(app, ["cloud", "ledger", "clone", "alice/books"])

    assert result.exit_code == 1, result.output
    assert "Unexpected server response" in result.stderr
    assert "cloned to" not in result.output
    assert not _marker(tmp_path).exists()
    assert sorted(p.name for p in Path.cwd().iterdir()) == before


@pytest.mark.parametrize("name", [".", "..", "../escaped", "../src", "/tmp/abs", "Books"])
def test_clone_refuses_a_name_that_is_not_a_ledger_slug(
    httpx_mock: HTTPXMock, git_remote: GitRemote, tmp_path: Path, name: str
) -> None:
    httpx_mock.add_response(
        method="GET", url=f"{_API}/api-gateway/v1/ledgers/alice/books", json=_ledger(name, git_remote.url)
    )
    outside = sorted(p.name for p in Path.cwd().parent.iterdir())

    result = CliRunner().invoke(app, ["cloud", "ledger", "clone", "alice/books"])

    assert result.exit_code == 1, result.output
    assert "Unexpected server response" in result.stderr
    assert "--dir" in result.stderr
    assert sorted(p.name for p in Path.cwd().parent.iterdir()) == outside
    assert not list((Path.cwd() / ".git" / "objects" / "pack").glob("*.pack"))


def test_explicit_dir_does_not_need_a_valid_server_name(httpx_mock: HTTPXMock, git_remote: GitRemote) -> None:
    httpx_mock.add_response(
        method="GET", url=f"{_API}/api-gateway/v1/ledgers/alice/books", json=_ledger("../escaped", git_remote.url)
    )

    result = CliRunner().invoke(app, ["cloud", "ledger", "clone", "alice/books", "--dir", "checkout"])

    assert result.exit_code == 0, result.output
    assert (Path.cwd() / "checkout" / ".git").is_dir()


@pytest.mark.parametrize("url_form", ["ssh", "https", "scp"])
def test_a_normal_clone_still_works(
    httpx_mock: HTTPXMock, git_remote: GitRemote, monkeypatch: pytest.MonkeyPatch, url_form: str
) -> None:
    url = {
        "ssh": git_remote.url,
        "https": "https://example.test/alice/books.git",
        "scp": "git@example.test:alice/books.git",
    }[url_form]
    monkeypatch.setenv("GIT_CONFIG_VALUE_0", url)
    httpx_mock.add_response(method="GET", url=f"{_API}/api-gateway/v1/ledgers/alice/books", json=_ledger("books", url))

    result = CliRunner().invoke(app, ["cloud", "ledger", "clone", "alice/books"])

    assert result.exit_code == 0, result.output
    assert (Path.cwd() / "books" / ".git").is_dir()


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_create_clone_refuses_a_hostile_url_but_reports_the_creation(
    httpx_mock: HTTPXMock, tmp_path: Path, json_output: bool
) -> None:
    url = _hostile_urls(tmp_path)[0]
    httpx_mock.add_response(method="POST", url=f"{_API}/api-gateway/v1/ledgers", json=_ledger(".", url))
    before = sorted(p.name for p in Path.cwd().iterdir())

    result = CliRunner().invoke(
        app, [*(["--json"] if json_output else []), "cloud", "ledger", "create", "books", "--clone"]
    )

    assert result.exit_code == 1, result.output
    assert "was created but was not cloned" in result.stderr
    assert "Unexpected server response" in result.stderr
    assert not _marker(tmp_path).exists()
    assert sorted(p.name for p in Path.cwd().iterdir()) == before
    if json_output:
        assert json.loads(result.stderr)["error"]["result"]["full_name"] == "alice/books"


def test_git_is_told_where_options_end(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def fake_run(argv: list[str], **_: object) -> subprocess.CompletedProcess[str]:
        calls.append(argv)
        return subprocess.CompletedProcess(argv, 0, "", "")

    monkeypatch.setattr(manager.subprocess, "run", fake_run)

    manager.clone_ledger("git@example.test:alice/books.git", tmp_path / "books")

    assert calls == [["git", "clone", "--", "git@example.test:alice/books.git", str(tmp_path / "books")]]
