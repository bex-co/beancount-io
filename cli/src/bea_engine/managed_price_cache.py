"""On-disk feed cache for managed price includes (w1/m29/t002).

Mirrors ADR 015 section 5 the way `managed_prices` mirrors sections 2–4: an
immutable blob per validated revision plus a small mutable head per URL, with
refresh driven by the head's time stamp rather than by key expiry. A failed
refresh records its error on the head while the previous revision keeps
serving, so a bad refresh never replaces a good cache entry with nothing.

Layout under `<cache>/bea/managed-prices/` (the same XDG base the write locks
use in `ledger/write.py`):

```
<sha256(url)[:32]>/
  head.json              # revision, next_refresh_at, last_error, failed_credential
  <revision>.beancount   # exact validated bytes
  <revision>.json        # etag, sha256 of the text, fetched_at, feed summary
```

The ETag lives on the blob, not the head, exactly as hosted: a head whose
blob went missing offers no stale ETag and simply fetches again. Writes are
atomic renames ordered blob-then-head, so concurrent CLI runs can only ever
expose a complete revision, never a half-written one; redundant fetches are
the only cost of two loads racing, and feeds are idempotent bytes.

Two modes beyond the hosted contract: offline resolution reads the head and
its blob only and never touches the network, and strict resolution fails the
load when a source is stale, unavailable, or serving its cache after a failed
refresh, instead of degrading quietly.
"""

from __future__ import annotations

import errno
import json
import os
import re
import stat
import tempfile
import time
from contextlib import suppress
from dataclasses import asdict, dataclass, replace
from datetime import UTC, date, datetime
from hashlib import sha256
from pathlib import Path
from typing import IO, Any, Literal
from urllib.request import OpenerDirector

from bea_engine.managed_prices import (
    FETCH_TIMEOUT_SECONDS,
    MAX_BODY_BYTES,
    FeedSummary,
    PricePoint,
    ValidFeed,
    check_feed_identity,
    credential_fingerprint,
    feed_revision_id,
    fetch_managed_price_feed,
    is_feed_commodity,
    validate_managed_price_text,
)
from bea_engine.protocol import LedgerError

REFRESH_SECONDS = 300
"""How long a validated revision serves before a conditional re-fetch."""

RETRY_SECONDS = 60
"""How long to wait after a failed refresh before trying again."""

STALE_DAYS = 7
"""Days a feed's newest price may age before the source reads `stale` (ADR 015 section 8).

One rule for every feed, so no asset class or trading calendar is needed: a
crypto feed has a price every day, and an equity or FX feed's longest regular
silence (Good Friday to Easter Monday, five days) plus its next-morning
publication still fits inside a week.
"""

FUTURE_DAYS = 1
"""Days ahead of the UTC date a newest price may be dated and still read recent.

A feed dated by a calendar east of UTC, or a computer clock running a little
slow, can put today's price a day ahead; a price further ahead is no evidence
of freshness, and would keep the source recent however old its real prices are.
"""

SUPERSEDED_GRACE_SECONDS = REFRESH_SECONDS
"""How long a superseded revision's files stay for a load that already chose it (w5/640)."""


@dataclass(frozen=True)
class PriceFeedHead:
    """The mutable pointer: serving revision, next refresh, last error.

    `failed_credential` is set only when the last refresh failed for auth:
    the fingerprint (never the token) of the credential that fetch carried,
    so the retry window holds against that credential and no other (w1/309).
    """

    revision: str | None
    next_refresh_at: float
    last_error: str | None
    failed_credential: str | None = None


@dataclass(frozen=True)
class PriceFeedBlob:
    """One immutable validated revision with the summary validation recorded."""

    url: str
    revision: str
    etag: str | None
    text: str
    fetched_at: float
    feed: FeedSummary


@dataclass(frozen=True)
class ResolvedFeed:
    """Whatever revision serves now, possibly none, with its head."""

    blob: PriceFeedBlob | None
    head: PriceFeedHead


def cache_root() -> Path:
    """Where feed revisions live — beside the write locks, under XDG cache."""
    from bea_engine.ledger.write import cache_dir

    return cache_dir() / "managed-prices"


def feed_dir(url: str, root: Path | None = None) -> Path:
    """The per-URL directory, keyed by a stable hash of the canonical URL."""
    return (root or cache_root()) / sha256(url.encode("utf-8")).hexdigest()[:32]


def open_cache_file(path: Path, mode: str = "r") -> IO[Any]:
    """Open one of bea's cache files for reading, refusing anything but a regular file.

    A FIFO in place of `head.json`, a revision or an effective file hung every
    load, `--offline` included, and the engine stayed blocked after the
    frontend was killed (w5/591). The open never waits, and what is not a
    regular file raises `OSError`, which every reader takes for a missing file.
    """
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_CLOEXEC", 0))
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise OSError(errno.EINVAL, "Not a regular file", str(path))
        return os.fdopen(fd, mode, encoding=None if "b" in mode else "utf-8")
    except BaseException:
        os.close(fd)
        raise


def _read_text(path: Path) -> str:
    with open_cache_file(path) as stream:
        text: str = stream.read()
    return text


def _read_head(directory: Path) -> PriceFeedHead:
    try:
        raw = json.loads(_read_text(directory / "head.json"))
        failed_credential = raw.get("failed_credential")
        return PriceFeedHead(
            revision=raw.get("revision"),
            next_refresh_at=float(raw.get("next_refresh_at", 0)),
            last_error=raw.get("last_error"),
            failed_credential=failed_credential if isinstance(failed_credential, str) else None,
        )
    except (OSError, ValueError, TypeError, AttributeError):
        return PriceFeedHead(revision=None, next_refresh_at=0.0, last_error=None)


def _read_blob(directory: Path, revision: str) -> PriceFeedBlob | None:
    try:
        text = _read_text(directory / f"{revision}.beancount")
        raw = json.loads(_read_text(directory / f"{revision}.json"))
        digest = raw.get("sha256")
        if digest is not None and digest != _digest(text):
            # The bytes are not what was validated: treat the blob as missing
            # so the next refresh fetches in full (no ETag) and heals it.
            return None
        feed = raw["feed"]
        if not (is_feed_commodity(feed["commodity"]) and is_feed_commodity(feed["quote"])):
            # Validated under the looser grammar before w5/377 (`BTC-`): serving
            # it breaks loads, and its pair would refuse the corrected feed.
            # Treat it as missing so the next refresh replaces it.
            return None
        prices = tuple(
            PricePoint(
                line=point["line"],
                date=point["date"],
                base=point["base"],
                quote=point["quote"],
                observed_at=point.get("observed_at"),
            )
            for point in feed.get("prices", [])
        )
        if any(date.fromisoformat(point.date).isoformat() != point.date for point in prices):
            # Not a date the feed's validation accepted: a damaged record.
            # Treat it as missing so the next refresh replaces it.
            return None
        blob = PriceFeedBlob(
            url=raw["url"],
            revision=raw["revision"],
            etag=raw.get("etag"),
            text=text,
            fetched_at=float(raw["fetched_at"]),
            feed=FeedSummary(
                alias=feed.get("alias"),
                commodity=feed["commodity"],
                quote=feed["quote"],
                source=feed.get("source"),
                revision=feed.get("revision"),
                latest_observed_at=feed.get("latest_observed_at"),
                prices=prices,
            ),
        )
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        return None
    if digest is None:
        # Written by bea 0.3.0/0.3.1, before revisions carried a digest, and by
        # the very versions that could cache a truncated download: re-validate
        # the text against the prices recorded for it, or a broken blob is
        # trusted and its ETag pins it with 304s forever (w5/423).
        validation = validate_managed_price_text(text)
        if not isinstance(validation, ValidFeed) or validation.feed.prices != blob.feed.prices:
            return None
    return blob


def _digest(text: str) -> str:
    return sha256(text.encode("utf-8")).hexdigest()


def write_text_atomic(path: Path, text: str) -> None:
    """Write atomically, so a crash never leaves a half-written cache file.

    The temp file is unique per write: concurrent loads racing on the same
    feed must never share (and so consume or truncate) each other's temp.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


CACHE_WRITE_PROBLEM = "price cache not writable"
"""How every recorded cache-write failure begins, so loads can warn about it."""


def cache_write_problem(error: OSError, path: Path) -> str:
    """The error text recorded when the feed cache cannot be written."""
    return f"{CACHE_WRITE_PROBLEM} ({error.strerror or error}): {path}"


def _try_write(path: Path, text: str) -> str | None:
    """Write atomically; on failure answer the problem instead of raising.

    Lenient resolution never fails for a cache problem: a read-only or full
    cache degrades to serving from memory, with the cause recorded.
    """
    try:
        write_text_atomic(path, text)
    except OSError as error:
        return cache_write_problem(error, path)
    return None


_EFFECTIVE_NAME = re.compile(r"(?P<revision>.+)\.effective\.[0-9a-f]{16}\.beancount")


def _revision_of(name: str) -> str | None:
    """The revision a cache file belongs to — its blob, record or an effective text — or None.

    A revision id is an ETag made key-safe, and may hold dots of its own.
    """
    if name.startswith(".") or name == "head.json":
        return None
    effective = _EFFECTIVE_NAME.fullmatch(name)
    if effective is not None:
        return effective["revision"]
    for suffix in (".beancount", ".json"):
        if name.endswith(suffix) and len(name) > len(suffix):
            return name.removesuffix(suffix)
    return None


def _revision_files(directory: Path, revision: str) -> list[Path]:
    """The blob, its record and every per-ledger effective text of one revision."""
    try:
        return [path for path in directory.iterdir() if _revision_of(path.name) == revision]
    except OSError:
        return []


def _retire(directory: Path, revision: str) -> None:
    """Stamp a superseded revision's files with the moment it was superseded.

    Deleting them at once failed every load in another process that had
    already chosen the revision: Beancount then found no file at the
    effective text's include (w5/640). The sweep removes them once a load
    that chose them has long finished.
    """
    now = time.time()
    for path in _revision_files(directory, revision):
        with suppress(OSError):
            os.utime(path, (now, now))


def _sweep(directory: Path, current: str) -> None:
    """Remove every revision but `current` untouched for the grace period.

    A fetch racing this one writes a revision no head ever points at, and
    nothing deleted it; the sweep collects those too, so the cache keeps only
    the revisions of the last grace period.
    """
    cutoff = time.time() - SUPERSEDED_GRACE_SECONDS
    try:
        entries = list(directory.iterdir())
    except OSError:
        return
    for path in entries:
        revision = _revision_of(path.name)
        if revision is None or revision == current:
            continue
        with suppress(OSError):
            if path.lstat().st_mtime < cutoff:
                path.unlink()


def _persist_head(directory: Path, head: PriceFeedHead) -> PriceFeedHead:
    """Write `head`; the head this load reports carries any write failure."""
    problem = _try_write(directory / "head.json", json.dumps(asdict(head)))
    if problem is None:
        return head
    return replace(head, last_error=problem)


def latest_price_date(feed: FeedSummary) -> str | None:
    """The newest price date in a validated feed (ISO dates sort as strings)."""
    return max((point.date for point in feed.prices), default=None)


def _age_days(day: str, now: float) -> int:
    """Whole UTC days from `day` to the UTC date of `now`."""
    today = datetime.fromtimestamp(now, UTC).date()
    return (today - date.fromisoformat(day)).days


def freshness(blob: PriceFeedBlob | None, now: float) -> Literal["recent", "stale", "unavailable"]:
    """Freshness computed at read time, never stored (ADR 015 section 8).

    Recent while the feed's newest price is at most `STALE_DAYS` UTC days
    old (and at most `FUTURE_DAYS` ahead), stale otherwise, unavailable when
    no revision validated. The hosted ledger service reads the same feed the
    same way.
    """
    if blob is None:
        return "unavailable"
    day = latest_price_date(blob.feed)
    if day is None:
        return "stale"
    return "recent" if -FUTURE_DAYS <= _age_days(day, now) <= STALE_DAYS else "stale"


def resolve_feed(
    url: str,
    alias: str,
    *,
    root: Path | None = None,
    offline: bool = False,
    strict: bool = False,
    now: float | None = None,
    opener: OpenerDirector | None = None,
    timeout_seconds: int = FETCH_TIMEOUT_SECONDS,
    max_body_bytes: int = MAX_BODY_BYTES,
    refresh_seconds: int = REFRESH_SECONDS,
    retry_seconds: int = RETRY_SECONDS,
) -> ResolvedFeed:
    """Serve the feed at `url` from the cache, refreshing past its window.

    Never fails for a feed problem in lenient mode: every failure is recorded
    on the head and the caller receives whatever revision last validated.
    Offline mode reads the head and its blob only and writes nothing. Strict
    mode raises naming the source when it is unavailable, stale, or serving
    cached prices because its last refresh failed.
    """
    at = time.time() if now is None else now
    directory = feed_dir(url, root)
    head = _read_head(directory)
    previous = _read_blob(directory, head.revision) if head.revision is not None else None
    if offline:
        if previous is None and head.revision is not None:
            head = PriceFeedHead(revision=None, next_refresh_at=0.0, last_error=head.last_error)
        resolved = ResolvedFeed(blob=previous, head=head)
        _enforce_strict(url, resolved, at, strict, refresh_error=head.last_error)
        return resolved
    # A refresh time further out than any window sets was written under a
    # clock running fast; honored, it suppressed refreshes for days (w5/645).
    believable = head.next_refresh_at <= at + max(refresh_seconds, retry_seconds)
    # An auth failure waits out its window only against the credential it
    # refused: a run that brings another one (a new BEA_TOKEN, a login, a
    # logout) fetches at once instead of replaying "Not logged in" (w1/309).
    credential = credential_fingerprint(url)
    held = head.failed_credential is None or head.failed_credential == credential
    if at < head.next_refresh_at and believable and held and (previous is not None or head.revision is None):
        resolved = ResolvedFeed(blob=previous, head=head)
        _enforce_strict(url, resolved, at, strict, refresh_error=head.last_error)
        return resolved

    result = fetch_managed_price_feed(
        url,
        etag=previous.etag if previous else None,
        opener=opener,
        timeout_seconds=timeout_seconds,
        max_body_bytes=max_body_bytes,
    )
    if result.kind == "not-modified" and previous is not None:
        refreshed = PriceFeedHead(revision=previous.revision, next_refresh_at=at + refresh_seconds, last_error=None)
        refreshed = _persist_head(directory, refreshed)
        resolved = ResolvedFeed(blob=previous, head=refreshed)
        _enforce_strict(url, resolved, at, strict, refresh_error=None)
        return resolved

    message: str | None = None
    failed_credential: str | None = None
    if result.kind == "fetched":
        pair = (previous.feed.commodity, previous.feed.quote) if previous else None
        validation = check_feed_identity(validate_managed_price_text(result.text), alias, pair)
        if validation.ok:
            assert isinstance(validation, ValidFeed)
            revision = feed_revision_id(result.etag, result.text)
            blob = PriceFeedBlob(
                url=url,
                revision=revision,
                etag=result.etag,
                text=result.text,
                fetched_at=at,
                feed=validation.feed,
            )
            # The blob must exist before the head points at it; the superseded
            # blob can go while the head is written. A cache that cannot be
            # written still serves the validated feed for this load.
            refreshed = PriceFeedHead(revision=revision, next_refresh_at=at + refresh_seconds, last_error=None)
            problem = _try_write(directory / f"{revision}.beancount", result.text) or _try_write(
                directory / f"{revision}.json",
                json.dumps(
                    {
                        "url": url,
                        "revision": revision,
                        "etag": result.etag,
                        "sha256": _digest(result.text),
                        "fetched_at": at,
                        "feed": {
                            **asdict(validation.feed),
                            "prices": [asdict(point) for point in validation.feed.prices],
                        },
                    }
                ),
            )
            if problem is None:
                refreshed = _persist_head(directory, refreshed)
            else:
                refreshed = PriceFeedHead(revision=revision, next_refresh_at=at + refresh_seconds, last_error=problem)
            if refreshed.last_error is None:
                if previous is not None and previous.revision != revision:
                    _retire(directory, previous.revision)
                _sweep(directory, revision)
            resolved = ResolvedFeed(blob=blob, head=refreshed)
            _enforce_strict(url, resolved, at, strict, refresh_error=None)
            return resolved
        message = (
            f"invalid feed: {validation.reason}"
            if validation.line is None
            else f"invalid feed at line {validation.line}: {validation.reason}"
        )
    elif result.kind == "not-modified":
        message = "server answered 304 without a cached revision to reuse"
    else:
        message = f"fetch failed ({result.reason}): {result.message}"
        if result.reason == "auth":
            failed_credential = credential
        # Only the cache knows whether anything is left to serve (w5/644).
        if result.reason == "provider" and previous is not None:
            message = message.rstrip(".") + "; cached prices remain usable."

    # The revision that still serves, not one whose blob is gone: a head naming
    # a missing blob never honored the retry window, so every command fetched
    # again, waiting out the timeout on a slow service (w5/641).
    degraded = PriceFeedHead(
        revision=previous.revision if previous is not None else None,
        next_refresh_at=at + retry_seconds,
        last_error=message,
        failed_credential=failed_credential,
    )
    # The fetch failure is the error worth reporting; an unwritable cache
    # only means the next load retries sooner.
    _try_write(directory / "head.json", json.dumps(asdict(degraded)))
    resolved = ResolvedFeed(blob=previous, head=degraded)
    _enforce_strict(url, resolved, at, strict, refresh_error=message)
    return resolved


def _enforce_strict(url: str, resolved: ResolvedFeed, at: float, strict: bool, *, refresh_error: str | None) -> None:
    """Fail the load, naming the source, when strict mode forbids degrading.

    `refresh_error` is why the last refresh failed when the cache is serving
    in its place. A week-old price still reads recent, so the failure itself
    is what tells strict mode that the prices may be out of date. A cache
    write problem after a good fetch is not one: the prices are current.
    """
    if not strict:
        return
    if resolved.blob is None:
        # The cause may be a bare phrase ("no cached revision") or a finished
        # sentence with its own remedy ("… set/replace BEA_TOKEN."), so add the
        # full stop only when one is missing.
        cause = (resolved.head.last_error or "no cached revision").rstrip()
        raise LedgerError(f"managed price source {url} is unavailable in strict mode: {cause}".rstrip(".") + ".")
    if freshness(resolved.blob, at) == "stale":
        day = latest_price_date(resolved.blob.feed)
        age = _age_days(day, at) if day else None
        if age is None:
            why = "the feed has no price."
        elif age < 0:
            why = (
                f"its newest price is dated {day}, ahead of today's UTC date; check the feed or this computer's clock."
            )
        else:
            why = f"its newest price is dated {day}, {age} days ago; a feed is stale after {STALE_DAYS} days."
        raise LedgerError(f"managed price source {url} is stale in strict mode: {why}")
    if refresh_error is not None:
        cause = refresh_error.rstrip()
        raise LedgerError(f"managed price source {url} failed to refresh in strict mode: {cause}".rstrip(".") + ".")


def managed_source_for_path(path: Path, root: Path | None = None) -> str | None:
    """The feed URL a cache path belongs to, or None outside the feed cache.

    The read-only write boundary uses this to name the managed source a
    write tried to target.
    """
    try:
        path.resolve().relative_to((root or cache_root()).resolve())
    except (OSError, ValueError):
        return None
    for sidecar in sorted(path.parent.glob("*.json")):
        if sidecar.name == "head.json":
            continue
        try:
            url = json.loads(_read_text(sidecar)).get("url")
        except (OSError, ValueError, AttributeError):
            continue
        if isinstance(url, str):
            return url
    return None


def zero_next_refresh(url: str, root: Path | None = None) -> PriceFeedHead:
    """Force the next load to re-resolve: the manual refresh of ADR 015 section 5."""
    directory = feed_dir(url, root)
    refreshed = replace(_read_head(directory), next_refresh_at=0.0)
    write_text_atomic(directory / "head.json", json.dumps(asdict(refreshed)))
    return refreshed
