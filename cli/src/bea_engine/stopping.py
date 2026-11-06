"""Termination signals in the engine process: a stopped write never commits.

`python -m bea_engine` turns SIGTERM, SIGHUP and SIGINT into an exception so
staged files and locks unwind in their `finally` blocks. That is not enough on
its own (w1/074): Beancount's C parser catches any exception a builder callback
raises — the handler runs inside one most of the time a ledger is parsing —
records it as a syntax error and keeps going. A stopped `--allow-errors` write
then committed, and a stopped write on a large ledger outran the frontend's
grace period and was killed with its staging copies still on disk.

So the handler also records the signal, removes every live staging copy at
once, and — while a ledger is loading, where an exception cannot be trusted to
propagate — exits on the spot. Write paths call `check()` immediately before
they replace or create a destination, so a signal that was swallowed anyway
still stops the commit.
"""

from __future__ import annotations

import os
import signal
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from types import FrameType
from typing import Any

_received: int | None = None
_loading = 0
#: Inside the replace that commits a write, and after it: a stop is noted, not obeyed.
_committing = False
_committed = False
_staged: dict[Path, int | None] = {}
#: The frontend that launched us, while we are watching for it to go.
_parent: int | None = None
_PARENT_POLL_SECONDS = 0.2


def install() -> dict[int, Any]:
    """Handle the termination signals; return the previous handlers for restoring."""
    previous: dict[int, Any] = {}
    for name in ("SIGTERM", "SIGHUP", "SIGINT"):
        number = getattr(signal, name, None)
        if number is not None:
            previous[number] = signal.signal(number, _terminate)
    _watch_parent()
    return previous


def _watch_parent() -> None:
    """Stop as if sent SIGTERM once the frontend that launched us is gone.

    The frontend starts a writing helper in its own session, so a SIGKILL of
    `bea` (an OOM kill, `kill -9`, a harness's `Popen.kill()`) reaches only
    the frontend, and no signal can be forwarded from a dead process. The
    orphan then finished validating and landed the write seconds later; a
    caller that saw the kill and retried recorded the entry twice (w5/300).
    Orphaning re-parents us, so polling the parent PID notices. Windows does
    not re-parent, and has no separate session to escape from.
    """
    global _parent
    if os.name != "posix" or os.getppid() == 1:
        return
    _parent = os.getppid()

    def watch() -> None:
        while not _orphaned():
            time.sleep(_PARENT_POLL_SECONDS)
        os.kill(os.getpid(), signal.SIGTERM)

    threading.Thread(target=watch, name="bea-engine-parent-watch", daemon=True).start()


def _orphaned() -> bool:
    return _parent is not None and os.getppid() != _parent


def interactive() -> None:
    """Give Ctrl-C back to an interactive session, and let the kernel end one.

    Ctrl-C cancels a line there. SIGTERM and SIGHUP go back to their default
    disposition (w5/234): a Python-level handler only runs once the interpreter
    regains control, and the line editor does not hand it back while there is
    text on the line — on a closed terminal it spun on end-of-file at full CPU,
    deaf to SIGTERM. A query session stages nothing that would need unwinding.
    """
    sigint = getattr(signal, "SIGINT", None)
    if sigint is not None and signal.getsignal(sigint) is _terminate:
        signal.signal(sigint, signal.default_int_handler)
    for name in ("SIGTERM", "SIGHUP"):
        number = getattr(signal, name, None)
        if number is not None and signal.getsignal(number) is _terminate:
            signal.signal(number, signal.SIG_DFL)


@contextmanager
def deferring_interrupt() -> Iterator[None]:
    """Hold an interactive session's Ctrl-C until a ledger load has finished.

    Python's handler raises inside whichever parser callback is running, and
    the parser drops that directive and parses on: the session then answered
    from a ledger one transaction short, and the load cache kept it for every
    later command (w5/233). So the signal is only noted while the load runs,
    and raised once the whole result exists, for the caller to throw away.
    """
    sigint = getattr(signal, "SIGINT", None)
    if sigint is None or signal.getsignal(sigint) is not signal.default_int_handler:
        # Not a session `interactive()` opened, or a load inside a guarded one.
        yield
        return
    pressed: list[int] = []
    signal.signal(sigint, lambda number, _frame: pressed.append(number))
    try:
        yield
    finally:
        signal.signal(sigint, signal.default_int_handler)
    if pressed:
        raise KeyboardInterrupt


def _terminate(number: int, _frame: FrameType | None) -> None:
    global _received
    _received = number
    if _committing or _committed:
        # The write is landing or has landed: its answer must still go out.
        return
    _discard_staged()
    if _loading:
        # The parser would swallow an exception raised here and keep parsing.
        os._exit(128 + number)
    if number == getattr(signal, "SIGINT", None):
        raise KeyboardInterrupt
    raise SystemExit(128 + number)


def check() -> None:
    """Refuse to go on once a termination signal arrived, even if something swallowed it.

    A frontend that is gone counts too: the watcher's signal may not have
    been handled yet, and nobody is left to report a commit to.
    """
    if _committed:
        return
    if _received is None and _orphaned():
        _discard_staged()
        raise SystemExit(128 + signal.SIGTERM)
    if _received is not None:
        raise SystemExit(128 + _received)


def requested() -> int | None:
    """The termination signal that arrived, if one did, whether or not it was obeyed.

    After a commit a stop is only noted, so a run that commits more than once
    asks before each later step (w5/825).
    """
    return _received


@contextmanager
def committing() -> Iterator[None]:
    """Commit a write as one step that no termination signal can split from its answer.

    A stop that landed just after the replace raised `SystemExit` before the
    success envelope was written, so the frontend died silently over a write
    that had committed, and a retry recorded the entry twice (w5/606). A stop
    that arrived before this point still refuses the commit. One that arrives
    during it or after is only noted, and the command finishes and reports.
    Signal masks would not do: they are per thread, and the parent watcher's
    thread can take the signal.
    """
    global _committing, _committed
    check()
    _committing = True
    try:
        yield
        _committed = True
    finally:
        _committing = False


@contextmanager
def loading() -> Iterator[None]:
    """Mark a ledger load, during which a termination signal exits at once."""
    global _loading
    _loading += 1
    try:
        yield
    finally:
        _loading -= 1
    check()


@contextmanager
def staged(path: Path, fd: int | None = None) -> Iterator[None]:
    """Register a staging copy, or its pickle-cache sidecar, for removal on a signal.

    `fd` is a descriptor the cleanup closes first: a candidate stays open
    for its lifetime, and Windows refuses to remove a file with an open
    handle (w5/719).
    """
    _staged[path] = fd
    try:
        yield
    finally:
        _staged.pop(path, None)


#: Staged paths whose descriptor `release_handle` already closed, so the owner's
#: own cleanup does not close the number again (it may name another file by then).
_released: set[Path] = set()


def release_handle(path: Path) -> None:
    """Close the descriptor `staged` holds for `path`, ahead of renaming the file.

    A candidate stays open for its lifetime so a sweep can tell it is live, but
    Windows refuses to rename a file with an open handle, so the commit that
    renames it over the ledger lets go first. The registration stays, without a
    descriptor, so a signal still removes the file.
    """
    fd = _staged.get(path)
    if fd is None:
        return
    _staged[path] = None
    _released.add(path)
    try:
        os.close(fd)
    except OSError:
        pass


def take_released(path: Path) -> bool:
    """Whether `release_handle` already closed `path`'s descriptor; forgets it either way."""
    was = path in _released
    _released.discard(path)
    return was


def _discard_staged() -> None:
    for path, fd in list(_staged.items()):
        if fd is not None:
            try:
                os.close(fd)
            except OSError:
                pass
        try:
            path.unlink(missing_ok=True)
        except OSError:
            continue
