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
  head.json              # revision, next_refresh_at, last_error
  <revision>.beancount   # exact validated bytes
  <revision>.json        # etag, fetched_at, and the feed summary
```

The ETag lives on the blob, not the head, exactly as hosted: a head whose
blob went missing offers no stale ETag and simply fetches again. Writes are
atomic renames ordered blob-then-head, so concurrent CLI runs can only ever
expose a complete revision, never a half-written one; redundant fetches are
the only cost of two loads racing, and feeds are idempotent bytes.

Two modes beyond the hosted contract: offline resolution reads the head and
its blob only and never touches the network, and strict resolution fails the
load when a source is stale or unavailable instead of degrading quietly.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from typing import Literal
from urllib.request import OpenerDirector

from bea_engine.managed_prices import (
    FETCH_TIMEOUT_SECONDS,
    MAX_BODY_BYTES,
    FeedSummary,
    PricePoint,
    ValidFeed,
    check_feed_identity,
    feed_revision_id,
    fetch_managed_price_feed,
    validate_managed_price_text,
)
from bea_engine.protocol import LedgerError

REFRESH_SECONDS = 300
"""How long a validated revision serves before a conditional re-fetch."""

RETRY_SECONDS = 60
"""How long to wait after a failed refresh before trying again."""

STALE_SECONDS = 600
"""Observation age beyond which a source reads `stale` (ADR 015 section 8)."""


@dataclass(frozen=True)
class PriceFeedHead:
    """The mutable pointer: serving revision, next refresh, last error."""

    revision: str | None
    next_refresh_at: float
    last_error: str | None


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
    base = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache").expanduser()
    return base / "bea" / "managed-prices"


def feed_dir(url: str, root: Path | None = None) -> Path:
    """The per-URL directory, keyed by a stable hash of the canonical URL."""
    return (root or cache_root()) / sha256(url.encode("utf-8")).hexdigest()[:32]


def _read_head(directory: Path) -> PriceFeedHead:
    try:
        raw = json.loads((directory / "head.json").read_text(encoding="utf-8"))
        return PriceFeedHead(
            revision=raw.get("revision"),
            next_refresh_at=float(raw.get("next_refresh_at", 0)),
            last_error=raw.get("last_error"),
        )
    except (OSError, ValueError, TypeError, AttributeError):
        return PriceFeedHead(revision=None, next_refresh_at=0.0, last_error=None)


def _read_blob(directory: Path, revision: str) -> PriceFeedBlob | None:
    try:
        text = (directory / f"{revision}.beancount").read_text(encoding="utf-8")
        raw = json.loads((directory / f"{revision}.json").read_text(encoding="utf-8"))
        feed = raw["feed"]
        return PriceFeedBlob(
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
                prices=tuple(
                    PricePoint(
                        line=point["line"],
                        date=point["date"],
                        base=point["base"],
                        quote=point["quote"],
                        observed_at=point.get("observed_at"),
                    )
                    for point in feed.get("prices", [])
                ),
            ),
        )
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        return None


def _write_text(path: Path, text: str) -> None:
    """Write atomically, so a crash never leaves a half-written cache file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def freshness(
    blob: PriceFeedBlob | None, now: float, stale_seconds: int = STALE_SECONDS
) -> Literal["recent", "stale", "unavailable"]:
    """Freshness computed at read time, never stored (ADR 015 section 8).

    Recent within the stale window of the latest `observed-at`, stale beyond
    it, unavailable when no revision validated. A feed with no parseable
    observed-at reads stale: without an observation age there is nothing
    fresh to claim, and the hosted side reads the same feed the same way.
    """
    if blob is None:
        return "unavailable"
    stamp = blob.feed.latest_observed_at
    if stamp is None:
        return "stale"
    moment = stamp[:-1] + "+00:00" if stamp.endswith("Z") else stamp
    try:
        age = now - datetime.fromisoformat(moment).timestamp()
    except ValueError:
        return "stale"
    return "recent" if age <= stale_seconds else "stale"


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
    stale_seconds: int = STALE_SECONDS,
) -> ResolvedFeed:
    """Serve the feed at `url` from the cache, refreshing past its window.

    Never fails for a feed problem in lenient mode: every failure is recorded
    on the head and the caller receives whatever revision last validated.
    Offline mode reads the head and its blob only and writes nothing. Strict
    mode raises naming the source when it is stale or unavailable.
    """
    at = time.time() if now is None else now
    directory = feed_dir(url, root)
    head = _read_head(directory)
    previous = _read_blob(directory, head.revision) if head.revision is not None else None
    if offline:
        if previous is None and head.revision is not None:
            head = PriceFeedHead(revision=None, next_refresh_at=0.0, last_error=head.last_error)
        resolved = ResolvedFeed(blob=previous, head=head)
        _enforce_strict(url, resolved, at, stale_seconds, strict)
        return resolved
    if at < head.next_refresh_at and (previous is not None or head.revision is None):
        resolved = ResolvedFeed(blob=previous, head=head)
        _enforce_strict(url, resolved, at, stale_seconds, strict)
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
        _write_text(directory / "head.json", json.dumps(asdict(refreshed)))
        resolved = ResolvedFeed(blob=previous, head=refreshed)
        _enforce_strict(url, resolved, at, stale_seconds, strict)
        return resolved

    message: str | None = None
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
            # blob can go while the head is written.
            _write_text(directory / f"{revision}.beancount", result.text)
            _write_text(
                directory / f"{revision}.json",
                json.dumps(
                    {
                        "url": url,
                        "revision": revision,
                        "etag": result.etag,
                        "fetched_at": at,
                        "feed": {
                            **asdict(validation.feed),
                            "prices": [asdict(point) for point in validation.feed.prices],
                        },
                    }
                ),
            )
            refreshed = PriceFeedHead(revision=revision, next_refresh_at=at + refresh_seconds, last_error=None)
            _write_text(directory / "head.json", json.dumps(asdict(refreshed)))
            if previous is not None and previous.revision != revision:
                (directory / f"{previous.revision}.beancount").unlink(missing_ok=True)
                (directory / f"{previous.revision}.json").unlink(missing_ok=True)
                # Per-ledger effective texts key off the revision; they die with it.
                for effective in directory.glob(f"{previous.revision}.effective.*.beancount"):
                    effective.unlink(missing_ok=True)
            resolved = ResolvedFeed(blob=blob, head=refreshed)
            _enforce_strict(url, resolved, at, stale_seconds, strict)
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

    degraded = PriceFeedHead(revision=head.revision, next_refresh_at=at + retry_seconds, last_error=message)
    _write_text(directory / "head.json", json.dumps(asdict(degraded)))
    resolved = ResolvedFeed(blob=previous, head=degraded)
    _enforce_strict(url, resolved, at, stale_seconds, strict)
    return resolved


def _enforce_strict(url: str, resolved: ResolvedFeed, at: float, stale_seconds: int, strict: bool) -> None:
    """Fail the load, naming the source, when strict mode forbids degrading."""
    if not strict:
        return
    if resolved.blob is None:
        cause = resolved.head.last_error or "no cached revision"
        raise LedgerError(f"managed price source {url} is unavailable in strict mode: {cause}.")
    if freshness(resolved.blob, at, stale_seconds) == "stale":
        stamp = resolved.blob.feed.latest_observed_at or "unknown observation time"
        raise LedgerError(
            f"managed price source {url} is stale in strict mode: latest observation {stamp} "
            f"is older than {stale_seconds} seconds."
        )


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
            url = json.loads(sidecar.read_text(encoding="utf-8")).get("url")
        except (OSError, ValueError, AttributeError):
            continue
        if isinstance(url, str):
            return url
    return None


def zero_next_refresh(url: str, root: Path | None = None) -> PriceFeedHead:
    """Force the next load to re-resolve: the manual refresh of ADR 015 section 5."""
    directory = feed_dir(url, root)
    head = _read_head(directory)
    refreshed = PriceFeedHead(revision=head.revision, next_refresh_at=0.0, last_error=head.last_error)
    _write_text(directory / "head.json", json.dumps(asdict(refreshed)))
    return refreshed
