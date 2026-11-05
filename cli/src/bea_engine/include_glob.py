"""Expose traversal failures that stdlib glob deliberately treats as no matches.

This is only a preflight: callers still use ``glob.glob`` for their matches.
Keep the engine twin identical; the two execution environments cannot import
one another.
"""

from __future__ import annotations

import errno
import fnmatch
import os
import stat
from collections.abc import Callable, Iterator

_ABSENT = frozenset({errno.ENOENT, errno.ENOTDIR, errno.ELOOP})


def check_glob(
    pattern: str, *, work: Callable[[], None] | None = None, on_cycle: Callable[[], None] | None = None
) -> None:
    """Raise on inaccessible glob traversal, without changing native match rules.

    Missing paths, non-directories and symlink loops remain ordinary no-match
    cases. Literal components need search access, not directory-list access.
    Recursive scans follow directory symlinks but stop physical ancestor
    cycles; a different pattern phase may still visit the same directory.
    Optional ``work`` charges each entry and metadata lookup before it runs,
    so discovery can refuse an incomplete traversal instead of exhausting it.
    """
    if not pattern:
        return

    def metadata(path: str, *, follow: bool = True) -> os.stat_result | None:
        if work is not None:
            work()
        try:
            return os.stat(path or os.curdir, follow_symlinks=follow)
        except OSError as exc:
            if exc.errno not in _ABSENT:
                raise
            return None

    def directory(path: str) -> bool:
        info = metadata(path)
        return info is not None and stat.S_ISDIR(info.st_mode)

    def entries(path: str) -> list[os.DirEntry[str]]:
        try:
            with os.scandir(path or os.curdir) as scanned:
                result = []
                for entry in scanned:
                    if work is not None:
                        work()
                    result.append(entry)
                return result
        except OSError as exc:
            if exc.errno not in _ABSENT:
                raise
            return []

    def entry_directory(entry: os.DirEntry[str]) -> bool:
        if work is not None:
            work()
        try:
            return entry.is_dir()
        except OSError as exc:
            if exc.errno not in _ABSENT:
                raise
            return False

    def recursive_names(path: str, dironly: bool, phase: str) -> Iterator[str]:
        if directory(path):
            yield ""
        pending: list[tuple[str, str, frozenset[tuple[int, int, str]]]] = [(path, "", frozenset())]
        while pending:
            current, relative, ancestors = pending.pop()
            info = metadata(current)
            if info is None or not stat.S_ISDIR(info.st_mode):
                continue
            key = (info.st_dev, info.st_ino, phase)
            if key in ancestors:
                if on_cycle is not None:
                    on_cycle()
                continue
            ancestors = ancestors | {key}
            for entry in entries(current):
                if entry.name.startswith("."):
                    continue
                child = os.path.join(current, entry.name)
                child_relative = os.path.join(relative, entry.name)
                is_directory = entry_directory(entry)
                if not dironly or is_directory:
                    yield child_relative
                if is_directory:
                    pending.append((child, child_relative, ancestors))

    def magic(path: str) -> bool:
        return any(character in path for character in "*?[")

    def expand(path: str, *, dironly: bool = False) -> Iterator[str]:
        dirname, basename = os.path.split(path)
        if not magic(path):
            if basename:
                if metadata(path, follow=False) is not None:
                    yield path
            elif directory(dirname):
                yield path
            return
        # A drive/UNC root can itself contain a question mark. Do not recurse
        # into a dirname that os.path.split returned unchanged.
        parents = expand(dirname, dironly=True) if dirname != path and magic(dirname) else iter((dirname,))
        for parent in parents:
            if basename == "**":
                for name in recursive_names(parent, dironly, path):
                    yield os.path.join(parent, name) if parent else name
            elif magic(basename):
                scanned = entries(parent)
                visible = {
                    entry.name: entry for entry in scanned if basename.startswith(".") or not entry.name.startswith(".")
                }
                for name in fnmatch.filter(visible, basename):
                    candidate = os.path.join(parent, name)
                    if not dironly or entry_directory(visible[name]):
                        yield candidate
            elif basename:
                candidate = os.path.join(parent, basename)
                if metadata(candidate, follow=False) is not None:
                    yield candidate
            elif directory(parent):
                yield os.path.join(parent, "")

    for _ in expand(pattern):
        pass
