"""Missing included destinations appear only after a successful write."""

from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

from tests.test_into_glob_create import _env

TRANSACTION = '2024-03-01 * "Cafe"\n  Assets:Bank:Checking -12.34 USD\n  Expenses:Uncategorized 12.34 USD'


def _make_ledger(tmp_path: Path, include: str) -> Path:
    books = tmp_path / "books"
    (books / "parts").mkdir(parents=True)
    root = books / "main.bean"
    root.write_text(f'option "operating_currency" "USD"\ninclude "accounts.bean"\ninclude "{include}"\n')
    (books / "accounts.bean").write_text(
        "2024-01-01 open Assets:Bank:Checking USD\n"
        "2024-01-01 open Expenses:Uncategorized USD\n"
        "2024-01-01 open Equity:Opening USD\n"
        '\n2024-01-02 * "Opening"\n'
        "  Assets:Bank:Checking  1000 USD\n"
        "  Equity:Opening\n"
    )
    (books / "parts" / "older.bean").write_text("; Existing file must stay unchanged.\n")
    return root


@pytest.fixture(params=["glob", "literal"])
def ledger(tmp_path: Path, request: pytest.FixtureRequest) -> Path:
    return _make_ledger(tmp_path, "parts/*.bean" if request.param == "glob" else "parts/new.bean")


@pytest.fixture
def source(tmp_path: Path) -> Path:
    path = tmp_path / "bank.csv"
    path.write_text("Date,Description,Amount,ID\n2024-03-01,Cafe,-12.34,txn-1\n")
    return path


def _tree(directory: Path) -> dict[str, bytes | None]:
    return {
        str(path.relative_to(directory)): path.read_bytes() if path.is_file() else None for path in directory.rglob("*")
    }


def _run(tmp_path: Path, ledger: Path, *args: str, json_output: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            *(["--json"] if json_output else []),
            "--no-input",
            "--file",
            str(ledger),
            *args,
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _import_args(source: Path) -> list[str]:
    return [
        "import",
        str(source),
        "--csv",
        "auto",
        "--account",
        "Assets:Bank:Checking",
        "--into",
        "parts/new.bean",
    ]


def _add_args(source_account: str = "Assets:Bank:Checking", *, into: str = "parts/new.bean") -> list[str]:
    return [
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "Cafe",
        "-p",
        f"{source_account} -12.34 USD",
        "-p",
        "Expenses:Uncategorized 12.34 USD",
        "--into",
        into,
    ]


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_import_preview_leaves_the_books_tree_unchanged(
    tmp_path: Path, ledger: Path, source: Path, json_output: bool
) -> None:
    before = _tree(ledger.parent)

    result = _run(tmp_path, ledger, *_import_args(source), json_output=json_output)

    assert result.returncode == 0, result.stderr
    if json_output:
        data = json.loads(result.stdout)["data"]
        assert (data["ready"], data["written"], data["validation_errors"]) == (1, 0, [])
        assert data["into"] == str(ledger.parent / "parts" / "new.bean")
    else:
        assert "Preview only" in result.stdout
        assert "Cafe" in result.stdout
    assert _tree(ledger.parent) == before


def test_rejected_add_does_not_create_the_destination(tmp_path: Path, ledger: Path) -> None:
    before = _tree(ledger.parent)

    result = _run(tmp_path, ledger, *_add_args("Assets:Nope"))

    assert result.returncode == 1, result.stderr
    assert "unknown account 'Assets:Nope'" in result.stderr
    assert "nothing was written" in result.stderr.lower()
    assert _tree(ledger.parent) == before


@pytest.mark.parametrize("operation", ["add", "import"])
def test_successful_write_creates_only_the_requested_destination(
    tmp_path: Path, ledger: Path, source: Path, operation: str
) -> None:
    before = _tree(ledger.parent)
    args = _add_args() if operation == "add" else [*_import_args(source), "--apply"]

    result = _run(tmp_path, ledger, *args)

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["written"] == 1
    target = ledger.parent / "parts" / "new.bean"
    assert '"Cafe"' in target.read_text()
    if os.name == "posix":
        assert stat.S_IMODE(target.stat().st_mode) == 0o600
    assert _tree(ledger.parent) == {**before, "parts/new.bean": target.read_bytes()}
    checked = _run(tmp_path, ledger, "check")
    assert checked.returncode == 0, checked.stderr


def test_rejected_import_apply_leaves_the_destination_absent(tmp_path: Path, ledger: Path, source: Path) -> None:
    before = _tree(ledger.parent)

    result = _run(tmp_path, ledger, *_import_args(source), "--default-account", "Expenses:Nope", "--apply")

    assert result.returncode == 4, result.stderr
    data = json.loads(result.stderr)["error"]["result"]
    assert (data["blocked"], data["ready"], data["written"]) == (1, 0, 0)
    assert "Expenses:Nope" in data["rows"][0]["reason"]
    assert _tree(ledger.parent) == before


def test_duplicate_only_import_apply_does_not_create_a_destination(tmp_path: Path, ledger: Path, source: Path) -> None:
    with (ledger.parent / "accounts.bean").open("a") as stream:
        stream.write(
            '\n2024-03-01 ! "Cafe"\n'
            '  import-id: "bank:txn-1"\n'
            "  Assets:Bank:Checking  -12.34 USD\n"
            "  Expenses:Uncategorized  12.34 USD\n"
        )
    before = _tree(ledger.parent)

    result = _run(tmp_path, ledger, *_import_args(source), "--apply")

    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    assert (data["duplicates"], data["ready"], data["written"]) == (1, 0, 0)
    assert _tree(ledger.parent) == before


@pytest.mark.parametrize(
    ("include", "destination", "accepted"),
    [
        ("parts/*.bean", "parts/nested/new.bean", False),
        ("parts/*.bean", "parts/.new.bean", False),
        ("parts/**/*.bean", "parts/nested/new.bean", True),
        ("parts/.*.bean", "parts/.new.bean", True),
    ],
    ids=["ordinary-glob-nested", "ordinary-glob-hidden", "recursive-glob-nested", "explicit-hidden-glob"],
)
def test_new_destination_obeys_the_include_glob(tmp_path: Path, include: str, destination: str, accepted: bool) -> None:
    ledger = _make_ledger(tmp_path, include)
    target = ledger.parent / destination
    target.parent.mkdir(exist_ok=True)
    before = _tree(ledger.parent)

    result = _run(tmp_path, ledger, *_add_args(into=destination))

    if accepted:
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["data"]["written"] == 1
        assert '"Cafe"' in target.read_text()
        assert _tree(ledger.parent) == {**before, destination: target.read_bytes()}
        checked = _run(tmp_path, ledger, "check")
        assert checked.returncode == 0, checked.stderr
    else:
        assert result.returncode == 2, result.stderr
        assert "not included" in result.stderr
        assert _tree(ledger.parent) == before


def test_concurrent_target_creation_preserves_the_other_writers_file(
    ledger: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from bea_engine.ledger import write as ledger_write
    from bea_engine.protocol import ConflictError

    target = ledger.parent / "parts" / "new.bean"
    before = _tree(ledger.parent)
    competitor = b"; Created by another writer during commit.\n"
    link = os.link
    attempts: list[Path] = []

    def collide(candidate: Path, destination: Path) -> None:
        assert destination == target
        assert not target.exists()
        assert '"Cafe"' in candidate.read_text()
        attempts.append(destination)
        destination.write_bytes(competitor)
        link(candidate, destination)

    monkeypatch.setattr(ledger_write.os, "link", collide)

    with pytest.raises(ConflictError):
        ledger_write.append(ledger, [TRANSACTION], into=Path("parts/new.bean"))

    assert attempts == [target]
    assert _tree(ledger.parent) == {**before, "parts/new.bean": competitor}
    assert not any(path.name.startswith((".bea-", "..bea-")) for path in ledger.parent.rglob("*"))


def test_retargeted_include_directory_refuses_a_new_file_outside_the_ledger(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from bea_engine.ledger import write as ledger_write
    from bea_engine.protocol import ConflictError

    ledger = _make_ledger(tmp_path, "alias/*.bean")
    first = ledger.parent / "first"
    second = ledger.parent / "second"
    first.mkdir()
    second.mkdir()
    alias = ledger.parent / "alias"
    alias.symlink_to(first, target_is_directory=True)
    original = ledger.read_bytes()
    validate = ledger_write.validate_candidate

    def retarget(candidate: Path, file: Path, **kwargs: Any) -> list[str]:
        warnings = validate(candidate, file, **kwargs)
        alias.unlink()
        alias.symlink_to(second, target_is_directory=True)
        return warnings

    monkeypatch.setattr(ledger_write, "validate_candidate", retarget)

    with pytest.raises(ConflictError):
        ledger_write.append(ledger, [TRANSACTION], into=Path("alias/new.bean"))

    assert alias.resolve() == second
    assert list(first.iterdir()) == list(second.iterdir()) == []
    assert ledger.read_bytes() == original
    assert not any(path.name.startswith((".bea-", "..bea-")) for path in ledger.parent.rglob("*"))


def test_append_dry_run_token_allows_creating_the_unchanged_missing_target(tmp_path: Path, ledger: Path) -> None:
    from bea_engine.ledger import appending

    before = _tree(ledger.parent)
    into = Path("parts/new.bean")
    target = ledger.parent / into

    preview = appending.answer(ledger, TRANSACTION, into=into, dry_run=True)

    assert preview["count"] == 1
    assert preview["target"] == str(target)
    assert preview["token"]
    assert _tree(ledger.parent) == before

    committed = appending.answer(ledger, TRANSACTION, into=into, token=preview["token"])

    assert committed["written"] == 1
    assert committed["target"] == str(target)
    assert '"Cafe"' in target.read_text()
    assert _tree(ledger.parent) == {**before, "parts/new.bean": target.read_bytes()}
    checked = _run(tmp_path, ledger, "check")
    assert checked.returncode == 0, checked.stderr


def test_append_dry_run_token_refuses_an_empty_target_created_before_commit(ledger: Path) -> None:
    from bea_engine.ledger import appending
    from bea_engine.protocol import ConflictError

    before = _tree(ledger.parent)
    into = Path("parts/new.bean")
    preview = appending.answer(ledger, TRANSACTION, into=into, dry_run=True)
    assert _tree(ledger.parent) == before
    target = ledger.parent / into
    target.write_bytes(b"")

    with pytest.raises(ConflictError):
        appending.answer(ledger, TRANSACTION, into=into, token=preview["token"])

    assert _tree(ledger.parent) == {**before, "parts/new.bean": b""}


@pytest.mark.parametrize(
    ("directive", "args"),
    [
        (
            "2024-03-01 price BTC 112000 USD",
            ["price", "--currency", "BTC", "--amount", "112000 USD"],
        ),
        (
            "2024-03-01 balance Assets:Bank:Checking 1000 USD",
            ["balance", "--account", "Assets:Bank:Checking", "--amount", "1000 USD"],
        ),
    ],
    ids=["price", "balance"],
)
def test_duplicate_directive_reports_its_original_source_without_creating_the_target(
    tmp_path: Path, ledger: Path, directive: str, args: list[str]
) -> None:
    accounts = ledger.parent / "accounts.bean"
    original = accounts.read_text()
    accounts.write_text(f"{original}\n{directive}\n")
    before = _tree(ledger.parent)

    result = _run(tmp_path, ledger, "add", *args, "--date", "2024-03-01", "--into", "parts/new.bean")

    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    assert data["duplicate"] is True
    assert data["written"] == 0
    assert data["source"] == {"filename": str(accounts), "lineno": len(original.splitlines()) + 2}
    assert _tree(ledger.parent) == before
