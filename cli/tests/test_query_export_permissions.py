"""Query exports honor file permissions and follow the user's output symlink."""

from __future__ import annotations

import csv
import io
import json
import os
import stat
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import pytest
from click.testing import Result
from typer.testing import CliRunner

from cli.main import app
from cli.utils import atomic_write

pytestmark = pytest.mark.skipif(os.name != "posix", reason="POSIX file modes and symlinks")
runner = CliRunner()
GOOD_QUERY = "SELECT account FROM #accounts"
BAD_QUERY = "SELECT missing_account_name FROM #accounts"


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text('option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n')
    return path


@contextmanager
def _umask(mask: int) -> Iterator[None]:
    previous = os.umask(mask)
    try:
        yield
    finally:
        os.umask(previous)


def _query(ledger: Path, destination: Path, export_format: str, *, query: str = GOOD_QUERY) -> Result:
    args = ["--no-input", "--file", str(ledger)]
    if export_format == "json":
        args.append("--json")
    args.extend(["query", query, "--output", str(destination)])
    if export_format != "json":
        args.extend(["--format", export_format])
    return runner.invoke(app, args)


def _assert_export(result: Result, destination: Path, export_format: str) -> None:
    assert result.exit_code == 0, result.output
    assert result.stdout == ""
    text = destination.read_text()
    if export_format == "json":
        assert json.loads(text)["data"]["rows"] == [["Assets:Cash"]]
    elif export_format == "csv":
        assert list(csv.reader(io.StringIO(text))) == [["account"], ["Assets:Cash"]]
    else:
        assert "account" in text
        assert "Assets:Cash" in text
        assert "last good export" not in text


@pytest.mark.parametrize("export_format", ["text", "csv", "json"])
@pytest.mark.parametrize(("mask", "expected_mode"), [(0o022, 0o644), (0o077, 0o600)], ids=["umask022", "umask077"])
def test_new_exports_use_the_callers_umask(
    tmp_path: Path, ledger: Path, export_format: str, mask: int, expected_mode: int
) -> None:
    destination = tmp_path / f"report.{export_format}"
    with _umask(mask):
        result = _query(ledger, destination, export_format)

    _assert_export(result, destination, export_format)
    assert stat.S_IMODE(destination.stat().st_mode) == expected_mode


@pytest.mark.parametrize("export_format", ["text", "csv", "json"])
@pytest.mark.parametrize("existing_mode", [0o644, 0o640], ids=["mode0644", "mode0640"])
def test_replacing_an_export_preserves_its_existing_mode(
    tmp_path: Path, ledger: Path, export_format: str, existing_mode: int
) -> None:
    destination = tmp_path / f"report.{export_format}"
    destination.write_text("last good export\n")
    destination.chmod(existing_mode)
    with _umask(0o077):
        result = _query(ledger, destination, export_format)

    _assert_export(result, destination, export_format)
    assert stat.S_IMODE(destination.stat().st_mode) == existing_mode


@pytest.mark.parametrize("export_format", ["text", "csv", "json"])
@pytest.mark.parametrize("target_exists", [True, False], ids=["existing-target", "dangling-link"])
def test_exports_follow_relative_symlinks(
    tmp_path: Path, ledger: Path, export_format: str, target_exists: bool
) -> None:
    directory = tmp_path / "reports"
    directory.mkdir()
    target = directory / f"actual.{export_format}"
    if target_exists:
        target.write_text("last good export\n")
        target.chmod(0o640)
    relative_target = Path("reports") / target.name
    destination = tmp_path / f"report.{export_format}"
    destination.symlink_to(relative_target)
    with _umask(0o022):
        result = _query(ledger, destination, export_format)

    assert result.exit_code == 0, result.output
    assert destination.is_symlink(), "exporting must leave the user's symlink in place"
    assert destination.readlink() == relative_target
    _assert_export(result, target, export_format)
    assert stat.S_IMODE(target.stat().st_mode) == (0o640 if target_exists else 0o644)


@pytest.mark.parametrize("export_format", ["text", "csv", "json"])
def test_failed_queries_preserve_the_symlink_and_its_target(tmp_path: Path, ledger: Path, export_format: str) -> None:
    directory = tmp_path / "reports"
    directory.mkdir()
    target = directory / f"actual.{export_format}"
    before = "last good export — keep me\n".encode()
    target.write_bytes(before)
    target.chmod(0o640)
    relative_target = Path("reports") / target.name
    destination = tmp_path / f"report.{export_format}"
    destination.symlink_to(relative_target)
    with _umask(0o022):
        result = _query(ledger, destination, export_format, query=BAD_QUERY)

    assert result.exit_code == 2, result.output
    assert destination.is_symlink()
    assert destination.readlink() == relative_target
    assert target.read_bytes() == before
    assert stat.S_IMODE(target.stat().st_mode) == 0o640


def test_atomic_write_keeps_its_default_private_mode_under_a_permissive_umask(tmp_path: Path) -> None:
    config = tmp_path / "importers.toml"
    with _umask(0o000):
        atomic_write(config, "first configuration\n")
        assert stat.S_IMODE(config.stat().st_mode) == 0o600
        config.chmod(0o664)
        atomic_write(config, "replacement configuration\n")

    assert config.read_text() == "replacement configuration\n"
    assert stat.S_IMODE(config.stat().st_mode) == 0o600


def test_candidate_files_keep_their_default_private_mode_under_a_permissive_umask(tmp_path: Path) -> None:
    from bea_engine.ledger.write import candidate_file

    destination = tmp_path / "main.bean"
    destination.write_text("current contents\n")
    destination.chmod(0o664)
    with _umask(0o000), candidate_file(destination, "replacement contents\n") as candidate:
        assert stat.S_IMODE(candidate.stat().st_mode) == 0o600
        assert candidate.read_text() == "replacement contents\n"
        assert destination.read_text() == "current contents\n"

    assert not candidate.exists()
    assert destination.read_text() == "current contents\n"
    assert stat.S_IMODE(destination.stat().st_mode) == 0o664
