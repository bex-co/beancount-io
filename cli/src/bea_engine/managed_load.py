"""Load a ledger with its managed price includes resolved (w1/m29/t003).

One resolution step every load path shares: `check`, `list`, `query`,
`report`, `import`, and write validation all load through here, so no command
sees a different ledger than another. Ledgers without a managed include load
exactly as before — the wrapper detects that case from the include closure
and calls Beancount directly with zero overhead.

Python Beancount resolves includes as filesystem paths, so there is no file
map to overlay onto the way the hosted loader does (ADR 015 section 6).
Instead the wrapper stages a shadow of the include closure beside the
customer's files — the same beside-source staging write validation already
uses, so documents and plugins keep their paths — rewriting each managed
include line to the feed's effective file and loading the staged root. The
customer's files are never touched; entry and error filenames map back to
the originals before anything is returned, while feed entries keep their
cache paths the way hosted entries keep their virtual paths.

Precedence follows ADR 015 section 7 on the feed text: a managed point whose
date and pair collide with a ledger-authored price, directly or reciprocally,
is commented out with its metadata, keeping line numbers stable. The shadowed
count and the dates the engine sees travel in the per-source records for the
status view t004 builds; the effective text is cached per ledger and revision
so the portable export t005 builds reads the same bytes the load parsed.
"""

from __future__ import annotations

import os
import re
import shutil
import time
from collections.abc import Callable
from contextlib import ExitStack
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any
from urllib.request import OpenerDirector

from bea_engine.managed_price_cache import (
    PriceFeedBlob,
    cache_root,
    feed_dir,
    freshness,
    resolve_feed,
)
from bea_engine.managed_prices import (
    DEFAULT_ORIGINS,
    MAX_URLS_PER_LOAD,
    AllowedUrl,
    ManagedPriceBudget,
    is_url_include_target,
    parse_managed_price_url,
)

ORIGINS_ENV = "MANAGED_PRICE_ORIGINS"
"""Comma-separated origin allowlist, mirroring the hosted variable; empty disables."""

OFFLINE_ENV = "MANAGED_PRICE_OFFLINE"
"""Set to resolve managed includes from the cache only, without fetching."""

STRICT_ENV = "MANAGED_PRICE_STRICT"
"""Set to fail the load on a stale or unavailable managed source."""

_LEDGER_PRICE_RE = re.compile(
    r"^(\d{4}-\d{2}-\d{2})[ \t]+price[ \t]+([A-Z][A-Z0-9'._-]*)[ \t]+\S+[ \t]+([A-Z][A-Z0-9'._-]*)",
    re.MULTILINE,
)
_METADATA_LINE_RE = re.compile(r"^[ \t]+[a-z][A-Za-z0-9_-]*\s*:")
_SHADOWED_LINE = "; shadowed by a ledger-authored price for the same date"
_ALREADY_INCLUDED_LINE = "; managed price feed already included from another file"


@dataclass(frozen=True)
class IncludeRef:
    """One include line that named a managed source, as written."""

    file: str
    line: int
    target: str


@dataclass(frozen=True)
class ManagedSource:
    """Per-source status threaded alongside the load, mirroring the hosted record."""

    url: str
    alias: str
    included_from: tuple[IncludeRef, ...]
    commodity: str | None
    quote: str | None
    source: str | None
    revision: str | None
    etag: str | None
    observed_at: str | None
    fetched_at: str | None
    next_refresh_at: str | None
    freshness: str
    error: str | None
    shadowed_count: int
    effective_dates: tuple[str, ...]
    effective_path: str | None = None


@dataclass(frozen=True)
class LoadedLedger:
    """A load with its managed sources: entries, errors, options, status."""

    entries: list[Any]
    errors: list[Any]
    options: dict[str, Any]
    sources: tuple[ManagedSource, ...] = ()


def collect_ledger_price_pairs(*texts: str) -> set[tuple[str, str, str]]:
    """Every `(date, base, quote)` the ledger's own files declare.

    Text-based like the hosted collector, so both engines shadow the same
    points: a price the ledger declares in any file wins regardless of
    include order.
    """
    pairs: set[tuple[str, str, str]] = set()
    for text in texts:
        for match in _LEDGER_PRICE_RE.finditer(text):
            pairs.add((match.group(1), match.group(2), match.group(3)))
    return pairs


@dataclass(frozen=True)
class EffectiveFeed:
    """A feed with ledger-shadowed points commented out, lines stable."""

    text: str
    shadowed_count: int
    effective_dates: tuple[str, ...]


def apply_ledger_price_precedence(
    text: str, prices: tuple[Any, ...], ledger_pairs: set[tuple[str, str, str]]
) -> EffectiveFeed:
    """Comment out managed points the ledger shadows, directly or reciprocally.

    Shadowed lines become comments with their metadata, so the line count is
    preserved and any diagnostic naming a virtual line still points at the
    right place in the feed revision.
    """
    lines = text.split("\n")
    effective_dates: list[str] = []
    shadowed = 0
    for price in prices:
        if (price.date, price.base, price.quote) in ledger_pairs or (
            price.date,
            price.quote,
            price.base,
        ) in ledger_pairs:
            shadowed += 1
            lines[price.line - 1] = _SHADOWED_LINE
            index = price.line
            while index < len(lines) and _METADATA_LINE_RE.match(lines[index]):
                lines[index] = f"; {lines[index].strip()}"
                index += 1
        else:
            effective_dates.append(price.date)
    return EffectiveFeed(
        text=text if shadowed == 0 else "\n".join(lines),
        shadowed_count=shadowed,
        effective_dates=tuple(effective_dates),
    )


def _env_origins() -> tuple[str, ...] | None:
    raw = os.environ.get(ORIGINS_ENV)
    if raw is None:
        return None
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _iso(moment: float | None) -> str | None:
    if moment is None:
        return None
    return datetime.fromtimestamp(moment, UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _remap(value: str, staged: dict[str, str]) -> str:
    return staged.get(value, value)


def load_with_sources(
    entry: Path,
    *,
    offline: bool | None = None,
    strict: bool | None = None,
    origins: tuple[str, ...] | None = None,
    root: Path | None = None,
    now: float | None = None,
    opener: OpenerDirector | None = None,
) -> LoadedLedger:
    """Load `entry` with managed price includes resolved, plus per-source status.

    Flags default from the `MANAGED_PRICE_*` environment; explicit arguments
    win. Without a managed include this is a plain Beancount load. Strict
    mode raises naming any stale or unavailable source; offline mode never
    fetches.
    """
    from beancount import loader
    from beancount.loader import LoadError

    from bea_engine.ledger.write import LedgerSnapshot, candidate_file

    at = time.time() if now is None else now
    want_offline = _env_flag(OFFLINE_ENV) if offline is None else offline
    want_strict = _env_flag(STRICT_ENV) if strict is None else strict
    allowed_origins = _env_origins() if origins is None else origins
    if allowed_origins is None:
        allowed_origins = DEFAULT_ORIGINS
    cache = root or cache_root()

    snapshot = LedgerSnapshot.capture(entry.resolve())
    managed = _collect_managed(snapshot, allowed_origins)
    if not managed:
        entries, errors, options = loader.load_file(str(entry))
        return LoadedLedger(list(entries), list(errors), dict(options), ())

    budget = ManagedPriceBudget(limit=MAX_URLS_PER_LOAD)
    pending = [source for source in managed if budget.claim(source.url)]
    resolved = {
        source.url: resolve_feed(
            source.url,
            source.alias,
            root=cache,
            offline=want_offline,
            strict=want_strict,
            now=at,
            opener=opener,
        )
        for source in pending
    }
    blobs = {url: result.blob for url, result in resolved.items() if result.blob is not None}
    texts = [content.decode("utf-8", errors="replace") for content in snapshot.contents.values()]
    pairs = collect_ledger_price_pairs(*texts) if blobs else set()
    ledger_key = sha256(str(entry.resolve()).encode("utf-8")).hexdigest()[:16]
    effective: dict[str, tuple[PriceFeedBlob, EffectiveFeed, Path]] = {}
    for url, blob in blobs.items():
        precedence = apply_ledger_price_precedence(blob.text, blob.feed.prices, pairs)
        path = feed_dir(url, cache) / f"{blob.revision}.effective.{ledger_key}.beancount"
        if not path.is_file() or path.read_text(encoding="utf-8") != precedence.text:
            path.write_text(precedence.text, encoding="utf-8")
        effective[url] = (blob, precedence, path)

    primary: set[tuple[str, int]] = set()
    for source in pending:
        if source.includes:
            first = source.includes[0]
            primary.add((first.file, first.line))

    with ExitStack() as stack:
        staged = {path: stack.enter_context(candidate_file(path, "")) for path in snapshot.contents}
        unavailable: list[Any] = []
        for path, original in snapshot.contents.items():
            content = _rewrite_includes(
                original,
                path,
                snapshot.patterns,
                staged,
                pending,
                resolved,
                effective,
                primary,
                unavailable,
                LoadError,
            )
            staged[path].write_bytes(content)
        entries, errors, options = loader.load_file(str(staged[snapshot.root]))
        back = {str(staged_path): str(original) for original, staged_path in staged.items()}
        entries = [_remap_entry(entry, back) for entry in entries]
        errors = [_remap_error(error, back) for error in errors]
    errors.extend(unavailable)

    sources: list[ManagedSource] = []
    for source in pending:
        result = resolved[source.url]
        serving = result.blob
        item = effective.get(source.url)
        applied = item[1] if item else None
        feed_path = item[2] if item else None
        sources.append(
            ManagedSource(
                url=source.url,
                alias=source.alias,
                included_from=tuple(source.includes),
                commodity=serving.feed.commodity if serving else None,
                quote=serving.feed.quote if serving else None,
                source=serving.feed.source if serving else None,
                revision=serving.revision if serving else None,
                etag=serving.etag if serving else None,
                observed_at=serving.feed.latest_observed_at if serving else None,
                fetched_at=_iso(serving.fetched_at) if serving else None,
                next_refresh_at=_iso(result.head.next_refresh_at),
                freshness=freshness(serving, at),
                error=result.head.last_error,
                shadowed_count=applied.shadowed_count if applied else 0,
                effective_dates=applied.effective_dates if applied else (),
                effective_path=str(feed_path) if feed_path else None,
            )
        )
    remapped_options = dict(options)
    if isinstance(remapped_options.get("filename"), str):
        remapped_options["filename"] = _remap(remapped_options["filename"], back)
    if isinstance(remapped_options.get("include"), list):
        remapped_options["include"] = [_remap(str(item), back) for item in remapped_options["include"]]
    return LoadedLedger(entries, errors, remapped_options, tuple(sources))


@dataclass
class _PendingSource:
    url: str
    alias: str
    includes: list[IncludeRef]


def _collect_managed(snapshot: Any, origins: tuple[str, ...]) -> list[_PendingSource]:
    """Group the closure's allowed managed includes by canonical feed URL.

    Disallowed URLs are left for Beancount to report, exactly as today.
    Nested includes, globs, and cycles are already handled by the snapshot's
    closure walk. The per-load cap applies later, when the budget claims.
    """
    from bea_engine.ledger.text import iter_includes

    by_url: dict[str, _PendingSource] = {}
    for path, content in snapshot.contents.items():
        for span in iter_includes(content):
            if not is_url_include_target(span.target):
                continue
            decision = parse_managed_price_url(span.target, origins)
            if not isinstance(decision, AllowedUrl):
                continue
            include = IncludeRef(file=str(path), line=span.line, target=span.target)
            existing = by_url.get(decision.url)
            if existing is not None:
                existing.includes.append(include)
            else:
                by_url[decision.url] = _PendingSource(url=decision.url, alias=decision.alias, includes=[include])
    return list(by_url.values())


def _rewrite_includes(
    original: bytes,
    path: Path,
    patterns: dict[str, tuple[Path, ...]],
    staged: dict[Path, Path],
    pending: list[_PendingSource],
    resolved: dict[str, Any],
    effective: dict[str, tuple[PriceFeedBlob, EffectiveFeed, Path]],
    primary: set[tuple[str, int]],
    unavailable: list[Any],
    load_error: Any,
) -> bytes:
    """Rewrite one closure file's includes for its staged twin.

    Local includes expand to staged paths like write validation does; the
    first managed include per URL points at its effective feed file while
    repeat occurrences become placeholders, so the same URL included twice
    never multiplies entries. An unresolvable managed include becomes an
    unavailable comment with a loader error naming the include as written,
    its file and line, and the cause. Anything else stays byte-identical.
    """
    from beancount.utils import misc_utils

    from bea_engine.ledger.text import iter_includes

    escape_string: Callable[[str], str] = misc_utils.escape_string
    by_target = {include.target: source for source in pending for include in source.includes}
    content = original
    for span in sorted(iter_includes(content), key=lambda item: item.start, reverse=True):
        source = by_target.get(span.target)
        if source is None:
            matches = patterns.get(str(path.parent / span.target), ())
            if matches:
                replacement = "\ninclude ".join(f'"{escape_string(str(staged[p]))}"' for p in matches)
                content = content[: span.start] + replacement.encode() + content[span.end :]
            continue
        result = resolved.get(source.url)
        blob = result.blob if result is not None else None
        if blob is not None:
            if (str(path), span.line) in primary:
                _, _, feed_path = effective[source.url]
                replacement = f'"{escape_string(str(feed_path))}"'
                content = content[: span.start] + replacement.encode() + content[span.end :]
            else:
                content = _swap_line(content, span.line, f"{_ALREADY_INCLUDED_LINE}\n".encode())
            continue
        cause = result.head.last_error if result is not None else "no cached revision"
        comment = f"; managed price source unavailable: {span.target} ({cause})\n".encode()
        content = _swap_line(content, span.line, comment)
        unavailable.append(
            load_error(
                {"filename": str(path), "lineno": span.line},
                f'managed price source unavailable: include "{span.target}" in {path}:{span.line}: {cause}. '
                "Run bea price status to inspect the source.",
            )
        )
    return content


def _swap_line(content: bytes, line: int, replacement: bytes) -> bytes:
    """Replace 1-based `line` keeping the line count, so later spans stay valid."""
    rows = content.splitlines(keepends=True)
    start = sum(len(row) for row in rows[: line - 1])
    return content[:start] + replacement + content[start + len(rows[line - 1]) :]


def _remap_entry(entry: Any, back: dict[str, str]) -> Any:
    meta = getattr(entry, "meta", None)
    if not isinstance(meta, dict) or "filename" not in meta:
        return entry
    mapped = _remap(str(meta["filename"]), back)
    if mapped == meta["filename"]:
        return entry
    return entry._replace(meta={**meta, "filename": mapped})


def _remap_error(error: Any, back: dict[str, str]) -> Any:
    source = getattr(error, "source", None)
    if not isinstance(source, dict) or "filename" not in source:
        return error
    mapped = _remap(str(source["filename"]), back)
    message = getattr(error, "message", "")
    for staged_path, original in back.items():
        message = message.replace(staged_path, original)
    if mapped == source["filename"] and message == getattr(error, "message", ""):
        return error
    replaced = dict(source)
    replaced["filename"] = mapped
    try:
        return error._replace(source=replaced, message=message)
    except (AttributeError, TypeError, ValueError):
        return error


def source_json(source: ManagedSource) -> dict[str, Any]:
    """One managed source as the status record ADR 015 section 8 describes."""
    return {
        "url": source.url,
        "alias": source.alias,
        "included_from": [
            {"file": include.file, "line": include.line, "target": include.target} for include in source.included_from
        ],
        "commodity": source.commodity,
        "quote": source.quote,
        "source": source.source,
        "revision": source.revision,
        "etag": source.etag,
        "observed_at": source.observed_at,
        "fetched_at": source.fetched_at,
        "next_refresh_at": source.next_refresh_at,
        "freshness": source.freshness,
        "error": source.error,
        "shadowed_count": source.shadowed_count,
        "effective_dates": list(source.effective_dates),
    }


def load_file(
    entry: Path | str,
    *,
    offline: bool | None = None,
    strict: bool | None = None,
    origins: tuple[str, ...] | None = None,
    root: Path | None = None,
    now: float | None = None,
    opener: OpenerDirector | None = None,
) -> tuple[list[Any], list[Any], dict[str, Any]]:
    """Drop-in `loader.load_file` with managed includes resolved.

    For call sites that need the per-source records, `load_with_sources`
    returns them alongside.
    """
    loaded = load_with_sources(
        Path(entry), offline=offline, strict=strict, origins=origins, root=root, now=now, opener=opener
    )
    if loaded.sources:
        loaded.options["bea_managed_price_sources"] = [source_json(source) for source in loaded.sources]
    return loaded.entries, loaded.errors, loaded.options


@dataclass(frozen=True)
class PortableExport:
    """A self-contained copy of the ledger with local price files."""

    output: Path
    files: tuple[str, ...]
    sources: tuple[ManagedSource, ...]
    errors: list[Any]


def export_portable(
    entry: Path,
    output: Path | None = None,
    *,
    allow_errors: bool = False,
    offline: bool | None = None,
    strict: bool | None = None,
    origins: tuple[str, ...] | None = None,
    root: Path | None = None,
    now: float | None = None,
    opener: OpenerDirector | None = None,
) -> PortableExport:
    """Snapshot the ledger with local price files and relative includes.

    Each managed feed lands at `prices/<ALIAS>.beancount` under the output
    directory as a `custom "bea-managed-source"` marker directive plus the
    exact effective text the load parsed, so the next pipeline stage replays
    the mapping and stock Beancount checks the tree untouched. An unavailable
    source refuses the export naming it, unless `allow_errors` carries the
    marker alone.
    """
    from bea_engine.ledger.write import LedgerSnapshot
    from bea_engine.protocol import UsageError

    loaded = load_with_sources(
        entry, offline=offline, strict=strict, origins=origins, root=root, now=now, opener=opener
    )
    failed = [source for source in loaded.sources if source.revision is None]
    if failed and not allow_errors:
        names = ", ".join(f"{source.alias} ({source.url})" for source in failed)
        raise UsageError(
            f"Cannot export: managed price source {names} is unavailable. "
            "Retry, or pass --allow-errors to export with its marker only."
        )
    target = (output or entry.parent / f"{entry.stem}-export").expanduser()
    snapshot = LedgerSnapshot.capture(entry.resolve())
    # `resolve()` for a destination that does not exist yet, too: `absolute()`
    # leaves `..` in place, so `books/not-created/..` compared unequal to
    # `books` and slipped past the guard below — then `mkdir(parents=True)`
    # created the missing component and the writes followed `..` straight back
    # into the ledger, rewriting the customer's own `main.bean`.
    #
    # `resolve()` is the right tool rather than stripping `..` textually: it
    # resolves symlinks in the ancestors that do exist *and* normalizes the
    # rest, so a destination reached through a symlinked parent is compared as
    # the directory it truly names.
    resolved_target = target.resolve()
    for path in snapshot.contents:
        if resolved_target == path.parent.resolve():
            raise UsageError(
                f"Cannot export into {target}: it holds {path.name}, which the export would overwrite. "
                "Choose an empty or dedicated directory."
            )
    destinations: dict[Path, Path] = {}
    external = 0
    # Classified by the file each path truly names. Snapshot paths keep a
    # lexical `..` (`books/../shared/accounts.bean`), which `relative_to`
    # accepted as `../shared/accounts.bean`: the copy was written beside the
    # export instead of in it, over whatever lived there, and the include kept
    # pointing outside the snapshot.
    home = snapshot.root.parent.resolve()
    for path in snapshot.contents:
        try:
            destinations[path] = target / path.resolve().relative_to(home)
        except ValueError:
            external += 1
            destinations[path] = target / "_shared" / f"{external:02d}-{path.name}"
    # Allocated against the copied files, not independently of them. A ledger
    # may legitimately keep its own `prices/BTC-USD.beancount` beside a managed
    # `BTC-USD` feed; the two maps used to be built in isolation, so the feed
    # wrote straight over the copy — the manual price vanished and the snapshot
    # included one file twice. The copies keep their relative paths, because
    # that is what makes the export portable, so the generated file is the one
    # that moves.
    taken = set(destinations.values())
    feed_files: dict[str, Path] = {}
    for source in loaded.sources:
        feed_files[source.url] = _free_feed_path(target / "prices", source.alias, taken)
        taken.add(feed_files[source.url])
    by_target = {
        include.target: feed_files[source.url] for source in loaded.sources for include in source.included_from
    }
    # Checked as a whole plan before the first write. A destination that is
    # already one of the ledger's own files — through a symlink, or a hard
    # link no path comparison can see — would be written straight through
    # into the books, so identity is compared, not spelling.
    attachments = _export_attachments(loaded, snapshot.contents, destinations, target, home)
    planned = [*destinations.values(), *feed_files.values(), *attachments.values()]
    for dest in planned:
        if not dest.exists():
            continue
        for ledger_file in [*snapshot.contents, *attachments]:
            if os.path.samefile(dest, ledger_file):
                raise UsageError(
                    f"Cannot export: {dest} is the source file {ledger_file} (a link to it), "
                    "which the export would overwrite. Choose an empty or dedicated directory. "
                    "Nothing was written."
                )
    # And an export writes inside the directory it was given, or nowhere.
    for dest in planned:
        if not dest.resolve().is_relative_to(resolved_target):
            raise UsageError(f"Cannot export: {dest} would land outside {target}. Nothing was written.")
    written: list[str] = []
    for path, original in snapshot.contents.items():
        dest = destinations[path]
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(_rewrite_export_includes(original, path, snapshot.patterns, destinations, by_target))
        written.append(str(dest))
    for document, dest in attachments.items():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(document, dest)
        written.append(str(dest))
    at = time.time() if now is None else now
    for source in loaded.sources:
        dest = feed_files[source.url]
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(_export_feed_text(source, at), encoding="utf-8")
        written.append(str(dest))
    return PortableExport(
        output=target, files=tuple(sorted(written)), sources=loaded.sources, errors=list(loaded.errors)
    )


def _export_attachments(
    loaded: LoadedLedger,
    contents: dict[Path, bytes],
    destinations: dict[Path, Path],
    target: Path,
    home: Path,
) -> dict[Path, Path]:
    """Where each `document` the ledger names goes in the export.

    Beancount checks that a document exists, so an export that copied only the
    ledger text failed stock `bean-check` for a source that passed it. A file
    under the root's directory is copied to the same relative place, which
    keeps every relative `document` path — and a relative `documents` option —
    resolving as before. What cannot travel that way is refused before
    anything is written rather than left pointing back at this machine: a
    file outside that tree, an absolute path in the directive, or a directive
    in an included file that the export relocates.
    """
    from beancount.core.data import Document

    from bea_engine.protocol import UsageError

    ledger_files = {path.resolve(): path for path in contents}
    unsupported: list[str] = []
    for option_dir in loaded.options.get("documents") or []:
        if os.path.isabs(option_dir):
            unsupported.append(f'option "documents" "{option_dir}" (absolute)')
    attachments: dict[Path, Path] = {}
    for entry in loaded.entries:
        if not isinstance(entry, Document):
            continue
        document = Path(entry.filename).resolve()
        try:
            dest = target / document.relative_to(home)
        except ValueError:
            unsupported.append(f"{document} (outside {home})")
            continue
        ledger = ledger_files.get(Path(entry.meta.get("filename", "")).resolve())
        line = int(entry.meta.get("lineno") or 0)
        if ledger is not None and line > 0:
            lines = contents[ledger].decode("utf-8", "replace").splitlines()
            text = lines[line - 1] if line <= len(lines) else ""
            quoted = text.split('"')[1] if text.count('"') >= 2 else ""
            moved = os.path.relpath(dest, destinations[ledger].parent) != os.path.relpath(document, ledger.parent)
            if os.path.isabs(quoted) or moved:
                unsupported.append(f"{document} (named by {ledger.name}:{line})")
                continue
        attachments[document] = dest
    if unsupported:
        raise UsageError(
            "Cannot export: these document attachments would not travel with the export: "
            + "; ".join(unsupported)
            + ". Keep documents beside the ledger and name them by relative path. Nothing was written."
        )
    return attachments


def _free_feed_path(directory: Path, alias: str, taken: set[Path]) -> Path:
    """Where a generated feed goes, never over a path something else owns.

    Deterministic, so re-exporting the same tree produces the same names: the
    plain `<alias>.beancount` when it is free, then `-managed`, then numbered.
    """
    candidate = directory / f"{alias}.beancount"
    suffix = 0
    while candidate in taken:
        suffix += 1
        stem = f"{alias}-managed" if suffix == 1 else f"{alias}-managed-{suffix}"
        candidate = directory / f"{stem}.beancount"
    return candidate


def _rewrite_export_includes(
    original: bytes,
    path: Path,
    patterns: dict[str, tuple[Path, ...]],
    destinations: dict[Path, Path],
    by_target: dict[str, Path],
) -> bytes:
    """Rewrite one copied file's includes as portable relative targets.

    Local includes follow their files to the new tree, managed URLs become
    the sibling price files, and anything the loader left unresolved stays
    byte-identical so stock tools report it the same way.
    """
    from beancount.utils import misc_utils

    from bea_engine.ledger.text import iter_includes

    escape_string: Callable[[str], str] = misc_utils.escape_string
    content = original
    dest = destinations[path]
    for span in sorted(iter_includes(content), key=lambda item: item.start, reverse=True):
        feed = by_target.get(span.target)
        if feed is not None:
            replacement = f'"{escape_string(os.path.relpath(feed, dest.parent))}"'
            content = content[: span.start] + replacement.encode() + content[span.end :]
            continue
        matches = patterns.get(str(path.parent / span.target), ())
        if matches:
            replacement = "\ninclude ".join(
                f'"{escape_string(os.path.relpath(destinations[p], dest.parent))}"' for p in matches
            )
            content = content[: span.start] + replacement.encode() + content[span.end :]
    return content


def _export_feed_text(source: ManagedSource, at: float) -> str:
    """A marker directive the next stage replays, plus the effective text."""
    if source.revision is None:
        day = datetime.fromtimestamp(at, UTC).strftime("%Y-%m-%d")
        marker = f'{day} custom "bea-managed-source" "{source.alias}" "{source.url}" "none" "unknown" "unknown" 0\n'
        cause = source.error or "no cached revision"
        return f"; bea-managed-error: {cause}\n{marker}"
    effective = Path(source.effective_path).read_text(encoding="utf-8") if source.effective_path else ""
    day = max(source.effective_dates) if source.effective_dates else _iso_day(source.fetched_at, at)
    marker = (
        f'{day} custom "bea-managed-source" "{source.alias}" "{source.url}" '
        f'"{source.revision}" "{source.observed_at or "unknown"}" "{source.fetched_at or "unknown"}" '
        f"{source.shadowed_count}\n"
    )
    return f"{marker}{effective}" if effective.endswith("\n") or not effective else f"{marker}{effective}\n"


def _iso_day(stamp: str | None, at: float) -> str:
    if stamp:
        return stamp[:10]
    return datetime.fromtimestamp(at, UTC).strftime("%Y-%m-%d")


__all__ = [
    "EffectiveFeed",
    "IncludeRef",
    "LoadedLedger",
    "ManagedSource",
    "OFFLINE_ENV",
    "ORIGINS_ENV",
    "PortableExport",
    "STRICT_ENV",
    "apply_ledger_price_precedence",
    "collect_ledger_price_pairs",
    "export_portable",
    "load_file",
    "load_with_sources",
]
