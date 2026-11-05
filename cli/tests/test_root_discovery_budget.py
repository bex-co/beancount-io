"""Incomplete root discovery cannot authorize a leaf write (w5/1119)."""

from __future__ import annotations

import json
import os
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest
from beancount import loader

from bea_engine.ledger import write
from tests.report_helpers import bea


def _books(path: Path, neighbors: int) -> tuple[Path, Path]:
    (path / ".git").mkdir()
    leaf = path / "leaf.bean"
    root = path / "zz-main.bean"
    leaf.write_text(
        'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n'
    )
    root.write_text(
        'option "operating_currency" "USD"\n'
        'include "leaf.bean"\n'
        "2024-01-01 open Equity:Opening USD\n"
        '2024-01-02 * "Capital"\n'
        "  Assets:Cash 100 USD\n"
        "  Equity:Opening -100 USD\n"
    )
    (path / "noise-common.bean").write_text("2024-01-01 open Assets:Other USD\n2024-01-01 open Equity:Other USD\n")
    for n in range(neighbors):
        (path / f"000-noise-{n:03d}.bean").write_text(
            'include "noise-common.bean"\n2024-01-02 * "Noise"\n  Assets:Other 1 USD\n  Equity:Other -1 USD\n'
        )
    return root, leaf


def _add(path: Path, target: Path, amount: str, *, into: str | None = None) -> Any:
    args = [
        "--no-input",
        "--offline",
        "--json",
        "--file",
        str(target),
        "add",
        "balance",
        "--date",
        "2024-02-01",
        "--account",
        "Assets:Cash",
        "--amount",
        amount,
    ]
    if into is not None:
        args += ["--into", into]
    return bea(args, path)


@pytest.mark.parametrize("neighbors", [0, 63, 64])
def test_false_leaf_balance_never_bypasses_its_root(tmp_path: Path, neighbors: int) -> None:
    root, leaf = _books(tmp_path, neighbors)
    before = {p: p.read_bytes() for p in (root, leaf)}
    assert not loader.load_file(str(root))[1]

    result = _add(tmp_path, leaf, "0 USD")

    assert result.returncode != 0, result.stdout + result.stderr
    if neighbors == 64:
        assert result.returncode == 2
        message = json.loads(result.stderr)["error"]["message"]
        assert "discovery" in message and "incomplete" in message
        assert "--file ROOT" in message and "--into" in message
    assert {p: p.read_bytes() for p in before} == before
    assert not loader.load_file(str(root))[1]


@pytest.mark.parametrize("amount, exit_code", [("0 USD", 1), ("100 USD", 0)])
def test_explicit_root_and_destination_work_after_budget_exhaustion(
    tmp_path: Path, amount: str, exit_code: int
) -> None:
    root, leaf = _books(tmp_path, 64)
    original = leaf.read_bytes()

    result = _add(tmp_path, root, amount, into=leaf.name)

    assert result.returncode == exit_code, result.stdout + result.stderr
    if exit_code:
        assert leaf.read_bytes() == original
    else:
        assert json.loads(result.stdout)["data"]["written"] == 1
        assert leaf.read_text().count("balance Assets:Cash") == 1
    assert not loader.load_file(str(root))[1]


def test_last_permitted_candidate_can_still_resolve_the_root(tmp_path: Path) -> None:
    root, leaf = _books(tmp_path, 63)

    result = _add(tmp_path, leaf, "100 USD")

    assert result.returncode == 0, result.stdout + result.stderr
    assert json.loads(result.stdout)["data"]["written"] == 1
    assert not loader.load_file(str(root))[1]


def test_non_including_ledgers_cannot_bypass_the_read_budget(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / ".git").mkdir()
    target = tmp_path / "main.bean"
    target.write_text("2024-01-01 open Assets:Cash USD\n")
    for n in range(1024):
        (tmp_path / f"other-{n:04d}.bean").write_text("2024-01-01 open Assets:Other USD\n")
    opened: list[Path] = []
    original = Path.open

    def counted(path: Path, *args: Any, **kwargs: Any) -> Any:
        if path.suffix == ".bean":
            opened.append(path)
        return original(path, *args, **kwargs)

    monkeypatch.setattr(Path, "open", counted)
    message = ""
    try:
        list(write.including_roots(target))
    except write.UsageError as error:
        message = str(error)

    assert len(opened) <= 128
    assert "incomplete" in message


def test_unrelated_directory_entries_have_a_fixed_work_bound(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / ".git").mkdir()
    target = tmp_path / "main.bean"
    target.write_text("2024-01-01 open Assets:Cash USD\n")
    for n in range(10000):
        (tmp_path / f"other-{n:05d}.txt").touch()
    observed = 0
    original_scandir = os.scandir
    original_listdir = os.listdir

    @contextmanager
    def counted_scandir(path: Any) -> Iterator[Iterator[os.DirEntry[str]]]:
        nonlocal observed
        with original_scandir(path) as scanned:

            def entries() -> Iterator[os.DirEntry[str]]:
                nonlocal observed
                for entry in scanned:
                    observed += 1
                    yield entry

            yield entries()

    def counted_listdir(path: Any) -> list[str]:
        nonlocal observed
        entries = original_listdir(path)
        observed += len(entries)
        return entries

    monkeypatch.setattr(os, "scandir", counted_scandir)
    monkeypatch.setattr(os, "listdir", counted_listdir)
    message = ""
    try:
        list(write.including_roots(target))
    except write.UsageError as error:
        message = str(error)

    assert observed <= 8192
    assert "incomplete" in message


def test_directory_listings_and_candidate_closures_are_reused(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root, leaf = _books(tmp_path, 2)
    listed: list[Path] = []
    opened: list[Path] = []
    original_scandir = os.scandir
    original_open = Path.open

    @contextmanager
    def counted_scandir(path: Any) -> Iterator[Any]:
        listed.append(Path(path))
        with original_scandir(path) as scanned:
            yield scanned

    def counted_open(path: Path, *args: Any, **kwargs: Any) -> Any:
        if path.suffix == ".bean":
            opened.append(path)
        return original_open(path, *args, **kwargs)

    monkeypatch.setattr(os, "scandir", counted_scandir)
    monkeypatch.setattr(Path, "open", counted_open)

    selected, into, _ = write.write_through_root(leaf, None)

    assert selected == root
    assert into == Path(leaf.name)
    assert listed.count(tmp_path) == 1
    assert len(opened) == len(set(opened))


def test_oversized_potential_root_is_not_a_complete_empty_search(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root, leaf = _books(tmp_path, 0)
    monkeypatch.setattr(write, "_INCLUDER_MAX_BYTES", root.stat().st_size - 1)

    with pytest.raises(write.UsageError, match="incomplete"):
        write.write_through_root(leaf, None)


@pytest.mark.skipif(os.name == "nt", reason="POSIX directory symlink")
def test_recursive_glob_cycle_is_refused_before_native_expansion(tmp_path: Path) -> None:
    (tmp_path / ".git").mkdir()
    (tmp_path / "main.bean").write_text('include "parts/**/*.bean"\n')
    parts = tmp_path / "parts"
    parts.mkdir()
    (parts / "leaf.bean").write_text("; leaf\n")
    (parts / "again").symlink_to(parts, target_is_directory=True)

    with pytest.raises(write.UsageError, match="incomplete.*directory cycle"):
        write.write_through_root(parts / "leaf.bean", None)


def test_candidate_closure_globs_share_the_work_budget(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root, leaf = _books(tmp_path, 0)
    nested = tmp_path / "archive" / "deep"
    nested.mkdir(parents=True)
    for n in range(5000):
        (nested / f"old-{n:04d}.bean").write_text("; unrelated\n")
    root.write_text(root.read_text() + 'include "archive/deep/*.bean"\n')
    expanded: list[str] = []
    original = write.glob.glob

    def counted(pattern: str, **kwargs: Any) -> list[str]:
        expanded.append(pattern)
        return original(pattern, **kwargs)

    monkeypatch.setattr(write.glob, "glob", counted)
    with pytest.raises(write.UsageError, match="incomplete"):
        write.write_through_root(leaf, None)
    pattern = str(nested / "*.bean")
    assert pattern not in expanded, "preflight must stop before the second native traversal"

    # Normal validation snapshots retain native glob behavior and no search cap.
    snapshot = write.LedgerSnapshot.capture(root)
    assert len(snapshot.contents) == 5002
    assert pattern in expanded


def test_a_growing_candidate_is_read_only_up_to_the_remaining_budget(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root, leaf = _books(tmp_path, 0)
    root.write_text(";" * 1024)
    (tmp_path / "noise-common.bean").unlink()
    original_stat = Path.stat
    original_open = Path.open
    reads: list[int] = []

    def stale_stat(path: Path, *args: Any, **kwargs: Any) -> os.stat_result:
        info = original_stat(path, *args, **kwargs)
        if path == root:
            values = list(info)
            values[6] = 0
            return os.stat_result(values)
        return info

    @contextmanager
    def counted_open(path: Path, *args: Any, **kwargs: Any) -> Iterator[Any]:
        with original_open(path, *args, **kwargs) as stream:
            if path != root:
                yield stream
                return

            class Reader:
                def read(self, size: int = -1) -> bytes:
                    reads.append(size)
                    return stream.read(size)

            yield Reader()

    monkeypatch.setattr(write, "_INCLUDER_MAX_BYTES", 16)
    monkeypatch.setattr(Path, "stat", stale_stat)
    monkeypatch.setattr(Path, "open", counted_open)
    with pytest.raises(write.UsageError, match="incomplete"):
        write.write_through_root(leaf, None)
    assert reads == [17]


@pytest.mark.parametrize("resolver", ["defining", "defines", "nearest"])
def test_incomplete_closure_cannot_be_swallowed_by_root_classification(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, resolver: str
) -> None:
    root, leaf = _books(tmp_path, 0)
    monkeypatch.setattr(write, "including_root", lambda _file: root)
    monkeypatch.setattr(write, "including_roots", lambda _file: iter((root, tmp_path / "other.bean")))

    def incomplete(*_args: Any, **_kwargs: Any) -> Any:
        raise write.IncompleteRootSearch("incomplete test closure")

    monkeypatch.setattr(write.LedgerSnapshot, "capture", incomplete)
    with pytest.raises(write.UsageError, match="incomplete"):
        if resolver == "defining":
            write.defining_root(leaf)
        elif resolver == "defines":
            write.defines_for(leaf, root)
        else:
            write._nearest_includers(leaf)


def test_import_refuses_incomplete_search_and_explicit_selection_recovers(tmp_path: Path) -> None:
    root, leaf = _books(tmp_path, 0)
    for n in range(256):
        (tmp_path / f"000-unrelated-{n:03d}.bean").write_text("; no include\n")
    source = tmp_path / "bank.csv"
    source.write_text("Date,Description,Amount,Reference\n2024-02-01,Coffee,-4.50,coffee-1\n")
    original = {p: p.read_bytes() for p in (root, leaf, source)}
    args = [
        "import",
        str(source),
        "--csv",
        "date=Date,narration=Description,amount=Amount,id=Reference",
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
    ]
    for apply in ([], ["--apply"]):
        result = bea(["--json", "--no-input", "--offline", "--file", str(leaf), *args, *apply], tmp_path)
        assert result.returncode == 2, result.stdout + result.stderr
        assert "incomplete" in result.stderr and "--into" in result.stderr
        assert {p: p.read_bytes() for p in original} == original

    for apply, written in (([], 0), (["--apply"], 1), (["--apply", "--duplicates", "skip"], 0)):
        result = bea(
            ["--json", "--no-input", "--offline", "--file", str(root), *args, "--into", leaf.name, *apply], tmp_path
        )
        assert result.returncode == 0, result.stdout + result.stderr
        assert json.loads(result.stdout)["data"]["written"] == written
    assert leaf.read_text().count('"Coffee"') == 1
    assert root.read_bytes() == original[root] and source.read_bytes() == original[source]
    assert not loader.load_file(str(root))[1]
