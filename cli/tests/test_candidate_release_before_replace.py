"""A staged copy is renamed over the ledger with its own handle closed.

Windows refuses to rename a file that has an open handle, and the staged copy
stays open for its lifetime so a sweep can tell it is live. Every write into an
existing ledger there ended "the filesystem refused to replace" it, with
nothing written, on the installed-artifact CI matrix. The release is
Windows-only, so these tests drive it on the host with the platform check
stood in, and pin the part that can go wrong anywhere: the owner's own cleanup
must not close the descriptor number a second time, because by then it can
name a different file.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

from bea_engine import stopping
from bea_engine.ledger import write


def _is_open(fd: int) -> bool:
    try:
        os.fstat(fd)
    except OSError:
        return False
    return True


def test_release_handle_closes_the_staged_descriptor(tmp_path: Path) -> None:
    path = tmp_path / "copy"
    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)
    with stopping.staged(path, fd):
        stopping.release_handle(path)
        assert not _is_open(fd)
        # Releasing again is a no-op rather than a second close.
        stopping.release_handle(path)
    assert stopping.take_released(path) is True
    assert stopping.take_released(path) is False


def test_release_handle_ignores_a_path_that_was_never_staged(tmp_path: Path) -> None:
    stopping.release_handle(tmp_path / "never")
    assert stopping.take_released(tmp_path / "never") is False


def test_a_signal_cleanup_after_release_does_not_close_a_reused_descriptor(tmp_path: Path) -> None:
    path = tmp_path / "copy"
    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)
    with stopping.staged(path, fd):
        stopping.release_handle(path)
        bystander = os.open(tmp_path / "other", os.O_RDWR | os.O_CREAT, 0o600)
        try:
            stopping._discard_staged()
            assert _is_open(bystander)
        finally:
            os.close(bystander)
    stopping.take_released(path)


def test_release_candidate_is_a_no_op_off_windows(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "linux")
    ledger = tmp_path / "main.bean"
    ledger.write_text("; ledger\n")
    with write.candidate_file(ledger, "; new\n") as candidate:
        fds = [fd for fd in range(3, 64) if _is_open(fd)]
        write.release_candidate(candidate)
        assert [fd for fd in range(3, 64) if _is_open(fd)] == fds


def test_a_released_candidate_replaces_the_ledger_and_leaves_no_descriptor_behind(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text("; old\n")
    bystander: list[int] = []
    with monkeypatch.context() as patch:
        patch.setattr(sys, "platform", "win32")
        with write.candidate_file(ledger, "; new\n") as candidate:
            write.release_candidate(candidate)
            os.replace(candidate, ledger)
            # The candidate's descriptor number is free now; a file opened here
            # would take it, and the owner's cleanup must not close that file.
            bystander.append(os.open(tmp_path / "other", os.O_RDWR | os.O_CREAT, 0o600))
    try:
        assert ledger.read_text() == "; new\n"
        assert _is_open(bystander[0])
    finally:
        os.close(bystander[0])
    assert not any(p.name.startswith(".bea-") for p in tmp_path.iterdir())


def test_an_unreleased_candidate_is_still_closed_by_its_owner(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text("; old\n")
    before = [fd for fd in range(3, 64) if _is_open(fd)]
    with write.candidate_file(ledger, "; new\n"):
        pass
    assert [fd for fd in range(3, 64) if _is_open(fd)] == before
    assert not any(p.name.startswith(".bea-") for p in tmp_path.iterdir())
