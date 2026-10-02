"""`format --in-place` is a locked, atomic write (w3/434, w3/435).

Two symptoms of one defect: the formatter used to hand the user's file to
upstream's `--in-place` and then rewrite it a second time itself, taking no lock
and staging nothing. A concurrent `bea add` that had already reported success
could be overwritten by the pre-append snapshot, and a signal during either
write left the ledger at zero bytes.

The reproducers in those notes are timing sweeps. These tests pin the two
properties that made them possible instead: the write waits for the ledger lock,
and the target is replaced rather than truncated.
"""

from __future__ import annotations

import errno
import os
import signal
import subprocess
import sys
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import pytest
from typer.testing import CliRunner

from bea_engine.ledger import formatting
from bea_engine.ledger import write as ledger_write
from bea_engine.protocol import AuthError, ConflictError, EngineError
from cli.main import app

runner = CliRunner()
ROOT = Path(__file__).resolve().parents[1]

HEADER = 'option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n\n'
# Three-space posting indents, so every posting line needs rewriting.
ENTRY = '2021-0{month}-01 * "t{index}"\n   Expenses:Food 1.00 USD\n   Assets:Cash -1.00 USD\n\n'
PROBE = '2022-01-01 * "PROBE"\n  Expenses:Food 9.00 USD\n  Assets:Cash -9.00 USD\n'


def _ledger(directory: Path, name: str = "main.bean", entries: int = 12) -> Path:
    file = directory / name
    file.write_text(HEADER + "".join(ENTRY.format(month=i % 9 + 1, index=i) for i in range(entries)))
    return file


def _bea(work: Path, *args: str) -> subprocess.Popen[str]:
    """`bea` in its own process group, sharing this test's isolated environment."""
    return subprocess.Popen(
        [sys.executable, "-m", "cli.main", *args],
        cwd=work,
        env={**os.environ, "PYTHONPATH": str(ROOT / "src")},
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )


def _litter(directory: Path) -> list[str]:
    """Staging copies left behind, candidates and Beancount's own sidecars alike."""
    return sorted(path.name for path in directory.iterdir() if "bea-" in path.name)


def test_in_place_waits_for_the_ledger_lock_and_keeps_the_write_it_waited_for(tmp_path: Path) -> None:
    """The lost concurrent append (w3/434), without sweeping offsets.

    Holding the lock stands in for an `add` that is mid-write: the formatter must
    not read or replace the file until that writer is done. Before the fix it
    took no lock at all, so it ran straight through and the append that landed
    while it worked was the one it overwrote.
    """
    file = _ledger(tmp_path)
    child: subprocess.Popen[str] | None = None
    try:
        with ledger_write.lock_file(file):
            child = _bea(tmp_path, "format", str(file), "--in-place")
            with pytest.raises(subprocess.TimeoutExpired):
                # A formatter that ignores the lock finishes this in well under a
                # second; one that respects it cannot finish while it is held.
                child.wait(timeout=15)
            assert "PROBE" not in file.read_text()
            # The append the formatter is waiting behind, committed under the lock.
            file.write_text(file.read_text() + PROBE)
        _, err = child.communicate(timeout=120)
    finally:
        if child is not None and child.poll() is None:  # pragma: no cover - only on failure
            child.kill()
            child.communicate()
    assert child.returncode == 0, err
    assert "PROBE" in file.read_text()
    assert _litter(tmp_path) == []
    assert runner.invoke(app, ["format", str(file), "--check"]).exit_code == 0


def test_the_target_is_replaced_rather_than_rewritten(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """One `os.replace` of a staged candidate — never a write to the target itself.

    The inode is the plain observable: a truncating write keeps it, a replacement
    does not. Before the fix the file was opened for writing twice, under its own
    name, which is what left it empty when a signal landed in between.
    """
    file = _ledger(tmp_path)
    before = file.stat()
    replacements: list[tuple[str, str]] = []
    real_replace = os.replace

    def record(src: object, dst: object) -> None:
        replacements.append((Path(os.fspath(src)).name, os.fspath(dst)))  # type: ignore[arg-type]
        real_replace(src, dst)  # type: ignore[arg-type]

    monkeypatch.setattr(os, "replace", record)
    answer = formatting.format_files([file], in_place=True, prefix_width=None, num_width=None, currency_column=None)

    assert answer == {"changed": [str(file)]}
    assert [staged.startswith(".bea-") for staged, _ in replacements] == [True]
    assert [destination for _, destination in replacements] == [str(file)]
    assert file.stat().st_ino != before.st_ino
    assert "  Expenses:Food" in file.read_text()
    assert _litter(tmp_path) == []


def test_a_failure_before_the_replacement_leaves_every_byte_in_place(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A batch that cannot finish names what it did, and damages nothing else."""
    files = [_ledger(tmp_path, name) for name in ("a.bean", "b.bean", "c.bean")]
    original = files[1].read_bytes()
    real = ledger_write.replace_checked

    def refuse(target: Path, *args: object) -> None:
        if target == files[1]:
            raise AuthError(f"Ledger file is read-only or not writable: {target}.")
        real(target, *args)  # type: ignore[arg-type]

    monkeypatch.setattr(ledger_write, "replace_checked", refuse)
    with pytest.raises(AuthError) as failure:
        formatting.format_files(files, in_place=True, prefix_width=None, num_width=None, currency_column=None)

    assert failure.value.result == {
        "formatted": [str(files[0])],
        "failed": [{"file": str(files[1]), "errors": [str(failure.value)]}],
        "not_attempted": [str(files[2])],
        "unchanged": [],
    }
    assert "  Expenses:Food" in files[0].read_text()
    assert files[1].read_bytes() == original
    assert files[2].read_bytes() == original
    assert _litter(tmp_path) == []


@pytest.mark.parametrize("conflict", [False, True], ids=["disk-full", "concurrent-edit"])
def test_write_failures_keep_partial_progress_and_their_error_category(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, conflict: bool
) -> None:
    files = [_ledger(tmp_path, name) for name in ("a.bean", "b.bean", "c.bean")]
    before = {file: file.read_bytes() for file in files}
    real = ledger_write.replace_checked

    def refuse(target: Path, *args: object) -> None:
        if target == files[1]:
            if conflict:
                raise ConflictError("The ledger changed while formatting; retry.")
            raise OSError(errno.ENOSPC, "No space left on device")
        real(target, *args)  # type: ignore[arg-type]

    monkeypatch.setattr(ledger_write, "replace_checked", refuse)
    with pytest.raises(EngineError) as failure:
        formatting.format_files(files, in_place=True, prefix_width=None, num_width=None, currency_column=None)

    assert failure.value.exit_code == (4 if conflict else 1)
    result = failure.value.result
    assert result is not None
    assert result["formatted"] == [str(files[0])]
    assert result["not_attempted"] == [str(files[2])]
    assert result["failed"][0]["file"] == str(files[1])
    assert ("changed" if conflict else "No space left") in result["failed"][0]["errors"][0]
    assert files[0].read_bytes() != before[files[0]]
    assert all(file.read_bytes() == before[file] for file in files[1:])
    assert _litter(tmp_path) == []


def test_a_lock_failure_reports_that_no_file_was_attempted(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    files = [_ledger(tmp_path, name) for name in ("a.bean", "b.bean", "c.bean")]
    before = {file: file.read_bytes() for file in files}
    real = ledger_write.lock_file

    @contextmanager
    def refuse(target: Path) -> Iterator[None]:
        if target == files[1]:
            raise PermissionError(errno.EACCES, "Cannot open the ledger lock")
        with real(target):
            yield

    monkeypatch.setattr(ledger_write, "lock_file", refuse)
    with pytest.raises(EngineError) as failure:
        formatting.format_files(files, in_place=True, prefix_width=None, num_width=None, currency_column=None)

    result = failure.value.result
    assert result is not None
    assert result["formatted"] == result["unchanged"] == []
    assert result["failed"][0]["file"] == str(files[1])
    assert "Cannot open the ledger lock" in result["failed"][0]["errors"][0]
    assert result["not_attempted"] == [str(files[0]), str(files[2])]
    assert all(file.read_bytes() == before[file] for file in files)
    assert _litter(tmp_path) == []


def test_cleanup_failure_does_not_hide_a_completed_replacement(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    files = [_ledger(tmp_path, name) for name in ("a.bean", "b.bean")]
    before = {file: file.read_bytes() for file in files}
    real = ledger_write.candidate_file

    @contextmanager
    def fail_cleanup(file: Path, content: str) -> Iterator[Path]:
        with real(file, content) as candidate:
            yield candidate
        raise OSError(errno.EACCES, "Cannot remove a staging sidecar")

    monkeypatch.setattr(ledger_write, "candidate_file", fail_cleanup)
    with pytest.raises(EngineError) as failure:
        formatting.format_files(files, in_place=True, prefix_width=None, num_width=None, currency_column=None)

    result = failure.value.result
    assert result is not None
    assert result["formatted"] == [str(files[0])]
    assert result["failed"] == result["unchanged"] == []
    assert result["not_attempted"] == [str(files[1])]
    assert "Cannot remove a staging sidecar" in str(failure.value)
    assert files[0].read_bytes() != before[files[0]]
    assert files[1].read_bytes() == before[files[1]]
    assert formatting.format_files(
        files[:1], in_place=False, prefix_width=None, num_width=None, currency_column=None
    ) == {"changed": []}


def test_lock_release_failure_keeps_all_completed_replacements(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    files = [_ledger(tmp_path, name) for name in ("a.bean", "b.bean")]
    real = ledger_write.lock_file

    @contextmanager
    def fail_release(file: Path) -> Iterator[None]:
        with real(file):
            yield
        raise OSError(errno.EIO, "Cannot close the ledger lock")

    monkeypatch.setattr(ledger_write, "lock_file", fail_release)
    with pytest.raises(EngineError) as failure:
        formatting.format_files(files, in_place=True, prefix_width=None, num_width=None, currency_column=None)

    result = failure.value.result
    assert result is not None
    assert result["formatted"] == [str(file) for file in files]
    assert result["failed"] == result["unchanged"] == result["not_attempted"] == []
    assert "Cannot close the ledger lock" in str(failure.value)
    assert formatting.format_files(files, in_place=False, prefix_width=None, num_width=None, currency_column=None) == {
        "changed": []
    }


def test_the_target_is_never_observed_empty_during_a_run(tmp_path: Path) -> None:
    """Sampling the size for a whole run never sees 0 — it saw it twice (w3/435)."""
    file = _ledger(tmp_path, entries=4000)
    unformatted = file.stat().st_size
    sizes: list[int] = []
    running = True

    def poll() -> None:
        while running:
            try:
                sizes.append(file.stat().st_size)
            except OSError:
                sizes.append(0)

    watcher = threading.Thread(target=poll)
    watcher.start()
    child = _bea(tmp_path, "format", str(file), "--in-place")
    _, err = child.communicate(timeout=300)
    running = False
    watcher.join()

    assert child.returncode == 0, err
    assert sizes, "the watcher never sampled the target"
    # Only two sizes exist for the whole run: the input's, and the formatted one.
    assert set(sizes) <= {unformatted, file.stat().st_size}
    assert 0 not in sizes


def test_an_interrupted_run_leaves_the_file_whole_and_no_staging_copy(tmp_path: Path) -> None:
    """SIGINT to the process group: byte-identical or fully formatted, exit 130."""
    file = _ledger(tmp_path, entries=4000)
    original = file.read_bytes()
    reference = tmp_path / "reference.bean"
    reference.write_bytes(original)
    assert runner.invoke(app, ["format", str(reference), "--in-place"]).exit_code == 0
    formatted = reference.read_bytes()
    assert formatted != original
    reference.unlink()

    child = _bea(tmp_path, "format", str(file), "--in-place")
    # Aimed at the staging window rather than at a fixed offset: a candidate
    # beside the ledger means the formatted bytes exist and the replacement has
    # not happened yet, which is exactly where the old code lost the file.
    deadline = time.time() + 60
    while time.time() < deadline and not _litter(tmp_path) and child.poll() is None:
        time.sleep(0.001)
    try:
        os.killpg(child.pid, signal.SIGINT)
    except (ProcessLookupError, PermissionError):
        pass  # It finished first; every assertion below still has to hold.
    child.communicate(timeout=120)

    exit_code = 128 - child.returncode if child.returncode < 0 else child.returncode
    assert exit_code in {0, 130}
    assert file.read_bytes() in {original, formatted}
    assert _litter(tmp_path) == []


def test_formatting_twice_converges_and_check_agrees(tmp_path: Path) -> None:
    """`-i` twice reports no second change, and `--check` on the result exits 0."""
    file = _ledger(tmp_path)

    first = runner.invoke(app, ["format", str(file), "--in-place"])
    assert first.exit_code == 0, first.output
    assert "1/1 file(s) formatted." in first.stdout
    once = file.read_bytes()

    second = runner.invoke(app, ["format", str(file), "--in-place"])
    assert second.exit_code == 0, second.output
    assert "0/1 file(s) formatted." in second.stdout
    assert file.read_bytes() == once

    assert runner.invoke(app, ["format", str(file), "--check"]).exit_code == 0


def test_a_read_only_target_refuses_and_writes_nothing(tmp_path: Path) -> None:
    """The filesystem refusing is exit 3 here, as it is for every other write."""
    file = _ledger(tmp_path)
    original = file.read_bytes()
    file.chmod(0o444)
    if os.access(file, os.W_OK):
        pytest.skip("This user can write read-only files")
    try:
        result = runner.invoke(app, ["format", str(file), "--in-place"])
    finally:
        file.chmod(0o644)

    assert result.exit_code == 3, result.output
    assert file.read_bytes() == original
    assert _litter(tmp_path) == []


def test_two_concurrent_in_place_runs_both_finish(tmp_path: Path) -> None:
    """Locking in one order means contending runs queue instead of deadlocking."""
    files = [_ledger(tmp_path, name, entries=200) for name in ("a.bean", "b.bean")]
    children = [_bea(tmp_path, "format", *(str(file) for file in files), "-i") for _ in range(2)]
    outcomes = [child.communicate(timeout=300) for child in children]

    assert [child.returncode for child in children] == [0, 0], outcomes
    assert sum("2/2 file(s) formatted." in out for out, _ in outcomes) == 1
    assert sum("0/2 file(s) formatted." in out for out, _ in outcomes) == 1
    assert runner.invoke(app, ["format", *(str(file) for file in files), "--check"]).exit_code == 0
    assert _litter(tmp_path) == []
