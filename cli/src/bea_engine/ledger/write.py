"""Validate a candidate ledger before atomically replacing its entry file."""

from __future__ import annotations

import difflib
import fnmatch
import glob
import hashlib
import os
import re
import shlex
import stat
import sys
import tempfile
import time
import unicodedata
from collections import Counter
from collections.abc import Callable, Iterable, Iterator
from contextlib import ExitStack, contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from bea_engine.protocol import AuthError, ConflictError, LedgerError, UsageError
from bea_engine.query import format_error


def cache_dir() -> Path:
    """Where the write locks live — the same directory `cli.config.cache_dir` names.

    Every writer — `bea add`, `bea import`, `bea ask` via `bea-engine append` —
    runs in the engine process and must contend for the same lock file.
    """
    base = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache").expanduser()
    return base / "bea"


def destination(root: Path, into: Path | None = None) -> Path:
    """Destinations are relative to the root ledger, independently of cwd."""
    return (root.parent / into.expanduser()).resolve() if into is not None else root.resolve()


def _includes(content: bytes) -> Iterator[tuple[int, int, str]]:
    from bea_engine.ledger.text import iter_includes

    for span in iter_includes(content):
        yield span.start, span.end, span.target


@dataclass
class LedgerSnapshot:
    """Freeze the root and its include graph for validation and conflict checks."""

    root: Path
    contents: dict[Path, bytes] = field(default_factory=dict)
    stats: dict[Path, os.stat_result] = field(default_factory=dict)
    patterns: dict[str, tuple[Path, ...]] = field(default_factory=dict)

    @classmethod
    def capture(cls, root: Path) -> LedgerSnapshot:
        snapshot = cls(root.resolve())
        pending = [snapshot.root]
        while pending:
            path = pending.pop(0)
            if path in snapshot.contents:
                continue
            snapshot.stats[path] = path.stat()
            content = snapshot.contents[path] = path.read_bytes()
            for _, _, name in _includes(content):
                pattern = str(path.parent / name)
                matches = tuple(sorted(Path(p).absolute() for p in glob.glob(pattern, recursive=True)))
                snapshot.patterns[pattern] = matches
                pending.extend(matches)
        return snapshot

    def require_target(self, target: Path) -> None:
        from bea_engine.managed_price_cache import managed_source_for_path

        source = managed_source_for_path(target)
        if source is not None:
            raise UsageError(
                f"Write destination {target} is a managed price feed resolved from {source} and is read-only; "
                "declare a price directive in your own ledger file to override it."
            )
        resolved = target.resolve()
        if any(path.resolve() == resolved for path in self.contents):
            return
        for pattern, matches in self.patterns.items():
            if not fnmatch.fnmatch(str(resolved), pattern):
                continue
            # Covered by an include glob that was expanded before this path existed.
            if not resolved.parent.is_dir():
                raise UsageError(
                    f"Write destination {target} matches include {pattern!r} but its directory "
                    f"{resolved.parent} does not exist. Create the directory first."
                )
            if not resolved.exists():
                resolved.write_bytes(b"")
            self.contents[resolved] = resolved.read_bytes()
            self.stats[resolved] = resolved.stat()
            self.patterns[pattern] = tuple(sorted({*matches, resolved}))
            return
        raise UsageError(
            f"Write destination {target} is not included by {self.root}. "
            "Create it and add an include directive to the root first."
        )

    def verify(self) -> None:
        for path, original in self.contents.items():
            try:
                current = path.stat()
                before = self.stats[path]
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
            current_paths = tuple(sorted(Path(p).absolute() for p in glob.glob(pattern, recursive=True)))
            if current_paths != before_paths:
                raise ConflictError(f"The included files changed: {pattern}. Nothing was written; retry.")

    @contextmanager
    def staged(self, candidate: Path, target: Path) -> Iterator[tuple[Path, dict[Path, Path]]]:
        """Keep each staged file beside its source so documents/plugins retain their paths."""
        from beancount.utils import misc_utils

        escape_string: Callable[[str], str] = misc_utils.escape_string

        with ExitStack() as stack:
            paths = {path: stack.enter_context(candidate_file(path, "")) for path in self.contents}
            for path, original in self.contents.items():
                content = candidate.read_bytes() if path.resolve() == target else original
                for start, end, name in reversed(list(_includes(content))):
                    matches = self.patterns.get(str(path.parent / name), ())
                    if matches:
                        replacement = "\ninclude ".join(f'"{escape_string(str(paths[p]))}"' for p in matches)
                        content = content[:start] + replacement.encode() + content[end:]
                paths[path].write_bytes(content)
            yield paths[self.root], {staged: original for original, staged in paths.items()}


#: How long a staged candidate must have been sitting before another write
#: treats it as abandoned. A write takes seconds, so an hour is far beyond any
#: live one and this can only ever catch a file whose owner is gone.
_ABANDONED_CANDIDATE_SECONDS = 3600

#: Candidate files, and the pickle-cache sidecars Beancount writes beside them.
#: The sidecar name *prepends* a dot to the file it caches, so a candidate
#: already named `.bea-xxxx.tmp` gets `..bea-xxxx.tmp.picklecache` — two
#: leading dots, which a `.bea-*` glob cannot reach.
_CANDIDATE_GLOBS = (".bea-*", "..bea-*")


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
    from beancount.loader import PICKLE_CACHE_FILENAME, get_cache_filename

    pattern = os.getenv("BEANCOUNT_LOAD_CACHE_FILENAME") or PICKLE_CACHE_FILENAME
    return Path(get_cache_filename(pattern, str(candidate)))


def sweep_abandoned_candidates(directory: Path) -> None:
    """Remove staging files an interrupted write could not remove itself.

    `candidate_file` drops its own file in a `finally`, and the frontend passes
    a termination signal on to the engine so that `finally` gets to run. Neither
    helps against SIGKILL, which no handler can catch, nor against a signal that
    lands in the moment between creating the file and entering the block that
    guards it. Each abandoned file is a full copy of the ledger, so they are
    worth clearing rather than leaving to accumulate beside a user's books.

    Only files old enough that no live write could still own them are removed,
    which is what makes this safe to do while another `bea` may be running in
    the same directory. Sweeping is best effort: a file someone else removes
    first, or one this user may not delete, must not fail the write that was
    actually asked for.
    """
    cutoff = time.time() - _ABANDONED_CANDIDATE_SECONDS
    try:
        stale = [path for pattern in _CANDIDATE_GLOBS for path in directory.glob(pattern)]
    except OSError:
        return
    for path in stale:
        try:
            if path.is_file() and path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
        except OSError:
            continue


@contextmanager
def lock_file(file: Path) -> Iterator[None]:
    """Serialize CLI writers across atomic replacements of the ledger inode.

    The cached lock must stay in place: unlinking it would let another process
    lock a different inode while a waiting writer still holds the old one.
    """
    directory = cache_dir() / "locks"
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    key = hashlib.sha256(os.path.normcase(str(file.resolve())).encode()).hexdigest()
    fd = os.open(directory / f"{key}.lock", os.O_RDWR | os.O_CREAT, 0o600)
    with os.fdopen(fd, "r+b") as stream:
        if sys.platform == "win32":
            import msvcrt

            if not os.fstat(stream.fileno()).st_size:
                stream.write(b"\0")
                stream.flush()
            stream.seek(0)
            msvcrt.locking(stream.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl

            fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            if sys.platform == "win32":
                stream.seek(0)
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


@contextmanager
def candidate_file(file: Path, content: str) -> Iterator[Path]:
    """Keep relative includes and documents relative to the original directory."""
    fd, name = tempfile.mkstemp(prefix=".bea-", suffix=".tmp", dir=file.parent)
    candidate = Path(name)
    try:
        # Preserve the supplied bytes: Windows newline translation would turn
        # existing CRLF into CRCRLF on every append.
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        yield candidate
    finally:
        candidate.unlink(missing_ok=True)
        pickle_cache_of(candidate).unlink(missing_ok=True)


def _balance_recovery_hints(
    balance: Any, source: Path, root: Path, entries: list[Any], options: dict[str, Any], snapshot: LedgerSnapshot | None
) -> list[str]:
    import datetime

    from beancount.core.data import Close, Open, Transaction

    date_hint = (
        "Balance assertions run at the start of the day, before that day's transactions. "
        "For a statement closing balance, use the following day's date. "
        "Review missing or duplicate transactions and record known fees as transactions before adjusting."
    )
    original = snapshot.contents.get(source, b"") if snapshot else b""
    if balance.meta.get("lineno", 0) <= len(original.splitlines()):
        return [
            date_hint,
            f"Review transactions against the existing assertion at {source}:{balance.meta['lineno']}. "
            "Correct missing transactions or edit that assertion; adding another balance would duplicate it.",
        ]
    if any(
        isinstance(entry, Transaction)
        and entry.date <= balance.date
        and any(posting.account == balance.account for posting in entry.postings)
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
        "Opening adjustment command: " + shlex.join(command),
    ]
    if source_account == "SOURCE_ACCOUNT":
        hints.append(
            f"Replace SOURCE_ACCOUNT with the intended adjustment source, active on {pad_date} "
            f"and allowing {balance.amount.currency}."
        )
    return hints


@dataclass(frozen=True)
class _ErrorRecord:
    """One loader error, kept separable so identical problems can be merged."""

    kind: str
    message: str
    lineno: int | None
    hints: list[str]


def _collapse_repeats(records: list[_ErrorRecord]) -> list[str]:
    """One line per distinct problem, naming the other lines it occurs on.

    A single unopened account referenced by forty imported rows is one thing to
    fix, and forty identical paragraphs bury the hint that says how.
    """
    order: list[tuple[str, tuple[str, ...]]] = []
    grouped: dict[tuple[str, tuple[str, ...]], list[_ErrorRecord]] = {}
    for record in records:
        key = (record.kind, tuple(record.hints))
        if key not in grouped:
            grouped[key] = []
            order.append(key)
        grouped[key].append(record)
    messages = []
    for key in order:
        occurrences = grouped[key]
        message = occurrences[0].message
        others = [str(record.lineno) for record in occurrences[1:] if record.lineno is not None]
        if len(others) == len(occurrences) - 1 and others:
            plural = "" if len(others) == 1 else "s"
            message += f" Same problem on {len(others)} more line{plural}: {', '.join(others)}."
        messages.append(message)
        messages.extend(occurrences[0].hints)
    return messages


def including_root(file: Path) -> Path | None:
    """A nearby ledger that includes `file`, when `file` is not itself a root.

    Pointing `--file` at one leaf of an include tree drops the sibling files
    that open its accounts and set its options, so the resulting failures name
    the transaction rather than the target.
    """
    target = file.resolve()
    candidates = []
    for directory in dict.fromkeys((target.parent, target.parent.parent)):
        candidates.extend(sorted(directory.glob("*.bean")) + sorted(directory.glob("*.beancount")))
    for candidate in dict.fromkeys(path.resolve() for path in candidates):
        if candidate == target:
            continue
        try:
            included = LedgerSnapshot.capture(candidate).contents
        except (OSError, UsageError, ValueError):
            continue
        if any(path.resolve() == target for path in included if path.resolve() != candidate):
            return candidate
    return None


def root_ledger_hints(file: Path) -> list[str]:
    """The `--into` recipe when the write target is an included file, else nothing."""
    root = including_root(file)
    if root is None:
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


def validate_candidate(
    candidate: Path, file: Path, *, allow_errors: bool = False, snapshot: LedgerSnapshot | None = None
) -> list[str]:
    """Refuse a candidate that fails validation, naming what it would break.

    `--allow-errors` tolerates errors the ledger already had — a failing
    balance assertion stays failing — but nothing the write itself introduces:
    a new unknown account, currency violation, or balance failure refuses the
    write even with the flag, so an exit-0 write never leaves a ledger `check`
    rejects for reasons absent before it. Three categories always refuse, flag
    or no flag: syntax errors, pad references to unknown or inactive accounts,
    and newly introduced errors. The one carve-out is a newly staged pad,
    whose `Unused Pad` the documented two-step pad-then-balance flow needs.
    """
    from beancount.core import interpolate
    from beancount.core.data import Balance, Close, Document, Open, Pad, Transaction
    from beancount.parser.grammar import ParserError, ParserSyntaxError
    from beancount.parser.lexer import LexerError

    from bea_engine import managed_load

    if snapshot is None:
        entries, errors, options = managed_load.load_file(candidate)
        filenames = {candidate: file}
        # `bea init` validates a candidate before the destination exists; treat
        # a missing original as zero lines so creation still works.
        original_line_counts = {file.resolve(): len(file.read_bytes().splitlines())} if file.exists() else {}
    else:
        with snapshot.staged(candidate, file) as (root, filenames):
            entries, errors, options = managed_load.load_file(root)
        original_line_counts = {
            path.resolve(): len(content.splitlines()) for path, content in snapshot.contents.items()
        }
    # The error set before the write, keyed so an identical failure after the
    # append reads as the same error. Appends land at end of file over
    # verbatim existing bytes, so a pre-existing error keeps its file, line,
    # and message; anything else in the after set is newly introduced.
    before_keys: Counter[tuple[str, int | None, str]] | None = None
    if allow_errors:
        _, before_errors, _ = managed_load.load_file(snapshot.root if snapshot else file)
        before_keys = Counter(_error_key(before, {}) for before in before_errors)
    accounts = [entry.account for entry in entries if isinstance(entry, Open)]
    records: list[_ErrorRecord] = []
    introduced: list[bool] = []
    invalid_pad_accounts = False
    for error in errors:
        hints = []
        message = format_error(error, ledger_file=file)
        for staged, original in filenames.items():
            message = message.replace(str(staged), str(original))
        source = Path(error.source.get("filename", str(candidate)))
        source = filenames.get(source, source)
        lineno = error.source.get("lineno")
        # Multiset consumption: each after-error spends one matching
        # before-error, so duplicates are only tolerated while they last.
        # A staged pad's `Unused Pad` is the documented carve-out — the
        # two-step pad-then-balance flow cannot start without it.
        is_new = False
        if before_keys is not None:
            key = _error_key(error, filenames)
            if before_keys[key] > 0:
                before_keys[key] -= 1
            else:
                is_new = "Unused Pad" not in getattr(error, "message", "")
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
        if "unknown account '" in message:
            account = message.split("unknown account '", 1)[1].split("'", 1)[0]
            normalization = unknown_account_is_normalization(account, accounts)
            if normalization is not None:
                message += normalization
            else:
                matches = difflib.get_close_matches(account, accounts, n=3, cutoff=0.6)
                if matches:
                    message += f" Did you mean {', '.join(matches)}?"
                message += f" To create it, use bea add open --account {shlex.quote(account)} --date YYYY-MM-DD."
            hints.extend(root_ledger_hints(file))
        if "inactive account '" in message:
            account = message.split("inactive account '", 1)[1].split("'", 1)[0]
            for entry in entries:
                if isinstance(entry, Open | Close) and entry.account == account:
                    location = str(entry.meta.get("filename", ""))
                    for staged, original in filenames.items():
                        location = location.replace(str(staged), str(original))
                    state = "opened" if isinstance(entry, Open) else "closed"
                    message += f" Account {state} {entry.date} at {location}:{entry.meta.get('lineno')}."
            message += (
                " Correct the transaction date or edit that directive; for new books use bea init --date YYYY-MM-DD."
            )
        if isinstance(error.entry, Pad) and error.message.startswith("Invalid reference to "):
            invalid_pad_accounts = True
            hints.append("Pad accounts must be active, even with --allow-errors.")
        if isinstance(error.entry, Transaction) and "does not balance" in error.message:
            residual = interpolate.compute_residual(error.entry.postings)  # type: ignore[no-untyped-call]
            if len(residual.currencies()) > 1:
                held_with_cost = {
                    posting.units.currency
                    for prior in entries
                    if prior is not error.entry
                    for posting in getattr(prior, "postings", []) or []
                    if posting.cost is not None and posting.units is not None
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
        if "Unused Pad" in message:
            pad_entry = error.entry if isinstance(error.entry, Pad) else None
            already_paired = pad_entry is not None and any(
                isinstance(entry, Balance) and entry.account == pad_entry.account and entry.date > pad_entry.date
                for entry in entries
            )
            if already_paired:
                message += " Book balance already matches the assertion; omit --pad-from and add the balance alone."
            else:
                message += (
                    " Add both directives atomically with bea add balance --pad-from ACCOUNT"
                    " --date YYYY-MM-DD --amount 'NUMBER CURRENCY' --account ACCOUNT."
                )
        elif isinstance(error.entry, Balance) and "Balance failed" in error.message:
            if allow_errors:
                hints.append(
                    "Review this assertion and missing transactions before further writes; it still fails validation."
                )
            else:
                hints.extend(
                    _balance_recovery_hints(
                        error.entry, source, snapshot.root if snapshot else file, entries, options, snapshot
                    )
                )
        records.append(_ErrorRecord(getattr(error, "message", str(error)), message, error.source.get("lineno"), hints))
    messages = _collapse_repeats(records)
    syntax_errors = [err for err in errors if isinstance(err, ParserError | ParserSyntaxError | LexerError)]
    new_records = [record for record, is_new in zip(records, introduced, strict=True) if is_new]
    if errors and (not allow_errors or syntax_errors or invalid_pad_accounts or new_records):
        if not allow_errors:
            raise LedgerError("The change would leave the ledger invalid; nothing was written.", details=messages)
        # A refused `--allow-errors` write names what forced the refusal —
        # the introduced errors, any syntax failure, any invalid pad — and
        # not the pre-existing errors the flag tolerates.
        reasons = [
            record
            for record, error, is_new in zip(records, errors, introduced, strict=True)
            if is_new
            or isinstance(error, ParserError | ParserSyntaxError | LexerError)
            or (isinstance(error.entry, Pad) and str(getattr(error, "message", "")).startswith("Invalid reference to "))
        ]
        if new_records:
            message = f"The change would introduce {len(new_records)} new ledger error(s); nothing was written."
        else:
            message = "The change would leave the ledger invalid; nothing was written."
        raise LedgerError(message, details=_collapse_repeats(reasons))
    return messages


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

    source = Path(error.source.get("filename", ""))
    try:
        name = str(filenames.get(source, source).resolve())
    except OSError:
        name = str(filenames.get(source, source))
    entry = getattr(error, "entry", None)
    if isinstance(entry, Balance):
        message = f"Balance failed for {entry.account} on {entry.date}"
    else:
        message = getattr(error, "message", str(error))
    return (name, error.source.get("lineno"), message)


def _destination_indent(content: str) -> str:
    """Posting indentation observed in the existing entries; two spaces when there are none.

    Amount columns are not measured here: `appended_content` hands the whole
    draft to bean-format's aligner and keeps its rendering of the new lines.
    """
    indents: Counter[str] = Counter()
    for line in content.splitlines():
        match = re.match(r"^(\s+)(\S+)( +).*$", line)
        if not match or "\t" in match.group(1):
            continue
        indents[match.group(1)] += 1
    return indents.most_common(1)[0][0] if indents else "  "


def _indent_block(texts: list[str], indent: str) -> list[str]:
    """Re-indent appended entries to the destination's style without touching it.

    Posting lines keep a two-space gap before their amount; `appended_content`
    aligns the amounts afterwards with the code `bea format` runs.
    """
    rendered = []
    for text in texts:
        lines = []
        for index, line in enumerate(text.rstrip().splitlines()):
            match = None if index == 0 else re.match(r"^\s*(\S+)(  +)(\S.*)$", line)
            if match and ":" in match.group(1) and not match.group(1).endswith(":"):
                lines.append(f"{indent}{match.group(1)}  {match.group(3)}")
            elif index == 0 or not line.strip() or not line[0].isspace():
                # A continuation at column zero is content (a wrapped note
                # comment), not structure: only re-indent indented lines.
                lines.append(line)
            else:
                lines.append(f"{indent}{line.strip()}")
        rendered.append("\n".join(lines))
    return rendered


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
    ending = _dominant_ending(original)
    blocks = _indent_block(texts, _destination_indent(text))
    draft = text + "".join("\n" + block + "\n" for block in blocks)
    kept = len(text.splitlines())
    tail = draft.splitlines()[kept:]
    try:
        from beancount.scripts.format import align_beancount

        # The aligner emits one line per input line, so the appended lines are
        # the tail of its output. Line endings are normalised first because its
        # own whitespace-only safety check cannot account for a carriage return.
        aligned = align_beancount(draft.replace("\r\n", "\n").replace("\r", "\n"))  # type: ignore[no-untyped-call]
        tail = aligned.splitlines()[kept:]
    except AssertionError:
        pass  # The aligner refused the text; alignment is cosmetic, the append is not.
    head = text if text.endswith("\n") or not text else text + ending
    return head + ending.join(tail) + ending


def _dominant_ending(content: bytes) -> str:
    """The line ending new lines should use: CRLF only when CRLF lines win.

    A tie or no newlines at all answers LF, the default for new ledgers; a
    mixed file keeps its existing bytes verbatim either way — only the
    appended lines follow the dominant ending.
    """
    crlf = content.count(b"\r\n")
    return "\r\n" if crlf > content.count(b"\n") - crlf else "\n"


def _appended_or_report(target: Path, original: bytes, texts: list[str]) -> str:
    """The append candidate, or a decode failure naming path, offset, and encoding.

    A ledger that is not UTF-8 cannot take an append, and the raw codec error
    names none of what the caller needs to fix it. The ledger itself is left
    untouched either way: this runs before any candidate is written.
    """
    from bea_engine.ledger.text import decode_error_message

    try:
        return appended_content(original, texts)
    except UnicodeDecodeError as exc:
        raise LedgerError(decode_error_message(target, exc)) from exc


def validate_append(
    file: Path,
    texts: list[str],
    *,
    allow_errors: bool = False,
    into: Path | None = None,
    snapshot: LedgerSnapshot | None = None,
) -> list[str]:
    """Validate the append without writing; returns the errors `allow_errors` tolerated."""
    snapshot = snapshot or LedgerSnapshot.capture(file)
    target = destination(file, into)
    snapshot.require_target(target)
    with candidate_file(target, _appended_or_report(target, target.read_bytes(), texts)) as candidate:
        warnings = validate_candidate(candidate, target, allow_errors=allow_errors, snapshot=snapshot)
    snapshot.verify()
    return warnings


def require_writable(file: Path) -> None:
    """Respect file permissions even though rename only needs directory access."""
    if not file.stat().st_mode & (stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH) or not os.access(file, os.W_OK):
        raise AuthError(
            f"Ledger file is read-only or not writable: {file}. "
            "Change its permissions explicitly before retrying; nothing was written."
        )


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
    candidate.chmod(stat.S_IMODE(original_stat.st_mode))
    os.replace(candidate, file)


def append(
    file: Path,
    texts: list[str],
    *,
    allow_errors: bool = False,
    expected: bytes | None = None,
    into: Path | None = None,
    snapshot: LedgerSnapshot | None = None,
) -> list[str]:
    if not texts:
        return []
    file = file.resolve()
    target = destination(file, into)
    with ExitStack() as stack:
        for path in sorted({file, target}):
            stack.enter_context(lock_file(path))
        sweep_abandoned_candidates(target.parent)
        snapshot = snapshot or LedgerSnapshot.capture(file)
        snapshot.require_target(target)
        snapshot.verify()
        require_writable(target)
        original_stat = target.stat()
        original = target.read_bytes()
        if expected is not None and original != expected:
            raise ConflictError("The ledger changed since the preview was prepared; nothing was written. Retry.")
        with candidate_file(target, _appended_or_report(target, original, texts)) as candidate:
            warnings = validate_candidate(candidate, target, allow_errors=allow_errors, snapshot=snapshot)
            snapshot.verify()
            replace_checked(target, candidate, original, original_stat)
    return warnings


def metadata_for_write(meta: dict[str, Any]) -> dict[str, Any]:
    """Restore typed JSON metadata; source locations never become ledger metadata."""
    import datetime
    from decimal import Decimal, InvalidOperation

    from beancount.core.amount import Amount

    result = {}
    for key, value in meta.items():
        if key in {"filename", "lineno"} or key.startswith("__"):
            continue
        if isinstance(value, dict):
            kind = value.get("kind")
            try:
                if kind == "number":
                    value = Decimal(value["value"])
                elif kind == "date":
                    value = datetime.date.fromisoformat(value["value"])
                elif kind == "amount":
                    value = Amount(Decimal(value["number"]), value["currency"])
                else:
                    raise LedgerError(f"Unsupported metadata value for {key!r}.")
            except (KeyError, TypeError, ValueError, InvalidOperation) as exc:
                raise LedgerError(f"Invalid {kind!r} metadata for {key!r}: {exc}") from exc
        elif isinstance(value, bool):
            pass
        elif isinstance(value, int | float):
            # JSON numbers arrive as int/float; Beancount's printer only accepts Decimal.
            value = Decimal(str(value))
        result[key] = value
    return result
