"""Validate a candidate ledger before atomically replacing its entry file."""

from __future__ import annotations

import datetime
import difflib
import errno
import fnmatch
import glob
import hashlib
import logging
import operator
import os
import re
import secrets
import shlex
import stat
import sys
import time
import unicodedata
from collections import Counter
from collections.abc import Callable, Iterable, Iterator, Sequence
from contextlib import ExitStack, contextmanager, nullcontext, suppress
from dataclasses import dataclass, field, replace
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import TYPE_CHECKING, Any

from bea_engine import stopping
from bea_engine.include_glob import check_glob
from bea_engine.ledger.text import (
    bea_command,
    escape_format_characters,
    lexer_lines,
    new_account_format_problem,
    root_name_options,
    single_line,
)
from bea_engine.paths import expand_path
from bea_engine.protocol import AuthError, ConflictError, LedgerError, StagingFailed, UsageError, notice
from bea_engine.query import format_error, same_file

if TYPE_CHECKING:
    from beancount.parser.lexer import LexBuilder


def cache_dir() -> Path:
    """Where the write locks live — the same directory `cli.config.cache_dir` names.

    Every writer — `bea add`, `bea import`, `bea ask` via `bea-engine append` —
    runs in the engine process and must contend for the same lock file.
    A relative `XDG_CACHE_HOME` is ignored, as the XDG Base Directory spec
    requires: it would resolve against whatever directory a command ran from,
    and the managed price cache writes this path into staged includes.
    """
    xdg = expand_path(Path(os.environ.get("XDG_CACHE_HOME") or ""), "$XDG_CACHE_HOME")
    base = xdg if xdg.is_absolute() else Path.home() / ".cache"
    return base / "bea"


def destination(root: Path, into: Path | None = None) -> Path:
    """Destinations are relative to the root ledger, independently of cwd.

    A file `--into` creates takes the NFC spelling of its name, as new
    directives do: one typed NFD (pasted from Finder) was created NFD, and the
    next keyboard-typed `--into` was refused as a respelling (w5/536).
    Directories keep the spelling they have on disk. On a volume that answers
    an NFD lookup with the NFC file, the NFD spelling that created the file
    keeps writing to it: when the typed leaf is not NFC, its NFC form is the
    name on disk, and both spellings reach the same file, the NFC name is
    used (w5/721). A spelling already exact on disk keeps its meaning: a
    case-only respelling, and the include line's other form, are still
    refused.
    """
    if into is None:
        return root.resolve()
    target = root.parent / expand_path(into, "--into")
    try:
        os.lstat(target)
    except OSError as exc:
        # `exists()` raises this one since Python 3.12, which reached the
        # user as `OSError: [Errno 63] File name too long` (w5/817).
        if exc.errno == errno.ENAMETOOLONG:
            raise UsageError(f"--into {into} has a name too long for the filesystem; choose a shorter one.") from None
    nfc = target.with_name(unicodedata.normalize("NFC", target.name))
    if not (target.exists() or target.is_symlink()):
        target = nfc
    elif nfc.name != target.name:
        names = _directory_names(target.parent)
        if nfc.name in names and target.name not in names and same_file(nfc, target):
            target = nfc
    return target.resolve()


def _directory_names(directory: Path) -> list[str]:
    """The names as they are on disk, or nothing when the directory cannot be listed."""
    try:
        return os.listdir(directory)
    except OSError:
        return []


def _includes(content: bytes) -> Iterator[tuple[int, int, str]]:
    from bea_engine.ledger.text import iter_includes

    for span in iter_includes(content):
        yield span.start, span.end, span.target


def _not_a_regular_file(path: Path, status: os.stat_result) -> str | None:
    """Why a ledger member cannot be read as a file, or None when it can.

    `/dev/null` is the one special file allowed: it reads as empty, as it
    always has.
    """
    mode = status.st_mode
    if stat.S_ISREG(mode) or stat.S_ISDIR(mode) or os.path.realpath(path) == os.devnull:
        # A directory fails in `read_bytes` and is named by the OSError branch.
        return None
    if stat.S_ISFIFO(mode):
        return "it is a named pipe, not a file"
    if stat.S_ISSOCK(mode):
        return "it is a socket, not a file"
    if stat.S_ISCHR(mode) or stat.S_ISBLK(mode):
        return "it is a device, not a file"
    return "it is not a regular file"


@dataclass
class LedgerSnapshot:
    """Freeze the root and its include graph for validation and conflict checks.

    A planned destination has empty contents and a None stat. It participates
    in staged loads, but must remain absent until the validated write commits.
    """

    root: Path
    contents: dict[Path, bytes] = field(default_factory=dict)
    stats: dict[Path, os.stat_result | None] = field(default_factory=dict)
    patterns: dict[str, tuple[Path, ...]] = field(default_factory=dict)

    @classmethod
    def capture(cls, root: Path) -> LedgerSnapshot:
        # Lexical, like Beancount's loader: a symlinked root's includes sit
        # beside the link, not beside its target (w1/056).
        from beancount.utils.encryption import is_encrypted_file

        from bea_engine.managed_prices import is_url_include_target

        snapshot = cls(Path(os.path.abspath(root)))
        pending = [snapshot.root]
        includers: dict[Path, Path] = {}
        while pending:
            path = pending.pop(0)
            if path in snapshot.contents:
                continue
            try:
                status = snapshot.stats[path] = path.stat()
                special = _not_a_regular_file(path, status)
                if special is not None:
                    # Refused before it is opened: opening a FIFO with no
                    # writer never returns, and `/dev/zero` reads until memory
                    # runs out (w5/435).
                    if path not in includers:
                        raise UsageError(f"Ledger file '{path}' is not readable: {special}.")
                    raise UsageError(
                        f"Included file '{path}' (included from '{includers[path]}') is not readable: {special}. "
                        "Correct the file, or remove the include."
                    )
                content = snapshot.contents[path] = path.read_bytes()
            except OSError as exc:
                if path not in includers:
                    # The root: the frontend names it and the source that selected it.
                    raise
                # An include is part of the ledger, so it fails as an unreadable
                # root does, in one line, rather than as a bare exception — a
                # traceback from native `check` (w5/120).
                if path.is_symlink() and not path.exists():
                    reason = "it is a broken symbolic link"
                elif path.is_dir():
                    reason = "it is a directory, not a file"
                else:
                    reason = exc.strerror or type(exc).__name__
                raise UsageError(
                    f"Included file '{path}' (included from '{includers[path]}') is not readable: {reason}. "
                    "Correct the file or its permissions, or remove the include."
                ) from None
            if is_encrypted_file(str(path)):
                # Retain ciphertext for conflict checks and staged loads, but
                # never interpret it as source text (w5/671).
                continue
            for _, _, name in _includes(content):
                if is_url_include_target(name):
                    # A URL is a managed price request or a refusal the load
                    # reports, never a local file glob: `https://example.com/x`
                    # otherwise matched `./https:/example.com/x` (w5/450).
                    continue
                pattern = str(path.parent / name)
                # Normalized the way the loader names an included file —
                # `normpath`, without resolving links. Left as `2026/../shared`,
                # a member's key never matched the name errors came back under,
                # so messages quoted the staged copy and an error already in
                # that file read as newly introduced (w5/096).
                matches = _glob_members(pattern)
                snapshot.patterns[pattern] = matches
                for match in matches:
                    includers.setdefault(match, path)
                pending.extend(matches)
        return snapshot

    def require_target(self, target: Path, *, into: Path | None = None) -> bytes:
        """Register an included destination without creating it; return its frozen bytes."""
        from bea_engine.managed_price_cache import managed_source_for_path

        source = managed_source_for_path(target)
        if source is not None:
            raise UsageError(
                f"Write destination {target} is a managed price feed resolved from {source} and is read-only; "
                "declare a price directive in your own ledger file to override it."
            )
        resolved = target.resolve()
        for path, content in self.contents.items():
            if path.resolve() == resolved:
                return content
        # The same file under another letter case or Unicode form — what a
        # case- and normalization-insensitive volume answers to. Compared as
        # text it matched nothing, the glob below then took it for a new
        # file, and its existing on disk read as a concurrent edit that no
        # retry could clear (w5/097).
        folded = unicodedata.normalize("NFC", str(resolved)).casefold()
        for path in self.contents:
            if unicodedata.normalize("NFC", str(path.resolve())).casefold() == folded and same_file(resolved, path):
                raise UsageError(
                    f"Write destination {target} is the ledger file {path} spelled in another letter case or "
                    f"Unicode form. {self._respelling(path, resolved)} Nothing was written."
                )
        matching = [pattern for pattern in self.patterns if _included_new_file(resolved, pattern)]
        if matching:
            if resolved.exists() or resolved.is_symlink():
                raise ConflictError(f"The ledger changed during the operation: {resolved}. Nothing was written; retry.")
            # A new file is created, its directory never is; found only when
            # staging, that read as an internal failure, exit 1 (w5/492).
            if not resolved.parent.is_dir():
                state = "is not a directory" if resolved.parent.exists() else "does not exist"
                raise UsageError(
                    f"Write destination {target}: directory {resolved.parent} {state}. Create it first; bea "
                    "creates only the file. Nothing was written."
                )
            self.contents[resolved] = b""
            self.stats[resolved] = None
            for pattern in matching:
                self.patterns[pattern] = tuple(sorted({*self.patterns[pattern], resolved}))
            return b""
        claimed = self._glob_claim_in_another_spelling(resolved)
        if claimed is not None:
            raise UsageError(
                f"Write destination {target} is in the directory {claimed.parent} spelled in another letter case "
                f"or Unicode form, and the include pattern matches only that spelling. "
                f"{self._respelling(claimed, resolved)} Nothing was written."
            )
        base = f"A relative --into path is based on {self.root.parent}, the root ledger's directory."
        correction = self._cwd_into_hint(into)
        if correction is not None:
            raise UsageError(
                f"Write destination {target} is not included by {self.root}. {base} {correction} Nothing was written."
            )
        if not resolved.parent.is_dir():
            raise UsageError(
                f"Write destination directory {resolved.parent} does not exist. {base} Create the directory first."
            )
        raise UsageError(
            f"Write destination {target} is not included by {self.root}. "
            f"{base} Create it and add an include directive to the root first."
        )

    def _cwd_into_hint(self, into: Path | None) -> str | None:
        """A root-relative correction when interpreting the path from cwd names a ledger member."""
        if into is None or expand_path(into, "--into").is_absolute():
            return None
        try:
            alternative = Path.cwd() / expand_path(into, "--into")
        except (OSError, ValueError):
            return None
        for member in self.contents:
            if same_file(alternative, member):
                relative = os.path.relpath(member, self.root.parent)
                return f"Did you mean --into {shlex.quote(relative)}?"
        return None

    def _respelling(self, accepted: Path, given: Path) -> str:
        """Which spelling `--into` takes: the include's, relative to the root, which is what bea matches.

        Naming the file's base name read as "the name on disk" even when the
        user had passed the on-disk name, and a Unicode-form difference looks
        identical in a terminal, so it is named too (w5/434).
        """
        spelled = os.path.relpath(accepted, self.root.parent)
        # A file an include glob matched is named by the disk, not by any
        # include line, which says only `Ausgaben/*.bean` (w5/536).
        globbed = any(
            accepted in matches and any(mark in pattern for mark in "*?[") for pattern, matches in self.patterns.items()
        )
        source = "the file is named on disk" if globbed else "the include line spells it"
        advice = f"Pass --into {shlex.quote(spelled)} as {source}."
        if unicodedata.normalize("NFC", str(accepted)) == unicodedata.normalize("NFC", str(given)):
            if unicodedata.normalize("NFC", spelled) == spelled:
                form = "NFC"
            elif unicodedata.normalize("NFD", spelled) == spelled:
                form = "NFD"
            else:
                form = "mixed"
            where = "the file's name" if globbed else "the include line"
            advice += f" The two differ only in Unicode form; {where} is {form}."
        return advice

    def _glob_claim_in_another_spelling(self, resolved: Path) -> Path | None:
        """The new destination an include glob would claim, were its directory spelled as the glob finds it.

        `--into MONTHS/feb.bean` under `include "months/*.bean"` on a
        case-insensitive volume names that directory, but the glob, which
        lists `months`, never matches it (w5/434).
        """
        if not resolved.parent.is_dir():
            return None
        for pattern in self.patterns:
            for directory in glob.glob(os.path.dirname(pattern), recursive=True):
                listed = Path(os.path.normpath(directory)).resolve()
                if listed != resolved.parent and same_file(listed, resolved.parent):
                    claimed = listed / resolved.name
                    if _included_new_file(claimed, pattern):
                        return claimed
        return None

    def verify(self) -> None:
        for path, original in self.contents.items():
            try:
                before = self.stats[path]
                if before is None:
                    try:
                        path.lstat()
                    except FileNotFoundError:
                        changed = False
                    else:
                        changed = True
                else:
                    current = path.stat()
                    changed = (current.st_ino, current.st_mtime_ns, current.st_size) != (
                        before.st_ino,
                        before.st_mtime_ns,
                        before.st_size,
                    ) or path.read_bytes() != original
            except OSError:
                changed = True
            if changed:
                raise ConflictError(f"The ledger changed during the operation: {path}. Nothing was written; retry.")
        for pattern, before_paths in self.patterns.items():
            current_paths = _glob_members(pattern)
            existing_paths = tuple(path for path in before_paths if self.stats[path] is not None)
            missing_still_included = all(
                _included_new_file(path, pattern) for path in before_paths if self.stats[path] is None
            )
            if current_paths != existing_paths or not missing_still_included:
                raise ConflictError(f"The included files changed: {pattern}. Nothing was written; retry.")

    def _includers(self, target: Path) -> set[Path]:
        """The files whose load reads `target`: itself and everything that includes it, transitively."""
        included_by: dict[Path, set[Path]] = {}
        for path, content in self.contents.items():
            for _, _, name in _includes(content):
                for match in self.patterns.get(str(path.parent / name), ()):
                    included_by.setdefault(match, set()).add(path)
        # Every name the file goes by, a case variant or a link as much as its
        # own: the one the load keeps first may not be the one written to.
        found = {path for path in self.contents if self._stands_for(path, target)}
        pending = list(found)
        while pending:
            for parent in included_by.get(pending.pop(), ()):
                if parent not in found:
                    found.add(parent)
                    pending.append(parent)
        return found

    def _identity(self, path: Path) -> tuple[int, int] | None:
        """The (device, inode) a closure file had when captured, or None."""
        status = self.stats.get(path)
        return None if status is None else (status.st_dev, status.st_ino)

    @contextmanager
    def staged(self, candidate: Path, target: Path) -> Iterator[tuple[Path, dict[Path, Path]]]:
        """Stage the changed file and its includers, each beside its source.

        Staging beside the source keeps documents and plugins at their paths.
        Only the destination and the files that (transitively) include it need
        a copy — their include lines must lead to the candidate — so a file
        the write cannot affect is read where it is, and a read-only shared
        directory elsewhere in the include graph does not block the write
        (w1/073).

        A file the ledger reaches again under another name is left out of a
        staged include line, as a read leaves it out: the staged copy's new
        inode hid it from that check, and the candidate was validated beside
        a second copy of its own entries (w5/574). `duplicate_include_errors`
        restores the error the read reports for it.
        """
        from bea_engine.managed_load import _duplicate_members

        duplicates = _duplicate_members(self)
        with ExitStack() as stack:
            paths = {path: stack.enter_context(candidate_file(path, "")) for path in self._includers(target)}
            for path, staged in paths.items():
                content = candidate.read_bytes() if self._stands_for(path, target) else self.contents[path]
                for start, end, name in reversed(list(_includes(content))):
                    matches = self.patterns.get(str(path.parent / name), ())
                    if matches:
                        kept = [paths.get(p, p) for p in matches if p not in duplicates]
                        replacement = staged_include(stack, path, kept)
                        content = content[:start] + replacement.encode() + content[end:]
                staged.write_bytes(content)
            yield paths[self.root], {staged: original for original, staged in paths.items()}

    def _stands_for(self, path: Path, target: Path) -> bool:
        """Whether a closure file is the write's target under one of its names."""
        identity = self._identity(target)
        return path.resolve() == target or (identity is not None and self._identity(path) == identity)

    def duplicate_include_errors(self, target: Path) -> list[Any]:
        """The `Duplicate include` errors a read reports on the include lines `staged` rewrites.

        Reported where the read reports them, so a ledger that already had one
        keeps it through a write: its gate applies, and `--allow-errors` sees
        it as the error it was, not a new one (w5/574).
        """
        from beancount.loader import LoadError

        from bea_engine.ledger.text import iter_includes
        from bea_engine.managed_load import _duplicate_members, duplicate_include_message

        duplicates = _duplicate_members(self)
        if not duplicates:
            return []
        found = []
        for path in sorted(self._includers(target)):
            for span in iter_includes(self.contents[path]):
                for again in self.patterns.get(str(path.parent / span.target), ()):
                    if again in duplicates:
                        found.append(
                            LoadError(
                                {"filename": str(path), "lineno": span.line},
                                duplicate_include_message(again, duplicates[again]),
                                None,
                            )
                        )
        return found


def _glob_members(pattern: str) -> tuple[Path, ...]:
    """The files an include pattern matches now, each named as the loader names it."""
    try:
        check_glob(pattern)
    except OSError as exc:
        failed = os.fsdecode(exc.filename) if exc.filename else pattern
        reason = exc.strerror or type(exc).__name__
        raise UsageError(
            f"Cannot expand include glob {pattern!r}: {failed} cannot be read: {reason}. "
            "Correct its permissions, then retry."
        ) from None
    return tuple(sorted(Path(os.path.normpath(os.path.abspath(p))) for p in glob.glob(pattern, recursive=True)))


def staged_include(stack: ExitStack, includer: Path, targets: Sequence[Path]) -> str:
    """The quoted target that makes one `include` line reach every staged match of its glob.

    A staged includer must keep the line numbering of the file it stands for:
    errors are paired with their pre-write twins by line, and entries are
    judged written or synthesized by reading the real file at their line. An
    include line takes one target, and writing a glob's N matches as N lines
    moved everything below it down N-1 (w5/079). Several matches therefore go
    through one staged file beside the includer that only lists them, in
    order, so the includer's own line count never changes.
    """
    if len(targets) == 1:
        return literal_include(targets[0])
    listing = "".join(f"include {literal_include(target)}\n" for target in targets)
    return literal_include(stack.enter_context(candidate_file(includer, listing)))


def literal_include(path: Path | str) -> str:
    """The quoted `include` target that reaches exactly the file at `path`.

    Beancount globs every include string, so a resolved path written back as
    it is spelled stops naming its file once the name holds `[`, `*` or `?`:
    `2024 [old].bean` read as a character class that matched nothing, and
    `q?.bean` also took in the `q2.bean` beside it (w5/247).
    """
    from beancount.utils import misc_utils

    escape_string: Callable[[str], str] = misc_utils.escape_string
    # `escape_string` leaves line breaks and tabs raw; a raw newline inside
    # the string split the include over two lines, which no later rewrite of
    # the staged copy or an exported root could locate (w5/301).
    quoted = escape_string(glob.escape(str(path)))
    return '"' + quoted.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + '"'


def include_claims(patterns: Iterable[str]) -> Callable[[Path], str | None]:
    """The include pattern that would read a new file at a resolved path, or None, for many paths.

    `_included_new_file` per path and pattern made `price export` resolve and
    glob once per pair: 37 s for a 1,500-file ledger `check` reads in under
    one (w5/317). A literal include names one file, so those are resolved
    once into a lookup; only patterns with wildcards are matched one by one.
    """
    literal: dict[Path, str] = {}
    wildcards: list[str] = []
    for pattern in patterns:
        if glob.has_magic(pattern):
            wildcards.append(pattern)
        else:
            parent, name = os.path.split(pattern)
            # Lexically first, as the loader does: `link/..` is the includer's
            # directory, not the symlink target's parent (w5/451).
            literal.setdefault(Path(os.path.normpath(parent)).resolve() / name, pattern)

    def claim(target: Path) -> str | None:
        return literal.get(target) or next(
            (pattern for pattern in wildcards if _included_new_file(target, pattern, any_spelling=True)), None
        )

    return claim


def _included_new_file(target: Path, pattern: str, *, any_spelling: bool = False) -> bool:
    """Match an absent leaf using the same directory and hidden-file rules as glob.

    `any_spelling` matches a directory however it is spelled, which a claim
    check needs (w5/595); `--into` matches the spelling the glob lists, and
    names the other one itself (w5/434).
    """
    parent, name = os.path.split(pattern)
    if target.name.startswith(".") and not name.startswith("."):
        return False
    if not fnmatch.fnmatch(target.name, name):
        return False
    if name == "**":
        parent = os.path.join(parent, "**")
    same = _same_directory if any_spelling else operator.eq
    if any(
        same(Path(os.path.normpath(directory)).resolve(), target.parent)
        for directory in glob.glob(parent, recursive=True)
    ):
        return True
    # A directory the write would create is not on disk for `glob` to list:
    # `price export` into a new `snap/` under `include "*/*.bean"` wrote a
    # copy the next load read back as part of the books (w5/296).
    return _directory_matches(target.parent, parent, same)


def _directory_matches(directory: Path, pattern: str, same: Callable[[Path, Path], bool]) -> bool:
    """Whether `glob` would list `directory` for `pattern` once it exists."""
    parts = Path(pattern).parts
    fixed = next((i for i, part in enumerate(parts) if glob.has_magic(part)), len(parts))
    base = Path(os.path.normpath(Path(*parts[:fixed]))).resolve()
    below = next(
        (directory.relative_to(ancestor).parts for ancestor in (directory, *directory.parents) if same(ancestor, base)),
        None,
    )
    return below is not None and _components_match(below, parts[fixed:])


def _same_directory(found: Path, wanted: Path) -> bool:
    """Whether two resolved directories are one, however each is spelled.

    `resolve()` keeps the spelling typed, so on a case- and normalization-
    insensitive volume (macOS's default) `Txns/` and `txns/` compared unequal
    while naming one directory, and an output or load cache there joined the
    books (w5/595). Spellings that fold together are compared by identity.
    """
    if found == wanted:
        return True
    if unicodedata.normalize("NFC", str(found)).casefold() != unicodedata.normalize("NFC", str(wanted)).casefold():
        return False
    try:
        return os.path.samefile(found, wanted)
    except OSError:
        return False


def _components_match(names: tuple[str, ...], patterns: tuple[str, ...]) -> bool:
    """Glob's component rules: `**` spans any depth, and wildcards skip hidden names."""
    if not patterns:
        return not names
    head, rest = patterns[0], patterns[1:]
    if head == "**":
        if _components_match(names, rest):
            return True
        return bool(names) and not names[0].startswith(".") and _components_match(names[1:], patterns)
    if not names or (names[0].startswith(".") and not head.startswith(".")):
        return False
    return fnmatch.fnmatch(names[0], head) and _components_match(names[1:], rest)


#: How long a staged candidate must have been sitting before another write
#: treats it as abandoned. A write takes seconds, so an hour is far beyond any
#: live one and this can only ever catch a file whose owner is gone.
_ABANDONED_CANDIDATE_SECONDS = 3600

_CANDIDATE_NAME = re.compile(r"\.bea-[0-9a-f]{16}\.tmp")

#: A candidate that never became one: `candidate_file` fills and locks a
#: scratch file first and only then renames it to the sweepable name, so a
#: sweepable name always means a complete, locked file (w5/719).
_STAGING_NAME = re.compile(r"\.bea-[0-9a-f]{16}\.staging")

#: What the sweep may remove: a candidate, a scratch file orphaned before its
#: rename, or the pickle-cache sidecar Beancount writes beside one. The
#: sidecar name *prepends* a dot to the file it caches, so `.bea-xxxx.tmp`
#: gets `..bea-xxxx.tmp.picklecache` — two leading dots. Nothing looser will
#: do: `.bea-rules.yaml` is the user's file, not ours.
_SWEEPABLE_NAME = re.compile(
    rf"{_CANDIDATE_NAME.pattern}|{_STAGING_NAME.pattern}|\.{_CANDIDATE_NAME.pattern}\.picklecache"
)


def is_candidate_file(path: Path) -> bool:
    """Whether `path` is a staged candidate `candidate_file` created."""
    return _CANDIDATE_NAME.fullmatch(path.name) is not None


def pickle_cache_of(candidate: Path) -> Path:
    """Where Beancount will write the cache sidecar for a staged file.

    Validating a write means loading the staged candidate, and a load slow
    enough to cross Beancount's one-second threshold writes a pickle cache
    beside it. That sidecar belongs to a file that is about to be renamed away,
    so it is always garbage — a full-size copy of the ledger, left in the
    user's own books directory.

    Both cleanups here used to rebuild the name by hand and both dropped the
    dot `PICKLE_CACHE_FILENAME` prepends, so neither ever matched a real file
    and every write to a large ledger leaked one. Asking upstream's own
    resolver is what stops that from drifting a third time — and it picks up
    `BEANCOUNT_LOAD_CACHE_FILENAME`, which `loader.initialize` honours and a
    hand-written template would have ignored.
    """
    keep_load_cache_private()
    from beancount.loader import PICKLE_CACHE_FILENAME, get_cache_filename

    pattern = os.getenv("BEANCOUNT_LOAD_CACHE_FILENAME") or PICKLE_CACHE_FILENAME
    return Path(get_cache_filename(pattern, str(candidate)))


def _private_load_cache(filename: str) -> str:
    """The load cache of `filename` under the `bea` cache home, in a directory only its owner can enter.

    Keyed by the file's directory and named after the file, which is as much as
    a `BEANCOUNT_LOAD_CACHE_FILENAME` pattern can say: `cli.engine.launch`
    hands the same path to `bean-check` and `bean-doctor` that way.
    """
    directory = cache_dir() / "load-cache"
    try:
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        if stat.S_IMODE(directory.stat().st_mode) & 0o077:
            directory.chmod(0o700)
    except OSError:
        # Upstream then finds no cache there and says so if it cannot write one.
        pass
    resolved = os.path.realpath(filename)
    digest = hashlib.sha256(os.fsencode(os.path.dirname(resolved))).hexdigest()[:32]
    cache = str(directory / f"{digest}.{os.path.basename(filename)}.picklecache")
    if clear_stray_cache_entry(cache):
        return cache
    # Under the null device nothing can be read or created, so the load runs uncached.
    return os.path.join(os.devnull, os.path.basename(cache))


def clear_stray_cache_entry(cache: str) -> bool:
    """Clear whatever non-regular entry sits at bea's own cache path; whether the path is now usable.

    Beancount opens its cache path unguarded. A directory there raised
    `IsADirectoryError` out of every read, a FIFO hung it, `--offline`
    included (w5/591), and a link was read and written through. The path is
    bea's, in a directory only its owner can enter, so what sits there is
    cleared: a link (never its target), a FIFO or device, an empty directory.
    `cli.engine.launch.load_cache_pattern` does the same for `bean-check`.
    """
    try:
        mode = os.lstat(cache).st_mode
    except FileNotFoundError:
        return True
    except OSError:
        return False
    if stat.S_ISREG(mode):
        return True
    try:
        if stat.S_ISDIR(mode):
            os.rmdir(cache)
        else:
            os.unlink(cache)
    except OSError:
        return False
    return True


def keep_load_cache_private() -> None:
    """Move Beancount's default load cache out of the ledger's directory.

    A load that takes a second leaves `.<name>.picklecache` beside the file it
    read: every directive of the ledger again, created with the process umask
    — `0644` beside books kept `0600` — through whatever link already sits at
    that name, and unpickled by the next read before anything is checked
    (w5/175). The default now resolves under the cache home instead; a
    location the user chose keeps upstream's meaning.
    """
    from beancount import loader

    upstream = loader.get_cache_filename
    if getattr(upstream, "_bea_private", False):
        return

    def get_cache_filename(pattern: str, filename: str) -> str:
        if pattern != loader.PICKLE_CACHE_FILENAME:
            return str(upstream(pattern, filename))
        return _private_load_cache(filename)

    get_cache_filename._bea_private = True  # type: ignore[attr-defined]
    loader.get_cache_filename = get_cache_filename
    # The loader bound the resolver it had when it was imported.
    loader.initialize(os.getenv("BEANCOUNT_DISABLE_LOAD_CACHE") is None)
    logging.getLogger().addFilter(_quiet_cache_logs)


#: What Beancount's loader logs about its own cache, through the root logger.
_CACHE_LOGS = (
    "Cache file is corrupted:",
    "Could not remove picklecache file",
    "Could not write to picklecache file",
    "Cache disabled; Explicitly overridden cache filename",
)


def _quiet_cache_logs(record: logging.LogRecord) -> bool:
    """Drop the loader's cache chatter; every other log line, a plugin's included, stays.

    The cache is an optimisation the read never depends on: a write that
    failed on a full disk printed a raw `WARNING:root:Could not write to
    picklecache file …` beside a correct answer (w5/411), where a read-only
    cache directory prints nothing. bea's own guards report the cache paths
    that matter.
    """
    return not (record.module == "loader" and str(record.msg).startswith(_CACHE_LOGS))


def _sidecar_of(candidate: Path) -> Path | None:
    """The cache file that belongs to this staged candidate alone, if any.

    A relocated cache whose name does not vary with the file loaded is the
    user's shared cache — or, misconfigured, one of the ledger's own files —
    and is never this candidate's to remove.
    """
    cache = pickle_cache_of(candidate)
    if cache in (candidate, pickle_cache_of(candidate.with_name(f"other-{candidate.name}"))):
        return None
    return cache


CACHE_ENV = "BEANCOUNT_LOAD_CACHE_FILENAME"


def not_a_load_cache(cache: Path) -> str | None:
    """Why the file at a load-cache path is no Beancount cache, or None.

    Beancount removes a cache it cannot unpickle before it parses the ledger,
    so a note, a CSV or a mistyped path to anything named as the cache was
    deleted by the next read, with exit 0 (w5/418); a FIFO hung the load and
    a device was opened as one. A cache is a regular file that starts with a
    pickle header. One that cannot be read is upstream's to report.
    """
    if not os.path.lexists(cache):
        return None
    if not os.path.isfile(cache):
        return "which is not a regular file, and Beancount would read it and try to delete it as a stale cache"
    try:
        with open(cache, "rb") as stream:
            head = stream.read(1)
    except OSError:
        return None
    if head != b"\x80":
        return "which is not a Beancount load cache, and Beancount deletes a cache file it cannot read"
    return None


def refuse_cache_over_ledger(loaded: Path, members: Iterable[Path], patterns: Iterable[str] = ()) -> None:
    """Refuse a relocated pickle cache that is one of the ledger's own files.

    Beancount treats its cache path as disposable: a file there that does not
    unpickle is removed before the ledger is parsed. So a
    `BEANCOUNT_LOAD_CACHE_FILENAME` that resolves to the root or an include —
    by any spelling, a `{filename}` pattern, a symlink or a hard link — made
    every read delete the books. Checked here, at the one boundary every load
    crosses, before the loader starts.
    """
    pattern = os.getenv(CACHE_ENV)
    if not pattern:
        return
    try:
        cache = pickle_cache_of(loaded)
    except (LookupError, ValueError):
        # A pattern upstream cannot format fails there before anything is removed.
        return
    members = tuple(members)
    for member in members:
        if same_file(cache, member):
            raise UsageError(
                f"{CACHE_ENV} {pattern} names {member}, a file of the ledger being read. Beancount deletes a "
                "cache file it cannot read, so this would delete the ledger. Choose a cache path outside the "
                "ledger's own files. Nothing was changed."
            )
    refuse_encrypted_destination(cache, members, CACHE_ENV)
    # A path an include glob claims becomes a member once written: the pickle
    # then loads as ledger text and every later command fails (w5/497).
    resolved = cache.resolve()
    claim = (
        None
        if cache.exists()
        else next((p for p in patterns if _included_new_file(resolved, p, any_spelling=True)), None)
    )
    if claim is not None:
        raise UsageError(
            f"{CACHE_ENV} {pattern} names {cache}, which the include pattern {claim} would load as part of the "
            "ledger once the cache is written. Choose a cache path outside the ledger's includes. "
            "Nothing was changed."
        )
    problem = not_a_load_cache(cache)
    if problem is not None:
        raise UsageError(
            f"{CACHE_ENV} {pattern} names {cache}, {problem}. Point {CACHE_ENV} at a new file or an "
            "existing cache, or unset it. Nothing was changed."
        )


def refuse_encrypted_destination(destination: Path, members: Iterable[Path], purpose: str) -> None:
    """Refuse output below an encrypted member whose hidden includes cannot be checked."""
    from beancount.utils.encryption import is_encrypted_file

    lexical = Path(os.path.abspath(expand_path(destination, purpose)))
    ancestors = {*lexical.parents, *lexical.resolve().parents}
    for member in dict.fromkeys(members):
        try:
            encrypted = is_encrypted_file(str(member))
        except OSError:
            continue
        if encrypted and any(same_file(member.parent, ancestor) for ancestor in ancestors):
            raise UsageError(
                f"{purpose} {destination} is beneath the directory of encrypted ledger member {member}. "
                "Its include patterns cannot be inspected before decryption, so this destination could join "
                f"the ledger. Choose a path outside {member.parent.resolve()}. Nothing was changed."
            )


def sweep_abandoned_candidates(directory: Path) -> None:
    """Remove staging files an interrupted write could not remove itself.

    `candidate_file` drops its own file in a `finally`, and the frontend passes
    a termination signal on to the engine so that `finally` gets to run. Neither
    helps against SIGKILL, which no handler can catch, nor against a signal that
    lands in the moment between creating the file and entering the block that
    guards it. Each abandoned file is a full copy of the ledger, so they are
    worth clearing rather than leaving to accumulate beside a user's books.

    A candidate whose writer is alive stays locked (POSIX) or open (Windows)
    for its whole lifetime, so one the sweep can take is an orphan however
    young: it goes at once, as USAGE promises. Scratch files that never
    became candidates, Beancount's pickle-cache sidecars, and candidates on
    filesystems without `flock` keep the age rule — old enough that no live
    write could still own them — which is what makes this safe to do while
    another `bea` may be running in the same directory. Only names
    `candidate_file` itself generates are considered, so a user's own
    `.bea-notes.md` is never taken for one.
    Sweeping is best effort: a file someone else removes first, or one this
    user may not delete, must not fail the write that was actually asked for.
    """
    cutoff = time.time() - _ABANDONED_CANDIDATE_SECONDS
    try:
        stale = [path for path in directory.iterdir() if _SWEEPABLE_NAME.fullmatch(path.name)]
    except OSError:
        return
    for path in stale:
        try:
            if not path.is_file():
                continue
            if is_candidate_file(path):
                removed = _remove_abandoned_candidate(path)
                if removed is None:
                    if path.stat().st_mtime >= cutoff:
                        continue
                    path.unlink(missing_ok=True)
                elif not removed:
                    continue
                # Its load cache is kept under the cache home rather than beside it (w5/175).
                relocated = _sidecar_of(path)
                if relocated is not None and relocated.parent != directory:
                    relocated.unlink(missing_ok=True)
            elif path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
        except (OSError, ImportError):
            continue


def _lock_key(file: Path) -> str:
    """One key per file, however the path that names it is spelled.

    The resolved path string was not enough: macOS's default volumes are
    case- and normalization-insensitive, `resolve()` keeps the caller's
    spelling and `normcase` is the identity there, so `~/Books/main.bean` and
    `~/books/main.bean` took different locks on one file and concurrent adds
    could lose an entry (w1/075). The directory is identified by device and
    inode, which every spelling shares; the name is case-folded and
    normalized, which at worst makes two distinct files on a case-sensitive
    volume share a lock — slower, never unsafe. The file itself is not keyed
    by inode: every atomic replace gives it a new one, and a destination may
    not exist yet.
    """
    resolved = file.resolve()
    try:
        parent = resolved.parent.stat()
    except OSError:
        identity = os.path.normcase(str(resolved))
    else:
        name = unicodedata.normalize("NFD", resolved.name).casefold()
        identity = f"{parent.st_dev}:{parent.st_ino}/{name}"
    return hashlib.sha256(identity.encode()).hexdigest()


#: Descriptors a write needs besides its locks: the standard streams, the
#: file being read, its staging copy, a directory listing, lazy imports.
DESCRIPTOR_HEADROOM = 64


def descriptors_allow(locks: int) -> bool:
    """Whether `locks` lock files can be open at once, raising the soft limit when that is all it takes.

    macOS starts a process with a soft limit of 256 descriptors, well under
    what a directory of ledger files can ask for, and a hard limit far above.
    """
    if sys.platform == "win32":
        return True
    import resource

    needed = locks + DESCRIPTOR_HEADROOM
    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    if soft == resource.RLIM_INFINITY or needed <= soft:
        return True
    if hard != resource.RLIM_INFINITY and needed > hard:
        return False
    try:
        resource.setrlimit(resource.RLIMIT_NOFILE, (needed, hard))
    except (OSError, ValueError):
        # An "unlimited" hard limit is still capped by the kernel's per-process maximum.
        return False
    return True


@contextmanager
def lock_files(files: Iterable[Path], *, deciding: bool = False) -> Iterator[None]:
    """Lock every file, each once, in one global order so writers queue instead of deadlocking.

    The cache locks only serialize writers that share a cache directory. Two
    OS users, containers or sandboxes on one ledger each have their own, so
    each file's directory is locked as well — after every cache lock, so a
    writer holding a directory never waits on a cache lock (w5/181).
    """
    files = list(files)
    with ExitStack() as stack:
        for file in lock_order(files):
            stack.enter_context(lock_file(file, deciding=deciding))
        stack.enter_context(lock_directories(files))
        yield


#: Times `locked_graph` re-probes a graph whose membership changed mid-locking.
_GRAPH_LOCK_ATTEMPTS = 3


@contextmanager
def locked_graph(file: Path, target: Path, *, deciding: bool = False) -> Iterator[LedgerSnapshot]:
    """Hold every lock a write's snapshot needs, taken before the snapshot is read for the write.

    `lock_files` covers only the files named, so a snapshot read under it
    still races a `bea` write to an include in another directory, whose
    commit then trips `verify` with exit 4 (w5/718). Probe the graph first,
    lock root, target, and every file it holds in one global-ordered pass,
    and re-read under the locks: a membership change in between releases
    everything and retries, so locks are never stacked out of order and
    writers queue instead of deadlocking. Must be outermost — a caller
    already holding locks widened before deciding.

    Whatever committed in the probe window is absorbed into the re-read:
    under the locks no `bea` writer can commit, so the yielded snapshot is
    ordered after it. An edit that takes no lock (an editor, a script) is
    still caught by the final compare-before-replace check.
    """
    probe = LedgerSnapshot.capture(file)
    files = [file, target, *probe.contents]
    if not descriptors_allow(2 * len(lock_order(files))):
        # More files than descriptors to hold open: serialize on root and
        # target as before; a raced include still refuses with exit 4.
        with lock_files([file, target], deciding=deciding):
            yield probe
        return
    with ExitStack() as stack:
        for _ in range(_GRAPH_LOCK_ATTEMPTS):
            probe = LedgerSnapshot.capture(file)
            stack.enter_context(lock_files([file, target, *probe.contents], deciding=deciding))
            fresh = LedgerSnapshot.capture(file)
            if set(fresh.contents) <= set(probe.contents):
                break
            # A file joined the graph in the probe window, unlocked: release
            # everything and retry with the new graph. The stack is reusable
            # after close, and the with-block closes it again harmlessly.
            stack.close()
        else:
            raise ConflictError("The ledger changed while taking the write locks. Nothing was written; retry.")
        yield fresh


@contextmanager
def lock_directories(files: Iterable[Path]) -> Iterator[None]:
    """Lock the directory of every file, each once; taken only after every `lock_file`."""
    with ExitStack() as stack:
        for directory in _directory_order(files):
            stack.enter_context(_lock_directory(directory))
        yield


def _directory_order(files: Iterable[Path]) -> list[Path]:
    """One path per directory holding a file, in the global order every writer locks them.

    Keyed by device and inode: a second descriptor on a directory this process
    already locked would wait on itself.
    """
    keyed: dict[tuple[int, int], Path] = {}
    for file in files:
        directory = file.resolve().parent
        try:
            status = directory.stat()
        except OSError:
            continue
        keyed.setdefault((status.st_dev, status.st_ino), directory)
    return [keyed[key] for key in sorted(keyed)]


@contextmanager
def _lock_directory(directory: Path) -> Iterator[None]:
    """Hold an advisory lock on the directory itself, which every cache shares and adds no file to.

    Best effort: Windows cannot open a directory to lock it, and a directory
    this user may not read or a filesystem without `flock` leaves the cache
    lock and the compare-before-replace check, as before.
    """
    if sys.platform == "win32":
        yield
        return
    import fcntl

    try:
        fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
    except OSError:
        yield
        return
    try:
        status = os.fstat(fd)
        key = (status.st_dev, status.st_ino)
        if key in _HELD_DIRECTORIES:
            # Kept, like a lock file this process already holds: `append` asks again (w5/183).
            yield
            return
        wait = _LockWait(directory)
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                wait.pause()
                continue
            except OSError:
                pass
            break
        _HELD_DIRECTORIES.add(key)
        try:
            yield
        finally:
            _HELD_DIRECTORIES.discard(key)
    finally:
        # Closing the descriptor releases the lock.
        os.close(fd)


def lock_order(files: Iterable[Path]) -> list[Path]:
    """One file per lock, in the global order every writer takes them."""
    keyed = {_lock_key(file): file for file in files}
    return [keyed[key] for key in sorted(keyed)]


_HELD_LOCKS: set[str] = set()
_HELD_DIRECTORIES: set[tuple[int, int]] = set()
# Appends this process committed; a deciding lock compares it to learn whether anything was written.
_COMMITS = [0]


def _open_lock(path: Path) -> tuple[int, bool]:
    """The lock file's descriptor, and whether this call created the file."""
    try:
        return os.open(path, os.O_RDWR | os.O_CREAT | os.O_EXCL, 0o600), True
    except FileExistsError:
        return os.open(path, os.O_RDWR | os.O_CREAT, 0o600), False


def _not_a_lock_file(mode: int) -> str | None:
    """What sits at a lock path instead of a regular file, or None when it is one."""
    if stat.S_ISREG(mode):
        return None
    if stat.S_ISDIR(mode):
        return "a directory"
    if stat.S_ISFIFO(mode):
        return "a named pipe"
    if stat.S_ISSOCK(mode):
        return "a socket"
    if stat.S_ISCHR(mode) or stat.S_ISBLK(mode):
        return "a device"
    return "something other than a file"


def _lock_obstructed(path: Path, what: str) -> str:
    """The refusal for a lock path something else occupies (w5/593).

    Not replaced: an entry removed on a stale look could be the lock file
    another writer has just created and holds.
    """
    return f"Cannot take the write lock: {path} is {what}, not a lock file. Remove it, then retry. Nothing was written."


#: How long a writer queues behind another `bea` write before it gives up, and
#: the variable that overrides it. Long enough for a large import to finish.
LOCK_TIMEOUT_SECONDS = Decimal(60)
LOCK_TIMEOUT_VARIABLE = "BEA_LOCK_TIMEOUT"
_LOCK_NOTICE_SECONDS = 1.0
_LOCK_POLL_SECONDS = 0.05


def _lock_timeout() -> Decimal:
    raw = os.environ.get(LOCK_TIMEOUT_VARIABLE, "").strip()
    if not raw:
        return LOCK_TIMEOUT_SECONDS
    try:
        seconds = Decimal(raw)
    except InvalidOperation:
        seconds = Decimal(-1)
    if not seconds.is_finite() or seconds < 0:
        raise UsageError(
            f"{LOCK_TIMEOUT_VARIABLE} must be a number of seconds, zero or more, not {single_line(raw)!r}. "
            "Correct it or unset it. Nothing was written."
        )
    return seconds


class _LockWait:
    """One writer's wait for a lock another `bea` write holds: a notice, then a limit.

    Polled rather than blocking: a holder that never finishes (a hung plugin,
    a stalled filesystem) must not hang every later writer behind it without a
    word (w5/182).
    """

    def __init__(self, target: Path) -> None:
        self._target = single_line(str(target))
        self._timeout = _lock_timeout()
        self._started = time.monotonic()
        self._announced = False

    def pause(self) -> None:
        """After a refused attempt: sleep before the next one, or give up."""
        waited = time.monotonic() - self._started
        if self._timeout <= waited:
            raise ConflictError(
                f"Timed out after {self._timeout:g} seconds waiting for another bea write to release "
                f"{self._target}. Nothing was written. Retry once that write has finished, or set "
                f"{LOCK_TIMEOUT_VARIABLE} to a number of seconds to wait longer."
            )
        if not self._announced and waited >= _LOCK_NOTICE_SECONDS:
            self._announced = True
            notice(f"Waiting up to {self._timeout:g} seconds for another bea write on {self._target} ...")
        time.sleep(_LOCK_POLL_SECONDS)


@contextmanager
def lock_file(file: Path, *, deciding: bool = False) -> Iterator[None]:
    """Serialize CLI writers across atomic replacements of the ledger inode.

    The cached lock stays in place after a write, so waiting writers keep
    coordinating through the same file.

    A command that reads the ledger to decide what to write takes the lock
    before that read (`deciding`) and keeps it through `append`, which asks
    for it again; a second `flock` on a new descriptor would wait on this
    process forever, so a lock this process already holds is simply kept
    (w5/183). Such a command may decide to write nothing — a duplicate, a
    refusal — and must then leave nothing behind either, so it removes a lock
    file it created itself, while still holding it. That is why every locker
    checks, once it holds the lock, that the path still names the file it
    locked, and opens it again otherwise: a writer that queued on a removed
    file must not run beside one that locked its replacement.
    """
    directory = cache_dir() / "locks"
    key = _lock_key(file)
    if key in _HELD_LOCKS:
        yield
        return
    path = directory / f"{key}.lock"
    created = False
    wait = _LockWait(file)
    with ExitStack() as stack:
        while True:
            try:
                directory.mkdir(mode=0o700, parents=True, exist_ok=True)
                fd, made = _open_lock(path)
            except OSError as exc:
                try:
                    found: int | None = os.stat(path).st_mode
                except OSError:
                    found = None
                in_the_way = None if found is None else _not_a_lock_file(found)
                if in_the_way is not None:
                    raise AuthError(_lock_obstructed(path, in_the_way)) from exc
                if found is not None:
                    # The lock file is there and will not open — mode 000, or
                    # root's after a `sudo bea` — which the directory message
                    # blamed on a directory that was fine (w5/820).
                    raise AuthError(
                        f"Cannot take the write lock: the lock file {path} cannot be opened "
                        f"({exc.strerror or exc}). Remove it, then retry. Nothing was written."
                    ) from exc
                # The filesystem refusing, not a broken ledger: exit 3 like the staging
                # refusal below, whether the cache is read-only or a file is in the way.
                raise AuthError(
                    f"Cannot take the write lock: the lock directory {directory} cannot be created or is not "
                    f"writable ({exc.strerror or exc}). Make it a writable directory or set XDG_CACHE_HOME to one "
                    "before retrying. Nothing was written."
                ) from exc
            created = created or made
            # A FIFO opens, then failed as `UnsupportedOperation: File or stream
            # is not seekable` (exit 1), naming nothing and leaking the descriptor (w5/593).
            in_the_way = _not_a_lock_file(os.fstat(fd).st_mode)
            if in_the_way is not None:
                os.close(fd)
                raise AuthError(_lock_obstructed(path, in_the_way))
            stream = os.fdopen(fd, "r+b")
            if sys.platform == "win32":
                import msvcrt

                if not os.fstat(stream.fileno()).st_size:
                    stream.write(b"\0")
                    stream.flush()
            else:
                import fcntl
            while True:
                try:
                    if sys.platform == "win32":
                        stream.seek(0)
                        msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
                    else:
                        fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except OSError as exc:
                    if sys.platform != "win32" and not isinstance(exc, BlockingIOError):
                        stream.close()
                        raise
                try:
                    wait.pause()
                except BaseException:
                    stream.close()
                    raise
            try:
                current = os.path.samestat(os.fstat(stream.fileno()), os.stat(path))
            except OSError:
                current = False
            if current:
                stack.enter_context(stream)
                break
            stream.close()
        _HELD_LOCKS.add(key)
        commits = _COMMITS[0]
        try:
            yield
        finally:
            _HELD_LOCKS.discard(key)
            if deciding and created and _COMMITS[0] == commits:
                try:
                    os.unlink(path)
                except OSError:
                    pass
            if sys.platform == "win32":
                stream.seek(0)
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


#: `flock` failures that mean locks do not exist here, not that locking failed.
_NO_FLOCK = frozenset(code for name in ("ENOTSUP", "EOPNOTSUPP", "ENOSYS") if (code := getattr(errno, name, None)))


def _hold_candidate(fd: int) -> None:
    """Lock a staged candidate for its lifetime, so the sweep can tell it from an orphan.

    The descriptor stays open (and locked) until the candidate is discarded;
    a killed writer's copies release their locks with its death. Windows
    needs no call: the open descriptor itself blocks deletion, which is the
    sweep's liveness check there. Where `flock` does not exist the candidate
    stays unlocked and the sweep keeps the age rule for it, as before.
    """
    if sys.platform == "win32":
        return
    import fcntl

    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
    except OSError as exc:
        if exc.errno not in _NO_FLOCK:
            raise


def _remove_abandoned_candidate(path: Path) -> bool | None:
    """Unlink a candidate no live write can still own.

    True when it unlinked one (or found it already gone); False when the
    candidate is locked or open and stays; None where liveness cannot be
    told (POSIX without `flock`), in which case the caller keeps the age
    rule.
    """
    if sys.platform == "win32":
        # No handle API: deletion itself is the liveness check — it fails
        # while the writer's descriptor is open.
        try:
            path.unlink()
        except FileNotFoundError:
            return True
        except OSError:
            return False
        return True
    import fcntl

    try:
        fd = os.open(path, os.O_RDONLY)
    except OSError:
        return False
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return False
        except OSError:
            return None
        try:
            same = os.path.samestat(os.fstat(fd), path.stat())
        except OSError:
            return False
        if not same:
            return False
        try:
            os.unlink(path)
        except FileNotFoundError:
            return True
        except OSError:
            return False
        return True
    finally:
        os.close(fd)


class _RenameDenied(Exception):
    """Renaming is forbidden here (a directory that denies deletion)."""


def _publish_candidate(scratch: Path, candidate: Path, file: Path) -> bool:
    """Give a filled, locked scratch file its sweepable name.

    A rename, not a replace: the destination must not exist, so on systems
    where renaming refuses an existing name a token collision retries
    instead of clobbering. False asks the caller to retry with fresh names.
    """
    try:
        os.rename(scratch, candidate)
    except FileExistsError:
        return False
    except PermissionError:
        raise _RenameDenied from None
    except OSError as exc:
        raise StagingFailed(_stage_failed(file, exc)) from exc
    return True


def _fill_candidate(fd: int, content: str, file: Path) -> None:
    """Write and sync candidate content through a duplicate descriptor."""
    try:
        # Binary over a duplicate: text mode would translate newlines on
        # Windows, turning CRLF into CRCRLF, and the original stays open for
        # the candidate's lifetime.
        with os.fdopen(os.dup(fd), "wb") as stream:
            stream.write(content.encode("utf-8"))
            stream.flush()
            os.fsync(stream.fileno())
    except OSError as exc:
        raise StagingFailed(_stage_failed(file, exc)) from exc


@contextmanager
def candidate_file(file: Path, content: str, *, mode: int = 0o600, _direct: bool = False) -> Iterator[Path]:
    """Stage beside the original, privately unless an export requests a mode.

    Exclusive creation lets the OS apply the umask without changing the
    process-wide mask, which would also affect other threads' file writes.

    The sweepable name appears only when the file is complete and held for
    its lifetime: the copy is filled under a scratch name first and then
    renamed, so the sweep never sees a candidate no lock yet protects, and a
    killed writer's copies are recognizable at once (w5/719). Where renaming
    is forbidden the candidate is created in place instead, and the sweep
    may catch it between creation and locking — the existence check turns
    that into a retryable failure rather than a confusing one.
    """
    while True:
        scratch = file.parent / f".bea-{secrets.token_hex(8)}.staging"
        candidate = file.parent / f".bea-{secrets.token_hex(8)}.tmp"
        # Registered before it exists, so a termination signal at any point
        # from creation on removes it at once — even while a parse it cannot
        # interrupt is still running (w1/074).
        with stopping.staged(scratch):
            try:
                fd = os.open(candidate if _direct else scratch, os.O_RDWR | os.O_CREAT | os.O_EXCL, mode)
            except FileExistsError:
                continue
            except PermissionError as exc:
                # A raw Errno 13 read as a validation failure (w1/073); this is
                # the filesystem refusing, which callers treat as exit 3.
                raise AuthError(
                    f"Cannot stage a copy of {file.name} in {file.parent}: the directory is not writable. "
                    "bea validates a write on a staged copy beside each changed file; make the directory "
                    "writable before retrying. Nothing was written."
                ) from exc
            except OSError as exc:
                raise StagingFailed(_stage_failed(file, exc)) from exc
            fallback = False
            try:
                _fill_candidate(fd, content, file)
                if _direct:
                    try:
                        _hold_candidate(fd)
                    except OSError as exc:
                        raise StagingFailed(_stage_failed(file, exc)) from exc
                    if not candidate.exists():
                        raise StagingFailed(_stage_failed(file, FileNotFoundError("removed by a concurrent sweep")))
                elif sys.platform == "win32":
                    # An open handle blocks renaming there, so the descriptor
                    # is closed and reopened around it; the sweep deletes,
                    # which an open handle blocks, so no flock call is needed.
                    # A sweep winning the nanosecond gap fails the reopen,
                    # which surfaces as a retryable staging failure.
                    os.close(fd)
                    try:
                        if not _publish_candidate(scratch, candidate, file):
                            continue
                    except _RenameDenied:
                        fallback = True
                    else:
                        try:
                            fd = os.open(candidate, os.O_RDWR)
                        except OSError as exc:
                            raise StagingFailed(_stage_failed(file, exc)) from exc
                else:
                    try:
                        _hold_candidate(fd)
                    except OSError as exc:
                        raise StagingFailed(_stage_failed(file, exc)) from exc
                    if candidate.exists():
                        # A 64-bit token collision; the finally below cleans the scratch.
                        continue
                    try:
                        if not _publish_candidate(scratch, candidate, file):
                            continue
                    except _RenameDenied:
                        fallback = True
                if not fallback:
                    sidecar: Path | None = None
                    try:
                        # The sidecar's name may import Beancount, so it is registered second.
                        sidecar = _sidecar_of(candidate)
                        with stopping.staged(candidate, fd):
                            with stopping.staged(sidecar) if sidecar else nullcontext():
                                yield candidate
                    finally:
                        if sidecar:
                            # In an unreachable load-cache directory there is no
                            # sidecar to remove; the load ran uncached (w5/312).
                            with suppress(OSError):
                                sidecar.unlink(missing_ok=True)
            finally:
                # Closed first: Windows cannot remove a file with an open handle.
                with suppress(OSError):
                    os.close(fd)
                _discard_candidate(candidate)
                _discard_candidate(scratch)
            if fallback:
                # Directories that deny deletion forbid renaming: create the
                # candidate in place instead, once — the direct call never
                # falls back again (w5/719).
                with candidate_file(file, content, mode=mode, _direct=True) as placed:
                    yield placed
            return


def _stage_failed(file: Path, exc: OSError) -> str:
    """A staged copy the filesystem would not take (a full disk, a size limit), in bea's words.

    Only a permission refusal had a sentence: the rest surfaced as `OSError:
    [Errno 27] File too large`, with nothing saying the file was untouched (w5/410).
    """
    return (
        f"Cannot write a staged copy of {file.name} in {file.parent} "
        f"({exc.strerror or type(exc).__name__}); nothing was written."
    )


#: What `link` answers on a filesystem without hard links: macOS's exFAT and
#: FAT say ENOTSUP, Linux's vfat EPERM.
_NO_HARD_LINKS = frozenset(
    code
    for name in ("ENOTSUP", "EOPNOTSUPP", "EPERM", "EXDEV", "ENOSYS", "EMLINK")
    if (code := getattr(errno, name, None))
)


def claim_new_file(candidate: Path, target: Path) -> None:
    """Give a validated candidate the name `target`, which must not exist yet.

    A hard link claims the name atomically and refuses an existing file. FAT
    and exFAT, the filesystems of USB sticks and SD cards, have no hard links,
    so `bea init` and every write into a new file failed there with a raw
    `OSError: [Errno 45]` naming the staging file (w5/605). There the name is
    claimed by exclusive creation instead, and the candidate replaces that
    empty placeholder. `FileExistsError` and `PermissionError` reach the
    caller as they are; anything else is said in bea's words.
    """
    try:
        with stopping.committing():
            os.link(candidate, target)
        return
    except FileExistsError:
        raise
    except OSError as exc:
        if exc.errno not in _NO_HARD_LINKS:
            raise LedgerError(_create_failed(target, exc)) from exc
    # Inside the commit section, so no stop can leave the empty placeholder behind.
    placeholder: os.stat_result | None = None
    try:
        with stopping.committing():
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            try:
                placeholder = os.fstat(fd)
            finally:
                os.close(fd)
            os.replace(candidate, target)
    except BaseException as exc:
        # Only the empty placeholder this call made is removed, never a file
        # that took its place.
        if placeholder is not None:
            with suppress(OSError):
                if os.path.samestat(placeholder, os.stat(target)):
                    os.unlink(target)
        if isinstance(exc, OSError) and not isinstance(exc, (FileExistsError, PermissionError)):
            raise LedgerError(_create_failed(target, exc)) from exc
        raise


def _create_failed(target: Path, exc: OSError) -> str:
    return f"Cannot create {target} ({exc.strerror or type(exc).__name__}); nothing was written."


def _discard_candidate(candidate: Path) -> None:
    """Remove a staged copy, even one carrying the ledger's own deny-delete ACL.

    `keep_file_metadata` gives the copy the ledger's ACL before the rename, so
    when that ACL is what refused the rename it refuses this unlink too
    (w5/257): the copy stayed behind and its `Errno 13` replaced the refusal
    being reported. The copy is bea's own, so its ACL and flags are dropped
    and the unlink retried; a cleanup that still fails never masks the error
    that is already on its way out.

    A new file is installed by hard-linking the copy, so from then on the
    copy's name is a second name for the ledger itself, and an ACL the
    directory made both inherit must stay: only a copy nothing else links to
    is still bea's own to strip.
    """
    try:
        candidate.unlink(missing_ok=True)
        return
    except OSError:
        pass
    try:
        if candidate.lstat().st_nlink != 1:
            return
    except OSError:
        return
    if sys.platform == "darwin":
        _clear_acl_darwin(candidate)
    if hasattr(os, "chflags"):
        with suppress(OSError):
            os.chflags(candidate, 0)
    with suppress(OSError):
        candidate.unlink(missing_ok=True)


# How to date and reconcile an assertion being written, so not advice for one
# a write merely finds failing in books that were already broken (w5/396).
_BALANCE_DATE_HINT = (
    "Balance assertions run at the start of the day, before that day's transactions. "
    "For a statement closing balance, use the following day's date. "
    "Review missing or duplicate transactions and record known fees as transactions before adjusting."
)


def book_units(entries: list[Any], account: str, currency: str, date: datetime.date) -> Decimal:
    """Units of `currency` in `account` and its children when a `date` assertion runs.

    Assertions run at the start of the day, so only earlier postings count —
    including the padding Beancount already inserted for earlier pads.
    """
    from beancount.core.data import Transaction

    prefix = f"{account}:"
    return sum(
        (
            posting.units.number
            for entry in entries
            if isinstance(entry, Transaction) and entry.date < date
            for posting in entry.postings
            if (posting.account == account or posting.account.startswith(prefix))
            and posting.units is not None
            and posting.units.currency == currency
            and posting.units.number is not None
        ),
        Decimal(0),
    )


def credit_root(account: str, options: dict[str, Any]) -> str | None:
    """The root of a credit-normal account (liabilities, equity, income), whose balances are negative, or None."""
    from bea_engine.ledger.text import ledger_roots

    root = account.split(":", 1)[0]
    return root if root in ledger_roots(options)[1:4] else None


def negated_credit_hint(
    account: str, number: Decimal, held: Decimal, currency: str, options: dict[str, Any]
) -> str | None:
    """The sign hint for a credit-normal account asserted at exactly its balance negated, or None.

    A card statement prints the balance owed as positive, and Beancount holds
    it negative: `77.04 USD` against a book of `-77.04 USD` failed with advice
    about missing transactions, and with `--pad-from` was padded by 154.08 USD
    with exit 0 (w5/611).
    """
    root = credit_root(account, options)
    if root is None or held == 0 or number != -held:
        return None
    return (
        f"{account} holds {held:f} {currency}: {root} balances are negative in Beancount, so a statement's "
        f"{abs(held):f} owed is {held:f} {currency}. Did you mean {held:f} {currency}?"
    )


def _balance_recovery_hints(
    balance: Any,
    source: Path,
    root: Path,
    entries: list[Any],
    options: dict[str, Any],
    snapshot: LedgerSnapshot | None,
    line_counts: dict[Path, int],
    filenames: dict[Path, Path] | None = None,
) -> list[str]:
    held = book_units(entries, balance.account, balance.amount.currency, balance.date)
    sign = negated_credit_hint(balance.account, balance.amount.number, held, balance.amount.currency, options)
    steps = _balance_recovery_steps(balance, source, root, entries, options, snapshot, line_counts, filenames)
    return [sign, *steps] if sign else steps


def _balance_recovery_steps(
    balance: Any,
    source: Path,
    root: Path,
    entries: list[Any],
    options: dict[str, Any],
    snapshot: LedgerSnapshot | None,
    line_counts: dict[Path, int],
    filenames: dict[Path, Path] | None = None,
) -> list[str]:
    import datetime

    from beancount.core.data import Close, Open, Transaction

    # A currency the account's open excludes: no missing transaction or pad
    # can put it there, so that advice would only mislead (w5/350).
    opened = next((e for e in entries if isinstance(e, Open) and e.account == balance.account), None)
    if opened is not None and opened.currencies and balance.amount.currency not in opened.currencies:
        allowed = ", ".join(opened.currencies)
        return [
            f"{balance.account}'s open allows {allowed} only, so a {balance.amount.currency} balance cannot hold "
            f"there; assert it in {allowed}, or add {balance.amount.currency} to that open."
        ]
    date_hint = _BALANCE_DATE_HINT
    # Counted once per file (w5/124): a ledger failing thousands of existing
    # assertions otherwise re-splits the whole source for each of them.
    if source not in line_counts:
        line_counts[source] = len(lexer_lines(snapshot.contents.get(source, b""))) if snapshot else 0
    if balance.meta.get("lineno", 0) <= line_counts[source]:
        return [
            date_hint,
            f"Review transactions against the existing assertion at {source}:{balance.meta['lineno']}. "
            "Correct missing transactions or edit that assertion; adding another balance would duplicate it.",
        ]
    # A balance assertion covers the account's subaccounts too, so activity
    # there is activity here: an opening adjustment on the parent would paper
    # over a discrepancy in the child.
    subaccount = f"{balance.account}:"
    if any(
        isinstance(entry, Transaction)
        and entry.date <= balance.date
        and any(
            posting.account == balance.account or posting.account.startswith(subaccount) for posting in entry.postings
        )
        for entry in entries
    ):
        return [date_hint]
    if balance.date == datetime.date.min:
        return ["Review the assertion date: an opening adjustment needs an earlier pad date."]
    pad_date = balance.date - datetime.timedelta(days=1)
    active: dict[str, list[str] | None] = {}
    for entry in entries:
        if entry.date > pad_date:
            break
        if isinstance(entry, Open):
            active[entry.account] = entry.currencies
        elif isinstance(entry, Close):
            active.pop(entry.account, None)
    if balance.account not in active:
        # Already opened, only too late: `bea add open` could only be refused
        # as a duplicate, so name the open to move instead (w5/345).
        opened = next((e for e in entries if isinstance(e, Open) and e.account == balance.account), None)
        if opened is not None and opened.date > pad_date:
            return [
                f"Review the assertion date: {balance.account} opens {opened.date} at "
                f"{_location(opened, filenames or {})}, not before this {balance.date} assertion. "
                "Move that open earlier, or use a later --date. Balance assertions run at the start of the day."
            ]
        return [
            f"Review the assertion date: {balance.account} must be open on an earlier day "
            "before this balance assertion (bea add open, or a later --date). "
            "Balance assertions run at the start of the day."
        ]
    source_account = f"{options['name_equity']}:OpeningBalances"
    allowed_currencies = active.get(source_account)
    if (
        source_account not in active
        or source_account == balance.account
        or (allowed_currencies and balance.amount.currency not in allowed_currencies)
    ):
        source_account = "SOURCE_ACCOUNT"
    tolerance = f" ~ {balance.tolerance:f}" if balance.tolerance is not None else ""
    amount = f"{balance.amount.number:f}{tolerance} {balance.amount.currency}"
    command = [
        "bea",
        "--file",
        str(root),
        "add",
        "balance",
        "--date",
        balance.date.isoformat(),
        "--account",
        balance.account,
        "--amount",
        amount,
        "--pad-from",
        source_account,
    ]
    if source.resolve() != root.resolve():
        command.extend(["--into", os.path.relpath(source, root.parent)])
    hints = [
        date_hint,
        "Review missing transactions first. The following command creates an intentional opening adjustment.",
    ]
    owed = credit_root(balance.account, options)
    if owed is not None and balance.amount.number > 0:
        # Run verbatim, the positive command added a loan to net worth (w5/611).
        negated = [*command]
        negated[negated.index("--amount") + 1] = f"{-balance.amount.number:f}{tolerance} {balance.amount.currency}"
        hints.append(
            f"{owed} balances are negative in Beancount, so an amount owed of {amount} is asserted as "
            f"{-balance.amount.number:f}{tolerance} {balance.amount.currency}. Opening adjustment command for that: "
            + shlex.join(negated)
        )
        hints.append("Opening adjustment command as asserted: " + shlex.join(command))
    else:
        hints.append("Opening adjustment command: " + shlex.join(command))
    if source_account == "SOURCE_ACCOUNT":
        hints.append(
            f"Replace SOURCE_ACCOUNT with the intended adjustment source, active on {pad_date} "
            f"and allowing {balance.amount.currency}."
        )
    return hints


class CandidateRejected(LedgerError):
    """A refused candidate, with the file and line of each error behind the refusal.

    The locations let a batch writer tell which of its appended rows failed
    from the one load it already paid for, instead of reloading per row.
    """

    def __init__(
        self,
        message: str,
        *,
        details: list[str],
        locations: list[tuple[Path, int | None]],
        records: list[_ErrorRecord],
        ledger_errors: list[str] | None = None,
        preexisting_only: bool = False,
    ) -> None:
        super().__init__(message, details=details, ledger_errors=ledger_errors)
        self.locations = locations
        self._records = records
        # True when the write adds nothing wrong and the books were already
        # broken: no row is the cause, so `--partial` cannot help (w5/725).
        self.preexisting_only = preexisting_only

    def details_at(self, positions: Iterable[int]) -> list[str]:
        """The detail lines for the errors at these positions in `locations` alone."""
        return _collapse_repeats([self._records[position] for position in positions])


@dataclass(frozen=True)
class _ErrorRecord:
    """One loader error, kept separable so identical problems can be merged."""

    kind: str
    message: str
    lineno: int | None
    hints: list[str]
    source: Path


def _collapse_repeats(records: list[_ErrorRecord]) -> list[str]:
    """One line per distinct problem, naming the other lines it occurs on.

    A single unopened account referenced by forty imported rows is one thing to
    fix, and forty identical paragraphs bury the hint that says how.

    Upstream can also report one problem twice for the same line (an unknown
    account on a balance, an inactive pad source), sometimes with different
    hints attached. Those are one record, line or no line, carrying every hint
    either had — otherwise the output names the line as "1 more line" of
    itself, or prints the same paragraph twice.

    The repeats can sit in other included files. A bare number reads as a line
    of the file the message names, so an occurrence elsewhere carries its own
    file (w5/146).
    """
    distinct: dict[tuple[str, str, int | None, Path], _ErrorRecord] = {}
    for record in records:
        same = distinct.get((record.kind, record.message, record.lineno, record.source))
        if same is None:
            distinct[(record.kind, record.message, record.lineno, record.source)] = _ErrorRecord(
                record.kind, record.message, record.lineno, list(record.hints), record.source
            )
        else:
            same.hints.extend(hint for hint in record.hints if hint not in same.hints)
    order: list[tuple[str, tuple[str, ...]]] = []
    grouped: dict[tuple[str, tuple[str, ...]], list[_ErrorRecord]] = {}
    for record in distinct.values():
        key = (record.kind, tuple(record.hints))
        if key not in grouped:
            grouped[key] = []
            order.append(key)
        grouped[key].append(record)
    messages = []
    for key in order:
        occurrences = grouped[key]
        message = occurrences[0].message
        first = occurrences[0].source
        others = [
            str(record.lineno) if record.source == first else f"{record.source}:{record.lineno}"
            for record in occurrences[1:]
            if record.lineno is not None
        ]
        if len(others) == len(occurrences) - 1 and others:
            plural = "" if len(others) == 1 else "s"
            message += f" Same problem on {len(others)} more line{plural}: {', '.join(others)}."
        messages.append(message)
        messages.extend(occurrences[0].hints)
    return [escape_format_characters(message) for message in messages]


#: How far `including_root` looks: the leaf's directory and this many above it.
_INCLUDER_LEVELS = 4
#: Candidate files it will open at most, so a search from a crowded home
#: directory stays a bounded cost (w5/112, w5/124).
_INCLUDER_CANDIDATES = 64
_INCLUDER_MAX_BYTES = 16 * 1024 * 1024


def including_root(file: Path) -> Path | None:
    """A nearby ledger that includes `file`, when `file` is not itself a root.

    Pointing `--file` at one leaf of an include tree drops the sibling files
    that open its accounts and set its options, so the resulting failures name
    the transaction rather than the target.

    The leaf's directory and a few above it are searched, with their immediate
    subdirectories for a `../shared/x.bean` include; only `.bean`/`.beancount`
    files that mention an include of the leaf's name or a glob are opened. A
    leaf three directories down or reached through `../` was never found, and
    a case-variant path never matched on macOS (w5/347).
    """
    return next(_scan_includers(file), None)


def including_roots(file: Path) -> Iterator[Path]:
    """Every nearby ledger that includes `file`, nearest directory first.

    Lazily scanned: a caller that only needs to know there are two stops the
    search at the second (w5/775).
    """
    return _scan_includers(file)


def _scan_includers(file: Path) -> Iterator[Path]:
    """Yield each nearby ledger whose include closure holds `file` (see `including_root`)."""
    target = file.resolve()
    directories: list[Path] = []
    for level, directory in enumerate([target.parent, *target.parent.parents]):
        if level >= _INCLUDER_LEVELS:
            break
        directories.append(directory)
        if (directory / ".git").exists():
            break
    near: list[Path] = []
    for directory in directories:
        near.append(directory)
        try:
            near.extend(
                sorted(child for child in directory.iterdir() if child.is_dir() and not child.name.startswith("."))
            )
        except OSError:
            continue
    # Case-folded: on a case-insensitive volume `DEEP.BEAN` names `deep.bean`.
    name = target.name.casefold().encode()
    opened = 0
    for directory in dict.fromkeys(near):
        try:
            entries = sorted(directory.iterdir())
        except OSError:
            continue
        # `glob` matches case-sensitively on POSIX, even on a case-insensitive
        # volume, so a `main.BEAN` root was never found (w5/870).
        files = [path for suffix in (".bean", ".beancount") for path in entries if path.suffix.lower() == suffix]
        for candidate in files:
            if opened >= _INCLUDER_CANDIDATES:
                return
            try:
                info = candidate.stat()
                # Regular files only, and not huge: a `.bean` FIFO left in a
                # nearby directory blocked this read forever.
                if not stat.S_ISREG(info.st_mode) or info.st_size > _INCLUDER_MAX_BYTES:
                    continue
                if os.path.samefile(candidate, target):
                    continue
                text = candidate.read_bytes()
            except OSError:
                continue
            if b"include" not in text or (name not in text.lower() and not any(c in text for c in (b"*", b"?", b"["))):
                continue
            opened += 1
            try:
                included = LedgerSnapshot.capture(candidate.resolve()).contents
            except (OSError, UsageError, ValueError):
                continue
            if any(_same_file(path, target) for path in included if not _same_file(path, candidate)):
                yield candidate.resolve()


def _same_file(left: Path, right: Path) -> bool:
    try:
        return os.path.samefile(left, right)
    except OSError:
        return False


def defining_root(file: Path, first: Path | None = None) -> Path | None:
    """The highest includer that defines what `file` reads, or None for a root.

    `first` forces the climb's first step, so each direct includer can be
    climbed on its own when a leaf has more than one (w5/775).

    Each step up must define what the file below it reads, and the first
    overlay ends the climb: climbing past the nearest includer to the topmost
    one put a leaf under a working ledger below a forecast overlay through the
    overlay, whose forecast entries then counted (w5/774). A step that defines
    nothing and adds no entries is a pass-through intermediate, which the
    climb continues past to the root above it (w5/346). A climb that comes
    back to `file` (an include cycle through it) has no other root to name:
    the hint told the user to run the command they had just run (w5/566).
    """
    root: Path | None = None
    current = file
    seen = {file.resolve()}
    above = first
    while True:
        if above is None:
            above = including_root(current)
        if above is None or above.resolve() in seen:
            break
        seen.add(above.resolve())
        try:
            around = LedgerSnapshot.capture(above).contents
            own = LedgerSnapshot.capture(current).contents
        except Exception:  # noqa: BLE001 - unreadable here is reported by the load itself
            break
        if not _defines_in(around, own):
            if _step_adds_entries(around, own):
                break
            current = above
            above = None
            continue
        root, current = above, above
        above = None
    return root


#: What the loader reads at the start of a line: a file's UTF-8 BOM, and a date
#: of any digit count (`2024-1-1`), which may touch its directive (`2024-01-01open`).
#: Matching only `\d{2}` and a space hid a root's opens from the leaf (w5/934).
_BOM = rb"^(?:\xef\xbb\xbf)?"
_DATE = _BOM + rb"\d{4}[-/]\d+[-/]\d+"
#: An account opened outside the file's own closure: a per-year file reads
#: the accounts its root opens.
_OPEN_LINE = re.compile(_DATE + rb"[ \t]*open[ \t]", re.MULTILINE)
#: Option and plugin names, to tell a repeated setting from a new definition.
_OPTION_NAME = re.compile(_BOM + rb'option[ \t]+"([a-z_]+)"', re.MULTILINE)
_PLUGIN_NAME = re.compile(_BOM + rb'plugin[ \t]+(?:"([^"]+)"|([A-Za-z_][\w.]*))', re.MULTILINE)
#: Options that never define what a file reads.
_REPEATED_OK = {b"title", b"render_commas"}
#: A dated line: a transaction or directive, the entries an overlay adds. A flag may touch
#: the date (`2024-01-15*"Forecast"`), as a directive word may (w5/987).
_ENTRY_LINE = re.compile(_DATE + rb"(?:[ \t]+\S|[A-Za-z*!&#?%])", re.MULTILINE)
#: Accounts the closure opens, and accounts its entries post to. A name may
#: start with and contain non-ASCII letters (`Áctivos:Cash`).
_OPEN_ACCOUNT = re.compile(_DATE + rb"[ \t]*open[ \t]+(\S+)", re.MULTILINE)
_POSTED_ACCOUNT = re.compile(rb"^[ \t]+([A-Z\x80-\xff][A-Za-z0-9_\x80-\xff-]*(?::[^:\s]+)+)(?=[ \t]|$)", re.MULTILINE)
_DIRECTIVE_ACCOUNT = re.compile(_DATE + rb"[ \t]*(?:balance|note|document|close)[ \t]+(\S+)", re.MULTILINE)
_PAD_ACCOUNTS = re.compile(_DATE + rb"[ \t]*pad[ \t]+(\S+)[ \t]+(\S+)", re.MULTILINE)


def _posts_unopened(own: dict[Path, bytes]) -> bool:
    """Whether the closure posts to an account it never opens, needing a plugin's opens."""
    opened = {account for content in own.values() for account in _OPEN_ACCOUNT.findall(content)}
    for content in own.values():
        posted = list(_POSTED_ACCOUNT.findall(content))
        posted.extend(_DIRECTIVE_ACCOUNT.findall(content))
        for first, second in _PAD_ACCOUNTS.findall(content):
            posted.extend((first, second))
        if any(account not in opened for account in posted):
            return True
    return False


def defines_for(file: Path, root: Path) -> bool:
    """Whether the ledger including `file` defines what `file` reads, which makes `file` its leaf.

    A per-year file reads the accounts its root opens. A working ledger that a
    Fava or forecast overlay includes reads nothing from the overlay, which
    only adds to it: taken for its root, the overlay's forecast entries
    counted in validation and dedupe, a wrong balance was written and a real
    bank row skipped as a duplicate (w5/578). Only what the file needs counts:
    an option or plugin the file already sets is a repeat, not a definition,
    and a plugin counts only when the file posts to an account it never opens
    (w5/774). When the closures cannot be read, the leaf answer stands.
    """
    try:
        around = LedgerSnapshot.capture(root).contents
        own = LedgerSnapshot.capture(file).contents
    except Exception:  # noqa: BLE001 - unreadable here is reported by the load itself
        return True
    return _defines_in(around, own)


def _defines_in(around: dict[Path, bytes], own: dict[Path, bytes]) -> bool:
    """Whether the files around a closure define what it reads (see `defines_for`)."""
    extra = [content for path, content in around.items() if path not in own]
    if any(_OPEN_LINE.search(content) for content in extra):
        return True
    own_options = {name for content in own.values() for name in _OPTION_NAME.findall(content)}
    for content in extra:
        if any(name not in _REPEATED_OK and name not in own_options for name in _OPTION_NAME.findall(content)):
            return True
    own_plugins = {quoted or bare for content in own.values() for quoted, bare in _PLUGIN_NAME.findall(content)}
    for content in extra:
        fresh = {
            quoted or bare for quoted, bare in _PLUGIN_NAME.findall(content) if (quoted or bare) not in own_plugins
        }
        if fresh and _posts_unopened(own):
            return True
    return False


def _step_adds_entries(around: dict[Path, bytes], own: dict[Path, bytes]) -> bool:
    """Whether the higher closure adds entries or a plugin of its own (an overlay, not a pass-through)."""
    return any(
        _ENTRY_LINE.search(content) or _PLUGIN_NAME.search(content)
        for path, content in around.items()
        if path not in own
    )


def root_read_hint(file: Path) -> str | None:
    """For a read that failed on an included leaf: the root to read instead, or None.

    `check` and the reads refused a per-year file with `Pass --allow-errors`,
    which answers for part of the ledger, never naming the root that loads
    the accounts it uses (w5/348). A file that reads nothing from its
    includer is no leaf (w5/578).
    """
    root = defining_root(file)
    if root is None:
        return None
    return (
        f"{file.name} is included by {root}; on its own it lacks the accounts and options that root provides. "
        f"Run with --file {shlex.quote(str(root))} to read the whole ledger."
    )


def _nearest_includers(file: Path) -> list[Path]:
    """The ledgers that include `file` and include no other such ledger.

    The scan yields every ancestor in the include closure. A ledger that also
    includes another includer of the leaf, like a forecast view over the
    working ledger, is reached by climbing from that includer, where the
    overlay rule applies. Started on its own, its closure held the working
    ledger's opens, so it passed for a second defining root and the write was
    refused as ambiguous (w5/933). Two includers neither of which reaches the
    other are still two roots.
    """
    found = list(including_roots(file))
    if len(found) < 2:
        return found
    closures: dict[Path, set[Path]] = {}
    for candidate in found:
        try:
            closures[candidate] = {path.resolve() for path in LedgerSnapshot.capture(candidate).contents}
        except Exception:  # noqa: BLE001 - unreadable here is reported by the load itself
            closures[candidate] = set()
    nearest = [
        candidate
        for candidate in found
        if not any(other != candidate and other.resolve() in closures[candidate] for other in found)
    ]
    # An include cycle makes each the other's ancestor: keep them all.
    return nearest or found


def write_through_root(file: Path, into: Path | None) -> tuple[Path, Path | None, str | None]:
    """The root and `--into` a write aimed at an included leaf is validated through, and the note saying so.

    A write with `--file` on a leaf validated that file alone: every account
    the root opens looked unknown, a remedy said to `add open` one again, and
    following it wrote a duplicate `open` with exit 0 that broke the whole
    ledger; a balance or a close could contradict the root, and import
    dedupe missed rows booked there (w5/343, w5/346). The write still lands
    in the leaf, checked against the ledger that loads it — the `--into`
    recipe, applied rather than printed.

    The note is the caller's to report in its answer: printed here, it
    reached a person but never `--json` (w5/613).
    """
    if into is not None:
        return file, into, None
    # The nearest includer may itself be included: a leaf under `sub/extra.bean`
    # was checked against `extra.bean` alone, and the root's own entries —
    # what a balance or a close contradicts, what import dedupes against —
    # stayed out of the check (w5/346). Climb past pass-through intermediates
    # to the highest defining root, stopping below an overlay (w5/774).
    tops: list[Path] = []
    for first in _nearest_includers(file):
        top = defining_root(file, first=first)
        if top is None or any(_same_file(top, known) for known in tops):
            continue
        tops.append(top)
        if len(tops) > 1:
            # Judged against whichever sorts first, a true balance was refused
            # and a false one written; the refusal never said which root
            # judged it. Ask instead (w5/775).
            listed = ", ".join(str(top) for top in tops)
            into_example = Path(os.path.relpath(file.resolve(), tops[0].parent))
            raise UsageError(
                f"{file.name} is included by more than one root ledger: {listed}. Say which ledger "
                f"to check the write against: bea --file {tops[0]} <command> --into {into_example}."
            )
    if not tops:
        return file, into, None
    root = tops[0]
    redirect = (
        f"{file.name} is included by {root}; the write goes to {file.name} and is checked against that whole ledger."
    )
    return root, Path(os.path.relpath(file.resolve(), root.parent)), redirect


def root_ledger_hints(file: Path) -> list[str]:
    """The `--into` recipe when the invoked entry file is an included leaf."""
    root = including_root(file)
    if root is None or not defines_for(file, root):
        return []
    relative = os.path.relpath(file.resolve(), root.parent)
    return [
        f"{file.name} is included by {root}; on its own it lacks the accounts and options that root provides. "
        f"Run against the root and pick the destination with --into: "
        f"bea --file {shlex.quote(str(root))} <command> --into {shlex.quote(relative)}."
    ]


def _normal_form(text: str) -> str:
    """Name the normalization `text` is in, for a message that has to tell two apart."""
    for form in ("NFC", "NFD"):
        if unicodedata.is_normalized(form, text):
            return form
    return "a mixed form"


def unknown_account_is_normalization(account: str, accounts: Iterable[str]) -> str | None:
    """Explain an open account that differs from `account` only in normalization.

    `difflib` compares code points, so the NFC and NFD spellings of one name
    score far above its cutoff and come back as a close match — a suggestion
    that renders exactly like the name it is suggested for, which tells the
    reader nothing and sends them looking for a typo that is not there.

    This is not a near miss at all: the account is already open, spelled with
    different code points. Both the suggestion and the `bea add open` advice
    are wrong for it — following the latter opens a second account that looks
    identical to the first — so this replaces them rather than joining them.
    The two forms are quoted as escapes because that is the only way to show a
    difference the terminal renders away.
    """
    for candidate in accounts:
        if candidate == account or unicodedata.normalize("NFC", candidate) != unicodedata.normalize("NFC", account):
            continue
        return (
            f" The ledger already opens this account, spelled in a different Unicode normalization: it has "
            f"{ascii(candidate)} ({_normal_form(candidate)}) where you wrote {ascii(account)} "
            f"({_normal_form(account)}). Both render identically, so this is not a typo: copy the name from the "
            f"ledger, or re-open the account in the form you type. Creating it with bea add open would add a "
            f"second account indistinguishable from the first."
        )
    return None


_PROSE_RE = re.compile(r'"(?:[^"\\]|\\.)*"|;[^\n]*|^\*[^\n]*', re.MULTILINE)
"""String literals, `;` comments, and org-mode `*` heading lines: text that names no account."""


def _account_tokens(text: str) -> set[str]:
    """Non-ASCII tokens shaped like an account name, outside strings and comments."""
    return {token for token in _PROSE_RE.sub(" ", text).split() if ":" in token.strip(":") and not token.isascii()}


def respelled_account_notes(texts: Iterable[str], snapshot: LedgerSnapshot) -> list[str]:
    """Say when new text spells an account in another normalization than the ledger does.

    `bea` reads the NFC and NFD spellings of one name as one account, and the
    writer emits NFC, so the write is valid here. Stock Beancount compares
    code points: on a ledger that spells the account NFD, the new NFC line
    refers to an account nobody opened, and `bean-check` fails on a file it
    passed before the write (w5/199). Existing bytes are never renormalized
    as a side effect, so the caller is told instead.

    The snapshot is the ledger before the write, so every such write is
    reported, not only the first one.
    """
    new = {token for text in texts for token in _account_tokens(text)}
    if not new:
        return []
    used: set[str] = set()
    for content in snapshot.contents.values():
        if not content.isascii():
            used |= _account_tokens(content.decode("utf-8", errors="ignore"))
    notes = []
    for account in sorted(new):
        canonical = unicodedata.normalize("NFC", account)
        other = next(
            (name for name in sorted(used) if name != account and unicodedata.normalize("NFC", name) == canonical),
            None,
        )
        if other is not None:
            notes.append(
                f"The new directive spells {canonical} as {ascii(account)} ({_normal_form(account)}) where the "
                f"ledger has {ascii(other)} ({_normal_form(other)}). bea reads both as one account, but other "
                f"Beancount tools such as bean-check read two and report the new line as an unknown account. "
                f"Re-save the ledger in Unicode NFC to keep it valid for them."
            )
    return notes


def validate_candidate(
    candidate: Path,
    file: Path,
    *,
    allow_errors: bool = False,
    snapshot: LedgerSnapshot | None = None,
    stages_pad: bool = False,
    stages_open: bool = False,
    pad_from: bool = False,
    pad_date_explicit: bool = False,
    operating_defaults: dict[int, list[str] | None] | None = None,
    inspect: Callable[[list[Any]], None] | None = None,
) -> list[str]:
    """Refuse a candidate that fails validation, naming what it would break.

    `inspect` is handed the candidate's loaded entries, in the order every
    read sees them, so a caller can judge the write against the ledger as it
    would stand (which price wins a day) without loading it a second time.

    `--allow-errors` tolerates errors the ledger already had — a failing
    balance assertion stays failing — but nothing the write itself introduces:
    a new unknown account, currency violation, or balance failure refuses the
    write even with the flag, so an exit-0 write never leaves a ledger `check`
    rejects for reasons absent before it. Three categories always refuse, flag
    or no flag: syntax errors, pad references to unknown or inactive accounts,
    and newly introduced errors. A syntax error is text the lexer or grammar
    could not read; upstream's `ParserError` is not one — it is what a grammar
    action says about text that did parse (an invalid option, a duplicate
    metadata key, an unbalanced pushtag), so an existing one is tolerated like
    any other and only a new one refuses (w5/200). The one carve-out is a
    newly staged pad, whose `Unused Pad` the documented two-step
    pad-then-balance flow needs:
    `stages_pad` says the request appends nothing but pads, and only an unused
    pad inside that appended text is exempt. Any other write that leaves a pad
    unused — its own alongside a balance, or one that was valid before —
    introduced an error like any other (w5/081). A newly staged `open` on a
    ledger loading `nounused` is the same first half of a two-step: the plugin
    reports the account until something uses it, and nothing can use it before
    it is open. `stages_open` says the request appends nothing but opens, and
    only an `Unused account` on one of those is exempt (w5/221). `pad_from`
    says the pad is `add balance --pad-from`'s, not a directive the user wrote.
    `operating_defaults` names the proposed postings whose currency is a guess
    from the operating currency, so hints blame the guess instead of advising
    an exchange never made (w5/804).
    """
    from beancount.core import interpolate
    from beancount.core.data import Balance, Close, Document, Open, Pad, Transaction
    from beancount.core.flags import FLAG_PADDING
    from beancount.plugins.unique_prices import UniquePricesError

    from bea_engine import managed_load
    from bea_engine.ledger.text import (
        ledger_roots,
        renamed_root_options,
        reports_unused_accounts,
        unknown_root_message,
    )

    # The staged copy has a private name, so the guard inside the load would
    # name that; a `{filename}` cache pattern is about the ledger file itself.
    refuse_cache_over_ledger(file, snapshot.contents if snapshot else [file], snapshot.patterns if snapshot else ())
    try:
        if snapshot is None:
            entries, errors, options = managed_load.load_file(candidate)
            filenames = {candidate: file}
            # `bea init` validates a candidate before the destination exists; treat
            # a missing original as zero lines so creation still works.
            original_lines = {file.resolve(): lexer_lines(file.read_bytes())} if file.exists() else {}
        else:
            with snapshot.staged(candidate, file) as (root, filenames):
                entries, errors, options = managed_load.load_file(root)
            errors = [*errors, *snapshot.duplicate_include_errors(file)]
            original_lines = {path.resolve(): lexer_lines(content) for path, content in snapshot.contents.items()}
    except InvalidOperation as exc:
        # Booking quantizes an interpolated amount under the 28-digit decimal
        # context and raises, instead of reporting, when it does not fit (w5/263).
        raise UsageError(
            "Beancount cannot load the ledger with this write: it has to calculate an amount wider than the "
            "28 significant digits its arithmetic keeps, which happens when a posting's amount is left for it "
            "to infer beside a number that wide. Give every posting an explicit amount, or use a number of at "
            "most 28 significant digits. Nothing was written."
        ) from exc
    if inspect is not None:
        inspect(entries)
    type_errors = managed_load.data_type_errors(entries, options)
    errors = [*errors, *type_errors]
    original_line_counts = {path: len(lines) for path, lines in original_lines.items()}
    # The error set before the write, matched so the same failure after the
    # append reads as the same error. Appends land at end of file over
    # verbatim existing bytes, so a pre-existing error keeps its file and
    # line; anything unmatched in the after set is newly introduced.
    tolerated: set[int] = set()
    before_errors: list[Any] | None = None
    existing_plugin_errors: set[int] | None = None

    def _own_lifecycle_accounts() -> set[str]:
        # Accounts this write itself opens or closes, walked only when an
        # inactive-account error needs classifying: a valid ledger pays for
        # no extra entries walk (w5/772).
        return {
            entry.account
            for entry in entries
            if isinstance(entry, Open | Close) and _proposed_entry(entry, filenames, original_lines)
        }

    if allow_errors:
        _, before_errors, _ = managed_load.load_file(
            snapshot.root if snapshot else file, snapshot=snapshot, check_types=True
        )
        tolerated = _preexisting_errors(errors, before_errors, filenames, original_lines, _own_lifecycle_accounts)
        existing_plugin_errors = tolerated
    accounts = [entry.account for entry in entries if isinstance(entry, Open)]
    on_disk_accounts: list[str] | None = None

    def _accounts_for(on_disk: bool) -> list[str]:
        # An error on a line already in the ledger is described by the ledger
        # as it is: "Did you mean" named the refused write's own account, and
        # "opened at" a line never written (w5/840).
        nonlocal on_disk_accounts
        if not on_disk:
            return accounts
        if on_disk_accounts is None:
            on_disk_accounts = [
                entry.account
                for entry in entries
                if isinstance(entry, Open) and not _proposed_entry(entry, filenames, original_lines)
            ]
        return on_disk_accounts

    # What the per-error hints below look up, each built on first use and then
    # shared (w5/124). One mis-dated `open` makes thousands of errors, and a
    # pass over the whole ledger for each took a refusal from seconds to
    # minutes.
    account_suggestions: dict[str, str] = {}
    lifecycles: dict[str, list[Any]] | None = None
    closes_by_location: dict[tuple[Any, Any, Any], Any] | None = None
    cost_holders: dict[str, set[int]] | None = None
    first_inactive_dates: dict[str, Any] | None = None
    last_inactive_dates: dict[str, Any] | None = None
    source_line_counts: dict[Path, int] = {}
    roots = ledger_roots(options)
    records: list[_ErrorRecord] = []
    locations: list[tuple[Path, int | None]] = []
    introduced: list[bool] = []
    invalid_pad_accounts = False
    # Each pad hint once: two inactive accounts on one pad are two errors (w5/395).
    pad_hints: set[str] = set()
    any_appended = False
    # Currencies check_commodity reported before the write (w5/398).
    missing_before: set[str] | None = None
    # Finding an including root lexes every sibling ledger's include closure,
    # so it is looked up once, on the first unknown account, not per error.
    root_hints: list[str] | None = None
    per_file_hinted: set[Path] = set()
    pad_invalid = any(is_invalid_pad_account(error) for error in errors)
    duplicate_opens = {
        error.entry.account
        for error in errors
        if isinstance(error.entry, Open) and str(getattr(error, "message", "")).startswith("Duplicate open directive")
    }
    conflicting_balances = {
        (error.entry.date, error.entry.account, error.entry.amount.currency)
        for error in errors
        if isinstance(error.entry, Balance)
        and str(getattr(error, "message", "")).startswith("Duplicate balance assertion")
    }
    for index, error in enumerate(errors):
        hints = []
        message = format_error(error, ledger_file=file)
        for staged, original in filenames.items():
            message = message.replace(str(staged), str(original))
        metadata = error.source or {}
        source = Path(metadata.get("filename", str(candidate)))
        source = filenames.get(source, source)
        lineno = metadata.get("lineno")
        # A staged pad's `Unused Pad` is the documented carve-out — the
        # two-step pad-then-balance flow cannot start without it. A staged
        # open's `Unused account` is the other, for the same reason.
        appended = isinstance(lineno, int) and lineno > original_line_counts.get(source.resolve(), lineno)
        any_appended = any_appended or appended
        unused_open = is_unused_open(error)
        is_new = False
        if allow_errors and index not in tolerated:
            exempt = (stages_pad and "Unused Pad" in getattr(error, "message", "")) or (stages_open and unused_open)
            is_new = not (appended and exempt)
        introduced.append(is_new)
        # Candidate validation invents line numbers past EOF when the append
        # is rejected. Do not send agents to a line that will not exist.
        if (
            (not allow_errors or is_new)
            and isinstance(lineno, int)
            and lineno > original_line_counts.get(source.resolve(), lineno)
        ):
            prefix = f"{source}:{lineno}: "
            if message.startswith(prefix):
                message = "Proposed append (not written): " + message[len(prefix) :]
            else:
                message = f"Proposed append (not written): {message}"
        plugin = type(error).__module__
        if plugin.startswith("beancount.plugins.") and not appended and not _unanchored(error):
            # A backdated entry can make a plugin fail at an existing line.
            # Keep that real location, but identify this write as the trigger
            # only when the error was absent before it (w5/666).
            if existing_plugin_errors is None:
                if before_errors is None:
                    root = snapshot.root if snapshot else file
                    before_errors = (
                        managed_load.load_file(root, snapshot=snapshot, check_types=True)[1] if root.exists() else []
                    )
                existing_plugin_errors = _preexisting_errors(
                    errors, before_errors, filenames, original_lines, _own_lifecycle_accounts
                )
            if index not in existing_plugin_errors:
                hints.append(f"The proposed append (not written) triggers this error from plugin {plugin}.")
        if _unanchored(error) and (missing := _MISSING_COMMODITY.search(message)):
            # check_commodity reports against no line, so the location test
            # above cannot tell the write's own currency from one the books
            # already lacked; the ledger before the write can (w5/398).
            message = message.removeprefix(f"{metadata.get('filename')}:{lineno}: ")
            if missing_before is None:
                if before_errors is None:
                    root = snapshot.root if snapshot else file
                    before_errors = (
                        managed_load.load_file(root, snapshot=snapshot, check_types=True)[1] if root.exists() else []
                    )
                missing_before = {
                    found.group(1)
                    for before in before_errors
                    if _unanchored(before) and (found := _MISSING_COMMODITY.search(getattr(before, "message", "")))
                }
            if missing.group(1) not in missing_before:
                message = f"Proposed append (not written): {message}"
            hints.append(
                "Plugin check_commodity requires a commodity directive for every currency the ledger uses. "
                f"Declare it first: {bea_command(snapshot.root if snapshot else file)} add commodity "
                f"--date YYYY-MM-DD --currency {missing.group(1)}, then retry."
            )
        if "unknown account '" in message:
            account = message.split("unknown account '", 1)[1].split("'", 1)[0]
            pool = _accounts_for(not appended)
            suggestion = account_suggestions.get(f"{appended}:{account}")
            if suggestion is None:
                suggestion = unknown_account_is_normalization(account, pool)
                if suggestion is None:
                    matches = difflib.get_close_matches(account, pool, n=3, cutoff=0.6)
                    suggestion = f" Did you mean {', '.join(matches)}?" if matches else ""
                    # An `open` under a root the ledger does not use can never
                    # load, so the remedy is the root, not the directive (w5/154).
                    if (problem := new_account_format_problem(account)) is not None:
                        suggestion += f" {problem}"
                    elif account.split(":", 1)[0] in roots:
                        # Pasted, a bare `bea add open` opened the account in
                        # whatever ledger cwd discovery found (w5/619).
                        suggestion += (
                            f" To create it, use {bea_command(snapshot.root if snapshot else file)} add open "
                            f"--account {shlex.quote(account)} --date YYYY-MM-DD"
                        )
                        # Under `nounused` the plain command is refused: the
                        # open is an error until this very write uses it.
                        if reports_unused_accounts(options):
                            suggestion += (
                                " --allow-errors, then retry; this ledger's nounused plugin reports the open"
                                " until the account is used"
                            )
                        suggestion += "."
                    else:
                        suggestion += f" {unknown_root_message(account, roots)}"
                account_suggestions[f"{appended}:{account}"] = suggestion
            message += suggestion
            if root_hints is None:
                root_hints = root_ledger_hints(snapshot.root if snapshot else file)
            hints.extend(root_hints)
        if (
            "Invalid account name: " in message
            and source != (snapshot.root if snapshot else file)
            and source not in per_file_hinted
        ):
            account = message.split("Invalid account name: ", 1)[1].split()[0].rstrip(".")
            renamed = renamed_root_options(options)
            if renamed and account.split(":", 1)[0] in roots:
                per_file_hinted.add(source)
                # Upstream checks names against the options of the file being
                # parsed, so an include reads the default roots (w5/462).
                hints.append(
                    f'Beancount applies option "name_*" per file, so {source.name} reads the default roots. '
                    f"Repeat the root's options at the top of {source.name}: {'; '.join(renamed)}."
                )
        if "AVERAGE method is not supported" in message:
            if lifecycles is None:
                lifecycles = _lifecycles(entries, original_lines)
            message += _average_booking_suffix(error, options, lifecycles)
        if "inactive account '" in message:
            account = message.split("inactive account '", 1)[1].split("'", 1)[0]
            if lifecycles is None:
                lifecycles = _lifecycles(entries, original_lines)
            # A plugin's open or close is not a line anyone can edit (w5/222).
            remedy = "edit that directive"
            for entry in lifecycles.get(account, []):
                word, state = ("open", "opened") if isinstance(entry, Open) else ("close", "closed")
                if isinstance(entry, Open) and _proposed_entry(entry, filenames, original_lines):
                    if first_inactive_dates is None:
                        first_inactive_dates, last_inactive_dates = _inactive_bounds(errors)
                    message += (
                        f" The proposed open would open {account} on {entry.date}; date it on or before "
                        f"{first_inactive_dates[account]}."
                    )
                    remedy = "correct the proposed open date"
                    continue
                if isinstance(entry, Close) and _proposed_entry(entry, filenames, original_lines):
                    if last_inactive_dates is None:
                        first_inactive_dates, last_inactive_dates = _inactive_bounds(errors)
                    message += (
                        f" The proposed close would close {account} on {entry.date}; date it on or after "
                        f"{last_inactive_dates[account]}."
                    )
                    remedy = "correct the proposed close date"
                    continue
                if isinstance(entry, Close) and (
                    closing_hint := _plugin_close_hint(entry, lifecycles, filenames, original_lines)
                ):
                    description, remedy = closing_hint
                    message += f" Account {description}."
                    continue
                origin = _plugin_origin(entry, word, filenames, original_lines)
                if origin is None:
                    message += f" Account {state} {entry.date} at {_location(entry, filenames)}."
                    continue
                message += f" Account {state} {entry.date} by {origin}, not by a line in the ledger"
                remedy = "change the ledger lines that plugin reads"
                message += "."
            # Named for the directive that failed: a note or a pad is no transaction (w5/393).
            # A pad's own padding transaction is the pad the user wrote, and
            # naming both alike keeps them one paragraph (w1/118).
            noun = type(error.entry).__name__.lower() if error.entry is not None else "directive"
            if isinstance(error.entry, Transaction) and error.entry.flag == FLAG_PADDING:
                noun = "pad"
            discovered = _discovered_document(error.entry)
            if discovered is not None:
                # No directive to edit: the file was auto-discovered, so name
                # it and the option, and offer moving it instead of dating it (w5/765).
                dirs = " ".join(f'"{name}"' for name in options.get("documents") or [])
                through = f'option "documents" {dirs}'.rstrip()
                message += (
                    f" {discovered} is auto-discovered through {through}, so the account must "
                    "be open on the file's date."
                )
                fix = "Move the file out of the documents folder"
            else:
                fix = f"Correct the {noun} date"
            message += f" {fix} or {remedy}; for new books use bea init --date YYYY-MM-DD."
        if isinstance(error.entry, Close) and error.message.endswith(" is being closed"):
            # Upstream calls the account unopened whether it never was or
            # opens after the close; say which, as every other directive's
            # refusal does (w5/394).
            if lifecycles is None:
                lifecycles = _lifecycles(entries, original_lines)
            opened = next(
                (
                    e
                    for e in lifecycles.get(error.entry.account, [])
                    if isinstance(e, Open) and (appended or not _proposed_entry(e, filenames, original_lines))
                ),
                None,
            )
            if closing_hint := _plugin_close_hint(error.entry, lifecycles, filenames, original_lines):
                description, _ = closing_hint
                message = message.removeprefix(f"{metadata.get('filename')}:{lineno}: ")
                message += (
                    f". Account {description}. Open {error.entry.account} on or before {error.entry.date}, "
                    "or open it under another parent."
                )
            elif opened is not None:
                message += (
                    f". Account opened {opened.date} at {_location(opened, filenames)}; "
                    f"date the close on or after {opened.date}."
                )
            elif matches := difflib.get_close_matches(
                error.entry.account, _accounts_for(not appended), n=3, cutoff=0.6
            ):
                message += f". Did you mean {', '.join(matches)}?"
            else:
                message += f". The ledger never opens {error.entry.account}; check the account name."
        if isinstance(error.entry, Transaction) and (invalid := _POSTING_CURRENCY.fullmatch(error.message)):
            if lifecycles is None:
                lifecycles = _lifecycles(entries, original_lines)
            opened = next((e for e in lifecycles.get(invalid["account"], []) if isinstance(e, Open)), None)
            if invalid["account"] in duplicate_opens:
                # Beancount checks postings against the account's last open:
                # the proposed one, so the existing postings fail (w5/488).
                hints.append(f"This follows from the duplicate open of {invalid['account']} above.")
            elif opened is not None and opened.currencies:
                pad_leg = _pad_leg_currency_hint(
                    error.entry,
                    invalid["account"],
                    invalid["currency"],
                    opened,
                    entries,
                    filenames,
                    original_lines,
                    pad_from=pad_from,
                )
                if pad_leg is not None:
                    hints.append(pad_leg)
                else:
                    interpolated = _interpolated_leg_hint(
                        error.entry,
                        invalid["account"],
                        invalid["currency"],
                        opened,
                        operating_defaults=operating_defaults if appended else None,
                    )
                    hints.append(
                        interpolated or _currency_widen_hint(invalid["currency"], opened, filenames, original_lines)
                    )
        if isinstance(error.entry, Open) and error.message.startswith("Duplicate open directive for "):
            if lifecycles is None:
                lifecycles = _lifecycles(entries, original_lines)
            opens = [e for e in lifecycles.get(error.entry.account, []) if isinstance(e, Open)]
            existing = None
            duplicate = None
            for opened in opens:
                path = Path(opened.meta.get("filename", ""))
                original = filenames.get(path, path).resolve()
                line = opened.meta.get("lineno")
                # Beancount blames the later-dated open, which can be the
                # existing one. Only an entry within the original bytes is
                # an open the user can edit (w5/658).
                if isinstance(line, int) and 1 <= line <= original_line_counts.get(original, 0):
                    if existing is None:
                        existing = opened
                elif duplicate is None or opened is error.entry:
                    duplicate = opened
            # With pre-existing duplicates, merge the newly proposed open's
            # currencies, rather than those of another persisted open.
            if duplicate is None:
                duplicate = next((e for e in opens if e is not existing), None)
            if existing is not None and duplicate is not None:
                closed = next(
                    (
                        entry
                        for entry in lifecycles.get(error.entry.account, [])
                        if isinstance(entry, Close) and _within_original(entry, filenames, original_line_counts)
                    ),
                    None,
                )
                hints.append(_duplicate_open_hint(existing, duplicate, filenames, closed))
        if isinstance(error.entry, Close) and error.message.startswith("Duplicate close directive for "):
            if lifecycles is None:
                lifecycles = _lifecycles(entries, original_lines)
            closes = [e for e in lifecycles.get(error.entry.account, []) if isinstance(e, Close)]
            existing_close = None
            duplicate_close = None
            for closed in closes:
                # As with opens, Beancount blames the later-dated close, which
                # can be the existing one (w5/658).
                if _within_original(closed, filenames, original_line_counts):
                    if existing_close is None:
                        existing_close = closed
                elif duplicate_close is None or closed is error.entry:
                    duplicate_close = closed
            if (
                existing_close is not None
                and duplicate_close is not None
                and _proposed_entry(duplicate_close, filenames, original_lines)
            ):
                hints.append(_duplicate_close_hint(existing_close, duplicate_close, filenames))
        if isinstance(error, UniquePricesError):
            hints.append(_unique_prices_hint(error.entry, filenames, original_lines))
        if is_invalid_pad_account(error):
            invalid_pad_accounts = True
            # Worded by how the pad arrived: `add balance --pad-from` wrote no
            # pad directive, and the flag is news only to who passed it (w5/395).
            if pad_from and f"'{error.entry.source_account}'" in error.message:
                pad_hint = f"The --pad-from account must be open on the pad date, {error.entry.date}" + (
                    ", even with --allow-errors." if allow_errors else "."
                )
            elif pad_from and (opened_on := _opened_after(error.entry.account, error.entry.date, entries)):
                if pad_date_explicit:
                    # Moving the balance cannot move a pad date the caller
                    # supplied. Change that date too, keeping it before the
                    # assertion (w5/688).
                    pad_hint = (
                        f"The pad date {error.entry.date} is before {error.entry.account} opens ({opened_on}); "
                        f"pass --pad-date {opened_on} or later, with a balance --date later than the pad date."
                    )
                else:
                    # The pad date was derived, the day before the balance;
                    # moving the balance moves both dates (w5/513).
                    pad_hint = (
                        f"{error.entry.account} opens {opened_on}, after the pad date {error.entry.date}: --pad-from "
                        "pads the day before the balance. Date the balance after the open, for example --date "
                        f"{opened_on + datetime.timedelta(days=1)}."
                    )
            elif allow_errors:
                pad_hint = "Pad accounts must be active, even with --allow-errors."
            else:
                pad_hint = f"Pad accounts must be open on the pad date, {error.entry.date}."
            if pad_hint not in pad_hints:
                pad_hints.add(pad_hint)
                hints.append(pad_hint)
        if isinstance(error.entry, Transaction) and "does not balance" in error.message:
            residual = interpolate.compute_residual(error.entry.postings)  # type: ignore[no-untyped-call]
            if len(residual.currencies()) > 1:
                redirect = (
                    _operating_default_balance_hint(error.entry, residual, operating_defaults)
                    if appended and operating_defaults
                    else None
                )
                if redirect is not None:
                    hints.append(redirect)
                else:
                    # Which entries hold each commodity at cost, so "held by an
                    # entry other than this one" is a lookup.
                    if cost_holders is None:
                        cost_holders = {}
                        for prior in entries:
                            for posting in getattr(prior, "postings", []) or []:
                                if posting.cost is not None and posting.units is not None:
                                    cost_holders.setdefault(posting.units.currency, set()).add(id(prior))
                    held_with_cost = {
                        currency for currency, holders in cost_holders.items() if holders != {id(error.entry)}
                    }
                    reducing_held_lot = any(
                        posting.units is not None
                        and posting.units.currency in held_with_cost
                        and posting.cost is None
                        and posting.price is None
                        for posting in error.entry.postings
                    )
                    if reducing_held_lot:
                        hints.append(
                            "For a commodity or stock reduction, attach a cost lot or a market price: "
                            "for example, 'Assets:Broker -1 HOOL {100 USD}' or "
                            "'Assets:Broker -1 HOOL @ 100 USD' against cash."
                        )
                    else:
                        hints.append(
                            "For a currency exchange, use a price annotation with the actual exchange rate: "
                            "for example, '100 EUR @ 1.08 USD' balances against '-108 USD'."
                        )
        if isinstance(error.entry, Document) and "File does not exist" in error.message:
            hints.append(
                f"Relative document paths resolve from {source.parent}, the directory containing {source.name}."
            )
        if unused_open:
            if not appended:
                hints.append(
                    "The account is open but nothing uses it yet, which this ledger's nounused plugin reports."
                    " Add its first transaction."
                )
            elif not allow_errors:
                hints.append(
                    "This ledger's nounused plugin reports an account until something uses it."
                    " Stage the open with --allow-errors, then add the account's first transaction."
                )
            elif not is_new:
                hints.append("Staged: add the account's first transaction to clear this.")
        if "Unused Pad" in message and not (pad_from and appended and pad_invalid):
            # A `--pad-from` pad on a date its account is not open is unused
            # because of that: the hint's "the assertion at line N already
            # holds" cited the proposed append, past the end of the file (w5/513).
            pad_entry = error.entry if isinstance(error.entry, Pad) else None
            # Beancount's "Unused Pad entry" has no full stop; every hint starts with a space.
            message = (
                message.rstrip(".")
                + "."
                + _unused_pad_hint(
                    pad_entry,
                    entries,
                    errors,
                    filenames,
                    appended=appended,
                    staged=not appended or (allow_errors and not is_new),
                )
            )
        elif isinstance(error.entry, Balance) and "Balance failed" in error.message:
            if not allow_errors and closes_by_location is None:
                closes_by_location = {
                    (entry.account, entry.meta.get("filename"), entry.meta.get("lineno")): entry
                    for entry in entries
                    if isinstance(entry, Close)
                }
            closing = (closes_by_location or {}).get(
                (error.entry.account, error.entry.meta.get("filename"), error.entry.meta.get("lineno"))
            )
            if allow_errors:
                hints.append(
                    "Review this assertion and missing transactions before further writes; it still fails validation."
                )
            elif closing is not None:
                # check_drained can inherit a close_tree close's pseudo-file;
                # the assertion still comes from check_drained (w5/666).
                hints.append(_drained_close_hint(error.entry, closing, error.message, options, entries))
            elif origin := _plugin_origin(error.entry, "balance", filenames, original_lines):
                # Nothing at that location is an assertion to edit (w5/222).
                hints.append(
                    f"This assertion is generated by {origin}; it is not a balance written in the ledger. "
                    f"Review the transactions on {error.entry.account} before {error.entry.date}, "
                    "or the ledger line the plugin reads."
                )
            elif (error.entry.date, error.entry.account, error.entry.amount.currency) in conflicting_balances:
                hints.append(
                    f"The {error.entry.date} assertions for {error.entry.account} in "
                    f"{error.entry.amount.currency} disagree. Remove or correct the conflicting assertion; "
                    "an opening adjustment cannot resolve conflicting same-day assertions."
                )
            else:
                hints.extend(
                    _balance_recovery_hints(
                        error.entry,
                        source,
                        snapshot.root if snapshot else file,
                        entries,
                        options,
                        snapshot,
                        source_line_counts,
                        filenames,
                    )
                )
        records.append(_ErrorRecord(getattr(error, "message", str(error)), message, lineno, hints, source))
        locations.append((source, lineno if isinstance(lineno, int) else None))
    messages = _collapse_repeats(records)
    syntax_errors = [err for err in errors if is_syntax_error(err)]
    new_records = [record for record, is_new in zip(records, introduced, strict=True) if is_new]
    if errors and (not allow_errors or syntax_errors or invalid_pad_accounts or new_records):
        if not allow_errors and type_errors and not (syntax_errors or invalid_pad_accounts):
            if before_errors is None:
                root = snapshot.root if snapshot else file
                before_errors = (
                    managed_load.load_file(root, snapshot=snapshot, check_types=True)[1] if root.exists() else []
                )
            if _preexisting_errors(type_errors, before_errors, filenames, original_lines, _own_lifecycle_accounts):
                raise CandidateRejected(
                    f"The ledger already has {len(before_errors)} error(s); nothing was written. "
                    "Pass --allow-errors to tolerate existing errors; new errors are still refused.",
                    details=messages,
                    locations=locations,
                    records=records,
                    preexisting_only=True,
                )
        # An error on an appended line is the write's own; only books whose
        # every error sits elsewhere are worth a load of the version before.
        if not allow_errors and not (any_appended or syntax_errors or invalid_pad_accounts):
            if before_errors is None:
                root = snapshot.root if snapshot else file
                before_errors = (
                    managed_load.load_file(root, snapshot=snapshot, check_types=True)[1] if root.exists() else []
                )
            if len(
                _preexisting_errors(errors, before_errors, filenames, original_lines, _own_lifecycle_accounts)
            ) == len(errors):
                # The write adds nothing wrong; the books were already broken,
                # which is the case --allow-errors exists for. The repair hints
                # for those errors stand; advice on dating a new assertion
                # does not (w5/396).
                plain = [
                    replace(record, hints=[hint for hint in record.hints if hint != _BALANCE_DATE_HINT])
                    for record in records
                ]
                raise CandidateRejected(
                    f"The ledger already has {len(errors)} error(s); nothing was written. "
                    "Pass --allow-errors to write anyway.",
                    details=_collapse_repeats(plain),
                    locations=locations,
                    records=plain,
                    preexisting_only=True,
                )
        if not allow_errors:
            raise CandidateRejected(
                "The change would leave the ledger invalid; nothing was written.",
                details=messages,
                locations=locations,
                records=records,
            )
        # A refused `--allow-errors` write names what forced the refusal —
        # the introduced errors, any syntax failure, any invalid pad — and
        # not the pre-existing errors the flag tolerates.
        blocking = [
            index
            for index, (error, is_new) in enumerate(zip(errors, introduced, strict=True))
            if is_new or is_syntax_error(error) or is_invalid_pad_account(error)
        ]
        if new_records:
            message = f"The change would introduce {len(new_records)} new ledger error(s); nothing was written."
        else:
            message = "The change would leave the ledger invalid; nothing was written."
        # The errors the flag tolerated travel with the refusal, so a `--json`
        # caller still learns the ledger was already broken (w5/461).
        tolerated_records = [record for index, record in enumerate(records) if index not in set(blocking)]
        raise CandidateRejected(
            message,
            details=_collapse_repeats([records[index] for index in blocking]),
            locations=[locations[index] for index in blocking],
            records=[records[index] for index in blocking],
            ledger_errors=_collapse_repeats(tolerated_records),
        )
    messages = [*messages, *_average_inheritance_warnings(entries, options, filenames, original_lines)]
    return messages


def is_syntax_error(error: Any) -> bool:
    """Whether Beancount could not read ledger text, rather than reporting a semantic parser error."""
    from beancount.parser.grammar import ParserSyntaxError
    from beancount.parser.lexer import LexerError

    return isinstance(error, ParserSyntaxError | LexerError)


def preexisting_refusal(errors: list[Any], ledger_errors: list[str]) -> LedgerError:
    """The strict pre-check's refusal of a ledger that already has errors.

    Syntax errors and pads with inactive accounts cannot be tolerated by the
    shared validation, so advising `--allow-errors` for either sends the user
    round in a loop (w5/508, w5/682).
    """
    if any(is_syntax_error(error) for error in errors):
        return LedgerError(
            f"The ledger already has {len(ledger_errors)} error(s), including a syntax error; nothing was written. "
            "Fix the syntax error first: --allow-errors never writes past one.",
            details=ledger_errors,
        )
    pads = sorted(
        {
            (error.entry.date, error.entry.account, error.entry.source_account)
            for error in errors
            if is_invalid_pad_account(error)
        }
    )
    if pads:
        return LedgerError(
            f"The ledger already has {len(ledger_errors)} error(s), including an invalid pad account; "
            "nothing was written. Open missing accounts or correct the pad account/date first: "
            "--allow-errors cannot bypass an inactive pad account.",
            details=[
                *ledger_errors,
                *(
                    f"Pad dated {date}: {account} and {source} must both be active on that date."
                    for date, account, source in pads
                ),
            ],
        )
    return LedgerError(
        f"The ledger already has {len(ledger_errors)} error(s); nothing was written. "
        "Pass --allow-errors to write anyway.",
        details=ledger_errors,
    )


def is_invalid_pad_account(error: Any) -> bool:
    """Whether a pad names an unopened or inactive account, which no write may tolerate."""
    from beancount.core.data import Pad

    return isinstance(getattr(error, "entry", None), Pad) and str(getattr(error, "message", "")).startswith(
        "Invalid reference to "
    )


def is_unused_open(error: Any) -> bool:
    """Whether a loader error is `nounused` reporting an `open` nothing uses yet."""
    from beancount.core.data import Open

    return isinstance(error.entry, Open) and str(getattr(error, "message", "")).startswith("Unused account '")


def _opened_after(account: str, date: Any, entries: list[Any]) -> Any:
    """The date `account` opens, when that is after `date`; otherwise None."""
    from beancount.core.data import Open

    opened = next((entry.date for entry in entries if isinstance(entry, Open) and entry.account == account), None)
    return opened if opened is not None and opened > date else None


def _unused_pad_hint(
    pad: Any,
    entries: list[Any],
    errors: list[Any],
    filenames: dict[Path, Path],
    *,
    appended: bool = True,
    staged: bool = False,
) -> str:
    """Why Beancount found nothing for this pad to fill, as a next step.

    Beancount applies a pad to the first assertion in each currency that
    follows it on the account (or a subaccount), until the next pad there. So
    a pad is unused because nothing follows it, because a later pad took its
    assertions over, or because every assertion it reached already held — and
    only that last case means the book balance already matches. An earlier
    assertion that holds still consumes the pad, leaving a later failing one
    unpadded; claiming "already matches" there contradicted the failure
    printed beside it. `staged` says the pad is already in the books with its
    balance still missing — the warning on a staged pad, or a refusal detail
    while one waits — where the atomic hint would send the user to a
    `--pad-from` the staged pad itself blocks (w5/799).
    """
    from beancount.core.data import Balance, Pad

    atomic = (
        " Add both directives atomically with bea add balance --pad-from ACCOUNT"
        " --date YYYY-MM-DD --amount 'NUMBER CURRENCY' --account ACCOUNT."
    )
    position = next((index for index, entry in enumerate(entries) if entry is pad), None)
    if pad is None or position is None:
        return atomic
    prefix = f"{pad.account}:"
    reached: list[Any] = []
    superseded_by = None
    for entry in entries[position + 1 :]:
        if isinstance(entry, Pad) and entry.account == pad.account:
            superseded_by = entry
            break
        if isinstance(entry, Balance) and (entry.account == pad.account or entry.account.startswith(prefix)):
            reached.append(entry)
    if not reached:
        if superseded_by is not None:
            return (
                f" The later pad at {_location(superseded_by, filenames)} takes over the assertions after it, "
                "leaving this pad nothing to fill; keep one of the two pads."
            )
        if staged:
            return " Staged: add its balance with bea add balance (without --pad-from), or remove the pad."
        return atomic
    # Keyed by source line: the balance check replaces a failing entry with a
    # copy carrying its difference, so identity does not survive.
    failed = {
        (error.entry.meta.get("filename"), error.entry.meta.get("lineno"))
        for error in errors
        if isinstance(error.entry, Balance) and "Balance failed" in getattr(error, "message", "")
    }
    first_by_currency: dict[str, Any] = {}
    for balance in reached:
        first = first_by_currency.setdefault(balance.amount.currency, balance)
        if first is not balance and (balance.meta.get("filename"), balance.meta.get("lineno")) in failed:
            if first.date == balance.date:
                # "Date the pad after" that same day cannot be done: the day
                # already holds an assertion, which is the conflict (w5/487).
                return (
                    f" The {first.date} assertion at {_location(first, filenames)} already asserts this "
                    "account on that day and consumes the pad; two different assertions for one account and "
                    "currency on one day cannot both hold, so remove one of the two."
                )
            return (
                f" A pad fills only the first later assertion in each currency; the {first.date} assertion at "
                f"{_location(first, filenames)} already holds and consumes it, so the {balance.date} assertion "
                f"stays unpadded. Date the pad after {first.date}."
            )
    if not appended:
        # A pad already in the books, orphaned by this write: no option of the
        # command at hand put it there, so `--pad-from` advice does not apply.
        first = reached[0]
        return (
            f" With this change the book balance already matches the {first.date} assertion at "
            f"{_location(first, filenames)}, so this existing pad would have nothing to fill. "
            "Remove that pad first, or leave the balance to it."
        )
    # `add balance --pad-from` drops a pad the matching balance does not need
    # before validating, so only `add pad` gets here; it has no `--pad-from`
    # to omit (w5/299).
    first = reached[0]
    return (
        f" The {first.date} assertion at {_location(first, filenames)} already holds, "
        "so this pad would have nothing to fill; it need not be added."
    )


_MISSING_COMMODITY = re.compile(r"Missing Commodity directive for '([^']+)'")
_ACCUMULATED = re.compile(r"accumulated (?P<amount>-?[\d.,]+ \S+)")


def _subtree_holders(entries: list[Any], account: str, currency: str, date: datetime.date) -> list[tuple[str, Decimal]]:
    """Nonzero per-account holdings in `account`'s subtree when a `date` assertion runs.

    The sibling `book_units` sums the subtree; this names who holds it, so a
    `check_drained` refusal can say the money sits in a subaccount. Same-day
    postings count: a drain dated on the close date clears the assertion.
    """
    from beancount.core.data import Transaction

    prefix = f"{account}:"
    totals: dict[str, Decimal] = {}
    for entry in entries:
        if not (isinstance(entry, Transaction) and entry.date <= date):
            continue
        for posting in entry.postings:
            units = posting.units
            if units is None or units.number is None or units.currency != currency:
                continue
            if posting.account == account or posting.account.startswith(prefix):
                totals[posting.account] = totals.get(posting.account, Decimal(0)) + units.number
    return [(name, total) for name, total in sorted(totals.items()) if total != 0]


def _drained_close_hint(balance: Any, closing: Any, message: str, options: dict[str, Any], entries: list[Any]) -> str:
    """What the account still holds at its close, and how to get it to zero."""
    plugins = [str(name) for name, _ in options.get("plugin") or ()]
    plugin = "check_drained" if any(name.endswith("check_drained") for name in plugins) else "a plugin"
    held = _ACCUMULATED.search(message)
    holding = f"still holds {held.group('amount')}" if held else "is not empty"
    holders = _subtree_holders(entries, balance.account, balance.amount.currency, closing.date)
    subs = [name for name, _ in holders if name != balance.account]
    if subs:
        # Upstream's accumulated amount includes the subtree: telling the
        # user to move it "out of" the parent posts a negative balance to a
        # closed parent while the child keeps the money (w5/771).
        breakdown = ", ".join(f"{name} {total} {balance.amount.currency}" for name, total in holders)
        scope = "its subaccounts" if len(holders) == len(subs) else "the account and its subaccounts"
        drain = f"Drain or close {' and '.join(subs)} first"
        if len(holders) != len(subs):
            drain = f"Drain {balance.account} and drain or close {' and '.join(subs)} first"
        return (
            f"This zero assertion is added by {plugin} for the close of {balance.account} on {closing.date}: "
            f"the balance sits in {scope} ({breakdown}), which balance assertions include. {drain} "
            f"(a drain posts on or before {closing.date}), then close {balance.account}."
        )
    return (
        f"This zero assertion is added by {plugin} for the close of {balance.account} on {closing.date}: the "
        f"account {holding} then. Move that balance out of {balance.account} with a transaction dated on or "
        f"before {closing.date}, then close it."
    )


def _average_booking_suffix(error: Any, options: Any, lifecycles: dict[str, list[Any]]) -> str:
    """The remedy for a reduction Beancount's unimplemented AVERAGE booking refused.

    An account opened with an explicit `AVERAGE` booking is told to change
    it; one inheriting it from `option "booking_method"` is told where it
    comes from, since its open has no booking keyword to edit (w5/764). The
    failing account is the reduction's: the first posting that names a cost
    lot, else the first bare reduction.
    """
    from beancount.core.data import Booking, Open, Transaction

    explicit = (
        '. Beancount cannot reduce a position in an account opened with "AVERAGE" booking;'
        " edit that account's open directive to use FIFO, LIFO, HIFO, STRICT or NONE."
    )
    entry = getattr(error, "entry", None)
    postings = list(entry.postings) if isinstance(entry, Transaction) else []

    def reduces(posting: Any) -> bool:
        # An interpolated leg holds MISSING, not an amount.
        number = getattr(posting.units, "number", None)
        return number is not None and number < 0

    candidates = [posting for posting in postings if reduces(posting) and posting.cost is not None]
    candidates = candidates or [posting for posting in postings if reduces(posting)]
    for posting in candidates:
        opened = next((e for e in lifecycles.get(posting.account, []) if isinstance(e, Open)), None)
        if opened is not None and opened.booking is None and options.get("booking_method") == Booking.AVERAGE:
            return (
                f'. Beancount cannot reduce a position in {posting.account}, which inherits "AVERAGE" '
                'booking from option "booking_method"; add an explicit booking '
                "(FIFO, LIFO, HIFO, STRICT or NONE) to that account's open directive, or change the option."
            )
    return explicit


def _average_inheritance_warnings(
    entries: list[Any], options: Any, filenames: dict[Path, Path], original_lines: dict[Path, list[bytes]]
) -> list[str]:
    """Warn for each staged open that inherits an unusable AVERAGE booking (w5/764).

    An explicit `--booking AVERAGE` is refused up front; an open that merely
    inherits the option's AVERAGE may never hold lots, so it warns instead.
    """
    from beancount.core.data import Booking, Open

    if options.get("booking_method") != Booking.AVERAGE:
        return []
    inherited: list[str] = []
    for entry in entries:
        if (
            isinstance(entry, Open)
            and entry.booking is None
            and _proposed_entry(entry, filenames, original_lines)
            and entry.account not in inherited
        ):
            inherited.append(entry.account)
    return [
        f'{account} inherits booking method AVERAGE from option "booking_method"; Beancount cannot '
        "reduce a position booked that way, so add an explicit booking (FIFO, LIFO, HIFO, STRICT or "
        "NONE) to its open if it will ever hold lots."
        for account in inherited
    ]


def _inactive_bounds(errors: list[Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """First and last failing-entry dates per account named in inactive-account errors."""
    first: dict[str, Any] = {}
    last: dict[str, Any] = {}
    for inactive in errors:
        if "inactive account '" in inactive.message and inactive.entry is not None:
            name = inactive.message.split("inactive account '", 1)[1].split("'", 1)[0]
            first[name] = min(first.get(name, inactive.entry.date), inactive.entry.date)
            last[name] = max(last.get(name, inactive.entry.date), inactive.entry.date)
    return first, last


def _proposed_entry(entry: Any, filenames: dict[Path, Path], original_lines: dict[Path, list[bytes]]) -> bool:
    """Whether the entry points into this write's unpersisted append."""
    path = Path(entry.meta.get("filename", ""))
    original = filenames.get(path, path).resolve()
    line = entry.meta.get("lineno")
    return original in original_lines and isinstance(line, int) and line > len(original_lines[original])


def _plugin_close_hint(
    closed: Any,
    lifecycles: dict[str, list[Any]],
    filenames: dict[Path, Path],
    original_lines: dict[Path, list[bytes]],
) -> tuple[str, str] | None:
    """Describe a generated close and the written ancestor close to correct."""
    from beancount.core.data import Close

    origin = _plugin_origin(closed, "close", filenames, original_lines)
    if origin is None:
        return None
    description = f"closed {closed.date} by {origin}, not by a line in the ledger"
    remedy = "change the ledger lines that plugin reads"
    ancestor = closed.account
    while ":" in ancestor:
        ancestor = ancestor.rsplit(":", 1)[0]
        parent = next(
            (
                entry
                for entry in lifecycles.get(ancestor, [])
                if isinstance(entry, Close)
                and entry.date == closed.date
                and not _proposed_entry(entry, filenames, original_lines)
                and _plugin_origin(entry, "close", filenames, original_lines) is None
            ),
            None,
        )
        if parent is not None:
            description += f"; {parent.account} is closed that day at {_location(parent, filenames)}"
            remedy = f"edit the close of {parent.account}"
            break
    return description, remedy


def _discovered_document(entry: Any) -> str | None:
    """The file behind a `Document` the `documents` option auto-discovered, else None.

    A written `document` directive always carries its own line; a discovered
    file points at the root with line 0 and names the file itself (w5/765).
    """
    from beancount.core.data import Document

    if not isinstance(entry, Document) or (entry.meta or {}).get("lineno") != 0:
        return None
    found = getattr(entry, "filename", None)
    return str(found) if found else None


def _plugin_origin(
    entry: Any, directive_type: str, filenames: dict[Path, Path], original_lines: dict[Path, list[bytes]]
) -> str | None:
    """Name the plugin behind a synthesized entry; None when the ledger declares it.

    A plugin's entry points either at no file (`<beancount.plugins.close_tree>:0`)
    or at a real line that declares something else (`check_drained` stamps its
    balance with the `close` it checks). Neither is a directive to edit. Text
    this write appends is past the original end of file and is never a plugin's.
    """
    from types import SimpleNamespace

    from bea_engine.ledger.reader import entry_generated

    filename = str(entry.meta.get("filename", ""))
    if filename.startswith("<") and filename.endswith(">"):
        return f"plugin {filename[1:-1]}"
    source = filenames.get(Path(filename), Path(filename))
    lines = original_lines.get(source.resolve())
    lineno = entry.meta.get("lineno")
    if lines is None or not isinstance(lineno, int) or not 1 <= lineno <= len(lines):
        return None
    # The staged copy is gone by now; the original still holds the same line.
    written = SimpleNamespace(meta={"filename": str(source), "lineno": lineno}, date=entry.date)
    if not entry_generated(written, directive_type):
        return None
    words = lines[lineno - 1].split()
    kind = words[1].decode() if len(words) > 1 and words[1].isalpha() else "line"
    return f"a plugin reading the {kind} at {source}:{lineno}"


# Beancount's posting check names neither the open nor a remedy, and `bea add
# open` cannot widen an account that is already open (w5/363).
_POSTING_CURRENCY = re.compile(r"Invalid currency (?P<currency>\S+) for account '(?P<account>[^']+)'")


def _currency_widen_hint(
    currency: str, opened: Any, filenames: dict[Path, Path], original_lines: dict[Path, list[bytes]]
) -> str:
    """Where the open that refuses `currency` is, and the two ways past it."""
    allowed = ", ".join(opened.currencies)
    origin = _plugin_origin(opened, "open", filenames, original_lines)
    where = f"by {origin}" if origin else f"at {_location(opened, filenames)}"
    return (
        f"{opened.account} is opened {where} for {allowed} only. To post {currency} there, edit that open to "
        f"'{_open_line(opened, [*opened.currencies, currency])}' (bea add open cannot change an existing open); "
        f"otherwise record this posting in {allowed}, converted at the rate paid."
    )


def _pad_leg_currency_hint(
    entry: Any,
    account: str,
    currency: str,
    opened: Any,
    entries: list[Any],
    filenames: dict[Path, Path],
    original_lines: dict[Path, list[bytes]],
    *,
    pad_from: bool,
) -> str | None:
    """Advice for a pad-synthesized leg in a currency its account does not take.

    A pad leg is generated from the pad, so the generic widen hint's "record
    this posting in ..." never applies: only the pad's source can change
    (w5/799). None unless the failing leg is the pad's source leg; the padded
    account's own leg keeps the generic advice.
    """
    from beancount.core.data import Pad
    from beancount.core.flags import FLAG_PADDING

    if entry.flag != FLAG_PADDING:
        return None
    pad = None
    atomic = False
    if pad_from:
        pad = next(
            (
                candidate
                for candidate in entries
                if isinstance(candidate, Pad) and _proposed_entry(candidate, filenames, original_lines)
            ),
            None,
        )
        if pad is not None and pad.source_account == account:
            atomic = True
        else:
            pad = None
    if pad is None:
        # A pad already in the books: the padding transaction carries its
        # pad's own location.
        meta = entry.meta or {}
        pad = next(
            (
                candidate
                for candidate in entries
                if isinstance(candidate, Pad)
                and (candidate.meta or {}).get("filename") == meta.get("filename")
                and (candidate.meta or {}).get("lineno") == meta.get("lineno")
            ),
            None,
        )
    if pad is None or pad.source_account != account:
        return None
    allowed = ", ".join(opened.currencies)
    origin = _plugin_origin(opened, "open", filenames, original_lines)
    where = f"by {origin}" if origin else f"at {_location(opened, filenames)}"
    edit = _open_line(opened, [*opened.currencies, currency])
    if atomic:
        return (
            f"{account} is opened {where} for {allowed} only, and a pad leg cannot be written in another "
            f"currency. Choose a --pad-from account that allows {currency}, or edit that open to '{edit}'."
        )
    return (
        f"That {currency} leg is synthesized from the pad at {_location(pad, filenames)}, whose source {account} "
        f"is opened {where} for {allowed} only. Remove that pad and pad from an account that allows {currency}, "
        f"or edit that open to '{edit}'."
    )


def _open_line(opened: Any, currencies: list[str]) -> str:
    """`opened` as one line with `currencies`, keeping its booking method.

    Without it the suggested edit turned `"FIFO"` lot matching back into the
    default one (w5/488). Metadata stays where it is, below the line.
    """
    booking = getattr(opened.booking, "value", opened.booking)
    return f"{opened.date} open {opened.account} {','.join(currencies)}" + (f' "{booking}"' if booking else "")


def _unique_prices_hint(prices: list[Any], filenames: dict[Path, Path], original_lines: dict[Path, list[bytes]]) -> str:
    """Explain conflicting explicit and transaction-implied quotes (w5/665)."""
    from bea_engine.managed_price_cache import managed_source_for_path

    quotes = []
    for price in prices:
        path = Path(price.meta.get("filename", ""))
        source = filenames.get(path, path)
        line = price.meta.get("lineno")
        lines = original_lines.get(source.resolve())
        proposed = isinstance(line, int) and lines is not None and line > len(lines)
        if price.meta.get("__implicit_prices__"):
            origin = (
                "implied by the proposed transaction (not written)"
                if proposed
                else (f"implied by the transaction at {_location(price, filenames)}")
            )
        elif proposed:
            origin = "proposed price (not written)"
        elif feed := managed_source_for_path(source):
            origin = f"managed price from {feed}"
        elif plugin := _plugin_origin(price, "price", filenames, original_lines):
            origin = f"generated by {plugin}"
        elif lines is None:
            origin = f"existing quote at {_location(price, filenames)}"
        else:
            origin = f"written price at {_location(price, filenames)}"
        quotes.append(f"{price.amount.number:f} {price.amount.currency} per {price.currency} on {price.date}, {origin}")
    return (
        "The unique_prices plugin permits one rate per date and currency pair. Conflicting quotes: "
        + "; ".join(quotes)
        + ". Review these rates and the plugin's one-price-per-day policy; --force cannot bypass this validation."
    )


def _within_original(entry: Any, filenames: dict[Path, Path], original_line_counts: dict[Path, int]) -> bool:
    """Whether the entry sits within the ledger's original bytes, so the user can edit it."""
    path = Path(entry.meta.get("filename", ""))
    original = filenames.get(path, path).resolve()
    line = entry.meta.get("lineno")
    return isinstance(line, int) and 1 <= line <= original_line_counts.get(original, 0)


def _duplicate_open_hint(existing: Any, duplicate: Any, filenames: dict[Path, Path], closed: Any | None = None) -> str:
    """One remedy for a second `open`: the account opens once, so edit the first (w5/488)."""
    where = _location(existing, filenames)
    # A second open on a closed account fails twice over: the widen advice
    # alone would leave the account closed (w5/773).
    shut = (
        f" It is closed {closed.date} at {_location(closed, filenames)}; remove that close or date it later."
        if closed is not None
        else ""
    )
    if not existing.currencies:
        return f"{existing.account} is already opened at {where} for any currency; an account opens once.{shut}"
    added = [currency for currency in duplicate.currencies or [] if currency not in existing.currencies]
    if not added:
        return f"{existing.account} is already opened at {where}; an account opens once.{shut}"
    return (
        f"{existing.account} is already opened at {where} for {', '.join(existing.currencies)}; an account opens "
        f"once. To allow {', '.join(added)} too, edit that open to "
        f"'{_open_line(existing, [*existing.currencies, *added])}' (bea add open cannot change an existing open)."
        f"{shut}"
    )


def _duplicate_close_hint(existing: Any, duplicate: Any, filenames: dict[Path, Path]) -> str:
    """One remedy for a second `close`: the account closes once, so edit the first (w5/773)."""
    where = _location(existing, filenames)
    return (
        f"The proposed close would close {existing.account} on {duplicate.date}, but it is already closed "
        f"{existing.date} at {where}; an account closes once \u2014 edit that close's date."
    )


def _operating_default_balance_hint(
    entry: Any, residual: Any, operating_defaults: dict[int, list[str] | None] | None
) -> str | None:
    """Redirect a balance failure caused by an operating-currency default (w5/804).

    `Expenses:Food 10` beside `-10 EUR` reads as `10 USD`, and the stock hint
    advises a currency exchange the user never made. When exactly one posting
    was defaulted, every leg is plain, and rewriting it in the residual's
    other currency zeroes the residual — the account must allow it — the fix
    is spelling that currency out. None otherwise — the existing hints stand.
    """
    from beancount.core.number import MISSING

    if not operating_defaults or len(operating_defaults) != 1:
        return None
    ((number, allowed),) = operating_defaults.items()
    if number < 1 or number > len(entry.postings):
        return None
    if not all(posting.cost is None and posting.price is None for posting in entry.postings):
        return None
    leg = entry.postings[number - 1]
    if leg.units is None or leg.units.number is MISSING:
        return None
    others = set(residual.currencies()) - {leg.units.currency}
    if len(others) != 1:
        return None
    (suggest,) = others
    if allowed is not None and suggest not in allowed:
        return None
    have = residual.get_currency_units(leg.units.currency)
    want = residual.get_currency_units(suggest)
    if have is None or want is None or have.number != leg.units.number or want.number != -leg.units.number:
        return None
    bare = f"{leg.account} {format(leg.units.number, 'f')}"
    read = f"{format(leg.units.number, 'f')} {leg.units.currency}"
    return (
        f"{bare} was read as {read} (the operating currency). If that posting "
        f"was meant in {suggest}, write '{bare} {suggest}' instead."
    )


def _interpolated_leg_hint(
    entry: Any,
    account: str,
    currency: str,
    opened: Any,
    *,
    operating_defaults: dict[int, list[str] | None] | None = None,
) -> str | None:
    """Advice for a leg Beancount filled in, in a currency its account does not take.

    A card charged for a meal priced in EUR is the usual case: the card leg had
    no amount, so the EUR came from the other legs, and widening the card's
    open is the wrong fix. The right one is a price on the leg the user wrote
    (w5/488). When the fill came from a leg whose own currency is an operating
    default, naming that guess beats pricing advice (w5/804).
    """
    from beancount.core.convert import get_weight
    from beancount.utils.misc_utils import escape_string

    legs = [p for p in entry.postings if p.account == account and p.units is not None and p.units.currency == currency]
    if not legs or not all((p.meta or {}).get("__automatic__") for p in legs):
        return None
    if len(opened.currencies) == 1 and operating_defaults:
        carriers = [
            (number, posting)
            for number, posting in enumerate(entry.postings, start=1)
            if all(posting is not own for own in legs)
            and posting.units is not None
            and posting.units.currency == currency
            and isinstance(posting.units.number, Decimal)
        ]
        if len(carriers) == 1 and carriers[0][0] in operating_defaults:
            number, source = carriers[0]
            allowed = operating_defaults[number]
            target = opened.currencies[0]
            if source.cost is None and source.price is None and (allowed is None or target in allowed):
                bare = f"{source.account} {format(source.units.number, 'f')}"
                read = f"{format(source.units.number, 'f')} {currency}"
                return (
                    f"{account} was given no amount, so Beancount filled in {currency} from the other legs. "
                    f"That {currency} came from '{bare}', read as {read} "
                    f"(the operating currency). If that posting was meant in {target}, "
                    f"write '{bare} {target}' instead."
                )
    target = opened.currencies[0] if len(opened.currencies) == 1 else "CURRENCY"
    prefix = (
        f"{account} was given no amount, so Beancount filled in {currency} from the other legs. If it was charged "
        f"in {target}, "
    )
    remedies = []
    for posting in entry.postings:
        if (
            (posting.meta or {}).get("__automatic__")
            or posting.units is None
            or not isinstance(posting.units.number, Decimal)
        ):
            continue
        weight = get_weight(posting)  # type: ignore[no-untyped-call]
        if weight.currency != currency:
            continue
        leg = f"{posting.account} {format(posting.units.number, 'f')} {posting.units.currency}"
        if posting.cost is not None:
            keep_lot = (
                f"keep the recorded {posting.cost.currency} cost of an existing {posting.account} lot "
                f"and use explicit settlement and FX postings for the {target} cash movement"
            )
            if posting.units.number < 0:
                remedies.append(keep_lot)
                continue
            details = [f"COST {target}"]
            if posting.cost.date:
                details.append(posting.cost.date.isoformat())
            if posting.cost.label:
                label = escape_string(posting.cost.label)  # type: ignore[no-untyped-call]
                details.append(f'"{label}"')
            example = shlex.quote(f"{leg} {{{', '.join(details)}}}")
            remedies.append(
                f"for a new lot, record the cost in {target} at the actual per-unit cost: {example}; {keep_lot}"
            )
        else:
            example = shlex.quote(f"{leg} @ RATE {target}")
            remedies.append(f"price the {posting.units.currency} leg at the rate paid: {example}")
    return prefix + ("; ".join(remedies) + "." if remedies else f"review the other legs' prices and costs in {target}.")


def _lifecycles(entries: list[Any], sources: Iterable[Path] = ()) -> dict[str, list[Any]]:
    """Account lifecycles, retaining written parent closes close_tree removes."""
    from beancount.core.data import Close, Open

    from bea_engine.ledger.reader import _spelled_entries

    lifecycles: dict[str, list[Any]] = {}
    generated_close = False
    for entry in entries:
        if isinstance(entry, Open | Close):
            lifecycles.setdefault(entry.account, []).append(entry)
            generated_close |= isinstance(entry, Close) and str(entry.meta.get("filename", "")).startswith("<")
    if generated_close:
        # close_tree drops a parent's close when the parent itself was never
        # opened. Recover that real remedy from the plugin-free source parse,
        # once for the whole load rather than once per error/import row.
        for source in sources:
            for entry in _spelled_entries(str(source)).values():
                if isinstance(entry, Close):
                    entry = entry._replace(account=unicodedata.normalize("NFC", entry.account))
                    group = lifecycles.setdefault(entry.account, [])
                    if not any(isinstance(other, Close) and other.date == entry.date for other in group):
                        group.append(entry._replace(meta={**entry.meta, "filename": str(source)}))
    return lifecycles


def _location(entry: Any, filenames: dict[Path, Path]) -> str:
    """An entry's `file:line`, naming the real file rather than its staged copy."""
    filename = str(entry.meta.get("filename", ""))
    for staged, original in filenames.items():
        filename = filename.replace(str(staged), str(original))
    return f"{filename}:{entry.meta.get('lineno')}"


def _error_key(error: Any, filenames: dict[Path, Path]) -> tuple[str, int | None, str]:
    """Identity of one loader error across the before/after loads of a write.

    The raw message, not the augmented display text: hints like close account
    matches depend on the entry set, which is what the write changes. Staged
    paths map back to the files they stand in for so both loads key alike.

    Balance failures key by assertion rather than by amount: an append to the
    asserted account moves the accumulated total, so the same still-failing
    assertion would otherwise read as a new error and block every import into
    a book mid-reconciliation. The warning text still shows the new amounts.
    """
    from beancount.core.data import Balance

    metadata = error.source or {}
    source = Path(metadata.get("filename", ""))
    try:
        name = str(filenames.get(source, source).resolve())
    except OSError:
        name = str(filenames.get(source, source))
    entry = getattr(error, "entry", None)
    if isinstance(entry, Balance) and str(getattr(error, "message", "")).startswith("Balance failed"):
        message = f"Balance failed for {entry.account} on {entry.date}"
    else:
        message = getattr(error, "message", str(error))
        # Some messages embed a path (a posting's repr with its `meta`, a
        # duplicate include); the after-load reads staged copies, so map those
        # back too or every such pre-existing error reads as new.
        for staged, original in filenames.items():
            message = message.replace(str(staged), str(original))
    return (name, metadata.get("lineno"), message)


def _preexisting_errors(
    after: list[Any],
    before: list[Any],
    filenames: dict[Path, Path],
    original_lines: dict[Path, list[bytes]],
    own_accounts: Callable[[], set[str]] | None = None,
) -> set[int]:
    """Positions in `after` of the errors the ledger already had in `before`.

    Multiset consumption: each after-error spends one matching before-error,
    so duplicates are only tolerated while they last.

    An identical key matches first. What is left is matched by anchor — the
    same kind of error on the same pre-existing directive. Some messages
    describe the books around the entry rather than the entry (a booking
    failure lists the account's lots, an unbalanced sale its residual), so a
    backdated append rewords an error it did not cause, and keyed on the
    message alone that error read as new and a ledger with one failing sale
    could never be backfilled a purchase at a time (w5/150). An append never
    alters an existing line, so the same kind of error on the same directive
    is the same entry still failing. Errors on appended lines or without a
    line have no such anchor; they match what is still left by the looser
    identity of an account-level plugin error the append moved (w5/153).
    """

    def anchor(error: Any, key: tuple[str, int | None, str]) -> tuple[str, int, str] | None:
        name, lineno = key[0], key[1]
        lines = original_lines.get(Path(name), [])
        if not isinstance(lineno, int) or not 1 <= lineno <= len(lines):
            return None
        # Upstream reports some failures at a posting and others at the
        # transaction, so anchor both to the directive's first line.
        while lineno > 1 and lines[lineno - 1][:1] in (b" ", b"\t"):
            lineno -= 1
        return (name, lineno, _error_kind(error))

    remaining: dict[tuple[str, int | None, str], list[tuple[tuple[str, int, str] | None, tuple[str, str]]]] = {}
    for error in before:
        key = _error_key(error, {})
        remaining.setdefault(key, []).append((anchor(error, key), _moved_error_key(error)))
    matched: set[int] = set()
    unmatched: list[tuple[int, tuple[str, int, str]]] = []
    unanchored: list[tuple[int, tuple[str, str]]] = []
    own: set[str] | None = None
    for index, error in enumerate(after):
        message = getattr(error, "message", "")
        if own_accounts is not None and "inactive account '" in message:
            if own is None:
                own = own_accounts()
            named = message.split("inactive account '", 1)[1].split("'", 1)[0]
            if named in own:
                # The write opens or closes this account, so the failure is
                # its own dating, not a pre-existing error reworded (w5/772).
                continue
        key = _error_key(error, filenames)
        if remaining.get(key):
            remaining[key].pop()
            matched.add(index)
        elif (anchored := anchor(error, key)) is not None:
            unmatched.append((index, anchored))
        else:
            unanchored.append((index, _moved_error_key(error)))
    left = [pair for pairs in remaining.values() for pair in pairs]
    anchors = Counter(anchored for anchored, _ in left if anchored is not None)
    for index, anchored in unmatched:
        if anchors[anchored] > 0:
            anchors[anchored] -= 1
            matched.add(index)
    # Only a before-error no anchored after-error spent can have moved.
    moved: Counter[tuple[str, str]] = Counter()
    for anchored, moved_key in left:
        if anchored is None:
            moved[moved_key] += 1
        elif anchors[anchored] > 0:
            anchors[anchored] -= 1
            moved[moved_key] += 1
    for index, moved_key in unanchored:
        if moved[moved_key] > 0:
            moved[moved_key] -= 1
            matched.add(index)
    return matched


def _error_kind(error: Any) -> str:
    """The error's class, with every booking failure counted as one kind.

    Booking reports one entry's failure under several classes depending on
    what the account holds: a sale with no lots at all is an interpolation
    error ("Too many missing numbers") and the same sale with too few is a
    reduction error ("Not enough lots").
    """
    kind = type(error)
    # A plugin may fix an old tags violation but introduce a links violation
    # on that same entry. Sharing ValidationError and a line is not enough
    # to tolerate a different data-type failure (w5/661).
    message = str(getattr(error, "message", ""))
    if message.startswith("Invalid data types:"):
        return f"{kind.__name__}: {message}"
    return "booking" if kind.__module__.startswith("beancount.parser.booking") else kind.__name__


def _unanchored(error: Any) -> bool:
    """Whether a plugin reported this error against no ledger line at all (`<check_commodity>:0`)."""
    lineno = (error.source or {}).get("lineno")
    return not isinstance(lineno, int) or lineno <= 0


def _moved_error_key(error: Any) -> tuple[str, str]:
    """Identity of an account-level plugin error whose anchor an append moves.

    `onecommodity` reports an account's violation at the account's latest
    posting, so a later-dated transaction becomes the source of an error the
    books already had; it matches on class and message wherever it now sits,
    its words sorted because the plugin joins a set of currencies in arbitrary
    order. `check_commodity` reports against no line and names whichever
    account sorts first, so the message moves too: its missing currency stays
    the same even when the account changes. The before-count still caps how
    many such errors a write may leave.
    """
    kind = type(error).__name__
    if str(getattr(error, "message", "")).startswith("Invalid data types:"):
        kind = _error_kind(error)
    if _unanchored(error):
        source = str((error.source or {}).get("filename", ""))
        if missing := _MISSING_COMMODITY.search(str(getattr(error, "message", ""))):
            return (kind, f"{source}: {missing.group(1)}")
        if not source:
            # With no source at all, the message is the only distinction
            # between this old failure and an unrelated new one (w5/667).
            return (kind, str(getattr(error, "message", error)))
        return (kind, source)
    return (kind, " ".join(sorted(re.split(r"[\s,]+", getattr(error, "message", str(error))))))


def _destination_indent(lines: list[str], postings: set[int]) -> str:
    """Posting indentation observed in the existing entries; two spaces when there are none.

    Only the posting lines vote. Posting metadata is nested at twice the
    indent, so counting every indented line let two metadata lines outvote the
    postings they sit under and doubled the indent of the next entry (w5/231).
    A tab is not a style to follow: `bea format` rewrites it as two spaces.

    Amount columns are not measured here: `appended_content` hands the whole
    draft to bean-format's aligner and keeps its rendering of the new lines.
    """
    indents: Counter[str] = Counter()
    for index in sorted(postings):
        indent = lines[index][: len(lines[index]) - len(lines[index].lstrip(" \t"))]
        if "\t" not in indent:
            indents[indent] += 1
    return indents.most_common(1)[0][0] if indents else "  "


def _lines(text: str) -> list[str]:
    """Lines as the lexer counts them: split on `\n` alone, any `\r` folded in first.

    `str.splitlines` also breaks on U+2028, U+2029 and friends, which inside
    a string turned one written line into two (w1/136).
    """
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return lines[:-1] if lines[-1] == "" else lines


def _indent_width(line: str) -> int:
    """Columns of leading whitespace, a tab counting as a tab stop."""
    return len(line.expandtabs()) - len(line.expandtabs().lstrip())


def _indent_block(texts: list[str], indent: str) -> list[str]:
    """Re-indent appended entries to the destination's style without touching it.

    Posting lines keep a two-space gap before their amount; `appended_content`
    aligns the amounts afterwards with the code `bea format` runs. A line that
    continues a multi-line string is string content and stays verbatim. A line
    indented deeper than the entry's shallowest indented line — posting
    metadata, which the printer nests under its posting — keeps that nesting
    at twice the destination indent, so it still reads as the posting's.
    """
    from bea_engine.ledger.formatting import string_continuation_lines

    rendered = []
    for text in texts:
        block = text.rstrip()
        verbatim = string_continuation_lines(block)
        source = _lines(block)
        depths = [
            _indent_width(line)
            for index, line in enumerate(source)
            if index > 0 and index not in verbatim and line.strip() and line[0].isspace()
        ]
        base = min(depths, default=0)
        lines = []
        for index, line in enumerate(source):
            match = None if index == 0 else re.match(r"^\s*(\S+)(  +)(\S.*)$", line)
            if index in verbatim:
                lines.append(line)
            elif match and ":" in match.group(1) and not match.group(1).endswith(":"):
                lines.append(f"{indent}{match.group(1)}  {match.group(3)}")
            elif index == 0 or not line.strip() or not line[0].isspace():
                # A continuation at column zero is content (a wrapped note
                # comment), not structure: only re-indent indented lines.
                lines.append(line)
            else:
                nested = indent * 2 if _indent_width(line) > base else indent
                lines.append(f"{nested}{line.strip()}")
        rendered.append("\n".join(lines))
    return rendered


def appended_spans(original: bytes, texts: list[str]) -> list[tuple[int, int]]:
    """The first and last line, 1-based, each of `texts` occupies in `appended_content(original, texts)`.

    Each entry follows a blank line, and the aligner keeps the line count.
    """
    line = len(_lines(original.decode("utf-8", errors="replace")))
    spans = []
    for text in texts:
        count = len(_lines(text.rstrip())) or 1
        spans.append((line + 2, line + 1 + count))
        line += 1 + count
    return spans


def appended_content(original: bytes, texts: list[str]) -> str:
    """The destination with `texts` appended, the new lines aligned as `bea format` would leave them.

    Existing bytes stay verbatim. The whole draft goes through bean-format's
    aligner and only its rendering of the appended lines is kept, so a
    formatted file is still formatted after an append, and `bea format` can
    never touch a line written here: when a new line is wider than any before
    it, the older lines are what a later format realigns.

    New lines use the file's dominant ending, so a CRLF ledger stays CRLF
    throughout instead of mixing; a missing final newline is repaired as part
    of the same write rather than gluing the first appended line to the last
    existing one.
    """
    if not texts:
        return original.decode("utf-8")
    text = original.decode("utf-8")
    if text == "\ufeff":
        # A file holding only a byte-order mark is empty: the mark read as an
        # unterminated line, and its first entry got two leading newlines (w5/843).
        return text + appended_content(b"", texts)
    ending = _dominant_ending(original)
    from bea_engine.ledger.formatting import align_protected, posting_lines

    # The lexer and the aligner both read universal newlines.
    existing = text.replace("\r\n", "\n").replace("\r", "\n")
    postings = posting_lines(existing)
    indent = _destination_indent(existing.split("\n"), postings)
    blocks = _indent_block(texts, indent)
    # Terminate the last line first: otherwise the separator's newline only
    # ends it, and the first entry lands with no blank line before it (w1/100).
    # A lone EOF carriage return is content, not a completed newline.
    terminated = text if not text or text.endswith("\n") else text + "\n"
    draft = terminated + "".join("\n" + block + "\n" for block in blocks)
    kept = len(_lines(text))
    tail = _lines(draft)[kept:]
    try:
        # The aligner emits one line per input line, so the appended lines are
        # the tail of its output. Line endings are normalised first because its
        # own whitespace-only safety check cannot account for a carriage return,
        # and string content is kept out of its reach (w1/136). Existing
        # postings are aligned from the indent `bea format` would give them:
        # upstream settles on the most frequent indent length, and a tab is
        # one character, so tab-indented entries pulled the new one to a
        # single space.
        aligning = draft.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        for index in postings:
            aligning[index] = indent + aligning[index].lstrip(" \t")
        aligned = align_protected("\n".join(aligning))
        tail = _lines(aligned)[kept:]
    except AssertionError:
        pass  # The aligner refused the text; alignment is cosmetic, the append is not.
    head = text if text.endswith("\n") or not text else text + ending
    return head + ending.join(tail) + ending


def appended_lines(original: bytes, texts: list[str]) -> str:
    """Only the lines `appended_content` adds, LF-terminated: what a write preview shows.

    The aligner rewrites indentation and spacing, so text a caller proposed is
    not the text that lands; a confirmation built from the proposal showed tab
    indentation as `\\x09` and then wrote aligned spaces (w5/374).
    """
    head = original.decode("utf-8")
    added = appended_content(original, texts)[len(head) :]
    return added.replace("\r\n", "\n").strip("\n") + "\n"


def _dominant_ending(content: bytes) -> str:
    """The line ending new lines should use: CRLF only when CRLF lines win.

    A tie or no newlines at all answers LF, the default for new ledgers; a
    mixed file keeps its existing bytes verbatim either way — only the
    appended lines follow the dominant ending.
    """
    crlf = content.count(b"\r\n")
    return "\r\n" if crlf > content.count(b"\n") - crlf else "\n"


def decoded_append(target: Path, original: bytes, texts: list[str]) -> str:
    """The append candidate, or a decode failure naming path, offset, and encoding.

    A ledger that is not UTF-8 cannot take an append, and the raw codec error
    names none of what the caller needs to fix it: the import preview died
    with a bare `UnicodeDecodeError` (w5/441). The ledger itself is left
    untouched either way: this runs before any candidate is written.
    """
    from bea_engine.ledger.text import decode_error_message

    try:
        return appended_content(original, texts)
    except UnicodeDecodeError as exc:
        raise LedgerError(decode_error_message(target, exc)) from exc


def _appended_or_report(target: Path, original: bytes, texts: list[str]) -> str:
    """The append candidate, refusing invalid UTF-8, original lexer errors or an open push."""
    content = decoded_append(target, original, texts)
    _refuse_unsafe_append_context(target, original)
    return content


def new_include_seed(snapshot: LedgerSnapshot, target: Path) -> bytes:
    """The root's `name_*` option lines, for an include this write is about to create; else nothing.

    Beancount applies these options per file while parsing, so a new glob
    member started without them read the default roots, and every entry naming
    a renamed root was refused as an invalid account (w5/462).
    """
    if snapshot.stats.get(target.resolve(), os.stat_result((0,) * 10)) is not None:
        return b""
    text = snapshot.contents.get(snapshot.root, b"").decode("utf-8", errors="replace")
    lines = (f'option "{key}" "{name}"' for key, name in root_name_options(text).items())
    return "".join(f"{line}\n" for line in lines).encode()


def open_pushes(text: str, *, builder: LexBuilder | None = None) -> list[tuple[int, str]]:
    """The `pushtag`/`pushmeta` directives still open at the end of `text`, as (line, directive)."""
    from beancount.parser import lexer

    open_: dict[tuple[str, str], list[int]] = {}
    pending: str | None = None
    text = unicodedata.normalize("NFC", text.removeprefix("\ufeff"))
    for kind, line, _, value in lexer.lex_iter_string(text, builder=builder):  # type: ignore[no-untyped-call]
        if pending is not None and kind in {"TAG", "KEY"}:
            key = ("tag" if kind == "TAG" else "meta", str(value))
            if pending.startswith("PUSH"):
                open_.setdefault(key, []).append(line)
            elif open_.get(key):
                open_[key].pop()
        pending = kind if kind in {"PUSHTAG", "POPTAG", "PUSHMETA", "POPMETA"} else None
    return sorted(
        (line, f"pushtag #{name}" if kind == "tag" else f"pushmeta {name}:")
        for (kind, name), lines in open_.items()
        for line in lines
    )


def _refuse_unsafe_append_context(target: Path, original: bytes) -> None:
    """Refuse original lexer errors or a `pushtag`/`pushmeta` the file never closes.

    An appended quote can close an original unterminated string, shifting its
    lexer error into the proposed entry (w5/711). An open push silently gives
    the entry tags or metadata nobody asked for (w5/464). Neither is safe even
    under `--allow-errors`; scan the original without parsing or loading it.
    """
    from beancount.parser import lexer

    builder = lexer.LexBuilder()
    pushes = open_pushes(original.decode("utf-8"), builder=builder)
    if builder.errors:
        details = [f"{target}:{error.source.get('lineno', 0)}: {error.message}" for error in builder.errors]
        raise preexisting_refusal(builder.errors, details)
    if not pushes:
        return
    named = ", ".join(f"`{directive}` at line {line}" for line, directive in pushes)
    raise UsageError(
        f"{target} ends inside {named}, so an entry appended there would silently inherit it. "
        "Nothing was written. Close it first (`poptag #tag` or `popmeta key:`), or write to another file."
    )


#: Lexer kinds of the lines that configure a ledger rather than record into it.
CONFIG_TOKENS = frozenset({"INCLUDE", "PLUGIN", "OPTION", "PUSHTAG", "POPTAG", "PUSHMETA", "POPMETA"})


def require_one_entry_each(texts: list[str]) -> None:
    """Refuse a rendered directive that reads back as anything but one directive.

    Every writer renders one requested directive per text. A field that slipped
    a line break or a second token past its own validation would print as
    extra directives — or an option, include or plugin — that a whole-ledger
    check happily accepts, since the injected text is itself valid. Reading
    each text back on its own is the last line of defence: it costs one parse
    per directive and never consults the ledger.
    """
    for number, text in enumerate(texts, start=1):
        problem = one_entry_problem(text)
        if problem is not None:
            raise UsageError(f"Directive {number} of {len(texts)} {problem} Nothing was written.")


def one_entry_problem(text: str) -> str | None:
    """Why a rendered directive would not read back as exactly one, or None when it would.

    A predicate phrase, for a caller that can name the directive itself: bulk
    rows ask per row, so one unreadable row is rejected as that row instead of
    refusing the batch with a usage error no `--partial` can recover (w5/184).
    """
    from beancount.parser import lexer, parser

    from bea_engine.ledger.text import without_root_name_errors

    entries, errors, _ = parser.parse_string(text)
    kinds = {kind for kind, *_ in lexer.lex_iter_string(text)}  # type: ignore[no-untyped-call]
    if len(entries) == 1 and not kinds & CONFIG_TOKENS:
        return None
    # The parser's own reason names the offending token; a renamed root is
    # never it, since that leaves the directive intact.
    reasons = [error.message for error in without_root_name_errors(errors)]
    return (
        f"would be written as {len(entries)} directive(s)"
        f"{' plus ledger configuration' if kinds & CONFIG_TOKENS else ''}; a field holds a line break "
        f"or a value that is not one token{f' (Beancount: {reasons[0]})' if reasons else ''}."
    )


def validate_append(
    file: Path,
    texts: list[str],
    *,
    allow_errors: bool = False,
    into: Path | None = None,
    snapshot: LedgerSnapshot | None = None,
    one_entry_each: bool = True,
    stages_pad: bool = False,
    inspect: Callable[[list[Any]], None] | None = None,
) -> list[str]:
    """Validate the append without writing; returns the errors `allow_errors` tolerated.

    Each text is one requested directive unless `one_entry_each` is off, which
    only raw directive text (`bea-engine append`) does: it counts its own.
    `stages_pad` is the staged-pad carve-out, and only `add pad` passes it: a
    pad-only batch from anywhere else — an import, a raw append — introduced
    its unused pad like any other error (w5/798).
    """
    if one_entry_each:
        require_one_entry_each(texts)
    snapshot = snapshot or LedgerSnapshot.capture(file)
    target = destination(file, into)
    original = snapshot.require_target(target, into=into)
    seeded = new_include_seed(snapshot, target) + original
    with candidate_file(target, _appended_or_report(target, seeded, texts)) as candidate:
        warnings = validate_candidate(
            candidate,
            target,
            allow_errors=allow_errors,
            snapshot=snapshot,
            stages_pad=stages_pad,
            stages_open=_only_opens(texts),
            inspect=inspect,
        )
    snapshot.verify()
    return warnings + respelled_account_notes(texts, snapshot)


_OPEN_TEXT = re.compile(r"\s*\d{4}[-/]\d+[-/]\d+\s*open\b")


def _only_opens(texts: list[str]) -> bool:
    """Whether a request appends opens and nothing else — an account staged ahead of its first use."""
    return bool(texts) and all(_OPEN_TEXT.match(text) for text in texts)


def require_writable(file: Path) -> None:
    """Respect file permissions even though rename only needs directory access."""
    if not file.stat().st_mode & (stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH) or not os.access(file, os.W_OK):
        raise AuthError(
            f"Ledger file is read-only or not writable: {file}. "
            "Change its permissions explicitly before retrying; nothing was written."
        )


#: User file flags a replacement carries over (`nodump`, `hidden`, `opaque`).
#: `uchg`/`uappnd` would make the staged copy itself impossible to rename, and
#: a ledger carrying them cannot be replaced anyway; system flags need root.
_KEPT_FILE_FLAGS = 0x00000001 | 0x00000008 | 0x00008000

#: copyfile(3) flags: COPYFILE_ACL | COPYFILE_XATTR.
_COPYFILE_ACL_XATTR = (1 << 0) | (1 << 2)


def keep_file_metadata(file: Path, candidate: Path, original_stat: os.stat_result) -> None:
    """Give the staged replacement everything about `file` but its bytes and times.

    A rename installs a new inode, so whatever the old one carried beyond
    its mode — its group, ACL entries, extended attributes, file flags — was
    silently dropped (w1/099): group members lost access and a deny ACL
    disappeared. The group is required, so a group this user cannot assign
    refuses the write (exit 3) rather than changing who may read the ledger.
    """
    if hasattr(os, "chown") and candidate.stat().st_gid != original_stat.st_gid:
        try:
            os.chown(candidate, -1, original_stat.st_gid)
        except PermissionError as exc:
            raise AuthError(
                f"Cannot keep {file}'s group (gid {original_stat.st_gid}) on the rewritten file: this user "
                "may not assign it. Nothing was written; write as a member of that group or change the "
                "file's group explicitly."
            ) from exc
    # After chown, which may clear setgid.
    candidate.chmod(stat.S_IMODE(original_stat.st_mode))
    if sys.platform == "darwin":
        _copy_acl_and_xattrs_darwin(file, candidate)
    elif sys.platform == "linux":
        _copy_xattrs_linux(file, candidate)
    flags = getattr(original_stat, "st_flags", 0) & _KEPT_FILE_FLAGS
    if flags and hasattr(os, "chflags"):
        try:
            os.chflags(candidate, getattr(os.stat(candidate), "st_flags", 0) | flags)
        except OSError as exc:
            raise AuthError(f"Cannot keep {file}'s file flags on the rewritten file; nothing was written.") from exc


def _copy_acl_and_xattrs_darwin(file: Path, candidate: Path) -> None:
    import ctypes

    libc = ctypes.CDLL("libc.dylib", use_errno=True)
    copyfile = libc.copyfile
    copyfile.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_void_p, ctypes.c_uint32]
    copyfile.restype = ctypes.c_int
    if copyfile(os.fsencode(file), os.fsencode(candidate), None, _COPYFILE_ACL_XATTR) < 0:
        number = ctypes.get_errno()
        raise AuthError(
            f"Cannot keep {file}'s ACL and extended attributes on the rewritten file "
            f"({os.strerror(number)}); nothing was written."
        )


def _clear_acl_darwin(candidate: Path) -> None:
    """Best effort: an ACL that stays simply leaves the unlink refused as before."""
    import ctypes

    libc = ctypes.CDLL("libc.dylib", use_errno=True)
    libc.acl_init.argtypes = [ctypes.c_int]
    libc.acl_init.restype = ctypes.c_void_p
    libc.acl_set_file.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_void_p]
    libc.acl_set_file.restype = ctypes.c_int
    libc.acl_free.argtypes = [ctypes.c_void_p]
    libc.acl_free.restype = ctypes.c_int
    empty = libc.acl_init(0)
    if empty:
        # ACL_TYPE_EXTENDED, the only type macOS has.
        libc.acl_set_file(os.fsencode(candidate), 0x00000100, empty)
        libc.acl_free(empty)


def _copy_xattrs_linux(file: Path, candidate: Path) -> None:
    """User attributes and POSIX ACLs, which Linux stores as `system.posix_acl_*` attributes."""
    import errno

    if sys.platform != "linux":
        return

    try:
        names = os.listxattr(file)
    except OSError as exc:
        if exc.errno in (errno.ENOTSUP, errno.EOPNOTSUPP):
            return
        raise
    for name in names:
        if not name.startswith(("user.", "system.posix_acl_")):
            continue
        try:
            os.setxattr(candidate, name, os.getxattr(file, name))
        except OSError as exc:
            raise AuthError(
                f"Cannot keep {file}'s extended attribute {name} on the rewritten file; nothing was written."
            ) from exc


def replace_checked(file: Path, candidate: Path, original: bytes, original_stat: os.stat_result) -> None:
    """Refuse to overwrite an edit made while validation was running."""
    require_writable(file)
    current = file.stat()
    if (current.st_ino, current.st_mtime_ns, current.st_size, current.st_mode) != (
        original_stat.st_ino,
        original_stat.st_mtime_ns,
        original_stat.st_size,
        original_stat.st_mode,
    ) or file.read_bytes() != original:
        raise ConflictError(
            "The ledger changed while the operation was running; nothing was written. Retry the command."
        )
    if original_stat.st_nlink > 1:
        # The validated copy is installed by rename, so the other names would
        # keep the old bytes: a ledger hard-linked into a backup folder
        # silently diverged on the first write (w5/391). Like a group bea
        # cannot keep (w1/099), a property the write would drop is refused.
        others = original_stat.st_nlink - 1
        raise AuthError(
            f"{file} has {others} other hard link{'s' if others > 1 else ''}; bea writes a ledger by replacing it "
            "with a validated copy, which would leave the other name holding the old ledger. Nothing was written. "
            "Replace the extra name with a symbolic link (writes land in the real file) or remove it, then retry."
        )
    keep_file_metadata(file, candidate, original_stat)
    try:
        with stopping.committing():
            os.replace(candidate, file)
    except PermissionError as exc:
        raise AuthError(
            f"The filesystem refused to replace {file} (an ACL, file flag or directory permission "
            "forbids it); nothing was written."
        ) from exc
    except OSError as exc:
        raise LedgerError(
            f"Could not replace {file} with its validated copy ({exc.strerror or type(exc).__name__}); "
            "nothing was written."
        ) from exc


def append(
    file: Path,
    texts: list[str],
    *,
    allow_errors: bool = False,
    expected: bytes | None = None,
    into: Path | None = None,
    snapshot: LedgerSnapshot | None = None,
    one_entry_each: bool = True,
    pad_from: bool = False,
    pad_date_explicit: bool = False,
    validated: list[str] | None = None,
    stages_pad: bool = False,
    operating_defaults: dict[int, list[str] | None] | None = None,
) -> list[str]:
    """Append `texts` to the ledger, validated and written under the lock.

    `stages_pad` is the staged-pad carve-out, passed only by `add pad` (w5/798).
    `operating_defaults` maps 1-based posting numbers to what their account
    allows (None when unconstrained), for postings whose currency fell back
    to the operating currency; hints name them when the guess fails (w5/804).

    `validated` is the answer `validate_append` already gave for these texts
    against this same `snapshot`. The snapshot is verified unchanged here, so
    that answer still holds and the candidate is not loaded a second time: an
    `import --apply` validated it twice, three full loads for one row (w5/577).
    """
    if not texts:
        return []
    if one_entry_each:
        require_one_entry_each(texts)
    file = Path(os.path.abspath(file))
    target = destination(file, into)
    with ExitStack() as stack:
        if not _HELD_LOCKS and not _HELD_DIRECTORIES:
            # Outermost writer: no deciding lock above us. Lock the whole
            # graph this write reads in one ordered pass, so a `bea` write
            # to an include in another directory queues instead of tripping
            # the verify below with exit 4 (w5/718). A snapshot handed in
            # may predate the locks: re-verify it, adopting the fresh one
            # when this call still owns validation, and refusing like
            # before when the caller pre-validated (import re-decides
            # under its own lock).
            fresh = stack.enter_context(locked_graph(file, target, deciding=True))
            if snapshot is not None:
                try:
                    snapshot.verify()
                except ConflictError:
                    if validated is not None:
                        raise
                    snapshot = fresh
            else:
                snapshot = fresh
        else:
            stack.enter_context(lock_files([file, target]))
        snapshot = snapshot or LedgerSnapshot.capture(file)
        # Every directory the write stages into, not just the target's: the
        # validation stages a copy beside each includer too, and orphaned
        # copies in an unswept directory would never be cleared (w5/719).
        for directory in dict.fromkeys([target.parent, *(path.parent for path in snapshot.contents)]):
            sweep_abandoned_candidates(directory)
        original = snapshot.require_target(target, into=into)
        snapshot.verify()
        original_stat = target.stat() if target.exists() else None
        if original_stat is not None:
            require_writable(target)
        if expected is not None and original != expected:
            raise ConflictError("The ledger changed since the preview was prepared; nothing was written. Retry.")
        seeded = new_include_seed(snapshot, target) + original
        with candidate_file(target, _appended_or_report(target, seeded, texts)) as candidate:
            if validated is None:
                warnings = validate_candidate(
                    candidate,
                    target,
                    allow_errors=allow_errors,
                    snapshot=snapshot,
                    stages_pad=stages_pad,
                    stages_open=_only_opens(texts),
                    pad_from=pad_from,
                    pad_date_explicit=pad_date_explicit,
                    operating_defaults=operating_defaults,
                )
            snapshot.verify()
            if original_stat is None:
                stopping.check()
                try:
                    claim_new_file(candidate, target)
                except FileExistsError as exc:
                    raise ConflictError(f"Already exists: {target}; nothing was overwritten.") from exc
                except PermissionError as exc:
                    raise AuthError(f"The filesystem refused to create {target}; nothing was written.") from exc
            else:
                replace_checked(target, candidate, original, original_stat)
            _COMMITS[0] += 1
    if validated is not None:
        return validated
    return warnings + respelled_account_notes(texts, snapshot)


def _is_marked_float(value: Any) -> bool:
    from bea_engine.amounts import JsonFloat

    return isinstance(value, JsonFloat)


def _exact_metadata_number(number: Any) -> Any:
    """Refuse a JSON float in typed metadata: `Decimal(0.1)` would persist its binary expansion."""
    if isinstance(number, bool):
        raise ValueError(f"expected a decimal string, got {number!r}")
    from bea_engine.amounts import decimal_string_hint

    if _is_marked_float(number):
        raise ValueError(
            f"JSON float {number.literal} cannot represent a decimal exactly. {decimal_string_hint(number, 'number')}"
        )
    if isinstance(number, float):
        raise ValueError(
            f"JSON float {number!r} cannot represent a decimal exactly. {decimal_string_hint(number, 'number')}"
        )
    return number


def metadata_for_write(meta: dict[str, Any]) -> dict[str, Any]:
    """Restore typed JSON metadata; source locations never become ledger metadata."""
    from decimal import Decimal, InvalidOperation

    from beancount.core.amount import Amount

    from bea_engine.ledger.text import parse_iso_date

    result = {}
    for key, value in meta.items():
        if key in {"filename", "lineno"} or key.startswith("__"):
            continue
        if isinstance(value, dict):
            kind = value.get("kind")
            try:
                if kind == "number":
                    value = Decimal(_exact_metadata_number(value["value"]))
                elif kind == "date":
                    value = parse_iso_date(value["value"])
                elif kind == "amount":
                    value = Amount(Decimal(_exact_metadata_number(value["number"])), value["currency"])
                else:
                    raise LedgerError(f"Unsupported metadata value for {key!r}.")
            except InvalidOperation as exc:
                # Decimal's own message is a bare exception class list.
                raise LedgerError(
                    f"Invalid {kind!r} metadata for {key!r}: expected a decimal string such as '1.25'."
                ) from exc
            except TypeError as exc:
                # A non-string where a string belongs: the raw TypeError names
                # Python types, not the tagged shape (w5/738).
                expected = "'YYYY-MM-DD' string" if kind == "date" else "decimal string such as '1.25'"
                raise LedgerError(f"Invalid {kind!r} metadata for {key!r}: expected a {expected}.") from exc
            except (KeyError, ValueError) as exc:
                raise LedgerError(f"Invalid {kind!r} metadata for {key!r}: {exc}") from exc
        elif isinstance(value, bool):
            pass
        elif _is_marked_float(value):
            # A marked float refused as one: quoting the literal, not the
            # double's expansion (w5/735). Plain floats keep the historical
            # coercion below; only parsed JSON carries the mark.
            _exact_metadata_number(value)
        elif isinstance(value, int | float):
            # JSON numbers arrive as int/float; Beancount's printer only accepts Decimal.
            value = Decimal(str(value))
        result[key] = value
    return result
