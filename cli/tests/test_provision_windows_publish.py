"""Windows keeps a fresh engine locked for a while; publish waits and stale partials are swept (w5/1111)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import pytest

from cli.engine import provision
from cli.errors import EngineError


def _locked(times: int, real: Any) -> Any:
    calls = {"n": 0}

    def replace(source: Any, target: Any) -> None:
        calls["n"] += 1
        if calls["n"] <= times:
            raise PermissionError(13, "Access is denied")
        real(source, target)

    replace.calls = calls  # type: ignore[attr-defined]
    return replace


@pytest.fixture
def delays(monkeypatch: pytest.MonkeyPatch) -> list[float]:
    slept: list[float] = []
    monkeypatch.setattr(provision.time, "sleep", slept.append)
    return slept


def test_the_rename_waits_out_a_lock_on_windows(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, delays: list[float]
) -> None:
    partial, root = tmp_path / "0.3.1.partial.1", tmp_path / "0.3.1"
    partial.mkdir()
    monkeypatch.setattr(provision.sys, "platform", "win32")
    monkeypatch.setattr(provision.os, "replace", _locked(3, os.replace))

    provision._publish(partial, root)

    assert root.is_dir() and not partial.exists()
    assert len(delays) == 3 and delays == sorted(delays)


def test_a_lock_that_never_lifts_still_fails_after_the_bounded_wait(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, delays: list[float]
) -> None:
    partial = tmp_path / "0.3.1.partial.1"
    partial.mkdir()
    monkeypatch.setattr(provision.sys, "platform", "win32")
    monkeypatch.setattr(provision.os, "replace", _locked(10_000, os.replace))

    with pytest.raises(EngineError, match="Could not move the finished engine into place"):
        provision._publish(partial, tmp_path / "0.3.1")

    assert len(delays) == provision._RENAME_ATTEMPTS - 1


def test_other_platforms_do_not_retry(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, delays: list[float]) -> None:
    partial = tmp_path / "0.3.1.partial.1"
    partial.mkdir()
    monkeypatch.setattr(provision.sys, "platform", "linux")
    monkeypatch.setattr(provision.os, "replace", _locked(1, os.replace))

    with pytest.raises(EngineError):
        provision._publish(partial, tmp_path / "0.3.1")

    assert delays == []


class _Kernel32:
    def __init__(self, handle: int, exit_code: int | None = None) -> None:
        self.handle, self.exit_code, self.closed = handle, exit_code, False

    def OpenProcess(self, _access: int, _inherit: bool, _pid: int) -> int:  # noqa: N802
        return self.handle

    def GetExitCodeProcess(self, _handle: int, code: Any) -> bool:  # noqa: N802
        code._obj.value = self.exit_code  # byref() hides the c_ulong it points at
        return True

    def CloseHandle(self, _handle: int) -> None:  # noqa: N802
        self.closed = True


def test_a_running_process_is_alive_and_an_exited_one_is_not() -> None:
    running, exited = _Kernel32(7, provision._STILL_ACTIVE), _Kernel32(7, 0)

    assert provision._windows_process_alive(4242, running) is True
    assert provision._windows_process_alive(4242, exited) is False
    assert running.closed and exited.closed


def test_windows_sweeps_the_partial_of_a_dead_process_only(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = tmp_path / "0.3.1"
    dead, live = tmp_path / "0.3.1.partial.111", tmp_path / "0.3.1.partial.222"
    dead.mkdir()
    live.mkdir()
    monkeypatch.setattr(provision.sys, "platform", "win32")
    monkeypatch.setattr(provision, "_windows_process_alive", lambda pid: pid == 222)

    provision._sweep_abandoned(root)

    assert not dead.exists() and live.exists()
